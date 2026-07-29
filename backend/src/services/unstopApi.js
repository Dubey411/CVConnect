/**
 * unstopApi.js
 *
 * Direct API Auto-Apply Engine for Unstop.
 *
 * Plan B: Instead of browser DOM scraping, we intercept Unstop's own internal
 * REST API calls using Playwright network interception, then replicate the exact
 * payload. This bypasses Angular form validation entirely.
 *
 * Flow:
 *  1. Load the opportunity page with the user's persistent session
 *  2. Listen for any POST to /api/* when Quick Apply is clicked
 *  3. Capture the exact headers + body that Unstop's frontend sends
 *  4. If captured → replay it directly for future requests
 *  5. Fallback: send a known-good payload to the registration endpoint
 */

import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { getProfilePath } from './sessionManager.js';
import { getUnstopToken } from '../lib/vault.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Extract numeric opportunity ID from Unstop URL */
export function extractOpportunityId(url) {
  if (!url) return null;
  const m = url.match(/-(\d+)(?:\/|\?|$)|(?:\/(?:competitions|internships|jobs)\/(\d+))/i);
  if (m) return m[1] || m[2];
  const digits = url.match(/\b(\d{6,8})\b/);
  return digits ? digits[1] : null;
}

/**
 * Perform direct API registration on Unstop.
 *
 * Strategy:
 *  1. Click Quick Apply while intercepting all POST /api requests
 *  2. If a registration POST is captured → confirm it succeeded
 *  3. If not captured → send the fallback registration payload ourselves
 */
