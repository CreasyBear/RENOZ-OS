import { createFileRoute, Link } from '@tanstack/react-router';
import { authErrorMessage, toAuthErrorCode } from '@/lib/auth/error-codes';
import { AuthErrorBoundary } from '@/components/auth/auth-error-boundary';
import { AuthLayout } from '@/components/auth/auth-layout';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { LogIn, Home, KeyRound } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/auth/error')({
  component: AuthError,
  validateSearch: (params) => {
    const error = params.error && typeof params.error === 'string' ? params.error : undefined;
    const errorDescription =
      params.error_description && typeof params.error_description === 'string'
        ? params.error_description
        : undefined;
    // Always return object so direct nav to /auth/error (no params) still renders with generic message
    return { error, error_description: errorDescription };
  },
});

const PASSWORD_RESET_ERROR_CODES = ['invalid_request', 'token_exchange_failed', 'access_denied'];

function AuthError() {
  const params = Route.useSearch();
  const errorCode = toAuthErrorCode(params?.error);
  const displayMessage = params?.error_description ?? authErrorMessage(errorCode);
  const showForgotPassword =
    errorCode && PASSWORD_RESET_ERROR_CODES.includes(errorCode);

  return (
    <AuthErrorBoundary>
      <AuthLayout maxWidth="max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Sorry, something went wrong</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">{displayMessage}</p>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Link to="/login" search={{}} className={cn(buttonVariants(), 'w-full')}>
              <LogIn className="mr-2 h-4 w-4" />
              Sign in
            </Link>
            {showForgotPassword && (
              <Link to="/forgot-password" className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}>
                <KeyRound className="mr-2 h-4 w-4" />
                Request a new reset link
              </Link>
            )}
            <Link to="/" search={{ code: undefined }} className={cn(buttonVariants({ variant: 'ghost' }), 'w-full')}>
              <Home className="mr-2 h-4 w-4" />
              Go home
            </Link>
          </CardFooter>
        </Card>
      </AuthLayout>
    </AuthErrorBoundary>
  );
}
