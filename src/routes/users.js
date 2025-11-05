import express from 'express';
import * as userController from '../controllers/userController.js';
import { ensureAuthenticated } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.get('/me', ensureAuthenticated, userController.getCurrentUser);

// Admin user list & user management
router.get('/', ensureAuthenticated, requireAdmin, userController.listUsers);
router.put('/:id', ensureAuthenticated, requireAdmin, userController.updateUser);
router.delete('/:id', ensureAuthenticated, requireAdmin, userController.deleteUser);



export default router;
