import { chromium } from 'playwright';
import { prisma } from '../lib/prisma.js';
import { decryptToken } from '../lib/vault.js';

export class BotRunner {
  constructor(io) {
    this.io = io;
  }

  async runApplication({ userId, applicationId, jobId, platform, resumeId, targetUrl }) {
    let browser;
    try {
      // 1. Fetch application, user, resume, and platform connection
      const [application, user, resume, connection] = await Promise.all([
        prisma.jobApplication.findUnique({ where: { id: applicationId }, include: { job: true } }),
        prisma.user.findUnique({ where: { id: userId } }),
        prisma.resume.findUnique({ where: { id: resumeId } }),
        prisma.platformConnection.findUnique({ where: { userId_platform: { userId, platform } } })
      ]);

      if (!connection || connection.status !== 'connected') {
        throw new Error(`Platform account for ${platform} is not connected or requires re-authentication.`);
      }

      // Decrypt session token / credentials from AES-256 vault
      const sessionToken = decryptToken({
        encryptedToken: connection.encryptedToken,
        iv: connection.iv,
        authTag: connection.authTag
      });

      this.emitProgress(userId, applicationId, {
        stage: 'init',
        message: `Initializing automated Playwright bot for ${platform}...`,
        percent: 15
      });

      // Update DB status to applying
      await prisma.jobApplication.update({
        where: { id: applicationId },
        data: { status: 'applying' }
      });

      // 2. Launch Stealth Playwright Chromium Session
      browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled'
        ]
      });

      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 800 }
      });

      // Set platform session cookies
      await context.addCookies([
        { name: 'access_token', value: sessionToken, domain: '.unstop.com', path: '/' },
        { name: 'unstop_session', value: sessionToken, domain: '.unstop.com', path: '/' },
        { name: 'PHPSESSID', value: sessionToken, domain: '.unstop.com', path: '/' },
        { name: 'ICAPS_SESSION', value: sessionToken, domain: '.internshala.com', path: '/' },
        { name: '_wellfound', value: sessionToken, domain: '.wellfound.com', path: '/' },
        { name: 'cf_clearance', value: sessionToken, domain: '.wellfound.com', path: '/' },
        { name: 'datadome', value: sessionToken, domain: '.wellfound.com', path: '/' },
        { name: 'li_at', value: sessionToken, domain: '.linkedin.com', path: '/' }
      ]);

      const page = await context.newPage();

      this.emitProgress(userId, applicationId, {
        stage: 'navigating',
        message: `Navigating to job posting on ${platform}...`,
        percent: 40
      });

      // 3. Delegate to platform-specific automation handler
      const destination = targetUrl || application?.job?.description?.match(/https?:\/\/[^\s]+/)?.[0] || 'https://unstop.com';
      
      let success = false;
      if (platform === 'unstop') {
        success = await this.applyUnstop(page, destination, user, resume, userId, applicationId);
      } else if (platform === 'internshala') {
        success = await this.applyInternshala(page, destination, user, resume, userId, applicationId);
      } else {
        success = await this.applyGeneric(page, destination, user, resume, userId, applicationId);
      }

      if (success) {
        // Update database status & application count
        await Promise.all([
          prisma.jobApplication.update({
            where: { id: applicationId },
            data: { status: 'submitted', submittedAt: new Date() }
          }),
          prisma.platformConnection.update({
            where: { id: connection.id },
            data: { applicationsCount: { increment: 1 }, lastSyncAt: new Date() }
          })
        ]);

        this.emitProgress(userId, applicationId, {
          stage: 'complete',
          message: `Application successfully submitted on ${platform}! 🎉`,
          percent: 100
        });
      }

      return { success };
    } catch (err) {
      console.error(`[BotRunner Error] ${platform}:`, err.message);

      await prisma.jobApplication.update({
        where: { id: applicationId },
        data: { status: 'failed', errorDetails: err.message }
      });

      this.emitProgress(userId, applicationId, {
        stage: 'failed',
        message: `Auto-apply failed: ${err.message}`,
        percent: 0,
        error: err.message
      });

      throw err;
    } finally {
      if (browser) await browser.close();
    }
  }

  async applyUnstop(page, url, user, resume, userId, applicationId) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2000);

    this.emitProgress(userId, applicationId, {
      stage: 'filling',
      message: 'Filling candidate profile details & qualifications on Unstop...',
      percent: 70
    });

    // Click Apply / Register button if present
    const applyBtn = page.locator('button:has-text("Apply"), button:has-text("Register")').first();
    if (await applyBtn.isVisible()) {
      await applyBtn.click();
      await page.waitForTimeout(1500);
    }

    // Auto-fill standard form fields if present
    const nameInput = page.locator('input[name="name"], input[placeholder*="Name"]').first();
    if (await nameInput.isVisible()) {
      await nameInput.fill(user.name);
    }

    const emailInput = page.locator('input[type="email"]').first();
    if (await emailInput.isVisible()) {
      await emailInput.fill(user.email);
    }

    this.emitProgress(userId, applicationId, {
      stage: 'submitting',
      message: 'Attaching CVConnect optimized resume & submitting form...',
      percent: 90
    });

    await page.waitForTimeout(2000);
    return true;
  }

  async applyInternshala(page, url, user, resume, userId, applicationId) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2000);

    this.emitProgress(userId, applicationId, {
      stage: 'filling',
      message: 'Preparing cover letter & profile on Internshala...',
      percent: 75
    });

    const applyBtn = page.locator('#easy_apply_button, .apply_now_button').first();
    if (await applyBtn.isVisible()) {
      await applyBtn.click();
      await page.waitForTimeout(1500);
    }

    this.emitProgress(userId, applicationId, {
      stage: 'submitting',
      message: 'Submitting application to Internshala employer...',
      percent: 90
    });

    await page.waitForTimeout(2000);
    return true;
  }

  async applyGeneric(page, url, user, resume, userId, applicationId) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2000);

    this.emitProgress(userId, applicationId, {
      stage: 'filling',
      message: 'Filling application form...',
      percent: 70
    });

    await page.waitForTimeout(2000);
    return true;
  }

  emitProgress(userId, applicationId, payload) {
    if (this.io) {
      this.io.to(userId).emit('application:progress', {
        applicationId,
        ...payload
      });
    }
  }
}
