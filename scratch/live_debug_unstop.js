import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { prisma } from './src/lib/prisma.js';
import { getProfilePath } from './src/services/sessionManager.js';
import { getUnstopToken } from './src/lib/vault.js';
import { fillUnstopForm, verifyUnstopRegistration } from './src/services/aiFormFiller.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runLiveDebug() {
  console.log('\n================================================================');
  console.log('🚀 LIVE UNSTOP SESSION & FORM FILLING DIAGNOSTIC');
  console.log('================================================================\n');

  // 1. Clean scratch directory screenshots
  const scratchDir = path.join(__dirname);
  const files = await fs.readdir(scratchDir);
  for (const f of files) {
    if (f.startsWith('debug_') && f.endsWith('.png')) {
      await fs.unlink(path.join(scratchDir, f)).catch(() => {});
    }
  }

  // 2. Fetch user from DB
  const user = await prisma.user.findFirst({
    where: { email: 'dubeytech19@gmail.com' }
  });

  if (!user) {
    console.error('❌ User dubeytech19@gmail.com not found in DB.');
    process.exit(1);
  }

  const userId = user.id;
  const profilePath = getProfilePath(userId, 'unstop');
  console.log(`User ID: ${userId}`);
  console.log(`Profile Path: ${profilePath}`);

  // 3. Vault Token check
  const vaultToken = await getUnstopToken(userId).catch(() => null);
  console.log(`Vault JWT Token Present?: ${Boolean(vaultToken?.token)}`);
  if (vaultToken?.token) {
    console.log(`Vault Token length: ${vaultToken.token.length}`);
  }

  // 4. Launch Playwright persistent context in visible mode (headless: false)
  console.log('\nLaunching Playwright browser context (headless: false)...');
  const context = await chromium.launchPersistentContext(profilePath, {
    headless: false,
    viewport: { width: 1280, height: 800 },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
    ],
  });

  const page = context.pages()[0] || await context.newPage();

  // Inject Vault JWT token into localStorage if present
  if (vaultToken?.token) {
    console.log('🔑 Injecting Vault JWT token into page localStorage...');
    await page.addInitScript((t) => {
      try {
        localStorage.setItem('token', t);
        localStorage.setItem('access_token', t);
        localStorage.setItem('jwt', t);
      } catch (_) {}
    }, vaultToken.token);
  }

  const targetUrl = 'https://unstop.com/internships/full-stack-developer-internship-amaanitvam-foundation-1726276';
  console.log(`\nNavigating to: ${targetUrl}`);
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Take Step 0 Screenshot
  const step0Path = path.join(scratchDir, 'debug_step0_page_load.png');
  await page.screenshot({ path: step0Path, fullPage: false });
  console.log(`📸 Saved Step 0 screenshot: ${step0Path}`);

  // Inspect page authentication DOM elements
  const loginBtnVisible = await page.locator('header a:has-text("Login"), header button:has-text("Login"), a:has-text("Login")').first().isVisible().catch(() => false);
  const googleBtnVisible = await page.locator('button:has-text("Continue with Google"), div:has-text("Continue with Google")').first().isVisible().catch(() => false);
  const userProfileVisible = await page.locator('.profile-pic, .user_name, button:has-text("Logout"), a[href*="/user/profile"], header .user-profile').first().isVisible().catch(() => false);

  const cookies = await context.cookies('https://unstop.com').catch(() => []);
  const cookieNames = cookies.map(c => c.name).join(', ');

  console.log('\n--- PAGE AUTHENTICATION DIAGNOSIS ---');
  console.log(`Current Page URL: ${page.url()}`);
  console.log(`Header Login Button Visible?: ${loginBtnVisible}`);
  console.log(`"Continue with Google" Visible?: ${googleBtnVisible}`);
  console.log(`Logged-In User Profile Visible?: ${userProfileVisible}`);
  console.log(`Stored Cookies Count: ${cookies.length}`);
  console.log(`Cookie Names: ${cookieNames || 'None'}`);
  console.log('-------------------------------------\n');

  // Click Quick Apply / Register button
  console.log('Locating Quick Apply / Register button...');
  const applyBtn = page.locator('#un-register-btn, button:has-text("Quick Apply"), a:has-text("Quick Apply"), button:has-text("Register"), a[href*="/register"]').first();
  if (await applyBtn.isVisible().catch(() => false)) {
    console.log('🖱️ Clicking Quick Apply button...');
    await applyBtn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(4000);
  }

  const step1Path = path.join(scratchDir, 'debug_step1_form_open.png');
  await page.screenshot({ path: step1Path, fullPage: false });
  console.log(`📸 Saved Step 1 screenshot: ${step1Path}`);

  // Construct real candidate formData from User profile in DB
  const formData = {
    resumePath: path.join(__dirname, 'testResume.pdf'),
    location: user.location || 'Mumbai, Maharashtra, India',
    skills: ['Full Stack Development', 'React.js', 'Node.js', 'JavaScript'],
    userDetails: {
      name: user.name || 'Shubham Dubey',
      email: user.email || 'dubeytech19@gmail.com',
      phone: user.phone || '9876543210',
      gender: user.gender || 'Male',
      college: user.college || '',
      degree: user.degree || ''
    }
  };

  console.log('\nStarting AI Form Filler pipeline...');
  const filled = await fillUnstopForm(page, formData, userId, 'debug_app_123', null);
  console.log(`Form filler finished with result: ${filled}`);

  const step5Path = path.join(scratchDir, 'debug_step5_after_submit.png');
  await page.screenshot({ path: step5Path, fullPage: false });
  console.log(`📸 Saved Step 5 screenshot: ${step5Path}`);

  // Verify registration
  const verified = await verifyUnstopRegistration(page, '1726276');
  console.log(`\nFinal Verification Result: ${verified ? '✅ SUCCESS' : '❌ FAILED'}`);

  await page.waitForTimeout(5000);
  await context.close();
  await prisma.$disconnect();
}

runLiveDebug().catch(err => {
  console.error('Fatal error during debug run:', err);
  process.exit(1);
});
