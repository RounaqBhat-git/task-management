/**
 * Shared test helpers — seed minimal users, generate tokens.
 */
import bcrypt from 'bcryptjs';
import { User, Client, ServiceType, TaskTemplate, Engagement, Task } from '../models';
import { signToken } from '../utils/jwt';
import type { UserRole } from '../models/User';

export async function createUser(overrides: Partial<{
  name: string; email: string; password: string; role: UserRole; isActive: boolean;
}> = {}) {
  const pw = overrides.password ?? 'testpass123';
  const user = await User.create({
    name: overrides.name ?? 'Test User',
    email: overrides.email ?? `user_${Date.now()}@test.local`,
    passwordHash: await bcrypt.hash(pw, 4), // low cost in tests
    role: overrides.role ?? 'team_member',
    isActive: overrides.isActive ?? true,
  });
  return { user, token: tokenFor(user.id, user.role, user.name) };
}

export function tokenFor(id: number, role: UserRole, name: string) {
  return `Bearer ${signToken({ sub: id, role, name })}`;
}

export async function createServiceWithTemplates(n = 3) {
  const svc = await ServiceType.create({
    name: `Svc_${Date.now()}`,
    recurrenceType: 'monthly',
    isActive: true,
  });
  const templates: TaskTemplate[] = [];
  for (let i = 1; i <= n; i++) {
    templates.push(await TaskTemplate.create({
      serviceTypeId: svc.id,
      title: `Template task ${i}`,
      orderIndex: i,
    }));
  }
  return { svc, templates };
}

export async function createClient() {
  return Client.create({ name: `Client_${Date.now()}`, isActive: true });
}

export async function createEngagementWithTasks(params: {
  clientId: number;
  serviceTypeId: number;
  createdByUserId: number;
  periodKey?: string;
  templates: TaskTemplate[];
  assignedToUserId?: number;
}) {
  const eng = await Engagement.create({
    clientId: params.clientId,
    serviceTypeId: params.serviceTypeId,
    createdByUserId: params.createdByUserId,
    title: 'Test engagement',
    periodKey: params.periodKey ?? `${Date.now()}`,
    status: 'active',
  });
  const tasks = await Task.bulkCreate(
    params.templates.map((t) => ({
      engagementId: eng.id,
      taskTemplateId: t.id,
      title: t.title,
      status: 'not_started' as const,
      assignedToUserId: params.assignedToUserId ?? null,
    }))
  );
  return { eng, tasks };
}
