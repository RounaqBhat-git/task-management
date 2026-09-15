import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/requireRole';
import {
  listTasksHandler,
  getTaskHandler,
  updateTaskStatusHandler,
  assignTaskHandler,
  updateTaskDetailsHandler,
} from '../controllers/taskController';

const router = Router();

// All task routes require authentication
router.use(authenticate);

// GET  /api/v1/tasks              — scoped by role
// GET  /api/v1/tasks?engagementId=X&status=Y
router.get('/', listTasksHandler);

// GET  /api/v1/tasks/:id
router.get('/:id', getTaskHandler);

// PATCH /api/v1/tasks/:id/status  — all authenticated roles (workflow validates internally)
router.patch('/:id/status', updateTaskStatusHandler);

// PATCH /api/v1/tasks/:id/assign  — manager & admin only
router.patch('/:id/assign', requireRole('admin', 'manager'), assignTaskHandler);

// PATCH /api/v1/tasks/:id         — dueDate / notes (manager, admin, assigned team member)
router.patch('/:id', updateTaskDetailsHandler);

export default router;
