import jwt from 'jsonwebtoken';
import config from '../config';
import type { UserRole } from '../models/User';

export interface JwtPayload {
  sub: number;   // user id
  role: UserRole;
  name: string;
}

export function signToken(payload: JwtPayload): string {
  // Cast expiresIn to `any` — the value is a valid zeit/ms string (e.g. "8h")
  // but @types/jsonwebtoken is stricter than the runtime accepts.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as any,
  });
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, config.jwt.secret);
  if (typeof decoded === 'string') {
    throw new Error('Unexpected JWT string payload');
  }
  return decoded as unknown as JwtPayload;
}
