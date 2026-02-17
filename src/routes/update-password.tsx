import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { AuthErrorBoundary } from '@/components/auth/auth-error-boundary';
import { AuthLayout } from '@/components/auth/auth-layout';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';
import { useExchangeHashForSession } from '@/lib/auth/use-exchange-hash-for-session';

export const Route = createFileRoute('/update-password')({
  ssr: false, // Auth callback route: avoid 307 loops from SSR path normalization
  validateSearch: (search: Record<string, unknown>) => ({
    code: typeof search.code === 'string' ? search.code : undefined,
  }),
  beforeLoad: async ({ search }) => {
    if (typeof window === 'undefined') return;
    if (search.code) {
      const { supabase } = await import('@/lib/supabase/client');
      const { error } = await supabase.auth.exchangeCodeForSession(search.code);
      if (error) {
        throw redirect({
          to: '/auth/error',
          search: {
            error: 'invalid_request',
            error_description:
              'This reset link is invalid or expired. Please request a new one from the forgot password page.',
          },
        });
      }
      return;
    }
    // No code: implicit flow uses hash. If no auth params in hash, send to forgot-password.
    const hash = window.location.hash;
    const hasAuthParams =
      hash &&
      (hash.includes('access_token') || hash.includes('refresh_token') || hash.includes('error='));
    if (!hasAuthParams) {
      throw redirect({ to: '/forgot-password' });
    }
  },
  component: UpdatePassword,
});

function UpdatePassword() {
  const navigate = useNavigate();
  const { authError } = useExchangeHashForSession();

  useEffect(() => {
    if (authError) {
      void navigate({
        to: '/auth/error',
        search: { error: authError.code, error_description: authError.description },
      });
    }
  }, [authError, navigate]);

  if (authError) {
    return (
      <AuthErrorBoundary>
        <AuthLayout>
          <div className="flex items-center justify-center p-8">
            <p className="text-muted-foreground text-sm">Redirecting...</p>
          </div>
        </AuthLayout>
      </AuthErrorBoundary>
    );
  }

  return (
    <AuthErrorBoundary>
      <AuthLayout>
        <ResetPasswordForm />
      </AuthLayout>
    </AuthErrorBoundary>
  );
}
