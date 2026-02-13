/**
 * Accept Invitation — Success State
 */

import { Link, useNavigate } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { AuthStatusCard } from './auth-status-card';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface AcceptInvitationSuccessViewProps {
  redirectTarget: 'dashboard' | 'login';
}

export function AcceptInvitationSuccessView({ redirectTarget }: AcceptInvitationSuccessViewProps) {
  const navigate = useNavigate();

  const description =
    redirectTarget === 'dashboard'
      ? "Your account is ready. You'll complete a quick setup, then go to your dashboard."
      : "Your account has been created. Sign in with your new password to continue.";

  useEffect(() => {
    if (redirectTarget === 'dashboard') {
      navigate({ to: '/onboarding', replace: true });
    }
  }, [redirectTarget, navigate]);

  return (
    <AuthStatusCard
      variant="success"
      title="Welcome aboard!"
      description={description}
      action={
        <div className="space-y-2">
          {redirectTarget === 'dashboard' ? (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Redirecting...
            </div>
          ) : (
            <Link to="/login" search={{ redirect: undefined }} className={cn(buttonVariants(), 'w-full')}>
              Sign in now
            </Link>
          )}
        </div>
      }
    />
  );
}
