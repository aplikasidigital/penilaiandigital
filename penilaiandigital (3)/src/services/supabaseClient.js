import { createClient } from '@supabase/supabase-js';

// Supabase Connection Credentials (Updated with official credentials)
const rawUrl = import.meta.env?.VITE_SUPABASE_URL || 'https://qixphlsusrcquqncnbma.supabase.co/rest/v1/';
export const SUPABASE_URL = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');

export const SUPABASE_ANON_KEY =
  import.meta.env?.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpeHBobHN1c3JjcXVxbmNuYm1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1NTYzMzksImV4cCI6MjEwNzEzMjMzOX0.ICBw1GUTFuI0vm0fVuB1nw0WofVy49V3wL5fGAmNmFg';

export const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_ywK7tqaqHBrwStA72uN96w_j2M6nwfB';

export const SUPABASE_SERVICE_ROLE_KEY =
  import.meta.env?.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpeHBobHN1c3JjcXVxbmNuYm1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTU1NjMzOSwiZXhwIjoyMTA3MTMyMzM5fQ.L1RPMzs8u5TzZ4eEDn_ek_iWFTYcbL6ld1YHD57Zkgg';

export const SUPABASE_SECRET_KEY =
  import.meta.env?.SUPABASE_SECRET_KEY ||
  'sb_secret_y-ngLEl0sccUohOZTHIW5g_7ppmauWs';

// 1. Initialize Supabase Client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 30,
    },
  },
});

/**
 * 2. Google OAuth Login Function
 * Initiates the Google OAuth flow via Supabase
 */
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    console.error('[Supabase OAuth] Error signing in with Google:', error.message);
    throw error;
  }

  return data;
}

/**
 * 3. Sign Out Function
 */
export async function signOutFromSupabase() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.warn('[Supabase OAuth] Error signing out:', error.message);
  }
}

/**
 * 4. Auth State Change Listener
 */
export function onAuthStateChange(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
  return () => {
    subscription?.unsubscribe();
  };
}

export default supabase;
