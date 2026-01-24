import type { Factor, User } from '@supabase/supabase-js';
import { createServerFn } from '@tanstack/react-start';

export type SSRSafeUser = User & {
  factors: (Factor & { factor_type: 'phone' | 'totp' })[];
};

// DEV MODE: Mock user that bypasses Supabase entirely
const DEV_MOCK_USER: SSRSafeUser = {
  id: 'dev-user-id-12345',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'admin@test.com',
  email_confirmed_at: new Date().toISOString(),
  phone: '',
  confirmed_at: new Date().toISOString(),
  last_sign_in_at: new Date().toISOString(),
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: { name: 'Dev Admin' },
  identities: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  factors: [],
};

export const fetchUser: () => Promise<SSRSafeUser | null> = createServerFn({
  method: 'GET',
}).handler(async () => {
  // DEV MODE: Skip Supabase entirely, return mock user
  if (process.env.NODE_ENV === 'development') {
    return DEV_MOCK_USER;
  }

  // PRODUCTION: Use real Supabase auth
  const { createClient } = await import('~/lib/supabase/server');
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return data.user as SSRSafeUser;
});
