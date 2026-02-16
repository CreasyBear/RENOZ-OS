/**
 * Accept Invitation Route
 *
 * Handles the invitation acceptance flow when a user clicks the
 * invitation link from their email.
 *
 * Flow:
 * 1. Extract token from URL; exchange Supabase hash (access_token, refresh_token) for session
 * 2. Fetch invitation details (public endpoint)
 * 3. User enters name and password
 * 4. Server: acceptInvitation (sets password via admin API, marks accepted)
 * 5. Client: signInWithPassword, then redirect to dashboard
 *
 * @see src/server/functions/invitations.ts for server functions
 */
import { createFileRoute } from '@tanstack/react-router';
import { useState, useMemo, useEffect } from 'react';
import { useInvitationByToken, useAcceptInvitation } from '@/hooks/users/use-invitations';
import { supabase } from '@/lib/supabase/client';
import { acceptInvitationSchema } from '@/lib/schemas/auth';
import { useTanStackForm } from '@/hooks/_shared/use-tanstack-form';
import { z } from 'zod';
import { AcceptInvitationLoadingView } from '@/components/auth/accept-invitation-loading';
import { AcceptInvitationInvalidView } from '@/components/auth/accept-invitation-invalid';
import { AcceptInvitationSuccessView } from '@/components/auth/accept-invitation-success';
import { AcceptInvitationForm } from '@/components/auth/accept-invitation-form';
import { AuthErrorBoundary } from '@/components/auth/auth-error-boundary';
import { AuthLayout } from '@/components/auth/auth-layout';

// Search params for the token (optional – missing/invalid shows recovery UI)
const acceptInvitationSearchSchema = z.object({
  token: z.string().optional(),
});

export const Route = createFileRoute('/accept-invitation')({
  validateSearch: acceptInvitationSearchSchema,
  component: AcceptInvitationPage,
});

type PageState = 'loading' | 'ready' | 'submitting' | 'success' | 'error' | 'invalid';

interface InvitationDetails {
  email: string;
  role: string;
  personalMessage: string | null;
  organizationName: string | null;
  inviterName: string | null;
  expiresAt: Date;
}

/**
 * Exchange Supabase redirect hash (access_token, refresh_token) for a session.
 * Required for invite flow: user lands with session in URL fragment.
 */
function useExchangeHashForSession() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash;
    if (!hash) return;
    const params = new URLSearchParams(hash.slice(1));
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    if (access_token && refresh_token) {
      void supabase.auth
        .setSession({ access_token, refresh_token })
        .then(() => {
          // Remove hash from URL without triggering navigation
          const url = new URL(window.location.href);
          url.hash = '';
          window.history.replaceState(null, '', url.toString());
        })
        .catch(() => {
          // Ignore - user may have already established session
        });
    }
  }, []);
}

function AcceptInvitationPage() {
  const { token } = Route.useSearch();

  useExchangeHashForSession();

  const { data: invitationData, isLoading: isLoadingInvitation, error: invitationError } =
    useInvitationByToken(token ?? '');

  const hasValidToken = Boolean(token?.trim());
  const acceptInvitation = useAcceptInvitation();

  const [redirectTarget, setRedirectTarget] = useState<'dashboard' | 'login'>('login');
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [validationError, setValidationError] = useState<string | null>(null);

  const invitation = useMemo<InvitationDetails | null>(() => {
    if (!invitationData) return null;
    return {
      email: invitationData.email,
      role: invitationData.role,
      personalMessage: invitationData.personalMessage,
      organizationName: invitationData.organizationName,
      inviterName: invitationData.inviterName,
      expiresAt: new Date(invitationData.expiresAt),
    };
  }, [invitationData]);

  const form = useTanStackForm({
    schema: acceptInvitationSchema,
    defaultValues: {
      firstName: '',
      lastName: '',
      password: '',
      confirmPassword: '',
    },
    onSubmitInvalid: () => setValidationError('Please check your input and try again.'),
    onSubmit: async (values) => {
      setSubmitState('submitting');
      try {
        const result = await acceptInvitation.mutateAsync({
          token: token!,
          firstName: values.firstName,
          lastName: values.lastName,
          password: values.password,
          confirmPassword: values.confirmPassword,
        });

        if (!result.success) return;

        setSubmitState('success');
        const invitationEmail = invitation?.email ?? invitationData?.email;
        if (!invitationEmail) {
          setRedirectTarget('login');
          return;
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: invitationEmail,
          password: values.password,
        });

        if (signInError) {
          setRedirectTarget('login');
          return;
        }

        setRedirectTarget('dashboard');
        // Success view will handle navigation via useEffect
      } catch (err) {
        setSubmitState('error');
        throw err;
      }
    },
  });

  const pageState: PageState =
    submitState !== 'idle'
      ? submitState
      : !hasValidToken || invitationError
        ? 'invalid'
        : isLoadingInvitation
          ? 'loading'
          : invitationData
            ? 'ready'
            : 'loading';

  const errorMessage =
    !hasValidToken
      ? 'Invalid invitation link. Please use the link from your invitation email.'
      : invitationError instanceof Error
        ? invitationError.message
        : 'Invalid or expired invitation';

  return (
    <AuthErrorBoundary>
      <AuthLayout maxWidth="max-w-md">
        {pageState === 'loading' && <AcceptInvitationLoadingView />}
        {pageState === 'invalid' && (
          <AcceptInvitationInvalidView
            errorMessage={errorMessage || 'This invitation link is invalid or has expired.'}
          />
        )}
        {pageState === 'success' && (
          <AcceptInvitationSuccessView redirectTarget={redirectTarget} />
        )}
        {(pageState === 'ready' || pageState === 'submitting' || pageState === 'error') && (
          <AcceptInvitationForm
            invitation={invitation}
            form={form}
            token={token}
            validationError={validationError}
            onClearValidationError={() => setValidationError(null)}
          />
        )}
      </AuthLayout>
    </AuthErrorBoundary>
  );
}
