import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '../backend/node_modules/playwright/index.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function checkSession() {
  const profilePath = path.join(__dirname, '..', 'backend', 'profiles', 'cmrs38nru0000kzecv2naie4t_unstop');
  console.log('=== CHECKING UNSTOP PLAYWRIGHT PROFILE SESSION ===');
  console.log('Profile Path:', profilePath);

  const context = await chromium.launchPersistentContext(profilePath, {
    headless: true,
    viewport: { width: 1280, height: 800 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = context.pages()[0] || await context.newPage();

  try {
    console.log('Navigating to https://unstop.com ...');
    await page.goto('https://unstop.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(4000);

    const url = page.url();
    const hasLoginBtn = await page.locator('header a:has-text("Login"), header button:has-text("Login"), .top-header button:has-text("Login")').first().isVisible().catch(() => false);
    const hasProfilePic = await page.locator('.profile-pic, .user_name, [class*="user_"], button:has-text("Logout"), a[href*="/user/profile"]').first().isVisible().catch(() => false);

    console.log('\n--- SESSION DIAGNOSTIC RESULTS ---');
    console.log('Current URL:', url);
    console.log('Login Button Visible?:', hasLoginBtn);
    console.log('Logged-In Profile Visible?:', hasProfilePic);

    const cookies = await context.cookies('https://unstop.com').catch(() => []);
    console.log('Unstop Cookies Count:', cookies.length);
    console.log('Cookie Names:', cookies.map(c => c.name).join(', '));

    const screenshotPath = path.join(__dirname, 'unstop_live_session.png');
    await page.screenshot({ path: screenshotPath }).catch(() => {});
    console.log(`Saved live page screenshot to: ${screenshotPath}`);

  } catch (err) {
    console.error('Error during session check:', err.message);
  } finally {
    await context.close().catch(() => {});
  }
}

checkSession();
