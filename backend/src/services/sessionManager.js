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

const OAUTH_DOMAINS = ['google.com', 'accounts.google', 'appleid.apple', 'facebook.com', 'github.com', 'microsoftonline.com'];

function isAuthOrOAuthUrl(url) {
  if (!url) return true;
  const lower = url.toLowerCase();
  if (OAUTH_DOMAINS.some(d => lower.includes(d))) return true;
  if (lower.includes('/login') || lower.includes('/auth') || lower.includes('/signin') || lower.includes('/sign_in') || lower.includes('/checkpoint') || lower.includes('/signup') || lower.includes('/oauth')) return true;
  return false;
}

// ─── Platform definitions ─────────────────────────────────────────────────────

const PLATFORM_CONFIG = {
  linkedin: {
    loginUrl: 'https://www.linkedin.com/login',
    displayName: 'LinkedIn',
    isLoggedIn: async (context, pages) => {
      try {
        if (pages.length > 1) return false; // Google/OAuth popup window is open
        const page = pages[0];
        if (!page) return false;
        const url = page.url();
        if (isAuthOrOAuthUrl(url)) return false;
        if (!url.includes('linkedin.com')) return false;

        const cookies = await context.cookies('https://www.linkedin.com');
        const liAt = cookies.find(c => c.name === 'li_at' && c.value && c.value.length > 10);
        return !!liAt;
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
    isLoggedIn: async (context, pages) => {
      try {
        if (pages.length > 1) return false;
        const page = pages[0];
        if (!page) return false;
        const url = page.url();
        if (isAuthOrOAuthUrl(url)) return false;
        if (!url.includes('wellfound.com') && !url.includes('angel.co')) return false;

        const cookies = await context.cookies('https://wellfound.com');
        const token = cookies.find(c => (c.name.includes('_wellfound') || c.name.includes('remember_user_token')) && c.value && c.value.length > 5);
        return !!token;
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
    isLoggedIn: async (context, pages) => {
      try {
        if (pages.length > 1) return false;
        const page = pages[0];
        if (!page) return false;
        const url = page.url();
        if (isAuthOrOAuthUrl(url)) return false;
        if (!url.includes('unstop.com')) return false;

        const cookies = await context.cookies('https://unstop.com');
        const token = cookies.find(c => (c.name === 'access_token' || c.name === 'token') && c.value && c.value.length > 20);
        if (token) return true;

        const profileEl = await page.$('.profile-pic, .user_name, a[href*="/user/profile"], .user-profile-image');
        return !!profileEl;
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
    isLoggedIn: async (context, pages) => {
      try {
        if (pages.length > 1) return false;
        const page = pages[0];
        if (!page) return false;
        const url = page.url();
        if (isAuthOrOAuthUrl(url)) return false;
        if (!url.includes('internshala.com')) return false;

        const cookies = await context.cookies('https://internshala.com');
        const phpSess = cookies.find(c => c.name === 'PHPSESSID' && c.value && c.value.length > 5);
        return !!phpSess;
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
    isLoggedIn: async (context, pages) => {
      try {
        if (pages.length > 1) return false;
        const page = pages[0];
        if (!page) return false;
        const url = page.url();
        if (isAuthOrOAuthUrl(url)) return false;
        if (!url.includes('indeed.com')) return false;

        const cookies = await context.cookies('https://indeed.com');
        const ctk = cookies.find(c => (c.name === 'CTK' || c.name.includes('indeed')) && c.value && c.value.length > 5);
        return !!ctk;
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
    isLoggedIn: async (context, pages) => {
      try {
        if (pages.length > 1) return false;
        const page = pages[0];
        if (!page) return false;
        const url = page.url();
        if (isAuthOrOAuthUrl(url)) return false;
        if (!url.includes('glassdoor.com')) return false;

        const cookies = await context.cookies('https://glassdoor.com');
        const sess = cookies.find(c => c.name.includes('SESSION') || c.name.includes('gd'));
        return !!sess;
      } catch { return false; }
    },
    accountExtract: async () => null,
  },

  naukri: {
    loginUrl: 'https://www.naukri.com/nlogin/login',
    displayName: 'Naukri',
    isLoggedIn: async (context, pages) => {
      try {
        if (pages.length > 1) return false;
        const page = pages[0];
        if (!page) return false;
        const url = page.url();
        if (isAuthOrOAuthUrl(url)) return false;
        if (!url.includes('naukri.com')) return false;

        const cookies = await context.cookies('https://naukri.com');
        const naukAt = cookies.find(c => (c.name === 'nauk_at' || c.name.includes('naukri')) && c.value && c.value.length > 5);
        return !!naukAt;
      } catch { return false; }
    },
    accountExtract: async () => null,
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getProfilePath(userId, platform) {
  const safe = `${userId.replace(/[^a-zA-Z0-9_-]/g, '')}_${platform.replace(/[^a-z]/g, '')}`;
  return path.join(PROFILES_ROOT, safe);
}

function emitStatus(io, userId, platform, status, message = '') {
  if (!io) return;
  io.to(userId).emit('session:status', { platform, status, message, ts: Date.now() });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Launch a non-headless browser to the platform login page.
 * Poll until the user completes login (including Google/OAuth popups).
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
    `Opening ${cfg.displayName} login window — log in with Email or Google in the browser.`);

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

    const initialPage = browser.pages()[0] || await browser.newPage();
    await initialPage.goto(cfg.loginUrl, { waitUntil: 'domcontentloaded' }).catch(() => {});

    const deadline = Date.now() + timeout;
    let loggedIn = false;

    while (Date.now() < deadline && !userClosedManually) {
      await new Promise(r => setTimeout(r, 2000));
      if (userClosedManually) break;

      const pages = browser.pages();
      loggedIn = await cfg.isLoggedIn(browser, pages).catch(() => false);

      if (loggedIn) break;

      emitStatus(io, userId, platform, 'waiting', `Waiting for ${cfg.displayName} login (Email or Google OAuth)…`);
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

    const mainPage = browser.pages()[0] || initialPage;
    const accountEmail = await cfg.accountExtract(mainPage).catch(() => null);

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

    const pages = browser.pages();
    const loggedIn = await cfg.isLoggedIn(browser, pages);

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
