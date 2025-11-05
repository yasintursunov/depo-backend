import { adminClient } from '../models/supabaseClient.js';

const TABLE = 'inventory_access';

export async function listAccess(inventoryId) {
  const { data, error } = await adminClient.from(TABLE).select('*, user:users(id, name, email, role)').eq('inventory_id', inventoryId);
  if (error) throw error;
  return data;
}

export async function addAccess(inventoryId, userId, canWrite = true) {
  const payload = { inventory_id: inventoryId, user_id: userId, can_write: canWrite };
  const { data, error } = await adminClient.from(TABLE).upsert(payload, { onConflict: '(inventory_id, user_id)' }).select().single();
  if (error) throw error;
  return data;
}

export async function removeAccess(inventoryId, userId) {
  const { data, error } = await adminClient.from(TABLE).delete().eq('inventory_id', inventoryId).eq('user_id', userId).select();
  if (error) throw error;
  return data;
}

export async function checkWriteAccess(inventoryId, userId) {
  const { data, error } = await adminClient.from(TABLE).select('*').eq('inventory_id', inventoryId).eq('user_id', userId).limit(1).maybeSingle();
  if (error) throw error;
  if (!data) return false;
  return Boolean(data.can_write);
}