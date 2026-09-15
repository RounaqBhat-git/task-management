import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getClients, getClientById, createClient, updateClient } from '../services/clientService';
import { AppError } from '../utils/errors';

const createSchema = z.object({
  name: z.string().min(1).max(150),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().max(30).optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  contactEmail: z.string().email().nullable().optional(),
  contactPhone: z.string().max(30).nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function listClientsHandler(
  _req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    res.json({ data: await getClients() });
  } catch (err) { next(err); }
}

export async function getClientHandler(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) throw new AppError('Invalid client id', 400);
    res.json({ data: await getClientById(id) });
  } catch (err) { next(err); }
}

export async function createClientHandler(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.errors[0].message, 422);
    res.status(201).json({ data: await createClient(parsed.data) });
  } catch (err) { next(err); }
}

export async function updateClientHandler(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) throw new AppError('Invalid client id', 400);
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.errors[0].message, 422);
    res.json({ data: await updateClient(id, parsed.data) });
  } catch (err) { next(err); }
}
