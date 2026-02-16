import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { AuthErrorBoundary } from '@/components/auth/auth-error-boundary';
import { AuthLayout } from '@/components/auth/auth-layout';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';
import { useExchangeHashForSession } from '@/lib/auth/use-exchange-hash-for-session';

export const Route = createFileRoute('/update-password')({
  validateSearch: (search: Record<string, unknown>) => ({
    code: typeof search.code === 'string' ? search.code : undefined,
  }),
  beforeLoad: async ({ search }) => {
    if (typeof window === 'undefined') return;
    if (!search.code) return;

    const { supabase } = await import('@/lib/supabase/client');
    // PKCE flow: exchange code for session. Server-initiated reset uses implicit (hash).
    await supabase.auth.exchangeCodeForSession(search.code).catch(() => undefined);
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
