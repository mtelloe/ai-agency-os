import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _admin: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
  if (!_admin) {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) {
      // Fallback to anon key for development (limited by RLS)
      _admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
    } else {
      _admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        key,
      );
    }
  }
  return _admin;
}
