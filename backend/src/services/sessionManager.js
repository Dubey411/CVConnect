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

        const profileEl = await page.$('[data-test="user-menu"], .userinfo__name, [aria-label*="Profile"], [aria-label*="user menu"], a[href*="/jobs"]');
        if (profileEl) return true;

        const cookies = await context.cookies();
        const token = cookies.find(c => (c.domain.includes('wellfound') || c.domain.includes('angel')) && (
          c.name.includes('_wellfound') || c.name.includes('remember_user_token') || c.name.includes('session') || c.name === '_al_session'
        ) && c.value && c.value.length > 5);
        if (token) return true;

        if ((url.includes('/jobs') || url.includes('/overview') || url.includes('/dashboard')) && !url.includes('login')) {
          return true;
        }

        return false;
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
        const page = pages.find(p => p.url().includes('unstop.com')) || pages[0];
        if (!page) return false;
        const url = page.url();
        if (isAuthOrOAuthUrl(url)) return false;

        // Check if "Session expired" banner or Login button is visible
        const isExpiredOrLoggedOut = await page.evaluate(() => {
          const body = document.body ? document.body.innerText : '';
          const hasExpiredText = body.includes('Session expired') || body.includes('Please login again');
          const loginBtn = document.querySelector('header a[href*="login"], header button:has-text("Login"), a.login-btn');
          return hasExpiredText || Boolean(loginBtn);
        }).catch(() => false);

        if (isExpiredOrLoggedOut) return false;

        // Check for logged-in DOM elements (profile picture, user name, logout button)
        const loggedInEl = await page.locator('.profile-pic, .user_name, button:has-text("Logout"), a[href*="/user/profile"], header .user-profile').count().catch(() => 0);
        if (loggedInEl > 0) return true;

        // Check if Unstop API confirms token is active and valid
        const apiValid = await page.evaluate(async () => {
          try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token') || localStorage.getItem('jwt');
            if (!token) return false;
            const res = await fetch('https://unstop.com/api/v1/user/profile', {
              headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
            }).then(r => r.json()).catch(() => null);
            return Boolean(res?.data?.user || res?.user || res?.data?.id || res?.id);
          } catch { return false; }
        }).catch(() => false);

        return apiValid;
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
        if (url.includes('/auth') || url.includes('/login') || url.includes('/account/') || isAuthOrOAuthUrl(url)) return false;
        if (!url.includes('indeed.com')) return false;

        const userMenu = await page.$('[data-gnav-element-name="user-menu"], [data-testid="gnav-user-button"], .gnav-UserMenu-button, a[href*="/account/myjobs"], a[aria-label*="Profile"]');
        if (userMenu) return true;

        const cookies = await context.cookies('https://indeed.com');
        const hasUserSession = cookies.some(c => (c.name === 'sock' || c.name === 'PPID' || c.name === 'SURF') && c.value && c.value.length > 5);
        return hasUserSession;
      } catch { return false; }
    },
    accountExtract: async (page) => {
      try {
        return await page.evaluate(() => {
          const el = document.querySelector('[data-testid="gnav-user-email"], [data-gnav-element-name="user-email"]');
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
        if (url.includes('login_input') || url.includes('/login') || url.includes('/signup') || isAuthOrOAuthUrl(url)) return false;
        if (!url.includes('glassdoor.')) return false;

        const profileEl = await page.$('[data-test="user-account-menu"], [data-test="user-avatar"], [data-test="profile-dropdown"], #siteHeaderUserMenu, [class*="HeaderUserMenu"], button[aria-label*="Profile"], a[href*="/member/"], a[href*="/myJobs"]');
        if (profileEl) return true;

        const cookies = await context.cookies();
        const sess = cookies.find(c => c.domain.includes('glassdoor') && (
          c.name === 'gdId' || c.name === 'AT' || c.name === 'GSESSIONID' || c.name === 'as_member' || c.name === 'JSESSIONID' || c.name === 'bs' || c.name === 'goc'
        ) && c.value && c.value.length > 3);
        if (sess) return true;

        if ((url.includes('/member/') || url.includes('/Job/') || url.includes('/Overview/') || url.endsWith('glassdoor.com/') || url.endsWith('glassdoor.co.in/')) && !url.includes('login')) {
          return true;
        }

        return false;
      } catch { return false; }
    },
    accountExtract: async (page) => {
      try {
        return await page.evaluate(() => {
          const el = document.querySelector('[data-test="user-avatar"], [data-test="user-name"], [class*="UserMenu"]');
          return el?.textContent?.trim() || null;
        });
      } catch { return null; }
    },
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
        if (url.includes('/nlogin') || url.includes('/login') || url.includes('/registration') || isAuthOrOAuthUrl(url)) return false;
        if (!url.includes('naukri.com')) return false;

        const profileEl = await page.$('.nI-gNb-drawer__icon, .nI-gNb-user-name, [class*="profile-drawer"], a[href*="/mnjuser/profile"]');
        if (profileEl) return true;

        const cookies = await context.cookies('https://www.naukri.com');
        const naukAt = cookies.find(c => (c.name === 'nauk_at' || c.name === 'nauk_user') && c.value && c.value.length > 15);
        return !!naukAt;
      } catch { return false; }
    },
    accountExtract: async (page) => {
      try {
        return await page.evaluate(() => {
          const el = document.querySelector('.nI-gNb-user-name, [class*="user-name"]');
          return el?.textContent?.trim() || null;
        });
      } catch { return null; }
    },
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
export async function launchLoginSession(userId, platform, io, timeout = 1_800_000) {
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
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
      ignoreHTTPSErrors: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
        '--disable-dev-shm-usage',
        '--no-first-run',
        '--use-fake-ui-for-media-stream',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
    });

    await browser.addInitScript(() => {
      try {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
        window.chrome = { runtime: {}, loadTimes: function() {}, csi: function() {}, app: {} };
      } catch {}
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
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
        '--disable-dev-shm-usage',
        '--no-first-run',
      ],
    });

    await browser.addInitScript(() => {
      try {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
        window.chrome = { runtime: {}, loadTimes: function() {}, csi: function() {}, app: {} };
      } catch {}
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
