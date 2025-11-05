import express from 'express';
import { adminClient } from '../models/supabaseClient.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const q = (req.query.q || '').toString();
    if (!q) return res.json({ inventories: [], items: [] });
    const limit = Math.min(Number(req.query.limit || 20), 100);
    const invs = await adminClient.from('inventories').select('*').textSearch('search_vector', q).limit(limit);
    const items = await adminClient.from('items').select('*').textSearch('search_vector', q).limit(limit);
    
    const invData = invs.data ?? invs;
    const itemData = items.data ?? items;
    res.json({ inventories: invData, items: itemData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'search_failed' });
  }
});

export default router;
