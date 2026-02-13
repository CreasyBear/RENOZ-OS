import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { createFileRoute } from '@tanstack/react-router';
import { authErrorMessage, toAuthErrorCode } from '@/lib/auth/error-codes';

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
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Sorry, something went wrong.</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">{authErrorMessage(errorCode)}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
