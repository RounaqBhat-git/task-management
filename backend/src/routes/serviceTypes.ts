import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/requireRole';
import {
  listServiceTypesHandler,
  getServiceTypeHandler,
  createServiceTypeHandler,
  updateServiceTypeHandler,
  addTaskTemplateHandler,
  deleteTaskTemplateHandler,
} from '../controllers/serviceTypeController';

const router = Router();

router.use(authenticate);

// All authenticated roles can read service types (needed when creating engagements)
router.get('/', listServiceTypesHandler);
router.get('/:id', getServiceTypeHandler);

// Only admin can mutate service types and their templates
router.post('/', requireRole('admin'), createServiceTypeHandler);
router.patch('/:id', requireRole('admin'), updateServiceTypeHandler);
router.post('/:id/task-templates', requireRole('admin'), addTaskTemplateHandler);
router.delete('/:id/task-templates/:templateId', requireRole('admin'), deleteTaskTemplateHandler);

export default router;
