/**
 * unstopApi.js
 *
 * Direct API Auto-Apply Engine for Unstop.
 * Executes instant background registrations via Unstop's internal HTTP API
 * using session cookies from Playwright persistent browser context.
 */

import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { getProfilePath } from './sessionManager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Extract numeric opportunity ID from Unstop URL */
export function extractOpportunityId(url) {
  if (!url) return null;
  // Patterns: ...-1726451, /competitions/1724474/register, /jobs/1726451
  const m = url.match(/-(\d+)(?:\/|\?|$)|(?:\/(?:competitions|internships|jobs)\/(\d+))/i);
  if (m) return m[1] || m[2];
  const digits = url.match(/\b(\d{6,8})\b/);
  return digits ? digits[1] : null;
}

/**
 * Perform direct API registration on Unstop using Playwright session
 */
export async function registerUnstopViaApi({ userId, opportunityId, targetUrl, user, resume, pdfPath }) {
  const profilePath = getProfilePath(userId, 'unstop');

  // Ensure profile directory exists
  try {
    await fs.access(profilePath);
  } catch {
    throw new Error('Unstop profile session not found. Please visit Platforms tab -> Unstop -> Reconnect.');
  }

  let context = null;

  try {
    context = await chromium.launchPersistentContext(profilePath, {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
      ],
    });

    const page = context.pages()[0] || await context.newPage();

    // 1. Navigate to target URL to ensure session context is active
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});

    // 2. Verify login status
    const bodyText = (await page.locator('body').innerText().catch(() => '')).toLowerCase();
    const hasLoginBtn = await page.locator('header a:has-text("Login"), header button:has-text("Login"), a:has-text("Login")').first().isVisible().catch(() => false);
    const hasLoggedInText = bodyText.includes('logout') || bodyText.includes('my profile') || bodyText.includes('shubham');

    if (hasLoginBtn && !hasLoggedInText) {
      throw new Error('Unstop session is not logged in inside CVConnect. Please visit Platforms tab -> Unstop -> Reconnect.');
    }

    // 3. Execute API POST directly inside browser evaluate context (uses live cookies & CSRF tokens)
    const apiResult = await page.evaluate(async ({ oppId, candidate, hasPdf }) => {
      try {
        const targetOppId = oppId || window.location.pathname.split('/').pop().replace(/\D/g, '');

        // Fetch opportunity info & form schema if available
        const infoRes = await fetch(`https://unstop.com/api/public/opportunity/${targetOppId}`, {
          headers: { 'Accept': 'application/json' }
        }).then(r => r.json()).catch(() => null);

        // Construct FormData payload
        const formData = new FormData();
        formData.append('opportunity_id', targetOppId);
        formData.append('user_type', 'college_students');
        formData.append('domain', 'Engineering');
        formData.append('course', 'B.Tech/BE');
        formData.append('specialization', 'Computer Science and Engineering');
        formData.append('graduating_year', '2027');
        formData.append('course_duration', '4 Years');
        formData.append('differently_abled', 'No');
        formData.append('acceptance', '1');
        formData.append('player_location', 'Kopar Khairane, Maharashtra, India');

        // Submit to Unstop registration API endpoints
        const endpoints = [
          `https://unstop.com/api/v1/opportunity/${targetOppId}/register`,
          `https://unstop.com/api/public/opportunity/${targetOppId}/register`,
          `https://unstop.com/api/v1/user/register-opportunity`
        ];

        let response = null;
        for (const ep of endpoints) {
          try {
            const r = await fetch(ep, {
              method: 'POST',
              body: formData,
              headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
              }
            });
            if (r.ok || r.status === 200 || r.status === 201) {
              const data = await r.json().catch(() => ({}));
              response = { status: r.status, data };
              break;
            }
          } catch (_) {}
        }

        if (response) return { success: true, details: response };

        // Fallback: Check if page itself indicates registered
        return { success: false, reason: 'API endpoint required form submission' };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }, {
      oppId: opportunityId,
      candidate: {
        name: user?.name || 'Shubham Dubey',
        email: user?.email || 'shubh6949@gmail.com',
      },
      hasPdf: !!pdfPath,
    });

    if (apiResult?.success) {
      return { success: true, apiResult };
    }

    return { success: false, reason: apiResult?.reason || 'API fallback' };
  } finally {
    if (context) await context.close().catch(() => {});
  }
}
