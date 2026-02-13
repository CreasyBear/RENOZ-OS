'use server'

import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  const url = process.env.VITE_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !secretKey) {
    throw new Error(
      'Supabase admin environment variables not configured (VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)'
    );
  }

  return createClient(url, secretKey);
}
