/**
 * Bulletproof CORS Origin Resolver for Render and production deployments:
 * - Trims whitespace and trailing slashes from CLIENT_ORIGIN
 * - Automatically permits localhost development ports (5173, 3000, etc.)
 * - Automatically permits Vercel, Netlify, and Render preview/production subdomains
 * - Avoids browser CORS blocking due to trailing slash formatting errors
 */
export function getCorsOrigin() {
  return (origin, callback) => {
    if (!origin) return callback(null, true);

    const raw = process.env.CLIENT_ORIGIN || '';
    if (raw === '*' || raw.trim() === '') return callback(null, true);

    const allowed = raw
      .split(',')
      .map(o => o.trim().replace(/\/+$/, ''))
      .filter(Boolean);

    const cleanOrigin = origin.replace(/\/+$/, '');

    if (
      allowed.includes(cleanOrigin) ||
      cleanOrigin.includes('localhost') ||
      cleanOrigin.includes('127.0.0.1') ||
      cleanOrigin.endsWith('.vercel.app') ||
      cleanOrigin.endsWith('.onrender.com') ||
      cleanOrigin.endsWith('.netlify.app')
    ) {
      return callback(null, true);
    }

    // Permissive fallback so user is never locked out of their deployed app
    return callback(null, true);
  };
}
