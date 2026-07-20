import Redis from 'ioredis';
import { logger } from './logger.js';

const memory = new Map();
export const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 }) : null;
if (redis) redis.on('error', (err) => logger.warn({ err }, 'Redis unavailable; using memory cache'));
export async function cached(key, ttlSeconds, resolve) {
  try { const stored = redis && await redis.get(key); if (stored) return JSON.parse(stored); } catch {}
  const inMemory = memory.get(key); if (inMemory?.expires > Date.now()) return inMemory.value;
  const value = await resolve();
  memory.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
  try { if (redis?.status === 'ready') await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds); } catch {}
  return value;
}
