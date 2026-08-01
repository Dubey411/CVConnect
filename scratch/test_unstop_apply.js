import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '../backend/node_modules/playwright/index.mjs';
import { prisma } from '../backend/src/lib/prisma.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const user = await prisma.user.findFirst();
  if (!user) {
    console.log('No user found in DB');
    return;
  }
  const userId = user.id;
  const profilePath = path.join(__dirname, '..', 'backend', 'profiles', `${userId}_unstop`);

  console.log('Loading profile path:', profilePath);

  const context = await chromium.launchPersistentContext(profilePath, {
    headless: false,
    viewport: { width: 1280, height: 800 },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
    ]
  });

  const page = await context.newPage();
  const url = 'https://unstop.com/internships/web-software-development-internship-curelex-healthtech-private-limited-1724234';
  
  console.log('Navigating to:', url);
  await page.goto(url, { waitUntil: 'load', timeout: 35000 });
  await page.waitForTimeout(4000);

  const bodyText = await page.locator('body').innerText();
  console.log('Is logged in check:', bodyText.includes('Shubham') || bodyText.includes('Logout') || bodyText.includes('Profile'));

  const applyBtn = page.locator('button:has-text("Quick Apply"), a:has-text("Quick Apply"), #un-register-btn').first();
  const visible = await applyBtn.isVisible().catch(() => false);
  console.log('Apply button visible:', visible);

  if (visible) {
    console.log('Clicking Quick Apply...');
    await applyBtn.click();
    await page.waitForTimeout(5000);

    const postClickUrl = page.url();
    console.log('Post-click URL:', postClickUrl);

    const buttons = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button, a.btn, input[type="submit"]')).map(b => ({
        text: (b.textContent || '').trim(),
        class: b.className,
        visible: b.offsetWidth > 0 && b.offsetHeight > 0
      })).filter(b => b.text.length > 0 && b.visible);
    });

    console.log('Visible buttons after click:', JSON.stringify(buttons, null, 2));

    await page.screenshot({ path: path.join(__dirname, 'unstop_screenshot.png'), fullPage: true });
    console.log('Screenshot saved to scratch/unstop_screenshot.png');
  }

  await context.close();
  await prisma.$disconnect();
}

main().catch(console.error);
