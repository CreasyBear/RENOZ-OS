import { createFileRoute } from '@tanstack/react-router';
import { AuthErrorBoundary } from '@/components/auth/auth-error-boundary';
import { AuthLayout } from '@/components/auth/auth-layout';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';

export const Route = createFileRoute('/update-password')({
  validateSearch: (search: Record<string, unknown>) => ({
    code: typeof search.code === 'string' ? search.code : undefined,
  }),
  beforeLoad: async ({ search }) => {
    if (typeof window === 'undefined') return;
    if (!search.code) return;

    const { supabase } = await import('@/lib/supabase/client');
    // Fallback exchange to support environments where automatic PKCE code handling is delayed.
    await supabase.auth.exchangeCodeForSession(search.code).catch(() => undefined);
  },
  component: UpdatePassword,
});

function UpdatePassword() {
  return (
    <AuthErrorBoundary>
      <AuthLayout>
        <ResetPasswordForm />
      </AuthLayout>
    </AuthErrorBoundary>
  );
}
