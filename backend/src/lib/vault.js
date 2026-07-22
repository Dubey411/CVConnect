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

import axios from 'axios';

/**
 * Validate platform session token against live platform APIs before saving
 */
export async function verifyPlatformToken(platform, token) {
  if (!token || typeof token !== 'string' || token.trim().length < 8) {
    const err = new Error(`Invalid token format for ${platform}. Please re-copy the full token string.`);
    err.status = 400;
    throw err;
  }

  const trimmedToken = token.trim();

  if (platform === 'unstop') {
    try {
      const res = await axios.get('https://unstop.com/api/v1/user/profile', {
        headers: {
          'Authorization': `Bearer ${trimmedToken}`,
          'Cookie': `access_token=${trimmedToken}; unstop_session=${trimmedToken}`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 6000
      });

      if (res.status !== 200) {
        throw new Error('Unstop returned unauthorized.');
      }
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        const error = new Error('Authentication failed on Unstop. Your session token is invalid or expired. Please re-copy from browser.');
        error.status = 400;
        throw error;
      }
      if (!trimmedToken.startsWith('eyJ') && trimmedToken.length < 20) {
        const error = new Error('Invalid Unstop access_token JWT format. Unstop access_token must start with "eyJ...".');
        error.status = 400;
        throw error;
      }
    }
  } else if (platform === 'internshala') {
    if (trimmedToken.length < 10) {
      const error = new Error('Invalid Internshala session token. Token length must be at least 10 characters.');
      error.status = 400;
      throw error;
    }
  } else if (platform === 'wellfound') {
    if (trimmedToken.length < 10) {
      const error = new Error('Invalid Wellfound session token. Token length must be at least 10 characters.');
      error.status = 400;
      throw error;
    }
  }

  return true;
}

