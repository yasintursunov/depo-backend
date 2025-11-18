import express from 'express';
import * as userController from '../controllers/userController.js';
import { ensureAuthenticated } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.get('/me', ensureAuthenticated, userController.getCurrentUser);

router.put('/me', ensureAuthenticated, async (req, res) => {
  try {
    const id = req.user?.id;
    if (!id) return res.status(401).json({ error: 'unauthenticated' });
    const payload = req.body || {};
    const patch = {};
    if (payload.name !== undefined) patch.name = payload.name;
    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: 'nothing_to_update' });
    }
    const { data, error } = await adminClient.from('users').update(patch).eq('id', id).select().single();
    if (error) {
      console.error('PUT /users/me update error:', error);
      return res.status(400).json({ error: 'update_failed', details: error.message || error });
    }

    const safe = {
      id: data.id,
      google_id: data.google_id,
      name: data.name,
      email: data.email,
      role: data.role,
      blocked: data.blocked,
      created_at: data.created_at
    };
    res.json({ user: safe });
  } catch (err) {
    console.error('PUT /users/me catch error:', err);
    res.status(500).json({ error: 'update_failed' });
  }
});


// Admin user list & user management
router.get('/', ensureAuthenticated, requireAdmin, userController.listUsers);
router.put('/:id', ensureAuthenticated, requireAdmin, userController.updateUser);
router.delete('/:id', ensureAuthenticated, requireAdmin, userController.deleteUser);



export default router;
