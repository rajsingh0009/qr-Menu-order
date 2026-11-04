import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const isServiceRoleConfigured = Boolean(
  supabaseUrl &&
  supabaseServiceRoleKey &&
  supabaseServiceRoleKey !== 'your-supabase-service-role-key' &&
  !supabaseServiceRoleKey.includes('placeholder')
);

/**
 * Server-only Supabase client utilizing the high-privilege service_role key.
 * Used exclusively for administrative tasks such as creating Auth users,
 * managing RLS bypasses for admin dashboard stats, etc.
 * NEVER import or execute this file in client components.
 */
export function createAdminClient() {
  if (typeof window !== 'undefined') {
    throw new Error('FATAL: createAdminClient cannot be called from client-side code.');
  }

  if (!isServiceRoleConfigured) {
    return null;
  }

  return createSupabaseClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
