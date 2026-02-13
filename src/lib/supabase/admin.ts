'use server'

import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  const url = process.env.VITE_SUPABASE_URL;
  // Use secret key (formerly service_role key) for admin operations
  const secretKey = process.env.VITE_SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error('Supabase admin environment variables not configured (VITE_SUPABASE_URL, VITE_SUPABASE_SECRET_KEY)');
  }

  return createClient(url, secretKey);
}
