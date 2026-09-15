import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  getTasks,
  getTaskById,
  updateTaskStatus,
  assignTask,
  updateTaskDetails,
} from '../services/taskService';
import { AppError } from '../utils/errors';
import type { TaskStatus } from '../models/Task';

const VALID_STATUSES: TaskStatus[] = [
  'not_started',
  'in_progress',
  'waiting_for_client',
  'ready_for_review',
  'changes_requested',
  'completed',
];

const statusSchema = z.object({
  status: z.enum([
    'not_started',
    'in_progress',
    'waiting_for_client',
    'ready_for_review',
    'changes_requested',
    'completed',
  ]),
  comment: z.string().max(1000).optional(),
});

const assignSchema = z.object({
  assignedToUserId: z.number().int().positive().nullable(),
});

const detailsSchema = z.object({
  dueDate: z.string().datetime().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

// Handlers

export async function listTasksHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const engagementId = req.query.engagementId
      ? Number(req.query.engagementId)
      : undefined;
    const status =
      req.query.status && VALID_STATUSES.includes(req.query.status as TaskStatus)
        ? (req.query.status as TaskStatus)
        : undefined;

    const tasks = await getTasks(user.sub, user.role, { engagementId, status });
    res.json({ data: tasks });
  } catch (err) {
    next(err);
  }
}

export async function getTaskHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const id = Number(req.params.id);
    if (isNaN(id)) throw new AppError('Invalid task id', 400);
    const task = await getTaskById(id, user.sub, user.role);
    res.json({ data: task });
  } catch (err) {
    next(err);
  }
}

export async function updateTaskStatusHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0].message, 422);
    }
    const user = req.user!;
    const id = Number(req.params.id);
    if (isNaN(id)) throw new AppError('Invalid task id', 400);

    const task = await updateTaskStatus(
      id,
      parsed.data.status,
      parsed.data.comment,
      user.sub,
      user.role
    );
    res.json({ data: task });
  } catch (err) {
    next(err);
  }
}

export async function assignTaskHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = assignSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0].message, 422);
    }
    const user = req.user!;
    const id = Number(req.params.id);
    if (isNaN(id)) throw new AppError('Invalid task id', 400);

    const task = await assignTask(
      id,
      parsed.data.assignedToUserId,
      user.sub,
      user.role
    );
    res.json({ data: task });
  } catch (err) {
    next(err);
  }
}

export async function updateTaskDetailsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = detailsSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0].message, 422);
    }
    const user = req.user!;
    const id = Number(req.params.id);
    if (isNaN(id)) throw new AppError('Invalid task id', 400);
    const d = parsed.data;

    const task = await updateTaskDetails(
      id,
      {
        dueDate: d.dueDate !== undefined
          ? (d.dueDate ? new Date(d.dueDate) : null)
          : undefined,
        notes: d.notes,
      },
      user.sub,
      user.role
    );
    res.json({ data: task });
  } catch (err) {
    next(err);
  }
}
