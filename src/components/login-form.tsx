import * as React from 'react';
import { useState } from 'react';
import { cn } from '~/lib/utils';
import { supabase } from '~/lib/supabase/client';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Link, useNavigate, useRouter, useSearch } from '@tanstack/react-router';
import { useTanStackForm } from '~/hooks/_shared/use-tanstack-form';
import { loginSchema } from '~/lib/schemas/auth';
import { TextField } from '~/components/shared/forms';
import { Loader2 } from 'lucide-react';
import { checkLoginAttempt, clearLoginAttempt } from '@/server/functions/auth/login-rate-limit';
import { sanitizeInternalRedirect } from '@/lib/auth/redirects';
import { logger } from '@/lib/logger';

export function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const { redirect, reason } = useSearch({ from: '/login' });
  const navigate = useNavigate();
  const router = useRouter();
  const safeRedirect = sanitizeInternalRedirect(redirect, {
    fallback: '/dashboard',
    disallowPaths: ['/login', '/sign-up', '/forgot-password'],
  });
  const [authError, setAuthError] = useState<string | null>(null);

  React.useEffect(() => {
    if (reason === 'invalid_user') {
      setAuthError('Your account is not fully set up. Please contact support.');
      return;
    }
  }, [reason]);

  const form = useTanStackForm({
    schema: loginSchema,
    defaultValues: { email: '', password: '' },
    onSubmit: async (values) => {
      setAuthError(null);
      const loginRateLimit = await checkLoginAttempt({
        data: { email: values.email },
      }).catch((error) => {
        logger.warn('[login] Rate-limit check failed, continuing login flow', { error });
        return { success: true } as const;
      });

      if (
        loginRateLimit &&
        typeof loginRateLimit === 'object' &&
        'success' in loginRateLimit &&
        !loginRateLimit.success
      ) {
        throw new Error(
          (typeof loginRateLimit.error === 'string' && loginRateLimit.error) ||
            'Too many login attempts. Please try again later.'
        );
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      if (error) throw error;

      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        await supabase.auth.signOut();
        throw new Error('Login succeeded but no session was found.');
      }

      const { data: appUser, error: appUserError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .single();

      if (appUserError || !appUser) {
        await supabase.auth.signOut();
        throw new Error('Account setup is incomplete. Please sign up again or contact support.');
      }

      await clearLoginAttempt({
        data: { email: values.email },
      }).catch((error) => {
        // Successful login should not fail because limiter reset failed.
        logger.warn('[login] Failed to clear rate-limit counter', { error });
      });

      await router.invalidate();
      await navigate({ to: safeRedirect, replace: true });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAuthError(null);
    void form.handleSubmit().catch((err) => {
      setAuthError(err instanceof Error ? err.message : 'An error occurred');
    });
  };

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card className="border-border/80 shadow-lg">
        <CardHeader className="space-y-1.5 pb-4">
          <CardTitle className="text-2xl font-semibold tracking-tight">Sign in</CardTitle>
          <CardDescription className="text-muted-foreground">
            Enter your email and password to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form id="login-form" onSubmit={handleSubmit} noValidate>
            <div className="flex flex-col gap-5">
              <form.Field name="email">
                {(field) => (
                  <TextField
                    field={field}
                    label="Email"
                    type="email"
                    placeholder="name@company.com"
                    required
                    autocomplete="email"
                  />
                )}
              </form.Field>
              <form.Field name="password">
                {(field) => (
                  <div className="space-y-2">
                    <TextField
                      field={field}
                      label="Password"
                      type="password"
                      required
                      autocomplete="current-password"
                    />
                    <div className="flex justify-end">
                      <Link
                        to="/forgot-password"
                        className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground transition-colors duration-200 cursor-pointer"
                      >
                        Forgot your password?
                      </Link>
                    </div>
                  </div>
                )}
              </form.Field>
              {authError && (
                <p className="text-sm text-destructive" role="alert">
                  {authError}
                </p>
              )}
              <Button
                type="submit"
                className="w-full h-11 font-medium transition-colors duration-200"
                disabled={form.state.isSubmitting}
              >
                {form.state.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
            </div>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link
                to="/sign-up"
                className="font-medium text-foreground underline-offset-4 hover:underline transition-colors duration-200 cursor-pointer"
              >
                Sign up
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
