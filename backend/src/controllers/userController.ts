import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getUsers, getUserById, createUser, updateUser, getTeamMembers } from '../services/userService';
import { AppError } from '../utils/errors';

const createSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['admin', 'manager', 'team_member']),
});

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  role: z.enum(['admin', 'manager', 'team_member']).optional(),
  isActive: z.boolean().optional(),
});

export async function listUsersHandler(
  _req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    res.json({ data: await getUsers() });
  } catch (err) { next(err); }
}

export async function getUserHandler(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) throw new AppError('Invalid user id', 400);
    res.json({ data: await getUserById(id) });
  } catch (err) { next(err); }
}

export async function createUserHandler(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.errors[0].message, 422);
    res.status(201).json({ data: await createUser(parsed.data) });
  } catch (err) { next(err); }
}

export async function updateUserHandler(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) throw new AppError('Invalid user id', 400);
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.errors[0].message, 422);
    res.json({ data: await updateUser(id, parsed.data) });
  } catch (err) { next(err); }
}

export async function listTeamMembersHandler(
  _req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    res.json({ data: await getTeamMembers() });
  } catch (err) { next(err); }
}
