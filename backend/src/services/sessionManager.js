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
    isLoggedIn: async (page, url) => {
      try {
        if (url.includes('/login') || url.includes('/checkpoint') || url.includes('/signup')) return false;
        const cookies = await page.context().cookies('https://www.linkedin.com');
        const hasCookie = cookies.some(c => c.name === 'li_at' && c.value && c.value.length > 10);
        if (hasCookie) return true;
        const profileEl = await page.$('.feed-identity-module, [data-control-name="identity_profile_photo"], #global-nav');
        return !!profileEl;
      } catch { return false; }
    },
    accountExtract: async (page) => {
      try {
        return await page.evaluate(() => {
          const el = document.querySelector('.feed-identity-module__actor-meta .t-R, .profile-nav-item__title, .nav-settings__member-name');
          return el?.textContent?.trim() || null;
        });
      } catch { return null; }
    },
  },

  wellfound: {
    loginUrl: 'https://wellfound.com/login',
    displayName: 'Wellfound',
    isLoggedIn: async (page, url) => {
      try {
        if (url.includes('/login') || url.includes('/sign_in')) return false;
        const cookies = await page.context().cookies('https://wellfound.com');
        const hasCookie = cookies.some(c => (c.name.includes('_wellfound') || c.name.includes('remember_user_token')) && c.value && c.value.length > 5);
        if (hasCookie) return true;
        const profileEl = await page.$('[data-test="user-menu"], .userinfo__name');
        return !!profileEl;
      } catch { return false; }
    },
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
    loginUrl: 'https://unstop.com/auth/login',
    displayName: 'Unstop',
    isLoggedIn: async (page, url) => {
      try {
        if (url.includes('/auth/login') || url.includes('/login')) return false;
        const cookies = await page.context().cookies('https://unstop.com');
        const hasToken = cookies.some(c => (c.name === 'access_token' || c.name.includes('token') || c.name.includes('session')) && c.value && c.value.length > 20);
        if (hasToken) return true;
        const el = await page.$('.profile-pic, [class*="user-profile"], .user_name, a[href*="/user/profile"], .user-profile-image');
        return !!el;
      } catch { return false; }
    },
    accountExtract: async (page) => {
      try {
        return await page.evaluate(() => {
          const el = document.querySelector('.user_name, .user-profile-image, [class*="user_"], .user-name');
          return el?.textContent?.trim() || null;
        });
      } catch { return null; }
    },
  },

  internshala: {
    loginUrl: 'https://internshala.com/login/student',
    displayName: 'Internshala',
    isLoggedIn: async (page, url) => {
      try {
        if (url.includes('/login')) return false;
        const cookies = await page.context().cookies('https://internshala.com');
        const hasCookie = cookies.some(c => (c.name === 'PHPSESSID' || c.name.includes('student')) && c.value && c.value.length > 5);
        if (hasCookie) return true;
        const el = await page.$('.profile_container, .student-name, #profile_name');
        return !!el;
      } catch { return false; }
    },
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
    isLoggedIn: async (page, url) => {
      try {
        if (url.includes('/auth') || url.includes('/login')) return false;
        const cookies = await page.context().cookies('https://indeed.com');
        return cookies.some(c => (c.name === 'CTK' || c.name.includes('indeed')) && c.value && c.value.length > 5);
      } catch { return false; }
    },
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
    isLoggedIn: async (page, url) => {
      try {
        if (url.includes('/login')) return false;
        const cookies = await page.context().cookies('https://glassdoor.com');
        return cookies.some(c => c.name.includes('SESSION') || c.name.includes('gd'));
      } catch { return false; }
    },
    accountExtract: async () => null,
  },

  naukri: {
    loginUrl: 'https://www.naukri.com/nlogin/login',
    displayName: 'Naukri',
    isLoggedIn: async (page, url) => {
      try {
        if (url.includes('/login')) return false;
        const cookies = await page.context().cookies('https://naukri.com');
        return cookies.some(c => (c.name === 'nauk_at' || c.name.includes('naukri')) && c.value && c.value.length > 5);
      } catch { return false; }
    },
    accountExtract: async () => null,
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Return the profile directory path for userId + platform */
export function getProfilePath(userId, platform) {
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
 *
 * @param {string}  userId
 * @param {string}  platform   key from PLATFORM_CONFIG
 * @param {object}  io         Socket.IO server instance (optional)
 * @param {number}  timeout    max wait in ms (default: 10 minutes = 600,000 ms)
 */
export async function launchLoginSession(userId, platform, io, timeout = 600_000) {
  const cfg = PLATFORM_CONFIG[platform];
  if (!cfg) throw new Error(`Unknown platform: ${platform}`);

  const profilePath = getProfilePath(userId, platform);
  await fs.mkdir(profilePath, { recursive: true });
  await fs.mkdir(PROFILES_ROOT, { recursive: true });

  await prisma.browserSession.upsert({
    where:  { userId_platform: { userId, platform } },
    create: { userId, platform, profilePath, status: 'connecting' },
    update: { status: 'connecting', profilePath },
  });

  emitStatus(io, userId, platform, 'connecting',
    `Opening ${cfg.displayName} login window — log in manually in the browser.`);

  let browser = null;
  let userClosedManually = false;

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

    browser.on('close', () => { userClosedManually = true; });

    const page = browser.pages()[0] || await browser.newPage();
    await page.goto(cfg.loginUrl, { waitUntil: 'domcontentloaded' }).catch(() => {});

    const deadline = Date.now() + timeout;
    let loggedIn = false;

    while (Date.now() < deadline && !userClosedManually) {
      await new Promise(r => setTimeout(r, 2000));
      if (userClosedManually) break;

      const currentUrl = page.url();
      loggedIn = await cfg.isLoggedIn(page, currentUrl).catch(() => false);

      if (loggedIn) break;

      emitStatus(io, userId, platform, 'waiting', `Waiting for you to log in to ${cfg.displayName}…`);
    }

    if (!loggedIn) {
      await prisma.browserSession.update({
        where: { userId_platform: { userId, platform } },
        data: { status: userClosedManually ? 'pending' : 'failed' },
      });
      emitStatus(io, userId, platform, userClosedManually ? 'pending' : 'failed',
        userClosedManually ? 'Browser closed.' : 'Login timed out. Please try again.');
      return { success: false, reason: userClosedManually ? 'user_closed' : 'timeout' };
    }

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
      `${cfg.displayName} connected successfully${accountEmail ? ` as ${accountEmail}` : ''}!`);

    // Give a 2 second grace period before closing context so cookies flush cleanly
    await new Promise(r => setTimeout(r, 2000));

    return { success: true, accountEmail };
  } catch (err) {
    console.error(`[sessionManager] Error in launchLoginSession for ${platform}:`, err.message);
    await prisma.browserSession.update({
      where: { userId_platform: { userId, platform } },
      data: { status: 'failed' },
    }).catch(() => {});
    emitStatus(io, userId, platform, 'failed', err.message);
    return { success: false, reason: err.message };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

/**
 * Open the saved profile in headless mode and verify the user is still logged in.
 */
export async function validateSession(userId, platform, io) {
  const cfg = PLATFORM_CONFIG[platform];
  if (!cfg) return { valid: false, reason: 'Unknown platform' };

  const session = await prisma.browserSession.findUnique({
    where: { userId_platform: { userId, platform } },
  });

  if (!session || session.status !== 'connected') {
    return { valid: false, reason: 'No active session' };
  }

  let browser = null;
  try {
    browser = await chromium.launchPersistentContext(session.profilePath, {
      headless: true,
      args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
    });

    const page = browser.pages()[0] || await browser.newPage();
    await page.goto(cfg.loginUrl, { waitUntil: 'domcontentloaded' });

    const loggedIn = await cfg.isLoggedIn(page, page.url());

    if (!loggedIn) {
      await prisma.browserSession.update({
        where: { id: session.id },
        data:  { status: 'expired' },
      });
      emitStatus(io, userId, platform, 'expired', 'Session expired. Please reconnect.');
      return { valid: false, reason: 'Session expired' };
    }

    await prisma.browserSession.update({
      where: { id: session.id },
      data:  { lastUsedAt: new Date() },
    });

    return { valid: true };
  } catch (err) {
    return { valid: false, reason: err.message };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

/**
 * Disconnect a browser session: delete profile files from disk + update DB.
 */
export async function deleteSession(userId, platform) {
  const profilePath = getProfilePath(userId, platform);
  await fs.rm(profilePath, { recursive: true, force: true }).catch(() => {});
  await prisma.browserSession.deleteMany({
    where: { userId, platform },
  }).catch(() => {});
}

/**
 * Return all browser sessions for a user.
 */
export async function getSessions(userId) {
  return prisma.browserSession.findMany({
    where: { userId },
    select: {
      platform:     true,
      status:       true,
      accountEmail: true,
      connectedAt:  true,
      lastUsedAt:   true,
    },
  });
}

/** List supported platform keys */
export function getSupportedPlatforms() {
  return Object.keys(PLATFORM_CONFIG);
}
