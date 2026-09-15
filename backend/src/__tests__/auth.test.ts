import request from 'supertest';
import app from '../app';
import { createUser } from './helpers';

describe('Auth', () => {
  describe('POST /api/v1/auth/login', () => {
    it('returns a JWT and user object for valid credentials', async () => {
      const { user } = await createUser({
        email: 'login_valid@test.local',
        password: 'password123',
        role: 'team_member',
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'login_valid@test.local', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(typeof res.body.token).toBe('string');
      expect(res.body.user.id).toBe(user.id);
      expect(res.body.user.role).toBe('team_member');
      // passwordHash must never be returned
      expect(res.body.user.passwordHash).toBeUndefined();
    });

    it('returns 401 for wrong password', async () => {
      await createUser({ email: 'login_wrong@test.local', password: 'correct' });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'login_wrong@test.local', password: 'incorrect' });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid email or password');
    });

    it('returns 401 for unknown email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@test.local', password: 'anything' });

      expect(res.status).toBe(401);
    });

    it('returns 422 for missing email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ password: 'something' });

      expect(res.status).toBe(422);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('returns the current user for a valid token', async () => {
      const { token } = await createUser({
        email: 'me_valid@test.local',
        role: 'manager',
      });

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', token);

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('manager');
    });

    it('returns 401 with no token', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });

    it('returns 401 with a tampered token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer tampered.token.value');
      expect(res.status).toBe(401);
    });
  });
});
