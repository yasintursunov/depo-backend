import express from 'express';
import { testConnection } from '../models/supabaseClient.js';

const router = express.Router();

router.get('/supabase', async (req, res) => {
  try {
    const r = await testConnection();
    res.json({ ok: true, result: r });
  } catch (err) {
    console.error('Debug supabase error:', err);
    res.status(500).json({ ok: false, message: err.message, details: err.original ? String(err.original) : undefined });
  }
});

export default router;
