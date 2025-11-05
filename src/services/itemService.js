import { adminClient } from '../models/supabaseClient.js';
import { generateCustomId, isCustomIdUnique } from './customIdService.js';

const TABLE = 'items';

export async function listItems(inventoryId, { limit = 50, offset = 0, q = null } = {}) {
  if (q) {
    const { data, error } = await adminClient.from(TABLE).select('*').textSearch('search_vector', q).range(offset, offset + limit - 1);
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await adminClient.from(TABLE).select('*').eq('inventory_id', inventoryId).order('created_at', { ascending: false }).range(offset, offset + limit - 1);
    if (error) throw error;
    return data;
  }
}

export async function getItem(inventoryId, itemId) {
  const { data, error } = await adminClient.from(TABLE).select('*').eq('inventory_id', inventoryId).eq('id', itemId).limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

export async function createItem(inventoryId, creatorId, payload) {
  let customId = payload.custom_id;
  if (!customId) {
    customId = await generateCustomId(inventoryId);
  } else {
    const unique = await isCustomIdUnique(inventoryId, customId);
    if (!unique) {
      const e = new Error('custom_id_conflict');
      e.code = 'CUSTOM_ID_CONFLICT';
      throw e;
    }
  }

  const insertPayload = {
    inventory_id: inventoryId,
    creator_id: creatorId || null,
    custom_id: customId,
    values: payload.values || {}
  };

  const { data, error } = await adminClient.from(TABLE).insert(insertPayload).select().single();
  if (error) {
    // unique violation returns error; map to conflict
    const msg = (error?.message || '').toLowerCase();
    if (msg.includes('duplicate') || msg.includes('unique')) {
      const e = new Error('custom_id_conflict');
      e.code = 'CUSTOM_ID_CONFLICT';
      throw e;
    }
    throw error;
  }
  return data;
}

export async function updateItem(inventoryId, itemId, patch, expectedVersion = null) {
  if (expectedVersion !== null) {
    const { data, error } = await adminClient.from(TABLE).update(patch).match({ id: itemId, inventory_id: inventoryId, version: expectedVersion }).select().single();
    if (error) throw error;
    if (!data) {
      const e = new Error('VERSION_CONFLICT');
      e.code = 'VERSION_CONFLICT';
      throw e;
    }
    return data;
  } else {
    const { data, error } = await adminClient.from(TABLE).update(patch).eq('id', itemId).eq('inventory_id', inventoryId).select().single();
    if (error) throw error;
    return data;
  }
}

export async function deleteItem(inventoryId, itemId) {
  const { data, error } = await adminClient.from(TABLE).delete().eq('id', itemId).eq('inventory_id', inventoryId).select();
  if (error) throw error;
  return data;
}