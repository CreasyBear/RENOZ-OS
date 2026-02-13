/**
 * Sign-Up Success Route
 *
 * Post-signup confirmation page. User lands here after submitting sign-up form.
 * Provides resend confirmation and login link.
 *
 * @see src/components/auth/sign-up-success-card.tsx
 */
import { createFileRoute } from '@tanstack/react-router';
import { SignUpSuccessCard } from '@/components/auth/sign-up-success-card';
import { AuthLayout } from '@/components/auth/auth-layout';
import { AuthErrorBoundary } from '@/components/auth/auth-error-boundary';
import { signUpSuccessSearchSchema } from '@/lib/schemas/auth';

export const Route = createFileRoute('/sign-up-success')({
  validateSearch: signUpSuccessSearchSchema,
  component: SignUpSuccessPage,
});

function SignUpSuccessPage() {
  const { email } = Route.useSearch();

  return (
    <AuthErrorBoundary>
      <AuthLayout>
        <SignUpSuccessCard email={email} />
      </AuthLayout>
    </AuthErrorBoundary>
  );
}
