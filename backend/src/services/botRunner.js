import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import { prisma } from '../lib/prisma.js';
import { decryptToken } from '../lib/vault.js';
import { generateResumePdf } from '../lib/resumePdf.js';
import { getProfilePath } from './sessionManager.js';
import { extractOpportunityId, registerUnstopViaApi } from './unstopApi.js';
import { fillUnstopForm, verifyUnstopRegistration } from './aiFormFiller.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCRATCH_DIR = path.join(__dirname, '..', '..', '..', 'scratch');

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

/** Dismiss cookie banners, promo popups, and floating overlays that block clicks */
async function dismissOverlays(page) {
  if (!page) return;
  try {
    await page.evaluate(() => {
      // 1. Click accept cookie & close promo popup buttons if present
      const selectors = [
        '.GTM_ACCEPT_COOKIE',
        'button.GTM_ACCEPT_COOKIE',
        '#onetrust-accept-btn-handler',
        '.cookie-banner button',
        '#close_popup',
        '.ic-24-cross',
        '.modal-backdrop',
        '#app_download_modal .close',
        '.close_popup',
        'button.close',
        '[aria-label="Close"]',
      ];
      for (const sel of selectors) {
        const btns = document.querySelectorAll(sel);
        btns.forEach(b => { if (b && b.offsetWidth > 0) b.click(); });
      }

      // 2. Hide fixed cookie banners / notifications / backdrop overlays that obscure pointer events
      const banners = document.querySelectorAll('app-notification, .cookie-banner, .cookie-consent, #onetrust-banner-sdk, .modal-backdrop');
      banners.forEach(b => {
        b.style.display = 'none';
        b.style.pointerEvents = 'none';
      });
    }).catch(() => {});
  } catch (_) {}
}

/** Robust human-like click with cookie overlay dismissal and force fallback */
async function humanClick(locator) {
  await delay(120, 350);
  try {
    await locator.scrollIntoViewIfNeeded().catch(() => {});
    await locator.click({ timeout: 4000 });
  } catch (err) {
    if (err.message.includes('intercepts pointer events') || err.message.includes('Timeout') || err.message.includes('not visible')) {
      console.warn('[BotRunner:humanClick] Click obscured by overlay. Dismissing overlays & force-clicking element…');
      try {
        const page = locator.page ? locator.page() : null;
        if (page) await dismissOverlays(page);
      } catch (_) {}

      await locator.click({ force: true }).catch(async () => {
        await locator.evaluate(el => el.click()).catch(() => {});
      });
    } else {
      throw err;
    }
  }
  await delay(200, 500);
}

/** Detect CAPTCHA / bot-challenge pages */
function hasCaptcha(html) {
  if (!html) return false;
  const h = html.toLowerCase();
  // Avoid false positives on static <script src="...recaptcha..."> tags and hidden form fields
  return (
    h.includes('geo.captcha-delivery.com') ||
    h.includes('datadome')                 ||
    h.includes('cf-challenge')             ||
    h.includes('i am not a robot')         ||
    h.includes('verify you are human')     ||
    h.includes('press and hold')           ||
    h.includes('unusual traffic from your computer network')
  );
}

/** Check if an active visible CAPTCHA challenge box is blocking the page */
async function isCaptchaChallengeActive(page) {
  if (!page) return false;
  try {
    const html = (await page.content().catch(() => '')).toLowerCase();
    if (hasCaptcha(html)) return true;

    // Check for visible reCAPTCHA / hCaptcha iframe challenge box on screen
    const activeIframe = await page.locator(
      'iframe[src*="recaptcha/api2/bframe" i], iframe[src*="hcaptcha.com/captcha" i], iframe[title*="recaptcha challenge" i], .g-recaptcha-bubble-arrow'
    ).first().isVisible({ timeout: 500 }).catch(() => false);

    return activeIframe;
  } catch {
    return false;
  }
}

/** Try multiple CSS selectors and return first visible match */
async function findVisible(page, selectors, timeout = 2500) {
  for (const sel of selectors) {
    const el = page.locator(sel).first();
    if (await el.isVisible({ timeout }).catch(() => false)) return el;
  }
  return null;
}

