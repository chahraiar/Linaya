import { createClient } from '@supabase/supabase-js';

// Vite uses VITE_ prefix for environment variables (with ONE underscore, not two!)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug: log environment variables (without exposing keys)
console.log('🔧 Supabase Config Check:');
console.log('  URL:', SUPABASE_URL ? '✅ Set' : '❌ Missing');
console.log('  KEY:', SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing');

// Check for common mistakes
if (!SUPABASE_URL && import.meta.env.VITE__SUPABASE_URL) {
  console.error('❌ ERROR: You used VITE__SUPABASE_URL (double underscore) instead of VITE_SUPABASE_URL (single underscore)');
}
if (!SUPABASE_ANON_KEY && import.meta.env.VITE__SUPABASE_ANON_KEY) {
  console.error('❌ ERROR: You used VITE__SUPABASE_ANON_KEY (double underscore) instead of VITE_SUPABASE_ANON_KEY (single underscore)');
}

console.log('  Available env vars:', Object.keys(import.meta.env).filter(k => k.startsWith('VITE_')));

const isSupabaseConfigured = 
  SUPABASE_URL && 
  SUPABASE_ANON_KEY && 
  SUPABASE_URL !== 'YOUR_SUPABASE_URL' &&
  SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY' &&
  SUPABASE_URL.startsWith('http');

if (!isSupabaseConfigured) {
  console.error('❌ Supabase credentials not configured.');
  console.error('❌ Please create a .env file in the web/ directory with:');
  console.error('   VITE_SUPABASE_URL=https://your-project.supabase.co');
  console.error('   VITE_SUPABASE_ANON_KEY=your-anon-key-here');
  console.error('❌ Note: Vite uses VITE_ prefix (not EXPO_PUBLIC_)');
  console.error('❌ The app will not work without proper configuration.');
}

// Don't create a client if not configured - this prevents CORS errors
if (!isSupabaseConfigured) {
  throw new Error(
    'Supabase is not configured. Please create a .env file in the web/ directory with:\n' +
    'VITE_SUPABASE_URL=https://your-project.supabase.co\n' +
    'VITE_SUPABASE_ANON_KEY=your-anon-key-here\n\n' +
    'Note: Vite uses VITE_ prefix (not EXPO_PUBLIC_)'
  );
}

export const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

export const isSupabaseReady = isSupabaseConfigured;

