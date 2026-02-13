import * as React from 'react';
import { useState } from 'react';
import { cn } from '~/lib/utils';
import { supabase } from '~/lib/supabase/client';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Link, useNavigate } from '@tanstack/react-router';
import { useTanStackForm } from '~/hooks/_shared/use-tanstack-form';
import { registerSchema } from '@/lib/schemas/auth';
import { TextField } from '@/components/shared/forms';
import { Loader2 } from 'lucide-react';

export function SignUpForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const navigate = useNavigate();
  const [authError, setAuthError] = useState<string | null>(null);

  const form = useTanStackForm({
    schema: registerSchema,
    defaultValues: {
      name: '',
      organizationName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    onSubmit: async (values) => {
      setAuthError(null);
      const { error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
          data: {
            name: values.name || values.email.split('@')[0],
            organization_name:
              values.organizationName ||
              `${values.name || values.email.split('@')[0]}'s Organization`,
          },
        },
      });
      if (error) throw error;
      await navigate({ to: '/sign-up-success', search: { email: values.email } });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAuthError(null);
    void form.handleSubmit().catch((err) => {
      setAuthError(err instanceof Error ? err.message : 'An error occurred');
    });
  };

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card className="border-border/80 shadow-lg">
        <CardHeader className="space-y-1.5 pb-4">
          <CardTitle className="text-2xl font-semibold tracking-tight">Create an account</CardTitle>
          <CardDescription className="text-muted-foreground">
            Enter your details to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form id="sign-up-form" onSubmit={handleSubmit} noValidate>
            <div className="flex flex-col gap-5">
              <form.Field name="name">
                {(field) => (
                  <TextField
                    field={field}
                    label="Full Name"
                    placeholder="John Doe"
                    required
                  />
                )}
              </form.Field>
              <form.Field name="organizationName">
                {(field) => (
                  <TextField
                    field={field}
                    label="Organization Name"
                    placeholder="Acme Inc"
                    required
                  />
                )}
              </form.Field>
              <form.Field name="email">
                {(field) => (
                  <TextField
                    field={field}
                    label="Email"
                    type="email"
                    placeholder="m@example.com"
                    required
                    autocomplete="email"
                  />
                )}
              </form.Field>
              <form.Field name="password">
                {(field) => (
                  <TextField
                    field={field}
                    label="Password"
                    type="password"
                    required
                    autocomplete="new-password"
                  />
                )}
              </form.Field>
              <form.Field name="confirmPassword">
                {(field) => (
                  <TextField
                    field={field}
                    label="Repeat Password"
                    type="password"
                    required
                    autocomplete="new-password"
                  />
                )}
              </form.Field>
              {authError && (
                <p className="text-sm text-destructive" role="alert">
                  {authError}
                </p>
              )}
              <Button
                type="submit"
                className="w-full h-11 font-medium transition-colors duration-200"
                disabled={form.state.isSubmitting}
              >
                {form.state.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />
                    Creating account...
                  </>
                ) : (
                  'Create account'
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
    </div>
  );
}
