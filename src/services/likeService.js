import { adminClient } from '../models/supabaseClient.js';
const TABLE = 'likes';

export async function likeItem(itemId, userId) {
  try {
    const { data, error } = await adminClient.from(TABLE).insert({ item_id: itemId, user_id: userId }).select().single();
    if (error) {
      const msg = (error?.message || '').toLowerCase();
      if (msg.includes('duplicate') || msg.includes('unique')) {
        const e = new Error('ALREADY_LIKED');
        e.code = 'ALREADY_LIKED';
        throw e;
      }
      throw error;
    }
    return data;
  } catch (err) { throw err; }
}

export async function unlikeItem(itemId, userId) {
  const { data, error } = await adminClient.from(TABLE).delete().eq('item_id', itemId).eq('user_id', userId).select();
  if (error) throw error;
  return data;
}