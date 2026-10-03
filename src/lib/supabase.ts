import { createClient } from '@supabase/supabase-js';

// Ganti dengan URL dan anon key dari Supabase project Anda
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(
  supabaseUrl === 'YOUR_SUPABASE_URL' ? 'http://127.0.0.1:54321' : supabaseUrl,
  supabaseAnonKey === 'YOUR_SUPABASE_ANON_KEY' ? 'local-demo-placeholder' : supabaseAnonKey,
);

// Helper untuk cek apakah Supabase sudah dikonfigurasi
export const isSupabaseConfigured = () => {
  return supabaseUrl !== 'YOUR_SUPABASE_URL' && supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY';
};
