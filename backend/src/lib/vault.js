import crypto from 'node:crypto';
import axios from 'axios';

// Derive a 32-byte key for AES-256 encryption
const SECRET_KEY = crypto.scryptSync(process.env.JWT_SECRET || 'cvconnect_vault_secret_key_2026', 'cvconnect_salt', 32);
const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypt sensitive session tokens or API keys using AES-256-GCM
 */
export function encryptToken(text) {
  if (!text) return { encryptedToken: '', iv: '', authTag: '' };
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return {
    encryptedToken: encrypted,
    iv: iv.toString('hex'),
    authTag
  };
}

/**
 * Decrypt sensitive tokens
 */
export function decryptToken(encryptedObj) {
  const { encryptedToken, iv: ivHex, authTag: authTagHex } = encryptedObj || {};
  if (!encryptedToken || !ivHex || !authTagHex) return '';
  try {
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedToken, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('[Vault] Token decryption failed:', err.message);
    return '';
  }
}

// ─── Shared HTTP helper ────────────────────────────────────────────────────────

function makeErr(msg, status = 400) {
  const err = new Error(msg);
  err.status = status;
  return err;
}

async function liveGet(url, headers = {}, timeoutMs = 8000) {
  return axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json, text/html, */*',
      ...headers
    },
    timeout: timeoutMs,
    maxRedirects: 3,
    validateStatus: null          // never throw on HTTP status — we inspect it ourselves
  });
}

// ─── Platform verifiers ────────────────────────────────────────────────────────

async function verifyUnstop(token) {
  // Step 1: Structural JWT check (must be 3 dot-separated base64url segments)
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw makeErr(
      'Invalid Unstop token — must be a 3-part JWT (header.payload.signature). ' +
      'Random text or partial copies are rejected. Please re-copy your access_token from DevTools.'
    );
  }

  // Step 2: Decode payload and check expiry
  let payload;
  try {
    const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
    payload = JSON.parse(payloadJson);
  } catch {
    throw makeErr('Unstop token payload is malformed — the base64url segment could not be decoded.');
  }

  if (payload.exp) {
    const expiresAt = new Date(payload.exp * 1000);
    if (expiresAt < new Date()) {
      throw makeErr(
        `Your Unstop access_token expired on ${expiresAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST. ` +
        'Please log into Unstop, then re-copy a fresh access_token from DevTools → Application → Cookies.'
      );
    }
  }

  // Step 3: Live API call — Unstop's authenticated user profile endpoint
  let res;
  try {
    res = await liveGet('https://unstop.com/api/public/user/me', {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    });
  } catch (netErr) {
    // Network issue — log but don't hard-fail; structural check passed
    console.warn('[Vault:Unstop] Live check network error:', netErr.message);
    return { verified: true, method: 'structural', username: payload.sub ? `uid:${payload.sub}` : 'unknown' };
  }

  if (res.status === 401 || res.status === 403) {
    throw makeErr(
      'Unstop rejected this token with an Unauthorized error. ' +
      'The token may be from a different session or already invalidated. Please re-copy from a fresh Unstop login.'
    );
  }

  // Try to pull the user's name/email from the response for the UI
  const data = res.data?.data || res.data;
  const username = data?.name || data?.email || data?.username || (payload.sub ? `uid:${payload.sub}` : 'Unstop User');

  const expiresAt = payload.exp ? new Date(payload.exp * 1000) : null;

  return { verified: true, method: 'live_api', username, expiresAt };
}

async function verifyInternshala(token) {
  if (token.length < 20) {
    throw makeErr(
      'Internshala ICAPS_SESSION cookie is too short. ' +
      'Make sure you copied the full value — it should be at least 20 characters.'
    );
  }

  // Internshala session cookie format check — it's typically a long alphanumeric string
  if (!/^[a-zA-Z0-9%._\-=+/]+$/.test(token)) {
    throw makeErr(
      'Internshala session token contains unexpected characters. ' +
      'Please re-copy exactly the ICAPS_SESSION cookie value from DevTools.'
    );
  }

  // Live session ping — hit the dashboard endpoint with the session cookie
  let res;
  try {
    res = await liveGet('https://internshala.com/student/resume', {
      'Cookie': `ICAPS_SESSION=${token}`,
      'Referer': 'https://internshala.com/'
    });
  } catch (netErr) {
    console.warn('[Vault:Internshala] Live check network error:', netErr.message);
    // Structural check passed — accept with warning
    return { verified: true, method: 'structural' };
  }

  // If redirected to /login or got 401/403, session is invalid
  const finalUrl = res.request?.res?.responseUrl || res.config?.url || '';
  if (res.status === 401 || res.status === 403 || finalUrl.includes('/login') || finalUrl.includes('/student/login')) {
    throw makeErr(
      'Internshala did not accept this session cookie — the session has expired or is invalid. ' +
      'Please log into Internshala again, then re-copy the ICAPS_SESSION cookie from DevTools → Application → Cookies.'
    );
  }

  return { verified: true, method: 'live_session' };
}

async function verifyWellfound(token) {
  if (token.length < 20) {
    throw makeErr(
      'Wellfound session token is too short. ' +
      'Please copy the full _wellfound cookie value from DevTools — it should be at least 20 characters.'
    );
  }

  // Live ping — Wellfound has a lightweight user-info GraphQL or REST probe
  let res;
  try {
    res = await liveGet('https://wellfound.com/api/v1/user', {
      'Cookie': `_wellfound=${token}`,
      'X-Requested-With': 'XMLHttpRequest'
    });
  } catch (netErr) {
    console.warn('[Vault:Wellfound] Live check network error:', netErr.message);
    return { verified: true, method: 'structural' };
  }

  if (res.status === 401 || res.status === 403) {
    throw makeErr(
      'Wellfound rejected this session token — it may be expired or invalid. ' +
      'Please log into Wellfound, then re-copy the _wellfound cookie from DevTools → Application → Cookies.'
    );
  }

  const username = res.data?.data?.name || res.data?.name || res.data?.email || 'Wellfound User';
  return { verified: true, method: res.status === 200 ? 'live_api' : 'structural', username };
}

async function verifyLinkedIn(token) {
  if (token.length < 30) {
    throw makeErr(
      'LinkedIn li_at cookie is too short. ' +
      'The li_at cookie is a long string — please re-copy it from DevTools → Application → Cookies → linkedin.com.'
    );
  }

  // LinkedIn Voyager API — lightweight "me" endpoint used by the LinkedIn web app itself
  let res;
  try {
    res = await liveGet('https://www.linkedin.com/voyager/api/me', {
      'Cookie': `li_at=${token}`,
      'Csrf-Token': 'ajax:0',
      'X-Li-Lang': 'en_US',
      'X-RestLi-Protocol-Version': '2.0.0'
    });
  } catch (netErr) {
    console.warn('[Vault:LinkedIn] Live check network error:', netErr.message);
    return { verified: true, method: 'structural' };
  }

  if (res.status === 401 || res.status === 403) {
    throw makeErr(
      'LinkedIn rejected this li_at cookie — the session has expired or is invalid. ' +
      'Please log into LinkedIn, then re-copy the li_at cookie from DevTools → Application → Cookies → linkedin.com.'
    );
  }

  const profile = res.data?.miniProfile || res.data;
  const username = [profile?.firstName?.text, profile?.lastName?.text].filter(Boolean).join(' ') || 'LinkedIn User';
  return { verified: true, method: res.status === 200 ? 'live_api' : 'structural', username };
}

async function verifyIndeed(token) {
  if (token.length < 10) {
    throw makeErr(
      'Indeed CTK token is too short. ' +
      'Please copy the CTK cookie value from DevTools → Application → Cookies → indeed.com.'
    );
  }

  // Basic structure check — Indeed CTK is an alphanumeric string
  if (!/^[a-zA-Z0-9_\-=+./]+$/.test(token)) {
    throw makeErr(
      'Indeed token contains unexpected characters. ' +
      'Please re-copy exactly the CTK cookie value from DevTools.'
    );
  }

  // Live ping against Indeed's account endpoint
  let res;
  try {
    res = await liveGet('https://www.indeed.com/account/signin', {
      'Cookie': `CTK=${token}`,
      'Referer': 'https://www.indeed.com'
    });
  } catch (netErr) {
    console.warn('[Vault:Indeed] Live check network error:', netErr.message);
    return { verified: true, method: 'structural' };
  }

  if (res.status === 401 || res.status === 403) {
    throw makeErr(
      'Indeed rejected this session token. ' +
      'Please log into Indeed again and re-copy the CTK cookie from DevTools.'
    );
  }

  return { verified: true, method: 'structural' };
}

async function verifyGlassdoor(token) {
  if (token.length < 15) {
    throw makeErr(
      'Glassdoor session token is too short. ' +
      'Please copy the JSESSIONID or PHPSESSID cookie value from DevTools → Application → Cookies → glassdoor.com.'
    );
  }

  if (!/^[a-zA-Z0-9%._\-=+/]+$/.test(token)) {
    throw makeErr(
      'Glassdoor token contains unexpected characters. ' +
      'Please re-copy exactly the session cookie value.'
    );
  }

  return { verified: true, method: 'structural' };
}

// ─── Public entry point ───────────────────────────────────────────────────────

/**
 * Validate and live-verify a platform session token before saving.
 * Throws a structured error (err.status = 400) on failure.
 * Returns { verified, method, username?, expiresAt? } on success.
 */
export async function verifyPlatformToken(platform, token) {
  if (!token || typeof token !== 'string' || token.trim().length < 4) {
    throw makeErr(`Token is required to connect ${platform}. Please paste the session cookie or API key.`);
  }

  const t = token.trim();

  switch (platform) {
    case 'unstop':      return verifyUnstop(t);
    case 'internshala': return verifyInternshala(t);
    case 'wellfound':   return verifyWellfound(t);
    case 'linkedin':    return verifyLinkedIn(t);
    case 'indeed':      return verifyIndeed(t);
    case 'glassdoor':   return verifyGlassdoor(t);
    default: {
      // Unknown platform — basic sanity check only
      if (t.length < 8) {
        throw makeErr(`Token for ${platform} appears too short. Please paste the full session token.`);
      }
      return { verified: true, method: 'structural' };
    }
  }
}
