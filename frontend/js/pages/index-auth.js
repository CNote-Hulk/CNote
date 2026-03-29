import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY
);

const { data: { session } } = await supabase.auth.getSession();
if (session) {
  window.location.replace('/home.html');
}