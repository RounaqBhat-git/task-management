import { Router } from 'express';
import { loginHandler, meHandler } from '../controllers/authController';
import { authenticate } from '../middleware/authenticate';

const router = Router();

// POST /api/v1/auth/login
router.post('/login', loginHandler);

// GET /api/v1/auth/me  (requires valid JWT)
router.get('/me', authenticate, meHandler);

export default router;
