import { createFileRoute } from '@tanstack/react-router';
import { authErrorMessage, toAuthErrorCode } from '@/lib/auth/error-codes';
import { AuthErrorBoundary } from '@/components/auth/auth-error-boundary';
import { AuthLayout } from '@/components/auth/auth-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const Route = createFileRoute('/auth/error')({
  component: AuthError,
  validateSearch: (params) => {
    if (params.error && typeof params.error === 'string') {
      return { error: params.error };
    }
    return null;
  },
});

function AuthError() {
  const params = Route.useSearch();
  const errorCode = toAuthErrorCode(params?.error);

  return (
    <AuthErrorBoundary>
      <AuthLayout>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Sorry, something went wrong.</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">{authErrorMessage(errorCode)}</p>
          </CardContent>
        </Card>
      </AuthLayout>
    </AuthErrorBoundary>
  );
}
