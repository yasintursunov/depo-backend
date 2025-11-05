import * as itemService from '../services/itemService.js';
import * as accessService from '../services/accessService.js';
import * as inventoryService from '../services/inventoryService.js';

export async function listItems(req, res) {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const data = await itemService.listItems(req.params.inventoryId, { limit: Number(limit), offset: Number(offset) });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'items_list_failed' });
  }
}

export async function createItem(req, res) {
  try {
    const inventoryId = req.params.inventoryId;
    const userId = req.user ? req.user.id : null;
    const inv = await inventoryService.findById(inventoryId);
    if (!inv) return res.status(404).json({ error: 'inventory_not_found' });

    if (!inv.is_public) {
      if (!req.user) return res.status(401).json({ error: 'unauthenticated' });
      if (req.user.role !== 'admin' && req.user.id !== inv.owner_id) {
        const can = await accessService.checkWriteAccess(inventoryId, req.user.id);
        if (!can) return res.status(403).json({ error: 'no_write_access' });
      }
    } else {
      if (!req.user) return res.status(401).json({ error: 'login_required' });
    }

    const payload = req.body || {};
    const item = await itemService.createItem(inventoryId, userId, payload);
    res.status(201).json(item);
  } catch (err) {
    if (err.code === 'CUSTOM_ID_CONFLICT') return res.status(409).json({ error: 'custom_id_conflict' });
    console.error(err);
    res.status(400).json({ error: 'create_item_failed' });
  }
}

export async function getItem(req, res) {
  try {
    const item = await itemService.getItem(req.params.inventoryId, req.params.itemId);
    if (!item) return res.status(404).json({ error: 'not_found' });
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'fetch_failed' });
  }
}

export async function updateItem(req, res) {
  try {
    const inventoryId = req.params.inventoryId;
    const itemId = req.params.itemId;
    const payload = req.body || {};
    const expectedVersion = payload.version ?? null;

    const inv = await inventoryService.findById(inventoryId);
    if (!inv) return res.status(404).json({ error: 'inventory_not_found' });

    if (req.user.role !== 'admin' && req.user.id !== inv.owner_id) {
      const can = await accessService.checkWriteAccess(inventoryId, req.user.id);
      if (!can) return res.status(403).json({ error: 'no_write_access' });
    }

    const patch = {};
    if (payload.values !== undefined) patch.values = payload.values;
    if (payload.custom_id !== undefined) patch.custom_id = payload.custom_id;

    const updated = await itemService.updateItem(inventoryId, itemId, patch, expectedVersion);
    res.json(updated);
  } catch (err) {
    if (err.code === 'VERSION_CONFLICT') return res.status(409).json({ error: 'version_conflict' });
    console.error(err);
    res.status(400).json({ error: 'update_failed' });
  }
}

export async function deleteItem(req, res) {
  try {
    const inventoryId = req.params.inventoryId;
    const itemId = req.params.itemId;
    const inv = await inventoryService.findById(inventoryId);
    if (!inv) return res.status(404).json({ error: 'inventory_not_found' });

    if (req.user.role !== 'admin' && req.user.id !== inv.owner_id) {
      const can = await accessService.checkWriteAccess(inventoryId, req.user.id);
      if (!can) return res.status(403).json({ error: 'no_write_access' });
    }

    await itemService.deleteItem(inventoryId, itemId);
    res.json({ message: 'deleted' });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'delete_failed' });
  }
}