import * as React from 'react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';
import { TextField, FormFieldDisplayProvider } from '@/components/shared/forms';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTanStackForm } from '@/hooks/_shared/use-tanstack-form';
import { getPasswordStrength } from '@/lib/auth/password-utils';
import { passwordWithConfirmSchema } from '@/lib/schemas/auth';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

export function ResetPasswordForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const [showPasswords, setShowPasswords] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const navigate = useNavigate();

  type ResetPasswordValues = z.infer<typeof passwordWithConfirmSchema>;

  const form = useTanStackForm<ResetPasswordValues>({
    schema: passwordWithConfirmSchema,
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
    onSubmitInvalid: () => {
      setSubmitError('Please check your input and try again.');
    },
    onSubmit: async (values) => {
      setSubmitError(null);
      const { error } = await supabase.auth.updateUser({ password: values.password });
      if (error) throw error;
      await navigate({ to: '/dashboard', search: { tab: 'overview' } });
    },
  });

  const password = form.useWatch('password');
  const passwordStrength = useMemo(
    () => getPasswordStrength(password ?? ''),
    [password]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    void form.handleSubmit().catch((error: unknown) => {
      setSubmitError(error instanceof Error ? error.message : 'An error occurred');
    });
  };

  const isSubmitting = form.state.isSubmitting;

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card className="border-border/80 shadow-lg">
        <CardHeader className="space-y-1.5 pb-4">
          <CardTitle className="text-2xl font-semibold tracking-tight">Reset your password</CardTitle>
          <CardDescription className="text-muted-foreground">
            Enter and confirm your new password below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} noValidate>
            <FormFieldDisplayProvider form={form}>
            <div className="flex flex-col gap-5">
              <form.Field name="password">
                {(field) => (
                  <TextField
                    field={field}
                    label="New password"
                    type={showPasswords ? 'text' : 'password'}
                    placeholder="Enter a strong password"
                    required
                    autocomplete="new-password"
                  />
                )}
              </form.Field>

              <div className="space-y-2">
                <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`${passwordStrength.color} transition-all duration-200`}
                    style={{ width: `${(passwordStrength.strength / 4) * 100}%` }}
                    aria-hidden="true"
                  />
                </div>
                <p className="text-muted-foreground text-xs">
                  Password strength: <span className="font-medium">{passwordStrength.label}</span>
                </p>
              </div>

              <form.Field name="confirmPassword">
                {(field) => (
                  <TextField
                    field={field}
                    label="Confirm password"
                    type={showPasswords ? 'text' : 'password'}
                    placeholder="Re-enter your password"
                    required
                    autocomplete="new-password"
                  />
                )}
              </form.Field>

              <Button
                type="button"
                variant="ghost"
                className="h-11 w-full cursor-pointer"
                onClick={() => setShowPasswords((prev) => !prev)}
              >
                {showPasswords ? 'Hide passwords' : 'Show passwords'}
              </Button>

              <div className="min-h-5">
                {submitError && (
                  <p className="text-sm text-destructive" role="alert">
                    {submitError}
                  </p>
                )}
              </div>

              <Button type="submit" className="h-11 w-full font-medium" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </span>
                ) : (
                  'Save new password'
                )}
              </Button>
            </div>
            </FormFieldDisplayProvider>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Back to{' '}
              <Link
                to="/login"
                search={{ redirect: undefined }}
                className="cursor-pointer font-medium text-foreground underline-offset-4 transition-colors duration-200 hover:underline"
              >
                sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
