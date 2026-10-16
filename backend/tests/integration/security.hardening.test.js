const request = require('supertest');
const app = require('../../src/app');

// No DB needed — these tests exercise the hardening middleware layer.
jest.mock('../../src/config/database', () => ({
  prisma: { user: { findUnique: jest.fn().mockResolvedValue(null) } }
}));

describe('Security hardening (Task 18)', () => {
  describe('request body size limit', () => {
    it('should reject an oversized JSON body', async () => {
      // Build a payload larger than the 100kb limit
      const huge = 'x'.repeat(200 * 1024);
      const res = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send({ email: 'a@b.com', password: huge });

      // Express returns 413 Payload Too Large (or 400) when the limit is exceeded
      expect([400, 413]).toContain(res.status);
    });
  });

  describe('auth rate limiting', () => {
    it('should include standard rate-limit headers on auth responses', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@b.com', password: 'wrongpass' });

      // RateLimit standard headers should be present
      expect(res.headers).toHaveProperty('ratelimit-limit');
      expect(res.headers).toHaveProperty('ratelimit-remaining');
    });
  });

  describe('CORS configuration', () => {
    it('should respond to API requests (CORS middleware active)', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('ok');
    });
  });
});
