import { jest } from '@jest/globals';
import request from 'supertest';

// Health tests intentionally avoid a database connection; integration tests use a test Postgres service.
jest.unstable_mockModule('@prisma/client', () => ({ PrismaClient: jest.fn(() => ({})) }));
const { app } = await import('../src/app.js');

describe('health endpoint', () => {
  it('returns service health', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });
});
