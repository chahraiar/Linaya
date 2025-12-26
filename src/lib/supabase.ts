import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Get Supabase credentials from environment variables
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Check if Supabase is configured
const isSupabaseConfigured = 
  SUPABASE_URL && 
  SUPABASE_ANON_KEY && 
  SUPABASE_URL !== 'YOUR_SUPABASE_URL' &&
  SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY' &&
  SUPABASE_URL.startsWith('http');

if (!isSupabaseConfigured) {
  console.warn('⚠️ Supabase credentials not configured.');
  console.warn('⚠️ Please create a .env file with:');
  console.warn('   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co');
  console.warn('   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here');
  console.warn('⚠️ The app will run in demo mode (authentication disabled).');
}

// Create Supabase client only if configured, otherwise use dummy values
// This prevents the app from crashing, but authentication won't work
export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : createClient(
      'https://placeholder.supabase.co',
      'placeholder-key',
      {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      }
    );

// Export flag to check if Supabase is configured
export const isSupabaseReady = isSupabaseConfigured;

