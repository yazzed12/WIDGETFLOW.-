import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;

function requiredBrowserEnvironment(name: 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_PUBLISHABLE_KEY'): string {
  const value = import.meta.env[name]?.trim();
  if (!value) throw new Error(`Missing required browser configuration: ${name}`);
  return value;
}

export function getSupabaseBrowserClient(): SupabaseClient {
  if (browserClient) return browserClient;
  const startedAt = performance.now();
  const supabaseUrl = requiredBrowserEnvironment('VITE_SUPABASE_URL');
  const publishableKey = requiredBrowserEnvironment('VITE_SUPABASE_PUBLISHABLE_KEY');
  browserClient = createClient(
    supabaseUrl,
    publishableKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    },
  );
  if (import.meta.env.DEV) console.info('[WidgetFlow Supabase client]', {
    initializationCount: 1,
    durationMs: Math.round(performance.now() - startedAt),
    urlConfigured: Boolean(supabaseUrl),
    publishableKeyConfigured: Boolean(publishableKey),
    persistentSession: true,
    autoRefreshToken: true,
  });
  return browserClient;
}
