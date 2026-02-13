import { SignUpForm } from '~/components/sign-up-form';
import { AuthLayout } from '@/components/auth/auth-layout';
import { AuthErrorBoundary } from '@/components/auth/auth-error-boundary';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/sign-up')({
  ssr: false,
  component: SignUp,
});

function SignUp() {
  return (
    <AuthErrorBoundary>
      <AuthLayout maxWidth="max-w-md">
        <SignUpForm />
      </AuthLayout>
    </AuthErrorBoundary>
  );
}
