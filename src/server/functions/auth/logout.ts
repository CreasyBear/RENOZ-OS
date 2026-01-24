import { redirect } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { createClient } from '@/lib/supabase/server';

export const logoutFn = createServerFn().handler(async () => {
  const supabase = createClient();
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
