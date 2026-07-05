/* ─────────────────────────────────────────
   FILE: supabaseStorage.js
   DESCRIPTION: Shared Supabase Storage client, authenticated with the
   service-role key. Server-side only — never expose this key to clients.
   ───────────────────────────────────────── */
const { createClient } = require('@supabase/supabase-js');

// Missing env vars must not crash the whole server at boot — only avatar
// upload/delete depend on this client, so those routes fail instead.
let supabaseAdmin = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
	supabaseAdmin = createClient(
		process.env.SUPABASE_URL,
		process.env.SUPABASE_SERVICE_ROLE_KEY,
		{ auth: { persistSession: false } }
	);
} else {
	console.error('[supabaseStorage] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — avatar upload/delete disabled until configured.');
}

module.exports = { supabaseAdmin };
