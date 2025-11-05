import { adminClient } from '../models/supabaseClient.js';

const TABLE = 'inventory_fields';

export async function listFields(inventoryId) {
  const { data, error } = await adminClient.from(TABLE).select('*').eq('inventory_id', inventoryId).order('position', { ascending: true });
  if (error) throw error;
  return data;
}

export async function upsertField(field) {
  
  if (field.id) {
    const { data, error } = await adminClient.from(TABLE).update(field).eq('id', field.id).select().single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await adminClient.from(TABLE).insert(field).select().single();
    if (error) throw error;
    return data;
  }
}

export async function deleteField(id) {
  const { data, error } = await adminClient.from(TABLE).delete().eq('id', id).select();
  if (error) throw error;
  return data;
}