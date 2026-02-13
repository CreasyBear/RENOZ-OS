import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useRequestPasswordReset } from '@/hooks/auth';

export function ForgotPasswordForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const [email, setEmail] = useState('');

  const forgotPasswordMutation = useRequestPasswordReset();

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      {forgotPasswordMutation.data?.success ? (
        <Card className="border-border/80 shadow-lg">
          <CardHeader className="space-y-1.5 pb-4">
            <CardTitle className="text-2xl font-semibold tracking-tight">Check your email</CardTitle>
            <CardDescription>Password reset instructions sent</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              If an account with that email address exists, we have sent you a link to reset your
              password.
            </p>
            <div className="mt-6">
              <Link
                to="/login"
                search={{ redirect: undefined }}
                className="text-sm font-medium text-primary hover:underline underline-offset-4 transition-colors duration-200 cursor-pointer"
              >
                ← Back to sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/80 shadow-lg">
          <CardHeader className="space-y-1.5 pb-4">
            <CardTitle className="text-2xl font-semibold tracking-tight">Reset your password</CardTitle>
            <CardDescription className="text-muted-foreground">
              Enter your email and we&apos;ll send you a link to reset your password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                forgotPasswordMutation.mutate({ email });
              }}
            >
              <div className="flex flex-col gap-5">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11"
                  />
                </div>
                {forgotPasswordMutation.data && !forgotPasswordMutation.data.success && (
                  <p className="text-sm text-destructive" role="alert">
                    {forgotPasswordMutation.data.error}
                  </p>
                )}
                <Button
                  type="submit"
                  className="w-full h-11 font-medium transition-colors duration-200"
                  disabled={forgotPasswordMutation.status === 'pending'}
                >
                  {forgotPasswordMutation.status === 'pending' ? 'Sending...' : 'Send reset email'}
                </Button>
              </div>
              <p className="mt-6 text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link
                  to="/login"
                  search={{ redirect: undefined }}
                  className="font-medium text-foreground underline-offset-4 hover:underline transition-colors duration-200 cursor-pointer"
                >
                  Sign in
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
