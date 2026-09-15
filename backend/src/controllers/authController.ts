import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { login } from '../services/authService';
import { AppError } from '../utils/errors';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export async function loginHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0].message, 422);
    }

    const { email, password } = parsed.data;
    const result = await login(email, password);

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/auth/me
 * Returns the currently authenticated user from the JWT payload.
 * Useful for the frontend to rehydrate session on page load.
 */
export function meHandler(req: Request, res: Response): void {
  res.json({ user: req.user });
}
