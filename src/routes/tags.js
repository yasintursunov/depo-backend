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

router.post('/', async (req, res) => {
  try {
    const { value } = req.body;
    const { data, error } = await adminClient.from('tags').insert({ value }).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { console.error(err); res.status(400).json({ error: 'create_failed' }); }
});


router.post('/inventories/:inventoryId/tags/:tagId', async (req, res) => {
  try {
    const { inventoryId, tagId } = req.params;
    const { data, error } = await adminClient.from('inventory_tags').insert({ inventory_id: inventoryId, tag_id: tagId }).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { console.error(err); res.status(400).json({ error: 'add_failed' }); }
});


router.delete('/inventories/:inventoryId/tags/:tagId', async (req, res) => {
  try {
    const { inventoryId, tagId } = req.params;
    const { data, error } = await adminClient.from('inventory_tags').delete().eq('inventory_id', inventoryId).eq('tag_id', tagId).select();
    if (error) throw error;
    res.json({ message: 'deleted' });
  } catch (err) { console.error(err); res.status(400).json({ error: 'delete_failed' }); }
});


export default router;