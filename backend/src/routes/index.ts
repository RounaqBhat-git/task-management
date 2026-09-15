import { Router } from 'express';
import authRouter from './auth';
import engagementsRouter from './engagements';
import tasksRouter from './tasks';
import usersRouter from './users';
import clientsRouter from './clients';
import serviceTypesRouter from './serviceTypes';
import dashboardRouter from './dashboard';

const router = Router();

router.use('/auth', authRouter);
router.use('/engagements', engagementsRouter);
router.use('/tasks', tasksRouter);
router.use('/users', usersRouter);
router.use('/clients', clientsRouter);
router.use('/service-types', serviceTypesRouter);
router.use('/dashboard', dashboardRouter);

export default router;
