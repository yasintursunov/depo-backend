import express from 'express';
import { requireAdmin } from '../middleware/roleMiddleware.js';
import { adminClient } from '../models/supabaseClient.js';

const router = express.Router();

router.get('/users', requireAdmin, async (req, res) => {
  const { limit = 100, offset = 0 } = req.query;
  const { data, error } = await adminClient.from('users').select('*').order('created_at', { ascending: false }).range(Number(offset), Number(offset) + Number(limit) - 1);
  if (error) return res.status(500).json({ error: 'list_failed' });
  res.json(data);
});

router.put('/users/:id', requireAdmin, async (req, res) => {
  const id = req.params.id;
  const { role, blocked } = req.body;
  const { data, error } = await adminClient.from('users').update({ role, blocked }).eq('id', id).select().single();
  if (error) return res.status(400).json({ error: 'update_failed' });
  res.json(data);
});

router.delete('/users/:id', requireAdmin, async (req, res) => {
  const id = req.params.id;
  const { data, error } = await adminClient.from('users').delete().eq('id', id).select();
  if (error) return res.status(400).json({ error: 'delete_failed' });
  res.json({ message: 'deleted' });
});

export default router;