import { createServerFn } from '@tanstack/react-start';
import { createClient } from '@/lib/supabase/server';

export type LoginResult = { error: true; message: string } | undefined;

export const loginFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { email: string; password: string }) => d)
  .handler(async ({ data }): Promise<LoginResult> => {
    const supabase = createClient();
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
