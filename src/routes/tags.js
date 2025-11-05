import express from 'express';
import { adminClient } from '../models/supabaseClient.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const prefix = (req.query.prefix || '').toString();
    const limit = Math.min(Number(req.query.limit || 10), 50);
    if (!prefix) {
      const { data, error } = await adminClient.from('tags').select('*').limit(limit);
      if (error) throw error;
      return res.json(data);
    }
    const { data, error } = await adminClient.from('tags').select('*').ilike('value', `${prefix}%`).limit(limit);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'tags_fetch_failed' });
  }
});

export default router;