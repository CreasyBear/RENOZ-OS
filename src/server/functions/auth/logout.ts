'use server'

import { redirect } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { createServerSupabase } from '@/lib/supabase/server';

export const logoutFn = createServerFn().handler(async () => {
  const request = getRequest();
  const supabase = createServerSupabase(request);
  const { error } = await supabase.auth.signOut();

  if (error) {
    return {
      error: true,
      message: error.message,
    };
  }

  throw redirect({
    href: '/',
  });
});
