import { redirect } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { createClient } from '@/lib/supabase/server';

export type SignupResult = { error: true; message: string } | undefined;

export const signupFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: { email: string; password: string; name: string; organizationName: string }) => d
  )
  .handler(async ({ data }): Promise<SignupResult> => {
    const supabase = createClient();

    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          name: data.name,
          organization_name: data.organizationName,
        },
        emailRedirectTo: `${process.env.VITE_APP_URL || 'http://localhost:3000'}/auth/confirm`,
      },
    });

    if (error) {
      return {
        error: true,
        message: error.message,
      };
    }

    // Redirect to success page - user needs to confirm email
    throw redirect({
      to: '/sign-up-success',
    });
  });
