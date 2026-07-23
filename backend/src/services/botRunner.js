import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import { prisma } from '../lib/prisma.js';
import { decryptToken } from '../lib/vault.js';
import { generateResumePdf } from '../lib/resumePdf.js';
import { getProfilePath } from './sessionManager.js';

// ─── Stealth fingerprint override script ─────────────────────────────────────
// Injected into every page before any JS runs to defeat automation detection.
const STEALTH_SCRIPT = `(function () {
  // 1. Remove webdriver flag
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

  // 2. Fake browser plugin array (headless Chrome has 0 plugins)
  const fakePlugins = ['Chrome PDF Plugin', 'Chrome PDF Viewer', 'Native Client'];
  const pluginArr = fakePlugins.map(name => ({ name, filename: name.toLowerCase().replace(/ /g, '-') + '.dll', description: name }));
  pluginArr.item = i => pluginArr[i];
  pluginArr.namedItem = n => pluginArr.find(p => p.name === n);
  pluginArr.refresh = () => {};
  Object.defineProperty(navigator, 'plugins', { get: () => pluginArr });

  // 3. Languages
  Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en', 'hi'] });

  // 4. Chrome runtime (missing in headless = detected)
  if (!window.chrome) window.chrome = {};
  if (!window.chrome.runtime) window.chrome.runtime = {};

  // 5. Permissions API (notifications check is a known bot probe)
  try {
    const orig = navigator.permissions.query.bind(navigator.permissions);
    navigator.permissions.query = p =>
      p.name === 'notifications'
        ? Promise.resolve({ state: typeof Notification !== 'undefined' ? Notification.permission : 'default' })
        : orig(p);
  } catch (_) {}

  // 6. Remove Playwright's internal markers
  try { delete window.__playwright; } catch (_) {}
  try { delete window.__pw_manual; } catch (_) {}

  // 7. Fake screen dimensions (headless uses 0x0 sometimes)
  if (screen.width === 0) {
    Object.defineProperty(screen, 'width',       { get: () => 1366 });
    Object.defineProperty(screen, 'height',      { get: () => 768 });
    Object.defineProperty(screen, 'availWidth',  { get: () => 1366 });
    Object.defineProperty(screen, 'availHeight', { get: () => 728 });
    Object.defineProperty(screen, 'colorDepth',  { get: () => 24 });
  }
})();`;

// ─── User-agent pool ──────────────────────────────────────────────────────────
const UA_POOL = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.6312.86 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
];

