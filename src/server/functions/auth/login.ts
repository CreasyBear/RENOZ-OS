'use server'

import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { createServerSupabase } from '@/lib/supabase/server';

export type LoginResult = { error: true; message: string } | undefined;

export const loginFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { email: string; password: string }) => d)
  .handler(async ({ data }): Promise<LoginResult> => {
    const request = getRequest();
    const supabase = createServerSupabase(request);
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      return {
        error: true,
        message: error.message,
      };
    }

    return undefined;
  });
