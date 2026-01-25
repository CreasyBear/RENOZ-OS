import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { requestPasswordReset } from '@/server/functions/auth/password-reset';
import { useMutation } from '@/hooks';

export function ForgotPasswordForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const [email, setEmail] = useState('');

  const forgotPasswordMutation = useMutation({
    fn: requestPasswordReset,
    onSuccess: () => {
      // Server function always returns success to prevent email enumeration
      // The UI will show success regardless of whether email exists
    },
  });

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      {forgotPasswordMutation.data?.success ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Check Your Email</CardTitle>
            <CardDescription>Password reset instructions sent</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              If an account with that email address exists, we have sent you a link to reset your
              password.
            </p>
            <div className="mt-4">
              <Link to="/login" className="text-primary text-sm font-medium hover:underline">
                ← Back to login
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Reset Your Password</CardTitle>
            <CardDescription>
              Type in your email and we&apos;ll send you a link to reset your password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                forgotPasswordMutation.mutate({
                  data: { email },
                });
              }}
            >
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                {forgotPasswordMutation.data && !forgotPasswordMutation.data.success && (
                  <p className="text-sm text-red-500">{forgotPasswordMutation.data.error}</p>
                )}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={forgotPasswordMutation.status === 'pending'}
                >
                  {forgotPasswordMutation.status === 'pending' ? 'Sending...' : 'Send reset email'}
                </Button>
              </div>
              <div className="mt-4 text-center text-sm">
                Already have an account?{' '}
                <Link to="/login" className="underline underline-offset-4">
                  Login
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
