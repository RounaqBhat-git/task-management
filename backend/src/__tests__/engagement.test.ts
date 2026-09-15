import request from 'supertest';
import app from '../app';
import {
  createUser,
  createClient,
  createServiceWithTemplates,
  tokenFor,
} from './helpers';
import { ServiceType, TaskTemplate } from '../models';

describe('Engagements', () => {
  it('manager can create an engagement and tasks are auto-generated', async () => {
    const { token } = await createUser({ role: 'manager' });
    const client = await createClient();
    const { svc, templates } = await createServiceWithTemplates(3);

    const res = await request(app)
      .post('/api/v1/engagements')
      .set('Authorization', token)
      .send({
        clientId: client.id,
        serviceTypeId: svc.id,
        title: 'Test Engagement',
        periodDate: '2026-11-01T00:00:00.000Z',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.periodKey).toBe('2026-11');

    // Verify tasks were created via GET
    const detail = await request(app)
      .get(`/api/v1/engagements/${res.body.data.id}`)
      .set('Authorization', token);

    expect(detail.body.data.tasks).toHaveLength(templates.length);
  });

  it('duplicate recurring engagement for same client+service+period is rejected', async () => {
    const { token } = await createUser({ role: 'manager' });
    const client = await createClient();
    const { svc } = await createServiceWithTemplates(2);

    const payload = {
      clientId: client.id,
      serviceTypeId: svc.id,
      title: 'Dup Test',
      periodDate: '2026-12-01T00:00:00.000Z',
    };

    const first = await request(app)
      .post('/api/v1/engagements')
      .set('Authorization', token)
      .send(payload);
    expect(first.status).toBe(201);

    const second = await request(app)
      .post('/api/v1/engagements')
      .set('Authorization', token)
      .send(payload);
    expect(second.status).toBe(409);
    expect(second.body.message).toMatch(/already exists/);
  });

  it('team member cannot create an engagement', async () => {
    const { token } = await createUser({ role: 'team_member' });
    const client = await createClient();
    const { svc } = await createServiceWithTemplates(1);

    const res = await request(app)
      .post('/api/v1/engagements')
      .set('Authorization', token)
      .send({
        clientId: client.id,
        serviceTypeId: svc.id,
        title: 'Should fail',
        periodDate: '2027-01-01T00:00:00.000Z',
      });

    expect(res.status).toBe(403);
  });

  it('manager can only see their own engagements', async () => {
    const { user: mgr1, token: token1 } = await createUser({ role: 'manager' });
    const { token: token2 } = await createUser({ role: 'manager' });
    const client = await createClient();
    const { svc } = await createServiceWithTemplates(1);

    // mgr1 creates an engagement
    await request(app)
      .post('/api/v1/engagements')
      .set('Authorization', token1)
      .send({
        clientId: client.id,
        serviceTypeId: svc.id,
        title: 'mgr1 engagement',
        periodDate: '2027-02-01T00:00:00.000Z',
      });

    // mgr2 lists — should not see mgr1's engagement
    const res = await request(app)
      .get('/api/v1/engagements')
      .set('Authorization', token2);

    expect(res.status).toBe(200);
    const ids = res.body.data.map((e: { createdByUserId: number }) => e.createdByUserId);
    expect(ids.every((id: number) => id !== mgr1.id)).toBe(true);
  });

  it('rollover creates next period engagement idempotently', async () => {
    const { user: mgr, token } = await createUser({ role: 'manager' });
    const client = await createClient();
    const { svc } = await createServiceWithTemplates(2);

    // Create base engagement
    const base = await request(app)
      .post('/api/v1/engagements')
      .set('Authorization', token)
      .send({
        clientId: client.id,
        serviceTypeId: svc.id,
        title: 'Rollover base',
        periodDate: '2027-03-01T00:00:00.000Z',
      });
    expect(base.status).toBe(201);

    // First rollover
    const roll1 = await request(app)
      .post(`/api/v1/engagements/${base.body.data.id}/rollover`)
      .set('Authorization', token);
    expect(roll1.status).toBe(201);
    expect(roll1.body.data.periodKey).toBe('2027-04');

    // Second rollover of same source → 409
    const roll2 = await request(app)
      .post(`/api/v1/engagements/${base.body.data.id}/rollover`)
      .set('Authorization', token);
    expect(roll2.status).toBe(409);
  });

  it('unauthenticated request is rejected', async () => {
    const res = await request(app).get('/api/v1/engagements');
    expect(res.status).toBe(401);
  });
});
