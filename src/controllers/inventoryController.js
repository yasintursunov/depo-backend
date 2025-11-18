import * as inventoryService from '../services/inventoryService.js';
import * as fieldService from '../services/fieldService.js';
import * as accessService from '../services/accessService.js';
import { adminClient } from '../models/supabaseClient.js';

export async function createInventory(req, res) {
  try {
    if (!req.user) return res.status(401).json({ error: 'unauthenticated' });

    const owner_id = req.user.id;
    const { title, description, category, image_url, is_public } = req.body || {};

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'validation_failed', details: 'title is required' });
    }

    const payload = {
      owner_id,
      title: title.trim(),
      description: description ?? null,
      category: category ?? 'Other',
      image_url: image_url ?? null,
      is_public: Boolean(is_public)
    };

    const inv = await inventoryService.createInventory(payload);
    res.status(201).json(inv);
  } catch (err) {
    console.error('createInventory ERROR:', err);
    // expose details in dev only
    const details = err?.message || err?.details || (err && JSON.stringify(err)) || null;
    res.status(500).json({ error: 'create_failed', details });
  }
}

export async function getInventory(req, res) {
  try {
    const inv = await inventoryService.findById(req.params.id);
    if (!inv) return res.status(404).json({ error: 'not_found' });
    res.json(inv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'fetch_failed' });
  }
}

export async function updateInventory(req, res) {
  try {
    const id = req.params.id;
    const payload = req.body || {};
    const expectedVersion = payload.version ?? null;
    const patch = {};
    if (payload.title !== undefined) patch.title = payload.title;
    if (payload.description !== undefined) patch.description = payload.description;
    if (payload.category !== undefined) patch.category = payload.category;
    if (payload.image_url !== undefined) patch.image_url = payload.image_url;
    if (payload.is_public !== undefined) patch.is_public = payload.is_public;
    const updated = await inventoryService.updateInventory(id, patch, expectedVersion);
    res.json(updated);
  } catch (err) {
    if (err.code === 'VERSION_CONFLICT') {
      return res.status(409).json({ error: 'version_conflict' });
    }
    console.error(err);
    res.status(400).json({ error: 'update_failed' });
  }
}

export async function listInventories(req, res) {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const data = await inventoryService.listInventories({ limit: Number(limit), offset: Number(offset) });
    res.json(data);
  } catch (err) {
    console.error('listInventories ERROR:', err);
    const details = err?.message || err?.details || (err && JSON.stringify(err)) || null;
    res.status(500).json({ error: 'list_failed', details });
  }
}

export async function deleteInventory(req, res) {
  try {
    const id = req.params.id;
    await inventoryService.deleteInventory(id);
    res.json({ message: 'deleted' });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'delete_failed' });
  }
}


export async function listFields(req, res) {
  try {
    const data = await fieldService.listFields(req.params.id);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'fields_fetch_failed' });
  }
}

export async function upsertField(req, res) {
  try {
    const payload = req.body;
    payload.inventory_id = req.params.id;
    
    const kinds = ['singleline','multiline','number','doc','bool'];
    if (!kinds.includes(payload.kind)) return res.status(400).json({ error: 'invalid_kind' });
    const existing = await fieldService.listFields(req.params.id);
    const sameKindCount = existing.filter(f => f.kind === payload.kind).length;
    const maxMap = { singleline: 3, multiline: 3, number: 3, doc: 3, bool: 3 };
    if (!payload.id && sameKindCount >= (maxMap[payload.kind] || 3)) {
      return res.status(400).json({ error: 'fields_limit_exceeded' });
    }
    const data = await fieldService.upsertField(payload);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'field_upsert_failed' });
  }
}

export async function deleteField(req, res) {
  try {
    const { fieldId } = req.query;
    await fieldService.deleteField(fieldId);
    res.json({ message: 'deleted' });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'delete_failed' });
  }
}


export async function listAccess(req, res) {
  try {
    const data = await accessService.listAccess(req.params.id);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'access_list_failed' });
  }
}

export async function addAccess(req, res) {
  try {
    const inventoryId = req.params.id;
    const { user_id, can_write = true } = req.body;
    const data = await accessService.addAccess(inventoryId, user_id, can_write);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'add_access_failed' });
  }
}

export async function removeAccess(req, res) {
  try {
    const inventoryId = req.params.id;
    const { user_id } = req.body;
    await accessService.removeAccess(inventoryId, user_id);
    res.json({ message: 'removed' });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'remove_failed' });
  }
}


export async function getCustomIdElements(req, res) {
  try {
    const { data, error } = await adminClient.from('custom_id_elements').select('*').eq('inventory_id', req.params.id).order('position', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'fetch_failed' });
  }
}

export async function upsertCustomIdElements(req, res) {
  try {
    const inventoryId = req.params.id;
    const elements = req.body.elements || [];
    
    await adminClient.from('custom_id_elements').delete().eq('inventory_id', inventoryId);
    if (elements.length > 0) {
      const payload = elements.map((el, idx) => ({ ...el, inventory_id: inventoryId, position: idx }));
      const { data, error } = await adminClient.from('custom_id_elements').insert(payload).select();
      if (error) throw error;
      return res.json(data);
    }
    res.json([]);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'customid_update_failed' });
  }
}