// ─── Gap 1+7: Check if persistent profile dir exists ────────────────────────
async function persistentProfileExists(userId, platform) {
  try {
    const profilePath = getProfilePath(userId, platform);
    const stat = await fs.stat(profilePath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

// ─── Gap 2: Extract real skills from resume/user data ────────────────────────
function extractSkills(user, resume) {
  const resumeData = resume?.optimized || resume?.original || {};
  const resumeSkills = Array.isArray(resumeData.skills)
    ? resumeData.skills
    : typeof resumeData.skills === 'string'
      ? resumeData.skills.split(',').map(s => s.trim()).filter(Boolean)
      : [];
  const userSkills = Array.isArray(user?.skills)
    ? user.skills
    : typeof user?.skills === 'string'
      ? user.skills.split(',').map(s => s.trim()).filter(Boolean)
      : [];
  const combined = [...new Set([...resumeSkills, ...userSkills])].filter(Boolean);
  return combined.length > 0
    ? combined
    : ['Full Stack Development', 'React.js', 'Node.js', 'JavaScript'];
}


// ─── DOM-based login status check ─────────────────────────────────────────────
/**
 * After navigating to the target URL, inspect the live DOM to determine whether
 * the user is genuinely logged in — not just whether the backend thinks so.
 *
 * Returns { isLoggedIn, loginButtonFound, indicator }
 */
async function checkDomLoginStatus(page, platform) {
  const result = { isLoggedIn: false, loginButtonFound: false, indicator: '' };

  // Selectors that confirm the user IS logged in (profile/avatar/user-menu visible in header/nav)
  const LOGGED_IN = {
    unstop:      [
      '[class*="user-profile"]', '[class*="user_name"]',
      '.profile-pic', 'header img[class*="avatar"]',
      'header a[href*="/user/"]', 'header a[href*="/profile"]',
      'button:has-text("Logout")', '.user-details',
    ],
    internshala: ['header [class*="profile"]', 'header a[href*="/student/"]', '.profile-pic-wrapper', '#nav-dropdown-user-menu', '.student-menu'],
    linkedin:    ['.global-nav__me', '.nav__avatar', '[data-control-name="identity_welcome_message"]'],
    wellfound:   ['[data-test="user-menu"]', '.userinfo__name'],
    glassdoor:   ['[data-test="user-avatar"]', '[data-test="user-account-menu"]'],
    naukri:      ['.nI-gNb-drawer__icon', '.nI-gNb-user-name'],
    indeed:      ['[data-testid="gnav-user-button"]', '[data-gnav-element-name="user-menu"]'],
  };

  // Selectors that confirm the user is NOT logged in (login/signup button visible in header/nav)
  const LOGGED_OUT = {
    unstop:      [
      'header a:has-text("Login")', 'header button:has-text("Login")',
      '.top-header a:has-text("Login")', '.top-header button:has-text("Login")',
      'button:has-text("Continue with Google")', 'a:has-text("Sign Up")',
      'a[href*="/auth/login"]', 'button:has-text("Sign In")',
    ],
    internshala: ['header a:has-text("Login")', 'a:has-text("Login / Register")', 'button:has-text("Login / Register")', 'a#log_in_link', '.login-btn'],
    linkedin:    ['.nav__button-secondary', 'a[href*="/login"]'],
    wellfound:   ['a[href="/login"]', 'a:has-text("Sign In")'],
    glassdoor:   ['a[href*="login_input"]', 'button:has-text("Sign In")'],
    naukri:      ['a[href*="/nlogin"]', '#login_Layer'],
    indeed:      ['a[href*="/account/login"]', 'button:has-text("Sign in")'],
  };

  const inSelectors  = LOGGED_IN[platform]  || LOGGED_IN.unstop;
  const outSelectors = LOGGED_OUT[platform] || LOGGED_OUT.unstop;

  try {
    // 1. Positive check FIRST — is a "logged in" profile element visible?
    for (const sel of inSelectors) {
      const visible = await page.locator(sel).first().isVisible({ timeout: 2000 }).catch(() => false);
      if (visible) {
        result.isLoggedIn = true;
        result.indicator = `logged-in element: ${sel}`;
        console.log(`  ✅ [DOM-Login] Logged in confirmed via: ${sel}`);
        return result;
      }
    }

    // 2. Internshala session cookie check (handles SSR HTML with client-side JS header swap)
    if (platform === 'internshala') {
      await delay(1500, 2000);
      const cookies = await page.context().cookies().catch(() => []);
      const hasAuthCookie = cookies.some(c => (c.name === 'is_logged_in' && c.value !== 'false') || c.name === 'u');
      if (hasAuthCookie) {
        result.isLoggedIn = true;
        result.indicator = 'Internshala session cookie confirmed';
        console.log('  ✅ [DOM-Login] Internshala session confirmed via active cookies.');
        return result;
      }
    }

    // 3. Negative check — is a "Login / Register" header button visible?
    for (const sel of outSelectors) {
      const visible = await page.locator(sel).first().isVisible({ timeout: 1500 }).catch(() => false);
      if (visible) {
        result.loginButtonFound = true;
        result.isLoggedIn = false;
        result.indicator = `login button found: ${sel}`;
        console.warn(`  ❌ [DOM-Login] Login button visible in header (NOT logged in) via: ${sel}`);
        return result;
      }
    }

    // 3. Body-text fallback (handles pages where DOM structure differs)
    const bodyText = (await page.locator('body').innerText({ timeout: 3000 }).catch(() => '')).toLowerCase();
    const loggedInKw  = ['logout', 'sign out', 'my account', 'my profile', 'dashboard'];
    const loggedOutKw = ['sign in to', 'login to', 'create an account', 'continue with google'];

    if (loggedInKw.some(kw => bodyText.includes(kw))) {
      result.isLoggedIn = true;
      result.indicator = 'body text: logged-in keyword';
    } else if (loggedOutKw.some(kw => bodyText.includes(kw))) {
      result.loginButtonFound = true;
      result.indicator = 'body text: login keyword';
    } else {
      // Truly ambiguous — be optimistic and don't block the run
      result.isLoggedIn = true;
      result.indicator = 'ambiguous DOM — assumed logged in';
      console.log('  ℹ️ [DOM-Login] Could not determine login state from DOM — assuming logged in.');
    }
  } catch (err) {
    // If the check itself errors, don't crash the whole bot
    result.isLoggedIn = true;
    result.indicator = `check error: ${err.message}`;
    console.warn(`  ⚠️ [DOM-Login] Check threw error (assuming logged in): ${err.message}`);
  }

  return result;
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
    let context;   // declared here so finally{} can always close it

    try {
      // 1. Load all required data
      const [application, user] = await Promise.all([
        prisma.jobApplication.findUnique({ where: { id: applicationId }, include: { job: true } }),
        prisma.user.findUnique({ where: { id: userId } }),
      ]);

      let resume = null;
      if (resumeId) {
        resume = await prisma.resume.findUnique({ where: { id: resumeId } });
      }
      if (!resume && jobId) {
        resume = await prisma.resume.findFirst({
          where: { userId, jobId },
          orderBy: { updatedAt: 'desc' }
        });
      }
      if (!resume) {
        const rule = await prisma.automationRule.findUnique({ where: { userId_platform: { userId, platform } } });
        if (rule?.resumeId) {
          resume = await prisma.resume.findUnique({ where: { id: rule.resumeId } });
        }
        if (!resume) {
          resume = await prisma.resume.findFirst({ where: { userId }, orderBy: { updatedAt: 'desc' } });
        }
      }

      const destination = targetUrl || application?.job?.description?.match(/https?:\/\/[^\s]+/)?.[0];
      if (!destination) throw new Error('No target URL provided. Add a job URL before triggering auto-apply.');

      this.emit(userId, applicationId, 'init', `Initializing stealth bot for ${platform}…`, 10);

      // ── Gap 8: Resume missing warning ───────────────────────────────────────
      const resumeData = resume?.optimized || resume?.original;
      if (!resumeData) {
        this.emit(userId, applicationId, 'warning',
          '⚠️ No resume found in your profile. The bot will apply without uploading a resume. Add a resume in your Profile tab for best results.',
          15
        );
        console.warn(`[BotRunner:${platform}] No resume data found for user ${userId}.`);
      }

      // 2. Generate resume PDF
      if (resumeData) {
        this.emit(userId, applicationId, 'generating_pdf', 'Generating optimized resume PDF…', 20);
        pdfPath = await generateResumePdf(resumeData).catch(err => {
          console.warn('[BotRunner] PDF gen failed (non-fatal):', err.message);
          return null;
        });
      }

      // 3. Update status → applying
      await prisma.jobApplication.update({ where: { id: applicationId }, data: { status: 'applying' } });

      // ── Gap 1: Auto-use persistent profile if it exists ──────────────────────
      // No need for caller to pass useBrowserSession=true — we auto-detect.
      const hasProfile = await persistentProfileExists(userId, platform);
      const shouldUsePersistent = useBrowserSession || hasProfile;

      // 4. Launch browser — persistent profile (preferred) or fresh + cookie injection
      if (shouldUsePersistent) {
        // ── Gap 7: Pre-check session status ────────────────────────────────────
        const session = await prisma.browserSession.findUnique({
          where: { userId_platform: { userId, platform } }
        }).catch(() => null);
        if (session?.status === 'expired') {
          throw new Error(
            `Your ${platform} session has expired. Please go to Platforms → ${platform} → Reconnect and log in again.`
          );
        }

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
          throw new Error(`${platform} is not connected. Please go to Platforms tab → Connect.`);
        }

        // ── Gap 7: Token expiry pre-check ────────────────────────────────────
        if (connection.tokenExpiresAt && new Date(connection.tokenExpiresAt) < new Date()) {
          await prisma.platformConnection.update({ where: { id: connection.id }, data: { status: 'expired' } });
          throw new Error(
            `Your ${platform} session expired on ${new Date(connection.tokenExpiresAt).toLocaleDateString('en-IN')}. ` +
            'Please go to Platforms tab and reconnect.'
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

      // Block tracking & ads only (do NOT block images/fonts needed for UI layout)
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

      // 7.5 Always capture a proof screenshot after application run for manual testing
      const proofFileName = `proof_${platform}_${Date.now()}.png`;
      const proofPath = path.join(SCRATCH_DIR, proofFileName);
      try {
        await page.screenshot({ path: proofPath, fullPage: false }).catch(() => {});
        console.log(`  📸 [BotRunner:Proof] Saved manual testing proof screenshot: scratch/${proofFileName}`);
      } catch (_) {}

      // 8. Persist result
      if (success) {
        const updates = [
          prisma.jobApplication.update({
            where: { id: applicationId },
            data: { status: 'submitted', submittedAt: new Date() },
          }),
        ];
        if (!shouldUsePersistent) {
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
        this.emit(userId, applicationId, 'complete', `Application submitted on ${platform}! Proof: scratch/${proofFileName}`, 100);
      } else {
        await prisma.jobApplication.update({ where: { id: applicationId }, data: { status: 'failed', errorDetails: `Submission failed. Proof: scratch/${proofFileName}` } });
        this.emit(userId, applicationId, 'failed', `Bot completed but submission could not be confirmed. Proof: scratch/${proofFileName}`, 0);
      }

      return { success, proofPath };
    } catch (err) {
      console.error(`[BotRunner:${platform}]`, err.message);
      await prisma.jobApplication.update({
        where: { id: applicationId },
        data: { status: 'failed', errorDetails: err.message },
      }).catch(() => {});
      this.emit(userId, applicationId, 'failed', `Auto-apply failed: ${err.message}`, 0, err.message);
      throw err;
    } finally {
      if (context) await context.close().catch(() => {});
      if (browser) await browser.close().catch(() => {});
      if (pdfPath) await fs.unlink(pdfPath).catch(() => {});
    }
  }

  // ── Unstop ────────────────────────────────────────────────────────────────

  async applyUnstop(page, url, user, resume, pdfPath, userId, appId) {
    console.log('\n================================================================');
    console.log(`🚀 [BOT-RUNNER] UNSTOP AUTO-APPLY TRACE`);
    console.log(`   User Email: ${user?.email || 'N/A'}`);
    console.log(`   Target URL: ${url}`);
    console.log('================================================================\n');

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 28000 });
    await delay(1500, 3000);
    await dismissOverlays(page);

    // ── DOM-based login check: inspect real page DOM, not just backend state ──
    console.log('  🔍 [BotRunner:Unstop] Verifying login status from live page DOM…');
    this.emit(userId, appId, 'authenticating', 'Checking login state from live page…', 45);
    const loginStatus = await checkDomLoginStatus(page, 'unstop');

    console.log(`  -> DOM Login Check: isLoggedIn=${loginStatus.isLoggedIn} | loginBtnFound=${loginStatus.loginButtonFound}`);

    if (!loginStatus.isLoggedIn) {
      const msg = 'Unstop is showing a Login button — your session has expired or was never connected. '
                + 'Please go to Platforms → Unstop → Reconnect and log in again.';
      console.error('[BotRunner:Unstop] ❌ NOT logged in (DOM check failed).');
      this.emit(userId, appId, 'session_expired',
        '⚠️ Not logged into Unstop — please Reconnect your Unstop account in Platforms tab.', 0, 'SESSION_EXPIRED'
      );
      throw new Error(msg);
    }
    console.log('  ✅ [BotRunner:Unstop] Login verified from page DOM.');

    let applyBtn = null;

    // CAPTCHA check
    if (await isCaptchaChallengeActive(page)) {
      this.emit(userId, appId, 'captcha_detected', '⚠️ Active CAPTCHA challenge detected on Unstop — please solve it in your browser within 60s.', 50, 'CAPTCHA_REQUIRED');
      await delay(60000, 62000);
    }

    this.emit(userId, appId, 'filling', 'Locating Unstop Apply button…', 58);

    // Attempt Direct API Engine first (instant background payload)
    const oppId = extractOpportunityId(url);
    if (oppId) {
      this.emit(userId, appId, 'filling', `Executing Direct API Auto-Apply payload for opportunity #${oppId}…`, 65);
      const apiRes = await registerUnstopViaApi({ userId, opportunityId: oppId, targetUrl: url, user, resume, pdfPath, existingPage: page }).catch(err => {
        console.warn('[BotRunner:Unstop] Direct API engine fallback:', err.message);
        return null;
      });

      if (apiRes?.success) {
        this.emit(userId, appId, 'submitting', 'Direct API registration payload accepted by Unstop! 🎉', 92);
        await delay(2000, 3000);
        return true;
      }
    }

    // Step 1: Click Quick Apply / Register button if on job listing page
    if (!page.url().toLowerCase().includes('/register')) {
      console.log('  🔍 [BotRunner:Unstop] Locating Quick Apply / Register button on listing page...');
      applyBtn = await findVisible(page, [
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
        'a[href*="/register"]',
      ], 8000);

      if (applyBtn) {
        console.log('  🖱️ [BotRunner:Unstop] Quick Apply button found! Executing click...');
        await humanClick(applyBtn);
        await delay(3000, 5000);
      } else {
        console.warn('  ⚠️ [BotRunner:Unstop] Quick Apply button not found on listing page.');
      }
    }

    // ── Gap 2: Real skills from resume/user profile ──────────────────────────
    const skills = extractSkills(user, resume);

    const formData = {
      resumePath: pdfPath,
      location: user?.location || 'Mumbai, Maharashtra, India',
      skills,
      resumeData: resume?.optimized || resume?.original || {},
      userDetails: {
        name:    user?.name    || 'Candidate',
        email:   user?.email   || '',
        phone:   user?.phone   || '',
        gender:  user?.gender  || 'Male',
        college: user?.college || '',
        degree:  user?.degree  || '',
        skills:  skills.join(', ')
      }
    };

    const filled = await fillUnstopForm(page, formData, userId, appId, this.io);
    if (!filled) {
      this.emit(userId, appId, 'failed', 'AI form filling failed.', 0);
      return false;
    }

    this.emit(userId, appId, 'verifying', 'Verifying application status…', 95);
    const oppIdMatch = extractOpportunityId(url);
    const verified = await verifyUnstopRegistration(page, oppIdMatch);

    if (verified) {
      this.emit(userId, appId, 'complete', '✅ Application verified on Unstop! 🎉', 100);
      return true;
    }

    // ── Gap 6: Secondary verification — check URL and page text ─────────────
    const finalUrl = page.url();
    const finalBody = (await page.locator('body').innerText().catch(() => '')).toLowerCase();
    const secondaryConfirm = (
      finalUrl.includes('/register/edit') ||
      finalUrl.includes('/success') ||
      finalUrl.includes('rstatus=1') ||
      finalBody.includes('registration successful') ||
      finalBody.includes('application submitted') ||
      finalBody.includes('cancel application')     // Means they are registered
    );

    if (secondaryConfirm) {
      console.log(`  ✅ Secondary confirmation: URL=${finalUrl}`);
      return true;
    }

    // ── Layer 4: Re-navigate to the listing page to check registered state ────
    // If we're stuck on /register but submission may have gone through,
    // go back to the listing URL and check if "Cancel Application" / "Registered" now shows
    console.log('  🔄 [Verify] Re-navigating to listing page for definitive check…');
    try {
      const listingUrl = url.replace(/\/register.*$/, '');
      await page.goto(listingUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(2500);

      const listingBody = (await page.locator('body').innerText().catch(() => '')).toLowerCase();
      const listingUrl2 = page.url();
      const registeredOnListing = (
        listingBody.includes('cancel application') ||
        listingBody.includes('update details') ||
        listingBody.includes('already registered') ||
        listingBody.includes('registered!') ||
        listingUrl2.includes('rstatus=1') ||
        await page.locator(
          'button:has-text("Cancel Application"), button:has-text("Update Details"), button:has-text("Registered"), a:has-text("Cancel Application")'
        ).count().catch(() => 0) > 0
      );

      if (registeredOnListing) {
        console.log('  ✅ [Verify Layer 4] Listing page confirms registration!');
        return true;
      }
      console.log('  ❌ [Verify Layer 4] Listing page did NOT confirm registration.');
    } catch (navErr) {
      console.warn('  ⚠️ [Verify Layer 4] Re-navigate check failed:', navErr.message);
    }

    this.emit(userId, appId, 'failed', '❌ Application could not be verified on Unstop.', 0);
    return false;
  }

  // ── Internshala ───────────────────────────────────────────────────────────

  async applyInternshala(page, url, user, resume, pdfPath, userId, appId) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 28000 });
    await delay(1500, 3000);

    // ── DOM-based login check ──────────────────────────────────────────────────────
    const internshalaDomStatus = await checkDomLoginStatus(page, 'internshala');
    console.log(`  -> [Internshala DOM-Login] isLoggedIn=${internshalaDomStatus.isLoggedIn} | ${internshalaDomStatus.indicator}`);
    if (!internshalaDomStatus.isLoggedIn) {
      this.emit(userId, appId, 'session_expired', '⚠️ Not logged into Internshala — please Reconnect in Platforms tab.', 0, 'SESSION_EXPIRED');
      throw new Error('Internshala login page detected. Session expired — go to Platforms → Internshala → Reconnect.');
    }

    if (await isCaptchaChallengeActive(page)) {
      this.emit(userId, appId, 'captcha_detected', '⚠️ Active CAPTCHA challenge detected on Internshala. Please solve it in your browser.', 48, 'CAPTCHA_REQUIRED');
      await delay(60000, 62000);
    }

    this.emit(userId, appId, 'filling', 'Locating Internshala Apply now button…', 58);

    // ── Step 1: Open the detail page & click "Apply now" ───────────────────────
    const applyBtn = await findVisible(page, [
      'button:has-text("Apply now")',
      'a:has-text("Apply now")',
      'button:has-text("Apply Now")',
      'a:has-text("Apply Now")',
      '#easy_apply_button',
      '.apply_now_button',
      '.apply-button',
      'button.btn-primary:has-text("Apply")',
      'a.btn-primary:has-text("Apply")',
    ], 6000);

    if (applyBtn) {
      console.log('  🖱️ [Internshala] Clicking "Apply now" button...');
      await humanClick(applyBtn);
      await delay(2000, 3500);
    } else {
      console.warn('  ⚠️ [Internshala] Apply now button not found — checking if already applied or modal is open.');
    }

    // Wait for application modal overlay card to open
    await page.waitForSelector('.modal-content, #application_form, [class*="modal"], text="Confirm your availability", text="Apply now"', { timeout: 6000 }).catch(() => {});

    // ── Step 2: Confirm your availability ─────────────────────────────────────
    this.emit(userId, appId, 'filling', 'Confirming availability & filling details…', 68);

    // Availability Radio option selection (e.g. "Yes, I am available to join immediately")
    const availRadioSelectors = [
      'label:has-text("Yes, I am available to join immediately")',
      'label:has-text("Yes, I am available")',
      'input[type="radio"][value*="immediately" i]',
      'input[type="radio"][id*="immediately" i]',
      'input[type="radio"][value="yes" i]',
      'label:has-text("Yes")',
    ];

    let availSelected = false;
    for (const sel of availRadioSelectors) {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 800 }).catch(() => false)) {
        await el.scrollIntoViewIfNeeded().catch(() => {});
        await el.click({ force: true }).catch(() => {});
        console.log(`  ✅ [Internshala] Selected availability radio: "${sel}"`);
        availSelected = true;
        await delay(400, 800);
        break;
      }
    }

    if (!availSelected) {
      // Fallback: Availability text field if present
      const availField = await findVisible(page, [
        'input[name*="available"]',
        'input[placeholder*="available" i]',
        'input[placeholder*="joining" i]'
      ], 1500);
      if (availField) {
        await availField.clear().catch(() => {});
        await humanType(availField, 'Immediately');
        console.log('  ✅ [Internshala] Filled availability text field: "Immediately"');
      }
    }

    // ── Step 3: Cover Letter & Assessment / Custom Questions ─────────────────
    const coverLetter = this.buildCoverLetter(user, resume);
    const textareas = page.locator('textarea:not([readonly]):not([disabled])');
    const textareaCount = await textareas.count().catch(() => 0);

    if (textareaCount > 0) {
      console.log(`  📝 [Internshala] Found ${textareaCount} textarea(s) for cover letter / custom questions.`);
      for (let i = 0; i < textareaCount; i++) {
        const ta = textareas.nth(i);
        if (await ta.isVisible({ timeout: 500 }).catch(() => false)) {
          const currentVal = (await ta.inputValue().catch(() => '')).trim();
          if (!currentVal) {
            await ta.scrollIntoViewIfNeeded().catch(() => {});
            await ta.fill(coverLetter).catch(() => {});
            console.log(`  ✅ [Internshala] Filled textarea #${i + 1} with candidate response.`);
            await delay(400, 800);
          }
        }
      }
    }

    // ── Step 4: Custom Resume upload (if input is present) ────────────────────
    if (pdfPath) {
      const fileInput = await findVisible(page, [
        'input[type="file"][accept*="pdf"]',
        'input[type="file"]',
        '#custom_resume',
        '.custom-resume-input'
      ], 2000);
      if (fileInput) {
        this.emit(userId, appId, 'uploading', 'Uploading custom resume to Internshala…', 78);
        console.log('  📄 [Internshala] Uploading custom resume PDF...');
        await fileInput.setInputFiles(pdfPath).catch(() => {});
        await delay(2000, 3000);
      } else {
        console.log('  ℹ️ [Internshala] Using pre-saved profile resume.');
      }
    }

    // ── Step 5: Check terms & submit ──────────────────────────────────────────
    this.emit(userId, appId, 'submitting', 'Submitting Internshala application…', 85);

    const MAX_INTERN_STEPS = 5;
    let internStep = 0;
    let submitted = false;

    while (internStep < MAX_INTERN_STEPS && !submitted) {
      await delay(1000, 2000);

      // Scroll modal container & page to bottom to reveal submit button
      await page.evaluate(() => {
        const modal = document.querySelector('.modal-body, #application_form, [class*="modal"]');
        if (modal) modal.scrollTo(0, modal.scrollHeight);
        window.scrollTo(0, document.body.scrollHeight);
      }).catch(() => {});
      await delay(400);

      // Check all unchecked checkboxes
      await page.evaluate(() => {
        document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
          if (!cb.checked) { cb.scrollIntoView({ behavior: 'instant', block: 'center' }); cb.click(); }
        });
      }).catch(() => {});

      await delay(300);

      // Submit button inside modal / page (#submit input, input[value="Submit"], etc.)
      const submitBtn = page.locator('#submit, input[value="Submit"], input[type="submit"], button:has-text("Submit")').first();
      const isSubmitBtn = await submitBtn.isVisible({ timeout: 1500 }).catch(() => false);

      if (isSubmitBtn || await page.locator('#submit').count().catch(() => 0) > 0) {
        // Save debug screenshot right BEFORE clicking Submit
        try {
          const beforeSubmitPath = path.join(__dirname, '..', '..', '..', 'scratch', 'internshala_before_submit.png');
          await page.screenshot({ path: beforeSubmitPath, fullPage: false }).catch(() => {});
          console.log(`  📸 [Internshala Debug] Saved pre-submit screenshot to scratch/internshala_before_submit.png`);
        } catch (_) {}

        console.log('  🚀 [Internshala] Clicking Submit button...');
        await submitBtn.scrollIntoViewIfNeeded().catch(() => {});
        await page.evaluate(el => {
          if (el) {
            el.scrollIntoView({ behavior: 'instant', block: 'center' });
            el.click();
          }
        }, await submitBtn.elementHandle().catch(() => null)).catch(() => {});

        await humanClick(submitBtn).catch(() => {});
        await delay(3000, 5000);

        // Save debug screenshot right AFTER clicking Submit
        try {
          const afterSubmitPath = path.join(__dirname, '..', '..', '..', 'scratch', 'internshala_after_submit.png');
          await page.screenshot({ path: afterSubmitPath, fullPage: false }).catch(() => {});
          console.log(`  📸 [Internshala Debug] Saved post-submit screenshot to scratch/internshala_after_submit.png`);
        } catch (_) {}

        submitted = true;
        break;
      }

      // Next / Continue step (if multi-page application modal)
      const nextBtn = await findVisible(page, [
        'button:has-text("Next")',
        'button:has-text("Continue")',
        'button:has-text("Save & Next")',
        'a:has-text("Next")',
      ], 2000);

      if (nextBtn) {
        console.log('  ➡️ [Internshala] Clicking Next step button...');
        await humanClick(nextBtn);
        internStep++;
      } else {
        break;
      }
    }

    // ── Verification ──────────────────────────────────────────────────────────
    await delay(2500, 4000);
    const html = await page.content().catch(() => '');
    const bodyLower = html.toLowerCase();
    const finalUrl = page.url();

    const isVerified = (
      finalUrl.includes('/thankyou') ||
      finalUrl.includes('/success')  ||
      finalUrl.includes('/applied')  ||
      bodyLower.includes('application submitted successfully') ||
      bodyLower.includes('recommended internships') ||
      bodyLower.includes('successfully applied')   ||
      bodyLower.includes('application submitted')  ||
      bodyLower.includes('thank you for applying') ||
      bodyLower.includes('applied successfully')   ||
      bodyLower.includes('your application has been') ||
      bodyLower.includes('already applied') ||
      bodyLower.includes('application status')
    );

    if (isVerified) {
      console.log(`  ✅ [Internshala] Application confirmed via DOM/URL: ${finalUrl}`);
      return true;
    }

    // ── Layer 4: Re-navigate to listing page to check "Applied" status ────────
    console.log('  🔄 [Internshala Verify] Re-navigating to job listing page to verify applied status…');
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await delay(2500, 4000);

      const listingBody = (await page.locator('body').innerText().catch(() => '')).toLowerCase();
      const listingVerified = (
        listingBody.includes('applied') ||
        listingBody.includes('application sent') ||
        listingBody.includes('already applied') ||
        listingBody.includes('application status') ||
        listingBody.includes('your application has been') ||
        await page.locator(
          'button:has-text("Applied"), a:has-text("Applied"), .applied-badge, .already_applied, [class*="applied"]'
        ).count().catch(() => 0) > 0
      );

      if (listingVerified) {
        console.log('  ✅ [Internshala Layer 4] Listing page confirms application status!');
        return true;
      }
    } catch (navErr) {
      console.warn('  ⚠️ [Internshala Layer 4] Re-navigate check failed:', navErr.message);
    }

    return false;
  }

  // ── Wellfound ─────────────────────────────────────────────────────────────

  async applyWellfound(page, url, user, resume, pdfPath, userId, appId) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 28000 });
    await delay(2000, 4000);

    // ── DOM-based login check ──────────────────────────────────────────────────────
    const wellfoundDomStatus = await checkDomLoginStatus(page, 'wellfound');
    console.log(`  -> [Wellfound DOM-Login] isLoggedIn=${wellfoundDomStatus.isLoggedIn} | ${wellfoundDomStatus.indicator}`);
    if (!wellfoundDomStatus.isLoggedIn) {
      this.emit(userId, appId, 'session_expired', '⚠️ Not logged into Wellfound — please Reconnect in Platforms tab.', 0, 'SESSION_EXPIRED');
      throw new Error('Wellfound login page detected. Session expired — go to Platforms → Wellfound → Reconnect.');
    }

    const pageHtml = await page.content();

    // ── Gap 5: DataDome CAPTCHA notification (can't auto-solve) ─────────────
    if (hasCaptcha(pageHtml)) {
      this.emit(userId, appId, 'captcha_detected',
        '⚠️ Wellfound uses DataDome bot protection which blocks automated browsers. ' +
        'Please apply manually on Wellfound, or try again later.',
        45, 'CAPTCHA_REQUIRED'
      );
      await delay(90000, 92000);

      const refreshedHtml = await page.content();
      if (hasCaptcha(refreshedHtml)) {
        throw new Error(
          'Wellfound DataDome CAPTCHA could not be bypassed. ' +
          'This is a known limitation — please apply on Wellfound manually.'
        );
      }
    }

    // Session check
    const isLoggedIn = await page.locator('[data-test="user-menu"], .userinfo__name, a[href*="/jobs"]').first().isVisible().catch(() => false);
    if (!isLoggedIn) {
      throw new Error('Wellfound session is not logged in. Please go to Platforms → Wellfound → Reconnect.');
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

    const motivation = this.buildCoverLetter(user, resume, { short: true });
    const whyField = await findVisible(page, [
      'textarea[placeholder*="why" i]',
      'textarea[placeholder*="note" i]',
      'textarea[placeholder*="message" i]',
      'textarea[name*="message"]',
      'textarea',
    ], 4000);
    if (whyField) { await humanType(whyField, motivation); await delay(500, 1000); }

    if (pdfPath) {
      const fileInput = await findVisible(page, ['input[type="file"]'], 2000);
      if (fileInput) { await fileInput.setInputFiles(pdfPath); await delay(1500, 2500); }
    }

    this.emit(userId, appId, 'submitting', 'Submitting Wellfound application…', 88);

    const submitBtn = await findVisible(page, [
      'button[type="submit"]',
      'button:has-text("Submit")',
      'button:has-text("Send Application")',
      'button:has-text("Apply")',
    ], 4000);
    if (submitBtn) { await humanClick(submitBtn); await delay(3000, 5000); }

    const html = await page.content().catch(() => '');

    // ── Gap 6: Proper success verification ───────────────────────────────────
    const finalUrl = page.url();
    return (
      !hasCaptcha(html) &&
      (finalUrl.includes('/applied')       ||
       finalUrl.includes('/success')        ||
       html.toLowerCase().includes('application sent') ||
       html.toLowerCase().includes('successfully applied') ||
       html.toLowerCase().includes('application submitted'))
    );
  }

  // ── LinkedIn Easy Apply ────────────────────────────────────────────────────

  async applyLinkedIn(page, url, user, resume, pdfPath, userId, appId) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 28000 });
    await delay(2000, 4000);

    // ── DOM-based login check ──────────────────────────────────────────────────────
    const linkedinDomStatus = await checkDomLoginStatus(page, 'linkedin');
    console.log(`  -> [LinkedIn DOM-Login] isLoggedIn=${linkedinDomStatus.isLoggedIn} | ${linkedinDomStatus.indicator}`);
    if (!linkedinDomStatus.isLoggedIn) {
      this.emit(userId, appId, 'session_expired', '⚠️ Not logged into LinkedIn — please Reconnect in Platforms tab.', 0, 'SESSION_EXPIRED');
      throw new Error('LinkedIn login page detected. Session expired — go to Platforms → LinkedIn → Reconnect.');
    }

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

      // ── Gap 4: Per-step required field scan ─────────────────────────────────

      // Phone number
      const phoneInput = await findVisible(page, ['input[id*="phoneNumber"]', 'input[placeholder*="phone" i]'], 1000);
      if (phoneInput) {
        const phone = user?.phone || (resume?.optimized || resume?.original)?.phone || '';
        if (phone) { await phoneInput.clear(); await humanType(phoneInput, phone); }
      }

      // City / Location
      const cityInput = await findVisible(page, ['input[id*="city"]', 'input[placeholder*="city" i]', 'input[aria-label*="City" i]'], 1000);
      if (cityInput) {
        const city = user?.location?.split(',')[0]?.trim() || 'Mumbai';
        const curVal = await cityInput.inputValue().catch(() => '');
        if (!curVal) { await humanType(cityInput, city); await delay(800); await page.keyboard.press('ArrowDown'); await delay(300); await page.keyboard.press('Enter'); }
      }

      // Years of experience (all number fields default to "2")
      const numInputs = page.locator('input[type="text"]:visible, input[type="number"]:visible');
      const numCount = await numInputs.count().catch(() => 0);
      for (let i = 0; i < Math.min(numCount, 5); i++) {
        const inp = numInputs.nth(i);
        const label = (await inp.getAttribute('aria-label') || '').toLowerCase();
        const val = await inp.inputValue().catch(() => '');
        if (!val && (label.includes('year') || label.includes('experience') || label.includes('months'))) {
          await humanType(inp, '2');
        }
      }

      // Radio buttons — select first option for any unselected required radio group
      const radioGroups = page.locator('fieldset:has(input[type="radio"])');
      const radioCount = await radioGroups.count().catch(() => 0);
      for (let i = 0; i < radioCount; i++) {
        const group = radioGroups.nth(i);
        const hasChecked = await group.locator('input[type="radio"]:checked').count().catch(() => 0);
        if (hasChecked === 0) {
          // Prefer "Yes" for work authorization, first option otherwise
          const yesRadio = group.locator('input[type="radio"]').filter({ hasText: /yes/i }).first();
          const firstRadio = group.locator('input[type="radio"]').first();
          const target = (await yesRadio.count().catch(() => 0)) > 0 ? yesRadio : firstRadio;
          await target.click({ force: true }).catch(() => {});
          await delay(300);
        }
      }

      // Scroll to reveal all Terms / Consent checkboxes, then check them
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {});
      await delay(300);
      await page.evaluate(() => {
        document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
          if (!cb.checked) { cb.scrollIntoView({ behavior: 'instant', block: 'center' }); cb.click(); }
        });
      }).catch(() => {});
      await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
      await delay(300);

      // Resume PDF upload
      if (pdfPath) {
        const fileInput = await findVisible(page, ['input[type="file"]'], 1000);
        if (fileInput) { await fileInput.setInputFiles(pdfPath); await delay(2000, 3000); }
      }

      // Submit button check first
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
        break;
      }
    }

    const html = await page.content().catch(() => '');

    // ── Gap 6: Proper success verification ───────────────────────────────────
    return (
      html.toLowerCase().includes('your application was sent') ||
      html.toLowerCase().includes('application submitted')     ||
      html.toLowerCase().includes('submitted')                 ||
      html.toLowerCase().includes('application sent')          ||
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

    // Scroll and check all terms checkboxes
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {});
    await delay(400);
    await page.evaluate(() => {
      document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        if (!cb.checked) { cb.scrollIntoView({ behavior: 'instant', block: 'center' }); cb.click(); }
      });
    }).catch(() => {});

    // Try to find and click submit
    const submitBtn = await findVisible(page, [
      'button[type="submit"]',
      'button:has-text("Submit")',
      'button:has-text("Apply")',
      'input[type="submit"]',
    ], 3000);
    if (submitBtn) { await humanClick(submitBtn); await delay(3000, 5000); }

    const html = await page.content().catch(() => '');
    const finalUrl = page.url();

    // ── Gap 6: Best-effort verification ─────────────────────────────────────
    const bodyLower = html.toLowerCase();
    return (
      finalUrl.includes('/success') ||
      finalUrl.includes('/submitted') ||
      finalUrl.includes('/applied') ||
      bodyLower.includes('application submitted') ||
      bodyLower.includes('successfully applied') ||
      bodyLower.includes('thank you for applying')
    );
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
        status: stage,
        message,
        percent,
        timestamp: new Date().toISOString(),
        ...(errorCode ? { errorCode } : {}),
      });
    }
    console.log(`[BotRunner] ${stage.toUpperCase()} (${percent}%) — ${message}`);
  }
}