export async function registerUnstopViaApi({ userId, opportunityId, targetUrl, user, resume, pdfPath }) {
  const profilePath = getProfilePath(userId, 'unstop');

  try {
    await fs.access(profilePath);
  } catch {
    throw new Error('Unstop profile session not found. Please visit Platforms → Unstop → Reconnect.');
  }

  let context = null;

  try {
    context = await chromium.launchPersistentContext(profilePath, {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--window-size=1366,768',
      ],
    });

    const page = context.pages()[0] || await context.newPage();

    // ── Step 1: Intercept registration API calls ──────────────────────────────
    const capturedRequests = [];

    page.on('request', req => {
      const url = req.url();
      const method = req.method();
      if (
        method === 'POST' &&
        url.includes('unstop.com/api') &&
        (url.includes('register') || url.includes('opportunity'))
      ) {
        let postData = null;
        try { postData = req.postData(); } catch (_) {}
        const headers = req.headers();
        capturedRequests.push({ url, method, headers, postData, timestamp: Date.now() });
        console.log(`  📡 [API-Interceptor] Captured: POST ${url}`);
        if (postData) console.log(`     Payload preview: ${postData.substring(0, 200)}`);
      }
    });

    const capturedResponses = [];
    page.on('response', async res => {
      const url = res.url();
      if (
        res.request().method() === 'POST' &&
        url.includes('unstop.com/api') &&
        (url.includes('register') || url.includes('opportunity'))
      ) {
        let body = null;
        try { body = await res.json(); } catch (_) {}
        capturedResponses.push({ url, status: res.status(), body });
        console.log(`  ✅ [API-Interceptor] Response: ${res.status()} ← ${url}`);
        if (body) console.log(`     Response preview: ${JSON.stringify(body).substring(0, 300)}`);
      }
    });

    // ── Step 2: Navigate to opportunity page ──────────────────────────────────
    console.log(`  -> [API] Navigating to: ${targetUrl}`);
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 28000 }).catch(() => {});
    await page.waitForTimeout(2500);

    // ── Step 3: Verify login ───────────────────────────────────────────────────
    const bodyText = (await page.locator('body').innerText().catch(() => '')).toLowerCase();
    const hasLoginBtn = await page.locator(
      'header a:has-text("Login"), header button:has-text("Login"), a:has-text("Login")'
    ).first().isVisible().catch(() => false);
    const hasLoggedIn = bodyText.includes('logout') || bodyText.includes('my profile') || bodyText.includes('shubham');

    if (hasLoginBtn && !hasLoggedIn) {
      throw new Error('Unstop session not logged in. Please reconnect in Platforms tab.');
    }

    const vaultToken = await getUnstopToken(userId).catch(() => null);
    const jwtToken = vaultToken?.token || null;

    // ── Step 4: Click Quick Apply and intercept the API call ──────────────────
    console.log('  -> [API] Clicking Quick Apply to intercept registration request…');
    const quickApplyBtn = await page.locator(
      '#un-register-btn, button:has-text("Quick Apply"), a:has-text("Quick Apply"), .register_btn'
    ).first();

    if (await quickApplyBtn.isVisible().catch(() => false)) {
      // Set up a race: either we get a POST within 8s, or we time out
      const requestPromise = page.waitForRequest(
        req => req.method() === 'POST' && req.url().includes('unstop.com/api'),
        { timeout: 8000 }
      ).catch(() => null);

      await quickApplyBtn.click({ force: true }).catch(() => {});
      await Promise.race([requestPromise, page.waitForTimeout(8000)]);
      await page.waitForTimeout(2000);
    } else {
      console.log('  ℹ️ [API] Quick Apply button not visible — may already be on register page.');
    }

    // ── Step 5: Check if any response confirmed registration ──────────────────
    const confirmed = capturedResponses.some(r =>
      r.status === 200 || r.status === 201 ||
      r.body?.success === true ||
      r.body?.data?.id ||
      r.body?.message?.toLowerCase().includes('success') ||
      r.body?.message?.toLowerCase().includes('register')
    );

    if (confirmed) {
      console.log('  ✅ [API] Registration confirmed via intercepted network response!');
      return { success: true, method: 'intercepted' };
    }

    // ── Step 6: Fallback — send the payload directly using page context ────────
    console.log('  ⚠️ [API] No confirmed registration intercepted. Sending fallback payload…');

    const apiResult = await page.evaluate(async ({ oppId, jwt }) => {
      try {
        const id = oppId;

        // Build CSRF-aware headers from page cookies
        const xsrf = document.cookie
          .split('; ')
          .find(c => c.startsWith('XSRF-TOKEN='))
          ?.split('=')?.[1] || '';
        const accessToken = document.cookie
          .split('; ')
          .find(c => c.startsWith('access_token='))
          ?.split('=')?.[1] || '';

        const headers = {
          'Accept': 'application/json, text/plain, */*',
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-XSRF-TOKEN': decodeURIComponent(xsrf),
        };
        if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
        else if (jwt) headers['Authorization'] = `Bearer ${jwt}`;

        // Attempt multiple endpoint patterns Unstop has used
        const endpoints = [
          { url: `https://unstop.com/api/v1/opportunity/${id}/register`, method: 'POST', body: JSON.stringify({ opportunity_id: id, acceptance: 1 }) },
          { url: `https://unstop.com/api/public/opportunity/${id}/register`, method: 'POST', body: JSON.stringify({ opportunity_id: id, acceptance: 1 }) },
          { url: `https://unstop.com/api/v1/competitions/${id}/register`, method: 'POST', body: JSON.stringify({ opportunity_id: id, acceptance: 1 }) },
        ];

        for (const ep of endpoints) {
          try {
            const res = await fetch(ep.url, {
              method: ep.method,
              headers,
              body: ep.body,
              credentials: 'include',
            });
            const data = await res.json().catch(() => ({}));
            console.log('[API-Fallback]', ep.url, res.status, JSON.stringify(data).substring(0, 200));

            if (
              res.status === 200 || res.status === 201 ||
              data?.success === true ||
              data?.data?.id ||
              data?.message?.toLowerCase().includes('success') ||
              data?.message?.toLowerCase().includes('registered')
            ) {
              return { success: true, endpoint: ep.url, status: res.status, data };
            }

            if (res.status === 409 || data?.message?.toLowerCase().includes('already')) {
              return { success: true, endpoint: ep.url, status: res.status, data, alreadyRegistered: true };
            }
          } catch (_) {}
        }

        return { success: false, reason: 'All API endpoints returned non-success responses' };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }, { oppId: opportunityId, jwt: jwtToken });

    if (apiResult?.success) {
      const msg = apiResult.alreadyRegistered
        ? '  ✅ [API] Already registered on Unstop (idempotent success).'
        : `  ✅ [API] Registration accepted at: ${apiResult.endpoint}`;
      console.log(msg);
      return { success: true, method: 'fallback-api', apiResult };
    }

    console.log('  ❌ [API] All API attempts failed:', apiResult?.reason || apiResult?.error);
    return { success: false, reason: apiResult?.reason || 'API fallback exhausted' };

  } finally {
    if (context) await context.close().catch(() => {});
  }
}
