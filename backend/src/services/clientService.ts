import { Client } from '../models';
import { NotFoundError, ConflictError } from '../utils/errors';

export interface CreateClientInput {
  name: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface UpdateClientInput {
  name?: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  isActive?: boolean;
}

export async function getClients(): Promise<Client[]> {
  return Client.findAll({ order: [['name', 'ASC']] });
}

export async function getClientById(id: number): Promise<Client> {
  const client = await Client.findByPk(id);
  if (!client) throw new NotFoundError('Client');
  return client;
}

export async function createClient(input: CreateClientInput): Promise<Client> {
  const existing = await Client.findOne({ where: { name: input.name.trim() } });
  if (existing) throw new ConflictError('A client with that name already exists');

  return Client.create({
    name: input.name.trim(),
    contactEmail: input.contactEmail ?? null,
    contactPhone: input.contactPhone ?? null,
    isActive: true,
  });
}

export async function updateClient(
  id: number,
  input: UpdateClientInput
): Promise<Client> {
  const client = await Client.findByPk(id);
  if (!client) throw new NotFoundError('Client');
  await client.update(input);
  return client;
}
