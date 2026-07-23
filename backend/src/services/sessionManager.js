/**
 * sessionManager.js
 *
 * Manages Playwright Persistent Browser Contexts for each platform.
 * Users log in once manually in a headed browser window; the full
 * browser profile (cookies, localStorage, IndexedDB) is saved to disk
 * and reused in headless mode for every subsequent auto-apply run.
 *
 * Profile layout:
 *   backend/profiles/{userId}_{platform}/
 *       ↳ Chromium user data directory (managed entirely by Playwright)
 */

import path from 'node:path';
import fs   from 'node:fs/promises';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { prisma } from '../lib/prisma.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROFILES_ROOT = path.join(__dirname, '..', '..', 'profiles');

// ─── Platform definitions ─────────────────────────────────────────────────────

const PLATFORM_CONFIG = {
  linkedin: {
    loginUrl: 'https://www.linkedin.com/login',
    displayName: 'LinkedIn',
    /** Returns true once login is confirmed (URL changes away from /login) */
    isLoggedIn: (url) => !url.includes('/login') && !url.includes('/checkpoint') &&
      (url.includes('/feed') || url.includes('/jobs') || url.includes('/mynetwork') || url.includes('linkedin.com/')),
    /** CSS selector to extract logged-in email/name for display */
    profileSelector: '[data-control-name="identity_profile_photo"]',
    accountExtract: async (page) => {
      try {
        return await page.evaluate(() => {
          const el = document.querySelector('.feed-identity-module__actor-meta .t-R, .profile-nav-item__title');
          return el?.textContent?.trim() || null;
        });
      } catch { return null; }
    },
  },

  wellfound: {
    loginUrl: 'https://wellfound.com/login',
    displayName: 'Wellfound',
    isLoggedIn: (url) => !url.includes('/login') && !url.includes('/users/sign_in') &&
      (url.includes('wellfound.com') || url.includes('angel.co')),
    profileSelector: '[data-test="user-menu"]',
    accountExtract: async (page) => {
      try {
        return await page.evaluate(() => {
          const el = document.querySelector('[data-test="user-menu"], .userinfo__name');
          return el?.textContent?.trim() || null;
        });
      } catch { return null; }
    },
  },

  unstop: {
    loginUrl: 'https://unstop.com',
    displayName: 'Unstop',
    isLoggedIn: (url, page) => true, // validated via DOM check below
    profileSelector: '.profile-pic, .user_name, .user-profile-image',
    accountExtract: async (page) => {
      try {
        return await page.evaluate(() => {
          const el = document.querySelector('.user_name, .user-profile-image, [class*="user_"]');
          return el?.textContent?.trim() || null;
        });
      } catch { return null; }
    },
    loginCheck: async (page) => {
      try {
        const el = await page.$('.eligible-nudge, .profile-pic, [class*="un-navbar"] .user');
        return !!el;
      } catch { return false; }
    },
  },

  internshala: {
    loginUrl: 'https://internshala.com/login/student',
    displayName: 'Internshala',
    isLoggedIn: (url) => !url.includes('/login') && url.includes('internshala.com'),
    profileSelector: '.profile_container, .student-name',
    accountExtract: async (page) => {
      try {
        return await page.evaluate(() => {
          const el = document.querySelector('.profile_container .name, #profile_name, .student-name');
          return el?.textContent?.trim() || null;
        });
      } catch { return null; }
    },
  },

  indeed: {
    loginUrl: 'https://secure.indeed.com/auth',
    displayName: 'Indeed',
    isLoggedIn: (url) => !url.includes('/auth') && !url.includes('/login') && url.includes('indeed.com'),
    profileSelector: '[data-testid="gnav-user-button"]',
    accountExtract: async (page) => {
      try {
        return await page.evaluate(() => {
          const el = document.querySelector('[data-testid="gnav-user-email"]');
          return el?.textContent?.trim() || null;
        });
      } catch { return null; }
    },
  },

  glassdoor: {
    loginUrl: 'https://www.glassdoor.com/profile/login_input.htm',
    displayName: 'Glassdoor',
    isLoggedIn: (url) => !url.includes('/login') && url.includes('glassdoor.com'),
    profileSelector: '[data-test="user-account-menu"]',
    accountExtract: async () => null,
  },

  naukri: {
    loginUrl: 'https://www.naukri.com/nlogin/login',
    displayName: 'Naukri',
    isLoggedIn: (url) => !url.includes('/login') && url.includes('naukri.com'),
    profileSelector: '.nI-gNb-drawer__icon',
    accountExtract: async () => null,
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Return the profile directory path for userId + platform */
export function getProfilePath(userId, platform) {
  // Sanitize so it can't escape the profiles dir
  const safe = `${userId.replace(/[^a-zA-Z0-9_-]/g, '')}_${platform.replace(/[^a-z]/g, '')}`;
  return path.join(PROFILES_ROOT, safe);
}

/** Emit a session status event via Socket.IO if available */
function emitStatus(io, userId, platform, status, message = '') {
  if (!io) return;
  io.to(userId).emit('session:status', { platform, status, message, ts: Date.now() });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Launch a non-headless browser to the platform login page.
 * Poll until the user successfully logs in, then save the persistent profile.
 * Emits `session:status` events via Socket.IO throughout.
 *
 * @param {string}  userId
 * @param {string}  platform   key from PLATFORM_CONFIG
 * @param {object}  io         Socket.IO server instance (optional)
 * @param {number}  timeout    max wait in ms for the user to finish logging in (default: 3 min)
 */
export async function launchLoginSession(userId, platform, io, timeout = 180_000) {
  const cfg = PLATFORM_CONFIG[platform];
  if (!cfg) throw new Error(`Unknown platform: ${platform}`);

  const profilePath = getProfilePath(userId, platform);
  await fs.mkdir(profilePath, { recursive: true });
  await fs.mkdir(PROFILES_ROOT, { recursive: true });

  // Mark as connecting in DB
  await prisma.browserSession.upsert({
    where:  { userId_platform: { userId, platform } },
    create: { userId, platform, profilePath, status: 'connecting' },
    update: { status: 'connecting', profilePath },
  });

  emitStatus(io, userId, platform, 'connecting',
    `Opening ${cfg.displayName} login page — log in manually in the browser window.`);

  let browser = null;
  try {
    browser = await chromium.launchPersistentContext(profilePath, {
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
      ],
      viewport: { width: 1280, height: 800 },
    });

    const page = browser.pages()[0] || await browser.newPage();
    await page.goto(cfg.loginUrl, { waitUntil: 'domcontentloaded' });

    const deadline = Date.now() + timeout;
    let loggedIn = false;

    while (Date.now() < deadline) {
      await page.waitForTimeout(1500);
      const currentUrl = page.url();

      // Check URL-based login detection
      if (cfg.isLoggedIn(currentUrl)) {
        // Some platforms need an extra DOM check
        if (cfg.loginCheck) {
          loggedIn = await cfg.loginCheck(page).catch(() => false);
        } else {
          loggedIn = true;
        }
        if (loggedIn) break;
      }

      emitStatus(io, userId, platform, 'waiting', `Waiting for ${cfg.displayName} login…`);
    }

    if (!loggedIn) {
      await prisma.browserSession.update({
        where: { userId_platform: { userId, platform } },
        data: { status: 'failed' },
      });
      emitStatus(io, userId, platform, 'failed', 'Login timed out. Please try again.');
      return { success: false, reason: 'timeout' };
    }

    // Try to capture account email/name
    const accountEmail = await cfg.accountExtract(page).catch(() => null);

    await prisma.browserSession.update({
      where:  { userId_platform: { userId, platform } },
      data: {
        status:       'connected',
        accountEmail,
        connectedAt:  new Date(),
        lastUsedAt:   new Date(),
        profilePath,
      },
    });

    emitStatus(io, userId, platform, 'connected',
      `${cfg.displayName} connected${accountEmail ? ` as ${accountEmail}` : ''}!`);

    return { success: true, accountEmail };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

/**
 * Open the saved profile in headless mode and verify the user is still logged in.
 * Updates DB status to 'expired' if session has been invalidated.
 */
export async function validateSession(userId, platform, io) {
  const cfg = PLATFORM_CONFIG[platform];
  if (!cfg) return { valid: false };

  const session = await prisma.browserSession.findUnique({
    where: { userId_platform: { userId, platform } },
  });

  if (!session || session.status === 'pending') return { valid: false, reason: 'not_connected' };

  const profilePath = session.profilePath;

  // Check dir still exists
  const dirExists = await fs.access(profilePath).then(() => true).catch(() => false);
  if (!dirExists) {
    await prisma.browserSession.update({
      where: { userId_platform: { userId, platform } },
      data: { status: 'failed' },
    });
    return { valid: false, reason: 'profile_missing' };
  }

  let browser = null;
  try {
    browser = await chromium.launchPersistentContext(profilePath, { headless: true });
    const page = browser.pages()[0] || await browser.newPage();

    await page.goto(cfg.loginUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    let valid = cfg.isLoggedIn(currentUrl);
    if (valid && cfg.loginCheck) {
      valid = await cfg.loginCheck(page).catch(() => false);
    }

    if (!valid) {
      await prisma.browserSession.update({
        where: { userId_platform: { userId, platform } },
        data: { status: 'expired' },
      });
      emitStatus(io, userId, platform, 'expired', `${cfg.displayName} session expired. Please reconnect.`);
      return { valid: false, reason: 'session_expired' };
    }

    await prisma.browserSession.update({
      where: { userId_platform: { userId, platform } },
      data: { status: 'connected', lastUsedAt: new Date() },
    });

    return { valid: true };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

/**
 * Delete the persisted browser profile and remove the DB record.
 */
export async function deleteSession(userId, platform) {
  const session = await prisma.browserSession.findUnique({
    where: { userId_platform: { userId, platform } },
  });

  if (session?.profilePath) {
    await fs.rm(session.profilePath, { recursive: true, force: true }).catch(() => {});
  }

  await prisma.browserSession.deleteMany({
    where: { userId, platform },
  });
}

/**
 * Return all browser sessions for a user.
 */
export async function getSessions(userId) {
  return prisma.browserSession.findMany({
    where: { userId },
    orderBy: { platform: 'asc' },
  });
}

/**
 * Get all supported platforms with their display info.
 */
export function getSupportedPlatforms() {
  return Object.entries(PLATFORM_CONFIG).map(([key, cfg]) => ({
    key,
    displayName: cfg.displayName,
  }));
}

export { PLATFORM_CONFIG };
