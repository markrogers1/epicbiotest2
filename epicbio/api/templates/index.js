import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req, res) {
  const { data: settings } = await supabase.from('settings').select('enable_templates').eq('id', 1).single();
  if (!settings?.enable_templates) {
    return res.status(403).json({ error: 'Templates are disabled' });
  }
  res.status(200).json({ templates: [] });
}