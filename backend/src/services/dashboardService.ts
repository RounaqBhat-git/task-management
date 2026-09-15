import { Op } from 'sequelize';
import { Task, Engagement, User, TaskTemplate } from '../models';
import type { UserRole } from '../models/User';
import type { TaskStatus } from '../models/Task';

const OPEN_STATUSES: TaskStatus[] = [
  'not_started',
  'in_progress',
  'waiting_for_client',
  'ready_for_review',
  'changes_requested',
];

// Scope helpers

/**
 * Builds a WHERE fragment for tasks based on the requesting user's role:
 *   admin       → no restriction
 *   manager     → tasks on engagements they created
 *   team_member → only tasks assigned to them
 */
async function buildTaskWhere(
  userId: number,
  role: UserRole
): Promise<Record<string, unknown>> {
  if (role === 'admin') return {};

  if (role === 'manager') {
    const engagements = await Engagement.findAll({
      where: { createdByUserId: userId },
      attributes: ['id'],
    });
    return { engagementId: { [Op.in]: engagements.map((e) => e.id) } };
  }

  // team_member
  return { assignedToUserId: userId };
}

// Shared include for task lists

const TASK_INCLUDE = [
  { model: User, as: 'assignedTo', attributes: ['id', 'name'] },
  { model: TaskTemplate, as: 'taskTemplate', attributes: ['id', 'title'] },
  {
    model: Engagement,
    as: 'engagement',
    attributes: ['id', 'title', 'periodKey'],
  },
];

// Public service functions
export interface DashboardData {
  summary: {
    open: number;
    overdue: number;
    dueToday: number;
    waitingForClient: number;
    waitingForReview: number;
  };
  overdueTask: Task[];
  dueTodayTasks: Task[];
  waitingForClientTasks: Task[];
  waitingForReviewTasks: Task[];
  recentOpenTasks: Task[];
}

export async function getDashboard(
  userId: number,
  role: UserRole
): Promise<DashboardData> {
  const scopeWhere = await buildTaskWhere(userId, role);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Run all five queries in parallel
  const [
    openTasks,
    overdueTasks,
    dueTodayTasks,
    waitingForClientTasks,
    waitingForReviewTasks,
  ] = await Promise.all([
    // Open = any non-completed status
    Task.findAll({
      where: { ...scopeWhere, status: { [Op.in]: OPEN_STATUSES } },
      include: TASK_INCLUDE,
      order: [['dueDate', 'ASC NULLS LAST']],
      limit: 20,
    }),

    // Overdue = dueDate < today AND not completed
    Task.findAll({
      where: {
        ...scopeWhere,
        status: { [Op.in]: OPEN_STATUSES },
        dueDate: { [Op.lt]: today },
      },
      include: TASK_INCLUDE,
      order: [['dueDate', 'ASC']],
    }),

    // Due today = dueDate >= today AND dueDate < tomorrow
    Task.findAll({
      where: {
        ...scopeWhere,
        status: { [Op.in]: OPEN_STATUSES },
        dueDate: { [Op.gte]: today, [Op.lt]: tomorrow },
      },
      include: TASK_INCLUDE,
      order: [['dueDate', 'ASC']],
    }),

    // Waiting for client
    Task.findAll({
      where: { ...scopeWhere, status: 'waiting_for_client' },
      include: TASK_INCLUDE,
      order: [['updatedAt', 'DESC']],
    }),

    // Waiting for review
    Task.findAll({
      where: { ...scopeWhere, status: 'ready_for_review' },
      include: TASK_INCLUDE,
      order: [['updatedAt', 'DESC']],
    }),
  ]);

  return {
    summary: {
      open: openTasks.length,
      overdue: overdueTasks.length,
      dueToday: dueTodayTasks.length,
      waitingForClient: waitingForClientTasks.length,
      waitingForReview: waitingForReviewTasks.length,
    },
    overdueTask: overdueTasks,
    dueTodayTasks,
    waitingForClientTasks,
    waitingForReviewTasks,
    recentOpenTasks: openTasks,
  };
}
