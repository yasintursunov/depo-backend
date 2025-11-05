import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment. Check .env.');
}

export const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});


export async function testConnection() {
  try {
    
    const { data, error } = await adminClient.from('users').select('id').limit(1);
    if (error) {
      
      const err = new Error('Supabase responded with an error: ' + (error.message || JSON.stringify(error)));
      err.details = error;
      throw err;
    }
    return { ok: true, sample: data };
  } catch (err) {
    
    const message = (err && err.message) ? err.message : String(err);
    const e = new Error('Supabase connection test failed: ' + message);
    e.original = err;
    throw e;
  }
}
