import { Request, Response, NextFunction } from 'express';
import type { UserRole } from '../models/User';
import { ForbiddenError, UnauthorizedError } from '../utils';

/**
 * Usage: requireRole('admin', 'manager')
 * Must be placed AFTER authenticate in the middleware chain.
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }
    if (!roles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Role '${req.user.role}' is not allowed to perform this action`
        )
      );
    }
    next();
  };
}
