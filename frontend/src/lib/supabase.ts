import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || (typeof process !== 'undefined' ? process.env?.SUPABASE_URL : '') || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || (typeof process !== 'undefined' ? process.env?.SUPABASE_ANON_KEY : '') || '';

const isConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isConfigured) {
  console.warn('Supabase URL 또는 Anon Key가 설정되지 않았습니다. .env 파일 설정을 확인해주세요.');
}

// Fallback dummy client if credentials are empty to avoid runtime crashes
export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : ({
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signInWithPassword: async () => ({ data: null, error: new Error('Supabase credentials not configured in .env') }),
        signUp: async () => ({ data: null, error: new Error('Supabase credentials not configured in .env') }),
        signOut: async () => ({ error: null }),
      }
    } as any);

