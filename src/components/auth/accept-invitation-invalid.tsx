/**
 * Accept Invitation — Invalid/Expired State
 */

import { Link } from '@tanstack/react-router';
import { Mail } from 'lucide-react';
import { AuthStatusCard } from './auth-status-card';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface AcceptInvitationInvalidViewProps {
  errorMessage: string;
}

export function AcceptInvitationInvalidView({ errorMessage }: AcceptInvitationInvalidViewProps) {
  return (
    <AuthStatusCard
      variant="error"
      title="Invalid Invitation"
      description={errorMessage || 'This invitation link is invalid or has expired.'}
      action={
        <div className="space-y-4">
          <div className="rounded-md border border-muted bg-muted/30 p-3">
            <p className="text-sm text-muted-foreground">
              <strong>Didn&apos;t receive the email?</strong> Ask your administrator to resend the
              invitation from the Invitations page.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Make sure to check your spam folder or add the sender to your contacts.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Link
              to="/login"
              search={{ redirect: undefined }}
              className={cn(buttonVariants(), 'w-full')}
            >
              Go to Sign in
            </Link>
            <Link
              to="/"
              search={{ code: undefined }}
              className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}
            >
              <Mail className="mr-2 h-4 w-4" />
              Back to home
            </Link>
          </div>
        </div>
      }
    />
  );
}
