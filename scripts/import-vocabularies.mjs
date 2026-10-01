import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment before importing.');
}

const dataPath = fileURLToPath(new URL('../public/vocabularies.json', import.meta.url));
const vocabularies = JSON.parse(await readFile(dataPath, 'utf8'));

if (!Array.isArray(vocabularies) || vocabularies.some((item) => !item.id || !item.word || !item.meaning || item.options?.length !== 4)) {
  throw new Error('The vocabulary file contains records that do not match the expected schema.');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

for (let offset = 0; offset < vocabularies.length; offset += 500) {
  const batch = vocabularies.slice(offset, offset + 500);
  const { error } = await supabase.from('vocabularies').upsert(batch, { onConflict: 'id' });
  if (error) throw error;
  console.log(`Imported ${Math.min(offset + batch.length, vocabularies.length)} / ${vocabularies.length}`);
}