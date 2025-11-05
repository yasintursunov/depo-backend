import { adminClient } from '../models/supabaseClient.js';

const TABLE = 'discussion_posts';

export async function listPosts(inventoryId, { limit = 100, offset = 0 } = {}) {
  const { data, error } = await adminClient.from(TABLE).select('*, author:users(id, name, email)').eq('inventory_id', inventoryId).order('created_at', { ascending: true }).range(offset, offset + limit - 1);
  if (error) throw error;
  return data;
}

export async function createPost(inventoryId, authorId, body) {
  const { data, error } = await adminClient.from(TABLE).insert({ inventory_id: inventoryId, author_id: authorId, body }).select().single();
  if (error) throw error;
  return data;
}