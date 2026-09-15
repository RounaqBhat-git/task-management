import { ServiceType, TaskTemplate } from '../models';
import { NotFoundError, ConflictError } from '../utils/errors';
import type { RecurrenceType } from '../models/ServiceType';

export interface CreateServiceTypeInput {
  name: string;
  description?: string;
  recurrenceType: RecurrenceType;
}

export interface CreateTaskTemplateInput {
  title: string;
  description?: string;
  orderIndex?: number;
}

export async function getServiceTypes(): Promise<ServiceType[]> {
  return ServiceType.findAll({
    include: [{ model: TaskTemplate, as: 'taskTemplates', order: [['orderIndex', 'ASC']] }],
    order: [['name', 'ASC']],
  });
}

export async function getServiceTypeById(id: number): Promise<ServiceType> {
  const st = await ServiceType.findByPk(id, {
    include: [{ model: TaskTemplate, as: 'taskTemplates', order: [['orderIndex', 'ASC']] }],
  });
  if (!st) throw new NotFoundError('ServiceType');
  return st;
}

export async function createServiceType(
  input: CreateServiceTypeInput
): Promise<ServiceType> {
  const existing = await ServiceType.findOne({ where: { name: input.name.trim() } });
  if (existing) throw new ConflictError('A service type with that name already exists');

  return ServiceType.create({
    name: input.name.trim(),
    description: input.description ?? null,
    recurrenceType: input.recurrenceType,
    isActive: true,
  });
}

export async function updateServiceType(
  id: number,
  input: Partial<CreateServiceTypeInput> & { isActive?: boolean }
): Promise<ServiceType> {
  const st = await ServiceType.findByPk(id);
  if (!st) throw new NotFoundError('ServiceType');
  await st.update(input);
  return getServiceTypeById(id);
}

export async function addTaskTemplate(
  serviceTypeId: number,
  input: CreateTaskTemplateInput
): Promise<TaskTemplate> {
  const st = await ServiceType.findByPk(serviceTypeId);
  if (!st) throw new NotFoundError('ServiceType');

  // Default orderIndex = current max + 1
  const maxOrder = await TaskTemplate.max<number, TaskTemplate>('orderIndex', {
    where: { serviceTypeId },
  });
  const orderIndex = input.orderIndex ?? (typeof maxOrder === 'number' ? maxOrder + 1 : 1);

  return TaskTemplate.create({
    serviceTypeId,
    title: input.title.trim(),
    description: input.description ?? null,
    orderIndex,
  });
}

export async function deleteTaskTemplate(
  serviceTypeId: number,
  templateId: number
): Promise<void> {
  const tpl = await TaskTemplate.findOne({
    where: { id: templateId, serviceTypeId },
  });
  if (!tpl) throw new NotFoundError('TaskTemplate');
  await tpl.destroy();
}
