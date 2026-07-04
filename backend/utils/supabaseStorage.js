/* ─────────────────────────────────────────
   FILE: supabaseStorage.js
   DESCRIPTION: Shared Supabase Storage client, authenticated with the
   service-role key. Server-side only — never expose this key to clients.
   ───────────────────────────────────────── */
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
	process.env.SUPABASE_URL,
	process.env.SUPABASE_SERVICE_ROLE_KEY,
	{ auth: { persistSession: false } }
);

module.exports = { supabaseAdmin };
