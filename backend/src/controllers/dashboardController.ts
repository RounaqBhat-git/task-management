import { Request, Response, NextFunction } from 'express';
import { getDashboard } from '../services/dashboardService';

export async function dashboardHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const data = await getDashboard(user.sub, user.role);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}
