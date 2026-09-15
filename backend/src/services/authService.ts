import bcrypt from 'bcryptjs';
import { User } from '../models';
import { signToken } from '../utils/jwt';
import { UnauthorizedError } from '../utils/errors';

export interface LoginResult {
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
}

export async function login(
  email: string,
  password: string
): Promise<LoginResult> {
  const user = await User.findOne({ where: { email: email.toLowerCase().trim() } });

  if (!user || !user.isActive) {
    // Same message for both "not found" and "wrong password" — avoids user enumeration
    throw new UnauthorizedError('Invalid email or password');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const token = signToken({ sub: user.id, role: user.role, name: user.name });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}
