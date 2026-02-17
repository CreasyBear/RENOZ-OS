import * as React from 'react';
import { useState } from 'react';
import { Link, useNavigate, useRouter, useSearch } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { TextField } from '@/components/shared/forms';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTanStackForm } from '@/hooks/_shared/use-tanstack-form';
import { getPostLoginTarget } from '@/lib/auth/route-policy';
import { loginSchema } from '@/lib/schemas/auth';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { checkLoginAttempt, clearLoginAttempt } from '@/server/functions/auth/login-rate-limit';

export function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const { redirect, reason } = useSearch({ from: '/login' });
  const navigate = useNavigate();
  const router = useRouter();
  const safeRedirect = getPostLoginTarget(redirect);
  const [authError, setAuthError] = useState<string | null>(null);

  const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL || 'support@renoz.energy';

  React.useEffect(() => {
    if (reason === 'invalid_user') {
      setAuthError('Your account is not fully set up. Please contact support.');
      return;
    }
    if (reason === 'session_expired') {
      setAuthError('Session check failed. Please sign in again.');
      return;
    }
    if (reason === 'offline') {
      setAuthError('You appear to be offline. Reconnect and try again.');
      return;
    }
    if (reason === 'auth_check_failed') {
      setAuthError('We could not verify your session yet. Please try signing in again.');
      return;
    }
  }, [reason]);

  const runLogin = async (values: { email: string; password: string }) => {
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

    const {
      data: { session },
    } = await supabase.auth.getSession();
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
      logger.warn('[login] Failed to clear rate-limit counter', { error });
    });

    await router.invalidate();
    await navigate({ to: safeRedirect, replace: true });
  };

  const form = useTanStackForm({
    schema: loginSchema,
    defaultValues: { email: '', password: '' },
    onSubmit: runLogin,
    onSubmitInvalid: () => setAuthError('Please check your input and try again.'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
                    showErrorsAfterSubmit={(form.state?.submissionAttempts ?? 0) > 0}
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
                      showErrorsAfterSubmit={(form.state?.submissionAttempts ?? 0) > 0}
                    />
                    <div className="flex justify-end">
                      <Link
                        to="/forgot-password"
                        className="cursor-pointer text-sm text-muted-foreground underline-offset-4 transition-colors duration-200 hover:text-foreground"
                      >
                        Forgot your password?
                      </Link>
                    </div>
                  </div>
                )}
              </form.Field>
              <div className="min-h-5">
                {authError && (
                  <p className="text-sm text-destructive" role="alert">
                    {authError}
                    {reason === 'invalid_user' && (
                      <>
                        {' '}
                        <a
                          href={`mailto:${supportEmail}?subject=Account setup incomplete`}
                          className="font-medium underline underline-offset-2 hover:no-underline"
                        >
                          Contact support
                        </a>
                      </>
                    )}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                className="h-11 w-full font-medium transition-colors duration-200"
                disabled={form.state?.isSubmitting ?? false}
              >
                {(form.state?.isSubmitting ?? false) ? (
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
                className="cursor-pointer font-medium text-foreground underline-offset-4 transition-colors duration-200 hover:underline"
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
