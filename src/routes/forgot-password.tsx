import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import { AuthLayout } from '@/components/auth/auth-layout';
import { AuthErrorBoundary } from '@/components/auth/auth-error-boundary';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/forgot-password')({
  component: ForgotPassword,
});

function ForgotPassword() {
  return (
    <AuthErrorBoundary>
      <AuthLayout>
        <ForgotPasswordForm />
      </AuthLayout>
    </AuthErrorBoundary>
  );
}
