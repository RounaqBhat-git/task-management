import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  createEngagement,
  rolloverEngagement,
  getEngagements,
  getEngagementById,
  updateEngagement,
} from '../services/engagementService';
import { AppError } from '../utils/errors';

// Zod schemas

const createSchema = z.object({
  clientId: z.number().int().positive(),
  serviceTypeId: z.number().int().positive(),
  title: z.string().min(1).max(255),
  periodDate: z.string().datetime({ message: 'periodDate must be an ISO date string' }),
  startDate: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional(),
  notes: z.string().max(2000).optional(),
});

const updateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  status: z.enum(['active', 'completed', 'cancelled']).optional(),
  dueDate: z.string().datetime().optional(),
  notes: z.string().max(2000).optional(),
});

// Handlers

export async function listEngagementsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const engagements = await getEngagements(user.sub, user.role);
    res.json({ data: engagements });
  } catch (err) {
    next(err);
  }
}

export async function getEngagementHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const id = Number(req.params.id);
    if (isNaN(id)) throw new AppError('Invalid engagement id', 400);
    const engagement = await getEngagementById(id, user.sub, user.role);
    res.json({ data: engagement });
  } catch (err) {
    next(err);
  }
}

export async function createEngagementHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0].message, 422);
    }
    const user = req.user!;
    const d = parsed.data;
    const engagement = await createEngagement({
      clientId: d.clientId,
      serviceTypeId: d.serviceTypeId,
      title: d.title,
      periodDate: new Date(d.periodDate),
      startDate: d.startDate ? new Date(d.startDate) : undefined,
      dueDate: d.dueDate ? new Date(d.dueDate) : undefined,
      notes: d.notes,
      createdByUserId: user.sub,
    });
    res.status(201).json({ data: engagement });
  } catch (err) {
    next(err);
  }
}

export async function rolloverEngagementHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const id = Number(req.params.id);
    if (isNaN(id)) throw new AppError('Invalid engagement id', 400);
    const engagement = await rolloverEngagement(id, user.sub, user.role);
    res.status(201).json({ data: engagement });
  } catch (err) {
    next(err);
  }
}

export async function updateEngagementHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0].message, 422);
    }
    const user = req.user!;
    const id = Number(req.params.id);
    if (isNaN(id)) throw new AppError('Invalid engagement id', 400);
    const d = parsed.data;
    const engagement = await updateEngagement(
      id,
      {
        ...d,
        dueDate: d.dueDate ? new Date(d.dueDate) : undefined,
      },
      user.sub,
      user.role
    );
    res.json({ data: engagement });
  } catch (err) {
    next(err);
  }
}
