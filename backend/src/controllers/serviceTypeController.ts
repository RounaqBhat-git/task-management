import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  getServiceTypes,
  getServiceTypeById,
  createServiceType,
  updateServiceType,
  addTaskTemplate,
  deleteTaskTemplate,
} from '../services/serviceTypeService';
import { AppError } from '../utils/errors';

const createServiceTypeSchema = z.object({
  name: z.string().min(1).max(150),
  description: z.string().max(1000).optional(),
  recurrenceType: z.enum(['one_time', 'monthly', 'quarterly', 'annually']),
});

const updateServiceTypeSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  description: z.string().max(1000).optional(),
  recurrenceType: z.enum(['one_time', 'monthly', 'quarterly', 'annually']).optional(),
  isActive: z.boolean().optional(),
});

const taskTemplateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  orderIndex: z.number().int().nonnegative().optional(),
});

export async function listServiceTypesHandler(
  _req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    res.json({ data: await getServiceTypes() });
  } catch (err) { next(err); }
}

export async function getServiceTypeHandler(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) throw new AppError('Invalid service type id', 400);
    res.json({ data: await getServiceTypeById(id) });
  } catch (err) { next(err); }
}

export async function createServiceTypeHandler(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    const parsed = createServiceTypeSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.errors[0].message, 422);
    res.status(201).json({ data: await createServiceType(parsed.data) });
  } catch (err) { next(err); }
}

export async function updateServiceTypeHandler(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) throw new AppError('Invalid service type id', 400);
    const parsed = updateServiceTypeSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.errors[0].message, 422);
    res.json({ data: await updateServiceType(id, parsed.data) });
  } catch (err) { next(err); }
}

export async function addTaskTemplateHandler(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    const serviceTypeId = Number(req.params.id);
    if (isNaN(serviceTypeId)) throw new AppError('Invalid service type id', 400);
    const parsed = taskTemplateSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.errors[0].message, 422);
    res.status(201).json({ data: await addTaskTemplate(serviceTypeId, parsed.data) });
  } catch (err) { next(err); }
}

export async function deleteTaskTemplateHandler(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    const serviceTypeId = Number(req.params.id);
    const templateId = Number(req.params.templateId);
    if (isNaN(serviceTypeId) || isNaN(templateId)) throw new AppError('Invalid id', 400);
    await deleteTaskTemplate(serviceTypeId, templateId);
    res.status(204).send();
  } catch (err) { next(err); }
}
