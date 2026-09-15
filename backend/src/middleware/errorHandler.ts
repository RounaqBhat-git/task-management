import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils';

/**
 * Global error handler — must be registered LAST in app.ts.
 * Converts AppError subclasses to structured JSON responses.
 * Unexpected errors return 500 without leaking internals.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.name,
      message: err.message,
    });
    return;
  }

  // Zod parse errors (when using z.parse directly instead of safeParse)
  if (err instanceof ZodError) {
    res.status(422).json({
      error: 'ValidationError',
      message: err.errors[0]?.message ?? 'Validation failed',
    });
    return;
  }

  // Sequelize unique constraint violation → 409
  if (
    typeof err === 'object' &&
    err !== null &&
    'name' in err &&
    (err as { name: string }).name === 'SequelizeUniqueConstraintError'
  ) {
    res.status(409).json({
      error: 'ConflictError',
      message: 'A record with those values already exists',
    });
    return;
  }

  // Unknown errors — log but don't expose internals
  console.error('[error]', err);
  res.status(500).json({
    error: 'InternalServerError',
    message: 'An unexpected error occurred',
  });
}
