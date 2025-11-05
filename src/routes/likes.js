import express from 'express';
import { ensureAuthenticated } from '../middleware/authMiddleware.js';
import * as likeService from '../services/likeService.js';

const router = express.Router();

router.post('/:itemId/like', ensureAuthenticated, async (req, res) => {
  try {
    const itemId = req.params.itemId;
    const userId = req.user.id;
    const data = await likeService.likeItem(itemId, userId);
    res.json(data);
  } catch (err) {
    if (err.code === 'ALREADY_LIKED') return res.status(409).json({ error: 'already_liked' });
    console.error(err);
    res.status(400).json({ error: 'like_failed' });
  }
});

router.post('/:itemId/unlike', ensureAuthenticated, async (req, res) => {
  try {
    const itemId = req.params.itemId;
    const userId = req.user.id;
    await likeService.unlikeItem(itemId, userId);
    res.json({ message: 'unliked' });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'unlike_failed' });
  }
});

export default router;