/**
 * Accept Invitation — Form
 *
 * Uses TanStack Form with design system: Card, TextField, Button, Loader2.
 */

import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { TextField, FormFieldDisplayProvider } from '@/components/shared/forms';
import { getPasswordStrength } from '@/lib/auth/password-utils';
import { cn } from '@/lib/utils';
import type { TanStackFormApi } from '@/hooks/_shared/use-tanstack-form';
import type { AcceptInvitationFormData } from '@/lib/schemas/auth';

export interface InvitationDetails {
  email: string;
  role: string;
  personalMessage: string | null;
  organizationName: string | null;
  inviterName: string | null;
}

export interface AcceptInvitationFormProps {
  invitation: InvitationDetails | null;
  form: TanStackFormApi<AcceptInvitationFormData>;
  /** Token for preserving invitation context when navigating to login */
  token?: string | null;
  /** Validation error from onSubmitInvalid (set by parent route) */
  validationError?: string | null;
  /** Called when form is submitted to clear validation error */
  onClearValidationError?: () => void;
}

export function AcceptInvitationForm({
  invitation,
  form,
  token,
  validationError,
  onClearValidationError,
}: AcceptInvitationFormProps) {
  const passwordValue = form.useWatch('password');
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setGeneralError(null);
    onClearValidationError?.();
    void form.handleSubmit().catch((err) => {
      setGeneralError(err instanceof Error ? err.message : 'Failed to create account');
    });
  };

  const displayError = validationError ?? generalError;

  return (
    <div className="w-full space-y-8">
      <div>
        <h2 className="mt-6 text-center text-2xl font-bold text-foreground">
          Accept your invitation
        </h2>
        {invitation && (
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              You&apos;ve been invited to join{' '}
              <strong className="text-foreground">{invitation.organizationName}</strong>
              {invitation.inviterName && (
                <>
                  {' '}
                  by <strong className="text-foreground">{invitation.inviterName}</strong>
                </>
              )}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Role: <span className="font-medium capitalize">{invitation.role}</span>
            </p>
            {invitation.personalMessage && (
              <div className="mt-4 rounded-md bg-muted p-3 text-sm italic text-muted-foreground">
                &quot;{invitation.personalMessage}&quot;
              </div>
            )}
          </div>
        )}
      </div>

      <Card className="border-border/80 shadow-lg">
        <CardHeader />
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit} noValidate>
            {displayError && (
              <div
                className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                role="alert"
              >
                {displayError}
              </div>
            )}

            <FormFieldDisplayProvider form={form}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  value={invitation?.email ?? ''}
                  disabled
                  className="cursor-not-allowed bg-muted"
                />
              </div>

              <form.Field name="firstName">
                {(field) => (
                  <TextField
                    field={field}
                    label="First Name"
                    placeholder="John"
                    required
                    autocomplete="given-name"
                    disabled={form.state.isSubmitting}
                  />
                )}
              </form.Field>

              <form.Field name="lastName">
                {(field) => (
                  <TextField
                    field={field}
                    label="Last Name"
                    placeholder="Doe"
                    required
                    autocomplete="family-name"
                    disabled={form.state.isSubmitting}
                  />
                )}
              </form.Field>

              <form.Field name="password">
                {(field) => {
                  const passwordStrength = getPasswordStrength(field.state.value ?? '');
                  return (
                    <div className="space-y-2">
                      <TextField
                        field={field}
                        label="Create Password"
                        type={showPasswords ? 'text' : 'password'}
                        placeholder="********"
                        required
                        autocomplete="new-password"
                        disabled={form.state.isSubmitting}
                      />
                      {passwordValue && (
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className={cn('h-full transition-all', passwordStrength.color)}
                              style={{
                                width: `${passwordStrength.strength > 0 ? (passwordStrength.strength / 4) * 100 : 0}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs font-medium text-muted-foreground">
                            {passwordStrength.label}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                }}
              </form.Field>

              <form.Field name="confirmPassword">
                {(field) => (
                  <TextField
                    field={field}
                    label="Confirm Password"
                    type={showPasswords ? 'text' : 'password'}
                    placeholder="********"
                    required
                    autocomplete="new-password"
                    disabled={form.state.isSubmitting}
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
            </div>

            <Button type="submit" className="w-full" disabled={form.state.isSubmitting}>
              {form.state.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating your account...
                </>
              ) : (
                'Accept invitation & create account'
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link
                to="/login"
                search={
                  token
                    ? { redirect: `/accept-invitation?token=${encodeURIComponent(token)}` }
                    : { redirect: undefined }
                }
                className="font-medium text-primary underline underline-offset-4"
              >
                Sign in
              </Link>
            </p>
            </FormFieldDisplayProvider>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
