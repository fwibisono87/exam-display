import { createClient } from '@supabase/supabase-js';

// Check if environment variables are defined
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

// Create Supabase client
export const supabase = createClient(
  supabaseUrl as string,
  supabaseAnonKey as string
);

/**
 * Validates if Supabase is properly configured
 * @returns Boolean indicating if Supabase configuration appears valid
 */
export function isSupabaseConfigured(): boolean {
  return (
    typeof supabaseUrl === 'string' &&
    supabaseUrl !== '' &&
    supabaseUrl !== 'your-supabase-project-url' &&
    typeof supabaseAnonKey === 'string' &&
    supabaseAnonKey !== '' &&
    supabaseAnonKey !== 'your-supabase-anon-key'
  );
}
