import bcrypt from 'bcryptjs';
import { User } from '../models';
import { NotFoundError, ConflictError } from '../utils/errors';
import type { UserRole } from '../models/User';

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserInput {
  name?: string;
  role?: UserRole;
  isActive?: boolean;
}

const SAFE_ATTRS = ['id', 'name', 'email', 'role', 'isActive', 'createdAt'];

export async function getUsers(): Promise<User[]> {
  return User.findAll({ attributes: SAFE_ATTRS, order: [['name', 'ASC']] });
}

/**
 * Returns only active team_member users.
 * Accessible to managers and admins — used to populate assign dropdowns.
 */
export async function getTeamMembers(): Promise<User[]> {
  return User.findAll({
    where: { role: 'team_member', isActive: true },
    attributes: ['id', 'name', 'email'],
    order: [['name', 'ASC']],
  });
}

export async function getUserById(id: number): Promise<User> {
  const user = await User.findByPk(id, { attributes: SAFE_ATTRS });
  if (!user) throw new NotFoundError('User');
  return user;
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const existing = await User.findOne({
    where: { email: input.email.toLowerCase().trim() },
  });
  if (existing) throw new ConflictError('A user with that email already exists');

  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await User.create({
    name: input.name.trim(),
    email: input.email.toLowerCase().trim(),
    passwordHash,
    role: input.role,
    isActive: true,
  });

  return getUserById(user.id);
}

export async function updateUser(id: number, input: UpdateUserInput): Promise<User> {
  const user = await User.findByPk(id);
  if (!user) throw new NotFoundError('User');
  await user.update(input);
  return getUserById(id);
}
