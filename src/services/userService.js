import { adminClient } from '../models/supabaseClient.js';

const TABLE = 'users';

export async function findById(id) {
  const { data, error } = await adminClient.from(TABLE).select('*').eq('id', id).limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

export async function findByGoogleId(googleId) {
  const { data, error } = await adminClient.from(TABLE).select('*').eq('google_id', googleId).limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

export async function findByEmail(email) {
  const { data, error } = await adminClient.from(TABLE).select('*').eq('email', email).limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

export async function createUser({ google_id, name, email, access_token = null, refresh_token = null }) {
  const { data, error } = await adminClient
    .from(TABLE)
    .insert({ google_id, name, email, access_token, refresh_token })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateUser(id, patch) {
  const { data, error } = await adminClient.from(TABLE).update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function upsertFromGoogle({ googleId, name, email, accessToken = null, refreshToken = null }) {
  // search by google_id
  const existingByGoogle = await findByGoogleId(googleId);
  if (existingByGoogle) {
    return updateUser(existingByGoogle.id, {
      name,
      email,
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  }
  // search by email
  if (email) {
    const existingByEmail = await findByEmail(email);
    if (existingByEmail) {
      return updateUser(existingByEmail.id, {
        google_id: googleId,
        name,
        access_token: accessToken,
        refresh_token: refreshToken
      });
    }
  }
 
  return createUser({ google_id: googleId, name, email,  access_token: accessToken, refresh_token: refreshToken });
}

export async function listUsers({ limit = 50, offset = 0 } = {}) {
  const { data, error } = await adminClient.from(TABLE).select('*').order('created_at', { ascending: false }).range(offset, offset + limit - 1);
  if (error) throw error;
  return data;
}

export async function deleteUser(id) {
  const { data, error } = await adminClient.from(TABLE).delete().eq('id', id).select();
  if (error) throw error;
  return data;
}