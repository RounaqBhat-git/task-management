import request from 'supertest';
import app from '../app';
import { Task, TaskHistory } from '../models';
import {
  createUser,
  createClient,
  createServiceWithTemplates,
  createEngagementWithTasks,
} from './helpers';

describe('Task Workflow', () => {
  it('team member can start their own task (not_started → in_progress)', async () => {
    const { user: tm, token } = await createUser({ role: 'team_member' });
    const { user: mgr } = await createUser({ role: 'manager' });
    const client = await createClient();
    const { svc, templates } = await createServiceWithTemplates(1);
    const { tasks } = await createEngagementWithTasks({
      clientId: client.id,
      serviceTypeId: svc.id,
      createdByUserId: mgr.id,
      templates,
      assignedToUserId: tm.id,
    });

    const res = await request(app)
      .patch(`/api/v1/tasks/${tasks[0].id}/status`)
      .set('Authorization', token)
      .send({ status: 'in_progress' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('in_progress');

    // Audit history written
    const history = await TaskHistory.findAll({ where: { taskId: tasks[0].id } });
    expect(history).toHaveLength(1);
    expect(history[0].fromStatus).toBe('not_started');
    expect(history[0].toStatus).toBe('in_progress');
  });

  it('team member cannot update a task assigned to someone else', async () => {
    const { user: tm1 } = await createUser({ role: 'team_member' });
    const { token: tm2Token } = await createUser({ role: 'team_member' });
    const { user: mgr } = await createUser({ role: 'manager' });
    const client = await createClient();
    const { svc, templates } = await createServiceWithTemplates(1);
    const { tasks } = await createEngagementWithTasks({
      clientId: client.id,
      serviceTypeId: svc.id,
      createdByUserId: mgr.id,
      templates,
      assignedToUserId: tm1.id, // assigned to tm1, not tm2
    });

    const res = await request(app)
      .patch(`/api/v1/tasks/${tasks[0].id}/status`)
      .set('Authorization', tm2Token)
      .send({ status: 'in_progress' });

    expect(res.status).toBe(403);
  });

  it('team member cannot approve their own work (→ completed)', async () => {
    const { user: tm, token } = await createUser({ role: 'team_member' });
    const { user: mgr } = await createUser({ role: 'manager' });
    const client = await createClient();
    const { svc, templates } = await createServiceWithTemplates(1);
    const { tasks } = await createEngagementWithTasks({
      clientId: client.id,
      serviceTypeId: svc.id,
      createdByUserId: mgr.id,
      templates,
      assignedToUserId: tm.id,
    });

    // Get task to ready_for_review first
    await tasks[0].update({ status: 'ready_for_review' });

    const res = await request(app)
      .patch(`/api/v1/tasks/${tasks[0].id}/status`)
      .set('Authorization', token)
      .send({ status: 'completed' });

    expect(res.status).toBe(403);
  });

  it('invalid workflow transition is rejected', async () => {
    const { user: tm, token } = await createUser({ role: 'team_member' });
    const { user: mgr } = await createUser({ role: 'manager' });
    const client = await createClient();
    const { svc, templates } = await createServiceWithTemplates(1);
    const { tasks } = await createEngagementWithTasks({
      clientId: client.id,
      serviceTypeId: svc.id,
      createdByUserId: mgr.id,
      templates,
      assignedToUserId: tm.id,
    });

    // not_started → completed is not allowed
    const res = await request(app)
      .patch(`/api/v1/tasks/${tasks[0].id}/status`)
      .set('Authorization', token)
      .send({ status: 'completed' });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/Invalid transition/);
  });

  it('manager can approve work (ready_for_review → completed)', async () => {
    const { user: tm } = await createUser({ role: 'team_member' });
    const { user: mgr, token: mgrToken } = await createUser({ role: 'manager' });
    const client = await createClient();
    const { svc, templates } = await createServiceWithTemplates(1);
    const { tasks } = await createEngagementWithTasks({
      clientId: client.id,
      serviceTypeId: svc.id,
      createdByUserId: mgr.id,
      templates,
      assignedToUserId: tm.id,
    });

    await tasks[0].update({ status: 'ready_for_review' });

    const res = await request(app)
      .patch(`/api/v1/tasks/${tasks[0].id}/status`)
      .set('Authorization', mgrToken)
      .send({ status: 'completed', comment: 'Looks good' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('completed');

    // History entry created with comment
    const history = await TaskHistory.findAll({ where: { taskId: tasks[0].id } });
    expect(history.some((h) => h.toStatus === 'completed' && h.comment === 'Looks good')).toBe(true);
  });

  it('manager can request changes (ready_for_review → changes_requested)', async () => {
    const { user: tm } = await createUser({ role: 'team_member' });
    const { user: mgr, token: mgrToken } = await createUser({ role: 'manager' });
    const client = await createClient();
    const { svc, templates } = await createServiceWithTemplates(1);
    const { tasks } = await createEngagementWithTasks({
      clientId: client.id,
      serviceTypeId: svc.id,
      createdByUserId: mgr.id,
      templates,
      assignedToUserId: tm.id,
    });

    await tasks[0].update({ status: 'ready_for_review' });

    const res = await request(app)
      .patch(`/api/v1/tasks/${tasks[0].id}/status`)
      .set('Authorization', mgrToken)
      .send({ status: 'changes_requested', comment: 'Fix the numbers' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('changes_requested');
  });

  it('manager cannot update tasks on another manager\'s engagement', async () => {
    const { user: mgr1 } = await createUser({ role: 'manager' });
    const { token: mgr2Token } = await createUser({ role: 'manager' });
    const client = await createClient();
    const { svc, templates } = await createServiceWithTemplates(1);
    const { tasks } = await createEngagementWithTasks({
      clientId: client.id,
      serviceTypeId: svc.id,
      createdByUserId: mgr1.id, // owned by mgr1
      templates,
    });

    await tasks[0].update({ status: 'ready_for_review' });

    const res = await request(app)
      .patch(`/api/v1/tasks/${tasks[0].id}/status`)
      .set('Authorization', mgr2Token) // mgr2 trying to approve
      .send({ status: 'completed' });

    expect(res.status).toBe(403);
  });
});
