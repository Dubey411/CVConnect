import crypto from 'node:crypto';

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

/**
 * Validate platform session token against structural and signature rules before saving
 */
export async function verifyPlatformToken(platform, token) {
  if (!token || typeof token !== 'string' || token.trim().length < 8) {
    const err = new Error(`Invalid token format for ${platform}. Please re-copy the full token string.`);
    err.status = 400;
    throw err;
  }

  const trimmedToken = token.trim();

  if (platform === 'unstop') {
    const parts = trimmedToken.split('.');
    if (parts.length !== 3) {
      const err = new Error('Invalid Unstop access_token structure. Fake or random text tokens are rejected. Must be a 3-part signed JWT.');
      err.status = 400;
      throw err;
    }

    try {
      const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
      const payload = JSON.parse(payloadJson);
      
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        const err = new Error('Your Unstop access_token has expired. Please log in and re-copy an active token.');
        err.status = 400;
        throw err;
      }
    } catch (e) {
      if (e.status === 400) throw e;
      const err = new Error('Invalid Unstop session token structure or encoding.');
      err.status = 400;
      throw err;
    }
  } else if (platform === 'internshala') {
    if (trimmedToken.length < 15) {
      const err = new Error('Invalid Internshala session token length. Please copy your full ICAPS_SESSION cookie.');
      err.status = 400;
      throw err;
    }
  } else if (platform === 'wellfound') {
    if (trimmedToken.length < 15) {
      const err = new Error('Invalid Wellfound session token length. Please copy your full _wellfound cookie.');
      err.status = 400;
      throw err;
    }
  }

  return true;
}

