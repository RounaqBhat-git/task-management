import { Op } from 'sequelize';
import sequelize from '../db/sequelize';
import { Task, TaskHistory, Engagement, User, TaskTemplate } from '../models';
import { validateTransition } from '../utils/taskWorkflow';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import type { TaskStatus } from '../models/Task';
import type { UserRole } from '../models/User';

// Scoping helper

/**
 * Returns a Sequelize WHERE clause fragment that scopes tasks to what
 * the requesting user is allowed to see:
 *   admin       → all tasks
 *   manager     → tasks on engagements they created
 *   team_member → only tasks assigned to them
 */
async function taskScope(
  userId: number,
  role: UserRole
): Promise<Record<string, unknown>> {
  if (role === 'admin') return {};

  if (role === 'manager') {
    // Collect engagement ids the manager created
    const engagements = await Engagement.findAll({
      where: { createdByUserId: userId },
      attributes: ['id'],
    });
    const ids = engagements.map((e) => e.id);
    return { engagementId: { [Op.in]: ids } };
  }

  // team_member
  return { assignedToUserId: userId };
}

// Public service functions

export async function getTasks(
  userId: number,
  role: UserRole,
  filters: { engagementId?: number; status?: TaskStatus } = {}
): Promise<Task[]> {
  const scope = await taskScope(userId, role);
  const where: Record<string, unknown> = { ...scope };

  if (filters.engagementId) where['engagementId'] = filters.engagementId;
  if (filters.status) where['status'] = filters.status;

  return Task.findAll({
    where,
    include: [
      { model: User, as: 'assignedTo', attributes: ['id', 'name', 'email'] },
      { model: TaskTemplate, as: 'taskTemplate', attributes: ['id', 'title'] },
      {
        model: Engagement,
        as: 'engagement',
        attributes: ['id', 'title', 'periodKey', 'dueDate'],
      },
    ],
    order: [['dueDate', 'ASC NULLS LAST']],
  });
}

export async function getTaskById(
  taskId: number,
  userId: number,
  role: UserRole
): Promise<Task> {
  const task = await Task.findByPk(taskId, {
    include: [
      { model: User, as: 'assignedTo', attributes: ['id', 'name', 'email'] },
      { model: TaskTemplate, as: 'taskTemplate', attributes: ['id', 'title'] },
      {
        model: Engagement,
        as: 'engagement',
        attributes: ['id', 'title', 'periodKey', 'createdByUserId'],
      },
      {
        model: TaskHistory,
        as: 'history',
        include: [{ model: User, as: 'changedBy', attributes: ['id', 'name'] }],
        order: [['createdAt', 'ASC']],
      },
    ],
  });

  if (!task) throw new NotFoundError('Task');

  // Scope check
  if (role === 'team_member' && task.assignedToUserId !== userId) {
    throw new ForbiddenError('You can only view tasks assigned to you');
  }
  if (role === 'manager') {
    const eng = task.engagement as Engagement & { createdByUserId: number };
    if (eng.createdByUserId !== userId) {
      throw new ForbiddenError('You can only view tasks on your own engagements');
    }
  }

  return task;
}

export async function updateTaskStatus(
  taskId: number,
  toStatus: TaskStatus,
  comment: string | undefined,
  userId: number,
  role: UserRole
): Promise<Task> {
  return sequelize.transaction(async (t) => {
    const task = await Task.findByPk(taskId, { transaction: t, lock: true });
    if (!task) throw new NotFoundError('Task');

    // Scope: manager must own the parent engagement
    if (role === 'manager') {
      const eng = await Engagement.findByPk(task.engagementId, { transaction: t });
      if (!eng || eng.createdByUserId !== userId) {
        throw new ForbiddenError('You can only update tasks on your own engagements');
      }
    }

    // Validate the transition (throws on violation)
    validateTransition(task.status, toStatus, role, userId, task.assignedToUserId ?? null);

    const fromStatus = task.status;
    await task.update({ status: toStatus }, { transaction: t });

    // Write audit history row
    await TaskHistory.create(
      {
        taskId: task.id,
        changedByUserId: userId,
        fromStatus,
        toStatus,
        comment: comment ?? null,
      },
      { transaction: t }
    );

    return task;
  });
}

export async function assignTask(
  taskId: number,
  assignedToUserId: number | null,
  requestingUserId: number,
  role: UserRole
): Promise<Task> {
  const task = await Task.findByPk(taskId, {
    include: [{ model: Engagement, as: 'engagement' }],
  });
  if (!task) throw new NotFoundError('Task');

  // Manager scoping
  if (role === 'manager') {
    const eng = task.engagement as Engagement;
    if (eng.createdByUserId !== requestingUserId) {
      throw new ForbiddenError('You can only assign tasks on your own engagements');
    }
  }

  // Validate the assignee exists and is a team_member (if provided)
  if (assignedToUserId !== null) {
    const assignee = await User.findByPk(assignedToUserId);
    if (!assignee || !assignee.isActive) throw new NotFoundError('Assignee user');
    if (assignee.role !== 'team_member') {
      throw new ForbiddenError('Tasks can only be assigned to team members');
    }
  }

  await task.update({ assignedToUserId });
  return task;
}

export async function updateTaskDetails(
  taskId: number,
  input: { dueDate?: Date | null; notes?: string | null },
  requestingUserId: number,
  role: UserRole
): Promise<Task> {
  const task = await Task.findByPk(taskId, {
    include: [{ model: Engagement, as: 'engagement' }],
  });
  if (!task) throw new NotFoundError('Task');

  if (role === 'manager') {
    const eng = task.engagement as Engagement;
    if (eng.createdByUserId !== requestingUserId) {
      throw new ForbiddenError('You can only update tasks on your own engagements');
    }
  }

  if (role === 'team_member') {
    if (task.assignedToUserId !== requestingUserId) {
      throw new ForbiddenError('You can only update tasks assigned to you');
    }
  }

  await task.update(input);
  return task;
}
