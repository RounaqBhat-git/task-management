import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/requireRole';
import {
  listClientsHandler,
  getClientHandler,
  createClientHandler,
  updateClientHandler,
} from '../controllers/clientController';

const router = Router();

router.use(authenticate);

// All authenticated roles can read clients
router.get('/', listClientsHandler);
router.get('/:id', getClientHandler);

// Only admin can create or update clients
router.post('/', requireRole('admin'), createClientHandler);
router.patch('/:id', requireRole('admin'), updateClientHandler);

export default router;
