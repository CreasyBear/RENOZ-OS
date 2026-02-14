/**
 * Sign-Up Success Card
 *
 * Displays post-signup confirmation instructions with resend and login links.
 * Used on /sign-up-success route.
 *
 * @source useResendConfirmationEmail
 * @source sign-up-success route
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link } from '@tanstack/react-router';
import { useResendConfirmationEmail } from '@/hooks/auth/use-resend-confirmation';
import { useCooldown } from '@/hooks/_shared/use-cooldown';

const COOLDOWN_SECONDS = 60;

export interface SignUpSuccessCardProps {
  email?: string;
}

function SignUpSuccessResultCard({ displayEmail }: { displayEmail: string }) {
  return (
    <Card className="border-border/80 shadow-lg">
      <CardHeader className="space-y-1.5 pb-4">
        <CardTitle className="text-2xl font-semibold tracking-tight">Check your inbox</CardTitle>
        <CardDescription>Confirmation email sent</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm" aria-live="polite">
          {displayEmail && (
            <>We sent a confirmation link to {displayEmail}. </>
          )}
          Check your inbox, then sign in.
        </p>
        <div className="mt-4">
          <Link
            to="/login"
            search={{ redirect: undefined }}
            className="text-primary text-sm font-medium hover:underline"
          >
            Sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

interface SignUpSuccessFormCardProps {
  emailProp: string | undefined;
  emailInput: string;
  setEmailInput: (value: string) => void;
  errorMessage: string | null;
  isResendDisabled: boolean;
  cooldown: number;
  isPending: boolean;
  onResend: (e?: React.FormEvent) => void;
}

function SignUpSuccessFormCard({
  emailProp,
  emailInput,
  setEmailInput,
  errorMessage,
  isResendDisabled,
  cooldown,
  isPending,
  onResend,
}: SignUpSuccessFormCardProps) {
  return (
    <Card className="border-border/80 shadow-lg">
      <CardHeader className="space-y-1.5 pb-4">
        <CardTitle className="text-2xl font-semibold tracking-tight">Check your email</CardTitle>
        <CardDescription>
          {emailProp ? (
            <>
              We sent a confirmation link to{' '}
              <a
                href={`mailto:${emailProp}`}
                className="font-medium text-primary underline underline-offset-4"
              >
                {emailProp}
              </a>
            </>
          ) : (
            'Enter your email to resend the confirmation link.'
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <form onSubmitCapture={onResend} onSubmit={onResend} noValidate className="flex flex-col gap-5">
          {!emailProp && (
            <div className="grid gap-2">
              <Label htmlFor="resend-email">Email</Label>
              <Input
                id="resend-email"
                type="email"
                placeholder="m@example.com"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                aria-describedby={errorMessage ? 'resend-error' : undefined}
              />
            </div>
          )}
          {errorMessage && (
            <p
              id="resend-error"
              className="text-sm text-destructive"
              aria-live="polite"
              role="alert"
            >
              {errorMessage}
            </p>
          )}
          <Button
            type="button"
            onClick={() => onResend()}
            disabled={isResendDisabled}
            className="w-full h-11 font-medium transition-colors duration-200"
            aria-label={
              cooldown > 0
                ? `Resend email (available in ${cooldown} seconds)`
                : isPending
                  ? 'Sending confirmation email'
                  : 'Resend confirmation email'
            }
            aria-busy={isPending}
          >
            {isPending
              ? 'Sending...'
              : cooldown > 0
                ? `Resend in ${cooldown}s`
                : 'Resend email'}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already confirmed?{' '}
          <Link
            to="/login"
            search={{ redirect: undefined }}
            className="font-medium text-foreground underline-offset-4 hover:underline transition-colors duration-200 cursor-pointer"
          >
            Sign in
          </Link>
        </p>

        <ul className="text-muted-foreground space-y-1 text-xs">
          <li>• Check spam or promotions</li>
          <li>• Whitelist our sender</li>
          <li>• Allow a few minutes for delivery</li>
        </ul>
      </CardContent>
    </Card>
  );
}

export function SignUpSuccessCard({ email: emailProp }: SignUpSuccessCardProps) {
  const [emailInput, setEmailInput] = useState('');
  const [lastSentEmail, setLastSentEmail] = useState<string | null>(null);
  const [cooldown, startCooldown] = useCooldown(COOLDOWN_SECONDS);

  const resendMutation = useResendConfirmationEmail();
  const email = emailProp ?? emailInput;

  const handleResend = (e?: React.FormEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    const targetEmail = emailProp ?? emailInput;
    if (!targetEmail || cooldown > 0) return;

    resendMutation.mutate(
      { email: targetEmail },
      {
        onSuccess: (result) => {
          if (result.success) {
            setLastSentEmail(targetEmail);
            startCooldown();
          }
        },
      }
    );
  };

  const isResendDisabled = !email || cooldown > 0 || resendMutation.isPending;
  const mutationData = resendMutation.data;
  const hasSuccess = mutationData?.success === true;
  const hasError = mutationData && !mutationData.success;

  let errorMessage: string | null = null;
  if (hasError && mutationData) {
    errorMessage =
      mutationData.retryAfter
        ? `${mutationData.error ?? ''} Try again in ${Math.ceil(mutationData.retryAfter / 60)} minutes.`
        : (mutationData.error ?? null);
  } else if (resendMutation.error instanceof Error) {
    errorMessage = resendMutation.error.message;
  } else if (resendMutation.error) {
    errorMessage = 'Failed to send confirmation email. Please try again.';
  }

  const displayEmail = lastSentEmail ?? emailProp ?? emailInput ?? '';

  if (hasSuccess) {
    return <SignUpSuccessResultCard displayEmail={displayEmail} />;
  }

  return (
    <SignUpSuccessFormCard
      emailProp={emailProp}
      emailInput={emailInput}
      setEmailInput={setEmailInput}
      errorMessage={errorMessage}
      isResendDisabled={isResendDisabled}
      cooldown={cooldown}
      isPending={resendMutation.isPending}
      onResend={handleResend}
    />
  );
}