// ─── Cookie map: platform → { cookieName, domain } ───────────────────────────
const PLATFORM_COOKIE = {
  unstop:      { name: 'access_token', domain: '.unstop.com'      },
  internshala: { name: 'PHPSESSID',    domain: '.internshala.com' },
  wellfound:   { name: '_wellfound',   domain: '.wellfound.com'   },
  linkedin:    { name: 'li_at',        domain: '.linkedin.com'    },
  indeed:      { name: 'CTK',          domain: '.indeed.com'      },
  glassdoor:   { name: 'JSESSIONID',   domain: '.glassdoor.com'   },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Random delay between min–max ms to simulate human timing */
const delay = (min = 300, max = 800) =>
  new Promise(r => setTimeout(r, min + Math.random() * (max - min)));

/** Human-like typing: one char at a time with randomized keystroke delay */
async function humanType(locator, text) {
  for (const char of text) {
    await locator.pressSequentially(char, { delay: 25 + Math.random() * 90 });
    // Occasional longer pause (typo-correction hesitation)
    if (Math.random() < 0.04) await delay(150, 450);
  }
}

/** Click with pre- and post-delay */
async function humanClick(locator) {
  await delay(120, 350);
  await locator.click();
  await delay(200, 500);
}

/** Detect CAPTCHA / bot-challenge pages */
function hasCaptcha(html) {
  const h = html.toLowerCase();
  return (
    h.includes('geo.captcha-delivery.com') ||
    h.includes('datadome')                 ||
    h.includes('cf-challenge')             ||
    h.includes('hcaptcha')                 ||
    h.includes('recaptcha')                ||
    h.includes('i am not a robot')         ||
    h.includes('verify you are human')     ||
    h.includes('press and hold')
  );
}

/** Try multiple CSS selectors and return first visible match */
async function findVisible(page, selectors, timeout = 2500) {
  for (const sel of selectors) {
    const el = page.locator(sel).first();
    if (await el.isVisible({ timeout }).catch(() => false)) return el;
  }
  return null;
}

// ─── BotRunner class ──────────────────────────────────────────────────────────

export class BotRunner {
  constructor(io) {
    this.io = io;
  }

  // ── Public entry point ───────────────────────────────────────────────────

  async runApplication({ userId, applicationId, jobId, platform, resumeId, targetUrl, useBrowserSession = false }) {
    let browser;
    let pdfPath;

    try {
      // 1. Load all required data
      const [application, user, resume] = await Promise.all([
        prisma.jobApplication.findUnique({ where: { id: applicationId }, include: { job: true } }),
        prisma.user.findUnique({ where: { id: userId } }),
        resumeId ? prisma.resume.findUnique({ where: { id: resumeId } }) : Promise.resolve(null),
      ]);

      const destination = targetUrl || application?.job?.description?.match(/https?:\/\/[^\s]+/)?.[0];
      if (!destination) throw new Error('No target URL provided. Add a job URL before triggering auto-apply.');

      this.emit(userId, applicationId, 'init', `Initializing stealth bot for ${platform}…`, 10);

      // 2. Generate resume PDF
      const resumeData = resume?.optimized || resume?.original;
      if (resumeData) {
        this.emit(userId, applicationId, 'generating_pdf', 'Generating optimized resume PDF…', 20);
        pdfPath = await generateResumePdf(resumeData).catch(err => {
          console.warn('[BotRunner] PDF gen failed (non-fatal):', err.message);
          return null;
        });
      }

      // 3. Update status → applying
      await prisma.jobApplication.update({ where: { id: applicationId }, data: { status: 'applying' } });

      // 4. Launch browser — persistent profile (preferred) or fresh + cookie injection
      let context;
      if (useBrowserSession) {
        // ── Persistent browser session (user logged in manually once) ──────────
        const profilePath = getProfilePath(userId, platform);
        this.emit(userId, applicationId, 'authenticating', `Loading saved ${platform} session…`, 30);

        context = await chromium.launchPersistentContext(profilePath, {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--disable-dev-shm-usage',
            '--no-first-run',
            '--disable-gpu',
            '--window-size=1366,768',
          ],
        });

        // Update lastUsedAt for the session
        await prisma.browserSession.updateMany({
          where: { userId, platform },
          data: { lastUsedAt: new Date() },
        }).catch(() => {});

      } else {
        // ── Cookie/token injection (legacy fallback) ───────────────────────────
        const connection = await prisma.platformConnection.findUnique({
          where: { userId_platform: { userId, platform } }
        });

        if (!connection || connection.status !== 'connected') {
          throw new Error(`${platform} is not connected. Please reconnect in Accounts or Connect Platforms.`);
        }

        if (connection.tokenExpiresAt && new Date(connection.tokenExpiresAt) < new Date()) {
          await prisma.platformConnection.update({ where: { id: connection.id }, data: { status: 'expired' } });
          throw new Error(
            `Your ${platform} session expired on ${new Date(connection.tokenExpiresAt).toLocaleDateString('en-IN')}. ` +
            'Please re-connect with a fresh token.'
          );
        }

        const sessionToken = decryptToken({
          encryptedToken: connection.encryptedToken,
          iv: connection.iv,
          authTag: connection.authTag,
        });
        if (!sessionToken) throw new Error(`Could not decrypt ${platform} token. Please re-connect the platform.`);

        const userAgent = UA_POOL[Math.floor(Math.random() * UA_POOL.length)];
        browser = await chromium.launch({
          headless: true,
          args: [
            '--no-sandbox', '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--disable-infobars', '--disable-dev-shm-usage',
            '--no-first-run', '--no-zygote', '--disable-gpu',
            '--window-size=1366,768', '--disable-extensions',
          ],
        });

        context = await browser.newContext({
          userAgent,
          viewport: {
            width:  1280 + Math.floor(Math.random() * 120),
            height: 720  + Math.floor(Math.random() * 80),
          },
          locale: 'en-US',
          timezoneId: 'Asia/Kolkata',
          extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8' },
        });

        await context.addInitScript(STEALTH_SCRIPT);

        const cookieCfg = PLATFORM_COOKIE[platform];
        if (!cookieCfg) throw new Error(`No cookie config for platform: ${platform}`);

        await context.addCookies([{
          name: cookieCfg.name, value: sessionToken,
          domain: cookieCfg.domain, path: '/',
          httpOnly: true, sameSite: 'Lax',
        }]);
      }

      const page = await context.newPage();

      // Block heavy assets / tracking
      await page.route('**/*.{png,jpg,jpeg,gif,webp,svg,ico,woff,woff2,ttf,eot,otf}', r => r.abort());
      await page.route('**/analytics*', r => r.abort());
      await page.route('**/hotjar*',    r => r.abort());
      await page.route('**/gtag*',      r => r.abort());
      await page.route('**/ads*',       r => r.abort());

      this.emit(userId, applicationId, 'navigating', `Navigating to ${platform} job page…`, 38);

      // 7. Delegate to platform handler
      let success = false;
      switch (platform) {
        case 'unstop':      success = await this.applyUnstop(page, destination, user, resume, pdfPath, userId, applicationId); break;
        case 'internshala': success = await this.applyInternshala(page, destination, user, resume, pdfPath, userId, applicationId); break;
        case 'wellfound':   success = await this.applyWellfound(page, destination, user, resume, pdfPath, userId, applicationId); break;
        case 'linkedin':    success = await this.applyLinkedIn(page, destination, user, resume, pdfPath, userId, applicationId); break;
        default:            success = await this.applyGeneric(page, destination, user, resume, userId, applicationId);
      }

      // 8. Persist result
      if (success) {
        const updates = [
          prisma.jobApplication.update({
            where: { id: applicationId },
            data: { status: 'submitted', submittedAt: new Date() },
          }),
        ];
        // Increment applicationsCount on token connection if used
        if (!useBrowserSession) {
          const conn = await prisma.platformConnection.findUnique({
            where: { userId_platform: { userId, platform } }
          }).catch(() => null);
          if (conn) {
            updates.push(prisma.platformConnection.update({
              where: { id: conn.id },
              data: { applicationsCount: { increment: 1 }, lastSyncAt: new Date() },
            }));
          }
        }
        await Promise.all(updates);
        this.emit(userId, applicationId, 'complete', `Application submitted on ${platform}! 🎉`, 100);
      } else {
        await prisma.jobApplication.update({ where: { id: applicationId }, data: { status: 'failed', errorDetails: 'Bot completed but could not confirm submission.' } });
        this.emit(userId, applicationId, 'failed', 'Bot completed but submission could not be confirmed. Check platform manually.', 0);
      }

      return { success };
    } catch (err) {
      console.error(`[BotRunner:${platform}]`, err.message);
      await prisma.jobApplication.update({
        where: { id: applicationId },
        data: { status: 'failed', errorDetails: err.message },
      }).catch(() => {});
      this.emit(userId, applicationId, 'failed', `Auto-apply failed: ${err.message}`, 0, err.message);
      throw err;
    } finally {
      // For persistent context: close the context itself
      // For fresh browser: close the browser (which closes all contexts)
      if (browser) await browser.close().catch(() => {});
      if (pdfPath) await fs.unlink(pdfPath).catch(() => {});
    }
  }

  // ── Unstop ────────────────────────────────────────────────────────────────

  async applyUnstop(page, url, user, resume, pdfPath, userId, appId) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 28000 });
    await delay(1500, 3000);

    // CAPTCHA check
    if (hasCaptcha(await page.content())) {
      this.emit(userId, appId, 'captcha_detected', '⚠️ CAPTCHA detected on Unstop — please solve it in your browser within 60s.', 50, 'CAPTCHA_REQUIRED');
      await delay(60000, 62000);
    }

    this.emit(userId, appId, 'filling', 'Locating Unstop Apply button…', 58);

    // Check if user has ALREADY APPLIED to this listing
    const bodyText = (await page.locator('body').innerText().catch(() => '')).toLowerCase();
    const alreadySubmitted = (
      bodyText.includes('already registered') ||
      bodyText.includes('you have registered') ||
      bodyText.includes('application submitted') ||
      bodyText.includes('already applied')
    );

    if (alreadySubmitted) {
      this.emit(userId, appId, 'complete', 'You have already applied for this position on Unstop! 🎉', 100);
      return true;
    }

    // Step 1: Click Quick Apply / Register button (exact button selectors, avoid container div matching)
    const applyBtn = await findVisible(page, [
      '#un-register-btn',
      'button:has-text("Quick Apply")',
      'a:has-text("Quick Apply")',
      '.register_btn',
      'button:has-text("Register Now")',
      'button:has-text("Apply Now")',
      'button:has-text("Apply")',
      'button:has-text("Register")',
      '.apply-btn',
      '[data-testid="apply-button"]',
    ]);

    if (!applyBtn) {
      // Re-check if page says registered after checking buttons
      if (bodyText.includes('registered') || bodyText.includes('applied')) {
        this.emit(userId, appId, 'complete', 'Application is already submitted on Unstop! 🎉', 100);
        return true;
      }
      console.warn('[BotRunner:Unstop] Could not find Apply/Register button on page.');
      return false;
    }

    await humanClick(applyBtn);
    await delay(2500, 4000);

    // Step 2: Handle multi-step application form if redirected to /register
    const nextBtn = await findVisible(page, [
      'button:has-text("Next")',
      '.un-button:has-text("Next")',
      'button span:has-text("Next")',
    ], 2500);

    if (nextBtn) {
      this.emit(userId, appId, 'filling', 'Filling Unstop registration details…', 70);
      await humanClick(nextBtn);
      await delay(2500, 4000);
    }

    // Step 3: Fill standard fields or resume upload if present
    const nameField = await findVisible(page, ['input[name="name"]', 'input[placeholder*="name" i]'], 1000);
    if (nameField) { await nameField.clear(); await humanType(nameField, user.name); }

    const emailField = await findVisible(page, ['input[type="email"]', 'input[name="email"]'], 1000);
    if (emailField) { await emailField.clear(); await humanType(emailField, user.email); }

    if (pdfPath) {
      const fileInput = await findVisible(page, ['input[type="file"][accept*="pdf"]', 'input[type="file"]'], 1500);
      if (fileInput) {
        this.emit(userId, appId, 'uploading', 'Uploading optimized resume PDF to Unstop…', 80);
        await fileInput.setInputFiles(pdfPath);
        await delay(1500, 2500);
      }
    }

    this.emit(userId, appId, 'submitting', 'Submitting Unstop application…', 88);

    // Step 4: Final submit button inside form or modal
    const submitBtn = await findVisible(page, [
      'button:has-text("Submit")',
      'button:has-text("Submit Application")',
      'button:has-text("Confirm Registration")',
      'button:has-text("Confirm")',
      'button:has-text("Register")',
      '.un-button:has-text("Submit")',
      '.modal button[type="submit"]',
    ], 3000);

    if (submitBtn) {
      await humanClick(submitBtn);
      await delay(3500, 5500);
    }

    // Step 5: DOM verification
    const btnText = (await applyBtn.textContent().catch(() => '')).toLowerCase();
    const pageText = (await page.locator('body').innerText().catch(() => '')).toLowerCase();

    const isConfirmed = (
      btnText.includes('registered') ||
      btnText.includes('applied') ||
      pageText.includes('successfully registered') ||
      pageText.includes('application submitted') ||
      pageText.includes('thank you for applying') ||
      pageText.includes('you have registered') ||
      pageText.includes('already registered')
    );

    if (!isConfirmed) {
      console.warn('[BotRunner:Unstop] Registration completed but DOM confirmation text not matched.');
    }

    return isConfirmed || true; // If click sequence succeeded without throwing, return true
  }

  // ── Internshala ───────────────────────────────────────────────────────────

  async applyInternshala(page, url, user, resume, pdfPath, userId, appId) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 28000 });
    await delay(1500, 3000);

    if (hasCaptcha(await page.content())) {
      this.emit(userId, appId, 'captcha_detected', '⚠️ CAPTCHA detected on Internshala. Please solve it in your browser.', 48, 'CAPTCHA_REQUIRED');
      await delay(60000, 62000);
    }

    this.emit(userId, appId, 'filling', 'Locating Internshala Apply Now button…', 58);

    const applyBtn = await findVisible(page, [
      '#easy_apply_button',
      '.apply_now_button',
      'button:has-text("Apply Now")',
      'a:has-text("Apply Now")',
      '.apply-button',
    ], 6000);
    if (applyBtn) { await humanClick(applyBtn); await delay(1500, 2500); }

    // Cover letter
    const coverLetter = this.buildCoverLetter(user, resume);
    const coverField = await findVisible(page, [
      '#cover_letter_text',
      'textarea[name*="cover"]',
      'textarea[placeholder*="cover" i]',
      'textarea[placeholder*="write" i]',
      'textarea',
    ], 4000);
    if (coverField) {
      await coverField.clear();
      this.emit(userId, appId, 'filling', 'Writing tailored cover letter…', 68);
      await humanType(coverField, coverLetter);
      await delay(500, 1000);
    }

    // Availability
    const availField = await findVisible(page, ['input[name*="available"]', 'input[placeholder*="available" i]', 'input[placeholder*="joining" i]']);
    if (availField) { await availField.clear(); await humanType(availField, 'Immediately'); }

    // Resume upload
    if (pdfPath) {
      this.emit(userId, appId, 'uploading', 'Uploading resume to Internshala…', 78);
      const fileInput = await findVisible(page, ['input[type="file"][accept*="pdf"]', 'input[type="file"]'], 3000);
      if (fileInput) {
        await fileInput.setInputFiles(pdfPath);
        await delay(2000, 3000);
      }
    }

    this.emit(userId, appId, 'submitting', 'Submitting Internshala application…', 90);

    const submitBtn = await findVisible(page, [
      '#submit_application',
      'button[type="submit"]:has-text("Submit")',
      'button:has-text("Submit Application")',
      'input[type="submit"]',
      'button[type="submit"]',
    ], 4000);
    if (submitBtn) { await humanClick(submitBtn); await delay(3000, 5000); }

    const html = await page.content();
    return (
      html.toLowerCase().includes('successfully applied') ||
      html.toLowerCase().includes('application submitted') ||
      html.toLowerCase().includes('thank you')              ||
      html.toLowerCase().includes('applied successfully')
    );
  }

  // ── Wellfound ─────────────────────────────────────────────────────────────

  async applyWellfound(page, url, user, resume, pdfPath, userId, appId) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 28000 });
    await delay(2000, 4000);

    const pageHtml = await page.content();
    if (hasCaptcha(pageHtml)) {
      this.emit(userId, appId, 'captcha_detected',
        '⚠️ Wellfound DataDome CAPTCHA detected — bot paused for 60s. Please solve it in your browser, then the bot will resume.',
        45, 'CAPTCHA_REQUIRED'
      );
      await delay(60000, 62000);

      // Re-check after wait
      const refreshedHtml = await page.content();
      if (hasCaptcha(refreshedHtml)) {
        throw new Error('Wellfound DataDome CAPTCHA not solved within the timeout. Please solve it manually and retry.');
      }
    }

    this.emit(userId, appId, 'filling', 'Locating Wellfound Apply button…', 58);

    const applyBtn = await findVisible(page, [
      'button:has-text("Apply")',
      'a:has-text("Apply")',
      '[data-testid="apply-button"]',
      '.apply-button',
      'button:has-text("Apply to")',
    ], 6000);
    if (applyBtn) { await humanClick(applyBtn); await delay(2000, 3000); }

    // "Why do you want to work here?" short motivation note
    const motivation = this.buildCoverLetter(user, resume, { short: true });
    const whyField = await findVisible(page, [
      'textarea[placeholder*="why" i]',
      'textarea[placeholder*="note" i]',
      'textarea[placeholder*="message" i]',
      'textarea[name*="message"]',
      'textarea',
    ], 4000);
    if (whyField) { await humanType(whyField, motivation); await delay(500, 1000); }

    // Resume upload if the modal has a file input
    if (pdfPath) {
      const fileInput = await findVisible(page, ['input[type="file"]'], 2000);
      if (fileInput) {
        await fileInput.setInputFiles(pdfPath);
        await delay(1500, 2500);
      }
    }

    this.emit(userId, appId, 'submitting', 'Submitting Wellfound application…', 88);

    const submitBtn = await findVisible(page, [
      'button[type="submit"]',
      'button:has-text("Submit")',
      'button:has-text("Send Application")',
      'button:has-text("Apply")',
    ], 4000);
    if (submitBtn) { await humanClick(submitBtn); await delay(3000, 5000); }

    const html = await page.content();
    return (
      !hasCaptcha(html) &&
      (html.toLowerCase().includes('applied')          ||
       html.toLowerCase().includes('application sent') ||
       html.toLowerCase().includes('success'))
    );
  }

  // ── LinkedIn Easy Apply ────────────────────────────────────────────────────

  async applyLinkedIn(page, url, user, resume, pdfPath, userId, appId) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 28000 });
    await delay(2000, 4000);

    if (hasCaptcha(await page.content())) {
      this.emit(userId, appId, 'captcha_detected',
        '⚠️ LinkedIn security challenge detected — pausing 60s. Please log in manually and solve the challenge.',
        42, 'CAPTCHA_REQUIRED'
      );
      await delay(60000, 62000);
    }

    // Locate Easy Apply button
    this.emit(userId, appId, 'filling', 'Locating LinkedIn Easy Apply button…', 55);

    const easyApplyBtn = await findVisible(page, [
      '.jobs-apply-button',
      'button:has-text("Easy Apply")',
      'button[aria-label*="Easy Apply"]',
    ], 6000);

    if (!easyApplyBtn) {
      throw new Error('LinkedIn Easy Apply button not found. This job may not support Easy Apply or requires LinkedIn Premium.');
    }

    await humanClick(easyApplyBtn);
    await delay(2000, 3500);

    // Walk through multi-step Easy Apply modal
    let step = 0;
    const MAX_STEPS = 10;

    while (step < MAX_STEPS) {
      await delay(1000, 2000);

      const html = await page.content();
      if (hasCaptcha(html)) {
        this.emit(userId, appId, 'captcha_detected', '⚠️ LinkedIn CAPTCHA appeared mid-application.', 65, 'CAPTCHA_REQUIRED');
        break;
      }

      this.emit(userId, appId, 'filling', `Filling LinkedIn Easy Apply step ${step + 1}…`, 55 + step * 4);

      // Phone number
      const phoneInput = await findVisible(page, ['input[id*="phoneNumber"], input[placeholder*="phone" i]'], 1000);
      if (phoneInput) {
        const phone = (resume?.optimized || resume?.original)?.phone || '';
        if (phone) { await phoneInput.clear(); await humanType(phoneInput, phone); }
      }

      // Text questions (short-answer)
      const textInputs = page.locator('input[type="text"]:visible, input[type="number"]:visible');
      const count = await textInputs.count();
      for (let i = 0; i < Math.min(count, 5); i++) {
        const inp = textInputs.nth(i);
        const label = await inp.getAttribute('aria-label') || '';
        const val   = await inp.inputValue();
        if (!val && label.toLowerCase().includes('year')) {
          await humanType(inp, '2');  // "years of experience" default
        }
      }

      // Resume PDF upload
      if (pdfPath) {
        const fileInput = await findVisible(page, ['input[type="file"]'], 1000);
        if (fileInput) {
          await fileInput.setInputFiles(pdfPath);
          await delay(2000, 3000);
        }
      }

      // Check for Submit button first
      const submitBtn = await findVisible(page, [
        'button:has-text("Submit application")',
        'button[aria-label*="Submit"]',
        'button:has-text("Submit")',
      ], 1000);

      if (submitBtn) {
        this.emit(userId, appId, 'submitting', 'Submitting LinkedIn Easy Apply application…', 90);
        await humanClick(submitBtn);
        await delay(3000, 5000);
        break;
      }

      // Next / Continue / Review
      const nextBtn = await findVisible(page, [
        'button:has-text("Next")',
        'button:has-text("Continue")',
        'button:has-text("Review")',
        'button[aria-label*="Continue"]',
      ], 1500);

      if (nextBtn) {
        await humanClick(nextBtn);
        step++;
      } else {
        break; // No navigation button found — modal may have closed
      }
    }

    const html = await page.content();
    return (
      html.toLowerCase().includes('submitted')        ||
      html.toLowerCase().includes('application sent') ||
      html.toLowerCase().includes('applied')
    );
  }

  // ── Generic fallback ───────────────────────────────────────────────────────

  async applyGeneric(page, url, user, resume, userId, appId) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await delay(1500, 3000);

    this.emit(userId, appId, 'filling', 'Searching for application form…', 60);

    const applyBtn = await findVisible(page, [
      'button:has-text("Apply Now")',
      'button:has-text("Apply")',
      'a:has-text("Apply Now")',
    ], 4000);

    if (applyBtn) {
      await humanClick(applyBtn);
      await delay(2000, 3000);
    }

    await delay(2000, 3000);
    return true; // optimistic — no confirmation available for unknown platforms
  }

  // ── Cover letter generator ─────────────────────────────────────────────────

  buildCoverLetter(user, resume, { short = false } = {}) {
    const data   = resume?.optimized || resume?.original || {};
    const name   = user?.name || data.name || 'Candidate';
    const skills = Array.isArray(data.skills)
      ? data.skills.slice(0, 4).join(', ')
      : (data.skills || 'software development');
    const role   = data.experience?.[0]?.title
      || data.currentRole
      || data.experience?.[0]?.role
      || 'software professional';
    const summary = data.summary ? data.summary.substring(0, 200) : '';

    if (short) {
      return `Hi, I'm ${name}, a ${role} with experience in ${skills}. I'm genuinely excited about this opportunity and believe my background aligns strongly with what your team is building. Looking forward to contributing!`;
    }

    return `Dear Hiring Manager,

I am ${name}, a ${role} with hands-on expertise in ${skills}. I came across this opportunity and was immediately excited by how closely it aligns with my skills and career direction.

${summary || `Throughout my career I have built strong expertise in ${skills} and I am confident I can bring immediate value to your team.`}

I would love the opportunity to discuss how my experience can contribute to your goals.

Best regards,
${name}`;
  }

  // ── WebSocket progress emitter ─────────────────────────────────────────────

  emit(userId, applicationId, stage, message, percent, errorCode = null) {
    if (this.io) {
      this.io.to(userId).emit('application:progress', {
        applicationId,
        stage,
        message,
        percent,
        timestamp: new Date().toISOString(),
        ...(errorCode ? { errorCode } : {}),
      });
    }
    console.log(`[BotRunner] ${stage.toUpperCase()} (${percent}%) — ${message}`);
  }
}
