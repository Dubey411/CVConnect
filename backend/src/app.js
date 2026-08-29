import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { randomUUID } from 'node:crypto';
import { logger } from './lib/logger.js';
import { getCorsOrigin } from './lib/cors.js';
import { prisma } from './lib/prisma.js';
import api from './routes/api.js';
import auth from './routes/auth.js';
import ml from './routes/ml.js';
import { errorHandler, notFound } from './middleware/errors.js';
export const app = express();
app.set('trust proxy', 1);
app.use((req, res, next) => { req.id = randomUUID(); res.setHeader('X-Request-Id', req.id); next(); });
app.use(pinoHttp({ logger }));
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: getCorsOrigin(), credentials: true }));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(rateLimit({ windowMs: 60_000, limit: 100, standardHeaders: 'draft-8', legacyHeaders: false }));
app.get('/health', async (req, res) => {
  let dbStatus = 'ok';
  let dbError = null;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    dbStatus = 'error';
    dbError = err.message;
  }
  res.json({
    status: dbStatus === 'ok' ? 'ok' : 'degraded',
    service: 'cvconnect-api',
    database: dbStatus,
    ...(dbError ? { databaseError: dbError } : {}),
    envStatus: {
      hasDbUrl: Boolean(process.env.DATABASE_URL),
      hasJwtSecret: Boolean(process.env.JWT_SECRET),
      hasRedis: Boolean(process.env.REDIS_URL),
      clientOrigin: process.env.CLIENT_ORIGIN || 'default'
    },
    timestamp: new Date().toISOString()
  });
});
app.use('/api/auth', auth);
app.use('/api/ml', ml);
app.use('/api', api);
app.use(notFound);
app.use(errorHandler);
