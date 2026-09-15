import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { dashboardHandler } from '../controllers/dashboardController';

const router = Router();

router.use(authenticate);

// GET /api/v1/dashboard — scoped by role automatically
router.get('/', dashboardHandler);

export default router;
