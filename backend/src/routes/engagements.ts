import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/requireRole';
import {
  listEngagementsHandler,
  getEngagementHandler,
  createEngagementHandler,
  rolloverEngagementHandler,
  updateEngagementHandler,
} from '../controllers/engagementController';

const router = Router();

// All engagement routes require authentication
router.use(authenticate);

// GET /api/v1/engagements — admin sees all, manager sees own
router.get('/', listEngagementsHandler);

// GET /api/v1/engagements/:id
router.get('/:id', getEngagementHandler);

// POST /api/v1/engagements — manager & admin only
router.post('/', requireRole('admin', 'manager'), createEngagementHandler);

// PATCH /api/v1/engagements/:id
router.patch('/:id', requireRole('admin', 'manager'), updateEngagementHandler);

// POST /api/v1/engagements/:id/rollover — manager & admin only
router.post('/:id/rollover', requireRole('admin', 'manager'), rolloverEngagementHandler);

export default router;
