import { adminClient } from '../models/supabaseClient.js';
import { v4 as uuidv4 } from 'uuid';

const ELS = 'custom_id_elements';
const SEQ_RPC = 'next_custom_seq'; 
const ITEMS_TABLE = 'items';

function randomDigits(n) {
  let s = '';
  while (s.length < n) s += Math.floor(Math.random() * 10);
  return s.slice(0, n);
}

export async function getElements(inventoryId) {
  const { data, error } = await adminClient.from(ELS).select('*').eq('inventory_id', inventoryId).order('position', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function generateCustomId(inventoryId) {
  const elements = await getElements(inventoryId);
  if (!elements || elements.length === 0) return uuidv4();
  const parts = [];
  for (const el of elements) {
    const t = el.element_type;
    const params = el.params || {};
    if (t === 'fixed') {
      parts.push(params.text || '');
    } else if (t === 'rand6') {
      parts.push(randomDigits(6));
    } else if (t === 'rand9') {
      parts.push(randomDigits(9));
    } else if (t === 'rand20') {
     
      parts.push(randomDigits(6));
    } else if (t === 'rand32') {
      parts.push(randomDigits(9));
    } else if (t === 'guid') {
      parts.push(uuidv4());
    } else if (t === 'datetime') {
      const d = new Date();
      parts.push(`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}`);
    } else if (t === 'sequence') {
      
      const { data, error } = await adminClient.rpc(SEQ_RPC, { inv: inventoryId });
      if (error) throw error;
      
      let seq = data;
      if (Array.isArray(data)) seq = data[0]?.next_custom_seq ?? data[0]?.seq ?? data[0];
      const width = params?.width ? Number(params.width) : 0;
      const formatted = width > 0 ? String(seq).padStart(width, '0') : String(seq);
      parts.push(formatted);
    } else {
      parts.push('');
    }
  }
  return parts.join('');
}

export async function isCustomIdUnique(inventoryId, customId) {
  const { data, error } = await adminClient.from(ITEMS_TABLE).select('id').eq('inventory_id', inventoryId).eq('custom_id', customId).limit(1).maybeSingle();
  if (error) throw error;
  return !data;
}