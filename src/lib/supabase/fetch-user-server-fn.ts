'use server'

import type { Factor, User } from '@supabase/supabase-js';
import { createServerFn } from '@tanstack/react-start';

export type SSRSafeUser = User & {
  factors: (Factor & { factor_type: 'phone' | 'totp' })[];
};

/**
 * Fetches the current authenticated user from Supabase Auth.
 * 
 * SECURITY NOTE: This always validates against Supabase. There is no mock bypass.
 * For development, use real Supabase credentials in .env or the test seed script.
 */
export const fetchUser: () => Promise<SSRSafeUser | null> = createServerFn({
  method: 'GET',
}).handler(async () => {
  const { createServerSupabase } = await import('~/lib/supabase/server');
  const supabase = createServerSupabase();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return data.user as SSRSafeUser;
});
