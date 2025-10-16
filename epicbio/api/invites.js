import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { email, igUsername } = req.body;
  const { data: existing } = await supabase.from('invites').select('*').eq('email', email).single();
  if (existing) return res.status(200).json({ code: existing.code });
  const code = crypto.randomUUID();
  const { error } = await supabase.from('invites').insert({ email, code, used: false, username: igUsername });
  if (error) return res.status(500).json({ error: error.message });
  const adminEmail = 'mark.rogers1978@gmail.com';
  const role = email === adminEmail ? 'admin' : 'user';
  await supabase.auth.signUp({
    email,
    password: crypto.randomUUID(),
    options: { data: { ig_username: igUsername, username: igUsername, role } }
  });
  res.status(200).json({ code });
}