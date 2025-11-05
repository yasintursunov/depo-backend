import * as userService from '../services/userService.js';

export async function getCurrentUser(req, res) {
  if (!req.user) return res.status(401).json({ error: 'unauthenticated' });
  const user = await userService.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'not_found' });
  const safe = {
    id: user.id,
    google_id: user.google_id,
    name: user.name,
    email: user.email,
    role: user.role,
    blocked: user.blocked,
    created_at: user.created_at
  };
  res.json({ user: safe });
}

export async function listUsers(req, res) {
  const { limit = 50, offset = 0 } = req.query;
  try {
    const users = await userService.listUsers({ limit: Number(limit), offset: Number(offset) });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'list_failed' });
  }
}

export async function updateUser(req, res) {
  const { id } = req.params;
  const payload = req.body || {};
  const patch = {};
  if (payload.name !== undefined) patch.name = payload.name;
  if (payload.role !== undefined) patch.role = payload.role;
  if (payload.blocked !== undefined) patch.blocked = payload.blocked;
  try {
    const updated = await userService.updateUser(id, patch);
    res.json(updated);
  } catch (err) {
    console.error('updateUser error', err);
    res.status(400).json({ error: 'update_failed' });
  }
}

export async function deleteUser(req, res) {
  const { id } = req.params;
  try {
    await userService.deleteUser(id);
    res.json({ message: 'deleted' });
  } catch (err) {
    console.error('deleteUser error', err);
    res.status(400).json({ error: 'delete_failed' });
  }
}