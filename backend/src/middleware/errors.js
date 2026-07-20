import { logger } from '../lib/logger.js';
export function notFound(req, res) { res.status(404).json({ error: { code: 'NOT_FOUND', message: `No route for ${req.method} ${req.path}` } }); }
export function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  logger.error({ err, requestId: req.id }, 'Request failed');
  const status = err.status || (err.name === 'MulterError' ? 400 : 500);
  res.status(status).json({ error: { code: err.code || 'INTERNAL_ERROR', message: status < 500 ? err.message : 'Something went wrong. Please try again.' } });
}
