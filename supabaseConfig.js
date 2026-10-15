// استبدل المفاتيح بالبيانات الخاصة بمشروعك في Supabase
const SUPABASE_URL = 'https://rherbkebuusauqvnjlac.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_N3riMvileoNE3FPe6yP4aw_NyaH3pOp';

if (!window.supabase) {
  console.error("Supabase SDK not loaded!");
}

export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
