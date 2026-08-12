const SUPABASE_URL = "https://mpgmcfcjobzpbbiyraqd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_2BTiIWAVx5YKpaMNoz1K9g_3BfqgBPl";

if (SUPABASE_URL.includes("TU-PROYECTO") || SUPABASE_ANON_KEY.includes("TU-LLAVE")) {
  console.warn("Falta configurar Supabase: edita js/supabaseClient.js con la URL y la llave anon de tu proyecto.");
}

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
