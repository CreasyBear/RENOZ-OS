import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { TextField } from '@/components/shared/forms';
import { useRequestPasswordReset } from '@/hooks/auth';
import { forgotPasswordSchema, type ForgotPassword } from '@/lib/schemas/auth';
import { useTanStackForm } from '@/hooks/_shared/use-tanstack-form';

export function ForgotPasswordForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const forgotPasswordMutation = useRequestPasswordReset();
  const form = useTanStackForm<ForgotPassword>({
    schema: forgotPasswordSchema,
    defaultValues: {
      email: '',
    },
    onSubmitInvalid: () => {
      setSubmitError('Please enter a valid email address.');
    },
    onSubmit: async (values) => {
      setSubmitError(null);
      const result = await forgotPasswordMutation.mutateAsync({ email: values.email.trim() });
      if (!result.success) {
        throw new Error(result.error ?? 'Failed to send password reset email.');
      }
    },
  });

  const isSubmitting = forgotPasswordMutation.status === 'pending' || form.state.isSubmitting;
  const showErrorsAfterSubmit = form.state.submissionAttempts > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    void form.handleSubmit().catch((error: unknown) => {
      setSubmitError(error instanceof Error ? error.message : 'An unexpected error occurred.');
    });
  };

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
            <form onSubmit={handleSubmit} noValidate>
              <div className="flex flex-col gap-5">
                <form.Field name="email">
                  {(field) => (
                    <TextField
                      field={field}
                      label="Email"
                      type="email"
                      placeholder="name@company.com"
                      required
                      showErrorsAfterSubmit={showErrorsAfterSubmit}
                    />
                  )}
                </form.Field>

                <div className="min-h-5">
                  {submitError && (
                    <p className="text-sm text-destructive" role="alert">
                      {submitError}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 font-medium transition-colors duration-200"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </span>
                  ) : (
                    'Send reset email'
                  )}
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
