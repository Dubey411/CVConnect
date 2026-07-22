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
 * Validate platform session token before saving
 */
export async function verifyPlatformToken(platform, token) {
  if (!token || typeof token !== 'string' || token.trim().length < 8) {
    const err = new Error(`Invalid token format for ${platform}. Please re-copy the full token string.`);
    err.status = 400;
    throw err;
  }

  // Soft format checks per platform
  if (platform === 'unstop' && !token.startsWith('eyJ') && token.length < 20) {
    const err = new Error('Invalid Unstop access_token JWT. It usually starts with "eyJ...".');
    err.status = 400;
    throw err;
  }

  return true;
}

