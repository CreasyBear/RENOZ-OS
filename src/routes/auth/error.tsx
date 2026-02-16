import { createFileRoute } from '@tanstack/react-router';
import { authErrorMessage, toAuthErrorCode } from '@/lib/auth/error-codes';
import { AuthErrorBoundary } from '@/components/auth/auth-error-boundary';
import { AuthLayout } from '@/components/auth/auth-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const Route = createFileRoute('/auth/error')({
  component: AuthError,
  validateSearch: (params) => {
    const error = params.error && typeof params.error === 'string' ? params.error : undefined;
    const errorDescription =
      params.error_description && typeof params.error_description === 'string'
        ? params.error_description
        : undefined;
    if (error || errorDescription) {
      return { error, error_description: errorDescription };
    }
    return null;
  },
});

function AuthError() {
  const params = Route.useSearch();
  const errorCode = toAuthErrorCode(params?.error);
  const displayMessage = params?.error_description ?? authErrorMessage(errorCode);

  return (
    <AuthErrorBoundary>
      <AuthLayout>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Sorry, something went wrong.</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">{displayMessage}</p>
          </CardContent>
        </Card>
      </AuthLayout>
    </AuthErrorBoundary>
  );
}
