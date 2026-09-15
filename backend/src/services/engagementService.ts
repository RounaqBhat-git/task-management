import { UniqueConstraintError } from 'sequelize';
import sequelize from '../db/sequelize';
import { Engagement, Task, TaskTemplate, ServiceType, Client } from '../models';
import { buildPeriodKey, nextPeriodKey, periodStartDate } from '../utils/periodKey';
import { NotFoundError, ConflictError, ForbiddenError } from '../utils/errors';
import type { EngagementStatus } from '../models/Engagement';

// Input types

export interface CreateEngagementInput {
  clientId: number;
  serviceTypeId: number;
  title: string;
  periodDate: Date;   // used to derive periodKey
  startDate?: Date;
  dueDate?: Date;
  notes?: string;
  createdByUserId: number;
}

export interface UpdateEngagementInput {
  title?: string;
  status?: EngagementStatus;
  dueDate?: Date;
  notes?: string;
}

// Helpers

async function fetchServiceType(serviceTypeId: number) {
  const st = await ServiceType.findByPk(serviceTypeId);
  if (!st) throw new NotFoundError('ServiceType');
  return st;
}

async function fetchClient(clientId: number) {
  const client = await Client.findByPk(clientId);
  if (!client) throw new NotFoundError('Client');
  return client;
}

/**
 * Creates an Engagement + its Tasks from the service's TaskTemplates
 * inside a single transaction. Throws ConflictError on duplicate periodKey.
 */
async function createEngagementWithTasks(
  input: CreateEngagementInput,
  periodKey: string
): Promise<Engagement> {
  return sequelize.transaction(async (t) => {
    // Create the engagement row
    let engagement: Engagement;
    try {
      engagement = await Engagement.create(
        {
          clientId: input.clientId,
          serviceTypeId: input.serviceTypeId,
          createdByUserId: input.createdByUserId,
          title: input.title,
          periodKey,
          startDate: input.startDate ?? null,
          dueDate: input.dueDate ?? null,
          notes: input.notes ?? null,
          status: 'active',
        },
        { transaction: t }
      );
    } catch (err) {
      if (err instanceof UniqueConstraintError) {
        throw new ConflictError(
          `An engagement for this client, service, and period (${periodKey}) already exists`
        );
      }
      throw err;
    }

    // Fetch task templates ordered by orderIndex
    const templates = await TaskTemplate.findAll({
      where: { serviceTypeId: input.serviceTypeId },
      order: [['orderIndex', 'ASC']],
      transaction: t,
    });

    // Bulk-create one Task per template
    if (templates.length > 0) {
      await Task.bulkCreate(
        templates.map((tpl) => ({
          engagementId: engagement.id,
          taskTemplateId: tpl.id,
          title: tpl.title,
          description: tpl.description ?? null,
          status: 'not_started' as const,
          dueDate: input.dueDate ?? null,
          assignedToUserId: null,
        })),
        { transaction: t }
      );
    }

    return engagement;
  });
}

// Public service functions

export async function createEngagement(
  input: CreateEngagementInput
): Promise<Engagement> {
  const serviceType = await fetchServiceType(input.serviceTypeId);
  await fetchClient(input.clientId); // validates client exists

  const periodKey = buildPeriodKey(serviceType.recurrenceType, input.periodDate);
  return createEngagementWithTasks(input, periodKey);
}

/**
 * Rolls over a recurring engagement into the next period.
 * Copies title, client, service, due offset — creates fresh tasks.
 * Idempotent: calling twice for the same period returns ConflictError.
 */
export async function rolloverEngagement(
  engagementId: number,
  requestingUserId: number,
  requestingUserRole: string
): Promise<Engagement> {
  const source = await Engagement.findByPk(engagementId, {
    include: [{ model: ServiceType, as: 'serviceType' }],
  });
  if (!source) throw new NotFoundError('Engagement');

  // Managers may only roll over their own engagements
  if (
    requestingUserRole === 'manager' &&
    source.createdByUserId !== requestingUserId
  ) {
    throw new ForbiddenError('You can only roll over engagements you created');
  }

  const serviceType = source.serviceType!;
  if (serviceType.recurrenceType === 'one_time') {
    throw new ConflictError('One-time engagements cannot be rolled over');
  }

  const newPeriodKey = nextPeriodKey(serviceType.recurrenceType, source.periodKey);
  const newStartDate = periodStartDate(serviceType.recurrenceType, newPeriodKey);

  // Calculate new dueDate by preserving the original offset if present
  let newDueDate: Date | undefined;
  if (source.dueDate && source.startDate) {
    const offsetMs =
      new Date(source.dueDate).getTime() - new Date(source.startDate).getTime();
    newDueDate = new Date(newStartDate.getTime() + offsetMs);
  }

  return createEngagementWithTasks(
    {
      clientId: source.clientId,
      serviceTypeId: source.serviceTypeId,
      createdByUserId: source.createdByUserId,
      title: source.title,
      periodDate: newStartDate,
      startDate: newStartDate,
      dueDate: newDueDate,
      notes: source.notes ?? undefined,
    },
    newPeriodKey
  );
}

export async function getEngagements(
  requestingUserId: number,
  requestingUserRole: string
): Promise<Engagement[]> {
  const where =
    requestingUserRole === 'manager' ? { createdByUserId: requestingUserId } : {};

  return Engagement.findAll({
    where,
    include: [
      { model: Client, as: 'client', attributes: ['id', 'name'] },
      { model: ServiceType, as: 'serviceType', attributes: ['id', 'name', 'recurrenceType'] },
    ],
    order: [['createdAt', 'DESC']],
  });
}

export async function getEngagementById(
  engagementId: number,
  requestingUserId: number,
  requestingUserRole: string
): Promise<Engagement> {
  const engagement = await Engagement.findByPk(engagementId, {
    include: [
      { model: Client, as: 'client', attributes: ['id', 'name'] },
      { model: ServiceType, as: 'serviceType', attributes: ['id', 'name', 'recurrenceType'] },
      {
        model: Task,
        as: 'tasks',
        include: [{ model: TaskTemplate, as: 'taskTemplate', attributes: ['id', 'title'] }],
      },
    ],
  });

  if (!engagement) throw new NotFoundError('Engagement');

  if (
    requestingUserRole === 'manager' &&
    engagement.createdByUserId !== requestingUserId
  ) {
    throw new ForbiddenError('You do not have access to this engagement');
  }

  return engagement;
}

export async function updateEngagement(
  engagementId: number,
  input: UpdateEngagementInput,
  requestingUserId: number,
  requestingUserRole: string
): Promise<Engagement> {
  const engagement = await Engagement.findByPk(engagementId);
  if (!engagement) throw new NotFoundError('Engagement');

  if (
    requestingUserRole === 'manager' &&
    engagement.createdByUserId !== requestingUserId
  ) {
    throw new ForbiddenError('You can only update engagements you created');
  }

  await engagement.update(input);
  return engagement;
}
