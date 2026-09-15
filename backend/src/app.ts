import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import router from './routes';
import { errorHandler } from './middleware/errorHandler';
import { NotFoundError } from './utils/errors';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Health check — no auth required
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// All API routes
app.use('/api/v1', router);

// 404 for any unmatched route
app.use((_req: Request, _res: Response, next: NextFunction) => {
  next(new NotFoundError('Route'));
});

// Global error handler — must be last
app.use(errorHandler);

export default app;
