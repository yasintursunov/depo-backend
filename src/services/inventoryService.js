import { adminClient } from '../models/supabaseClient.js';

const TABLE = 'inventories';

export async function createInventory(payload) {
  try {
    const { data, error } = await adminClient.from(TABLE).insert(payload).select().single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('createInventory error:', err && err.message ? err.message : err);
    throw err;
  }
}

export async function findById(id) {
  try {
    const { data, error } = await adminClient.from(TABLE).select('*').eq('id', id).limit(1).maybeSingle();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('findById error:', err && err.message ? err.message : err);
    throw err;
  }
}

export async function listInventories({ limit = 50, offset = 0, owner_id } = {}) {
  try {
    let q = adminClient.from(TABLE).select('*').order('created_at', { ascending: false }).range(offset, offset + limit - 1);
    if (owner_id) q = q.eq('owner_id', owner_id);
    const { data, error } = await q;
    if (error) {
      console.error('listInventories supabase error:', error);
      throw error;
    }
    return data;
  } catch (err) {
    console.error('listInventories catch:', err);
    throw err;
  }
}

export async function updateInventory(id, patch, expectedVersion = null) {
  try {
    if (expectedVersion !== null) {
      const { data, error } = await adminClient.from(TABLE).update(patch).match({ id, version: expectedVersion }).select().single();
      if (error) {
        const e = new Error('update_failed');
        e.details = error;
        throw e;
      }
      if (!data) {
        const e = new Error('VERSION_CONFLICT');
        e.code = 'VERSION_CONFLICT';
        throw e;
      }
      return data;
    } else {
      const { data, error } = await adminClient.from(TABLE).update(patch).eq('id', id).select().single();
      if (error) throw error;
      return data;
    }
  } catch (err) {
    console.error('updateInventory error:', err && err.message ? err.message : err);
    throw err;
  }
}

export async function deleteInventory(id) {
  try {
    const { data, error } = await adminClient.from(TABLE).delete().eq('id', id).select();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('deleteInventory error:', err && err.message ? err.message : err);
    throw err;
  }
}
