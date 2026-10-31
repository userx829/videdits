import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  rawUrl &&
  rawAnonKey &&
  rawUrl.trim() !== '' &&
  rawAnonKey.trim() !== '' &&
  !rawUrl.includes('your-supabase-project-id') &&
  !rawUrl.includes('placeholder')
);

const supabaseUrl = rawUrl && rawUrl.trim() !== '' && !rawUrl.includes('your-supabase-project-id')
  ? rawUrl
  : 'https://placeholder.supabase.co';

const supabaseAnonKey = rawAnonKey && rawAnonKey.trim() !== '' && !rawAnonKey.includes('your-supabase-anon-key')
  ? rawAnonKey
  : 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

