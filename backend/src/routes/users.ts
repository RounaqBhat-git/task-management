import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/requireRole';
import {
  listUsersHandler,
  getUserHandler,
  createUserHandler,
  updateUserHandler,
  listTeamMembersHandler,
} from '../controllers/userController';

const router = Router();

router.use(authenticate);

// GET /api/v1/users/team-members — manager & admin (used for assign dropdowns)
// Must be registered BEFORE /:id so "team-members" isn't matched as a param
router.get('/team-members', requireRole('admin', 'manager'), listTeamMembersHandler);

// All remaining user management routes are admin-only
router.get('/', requireRole('admin'), listUsersHandler);
router.get('/:id', requireRole('admin'), getUserHandler);
router.post('/', requireRole('admin'), createUserHandler);
router.patch('/:id', requireRole('admin'), updateUserHandler);

export default router;
