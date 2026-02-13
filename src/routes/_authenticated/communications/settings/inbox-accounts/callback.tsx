/**
 * OAuth Callback Route for Inbox Email Accounts
 *
 * Handles OAuth callback after user authorizes email account connection.
 * Extracts code and state from URL params and processes the connection.
 *
 * @see src/server/functions/communications/inbox-accounts.ts
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useHandleInboxEmailAccountCallback } from "@/hooks/communications/use-inbox-email-accounts";
import { Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { getUserFriendlyMessage } from "@/lib/error-handling";

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute(
  "/_authenticated/communications/settings/inbox-accounts/callback"
)({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      code: (search.code as string) || "",
      state: (search.state as string) || "",
      error: (search.error as string) || undefined,
      error_description: (search.error_description as string) || undefined,
    };
  },
  component: InboxEmailAccountsCallbackPage,
});

// ============================================================================
// PAGE COMPONENT
// ============================================================================

function InboxEmailAccountsCallbackPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const callbackMutation = useHandleInboxEmailAccountCallback();

  useEffect(() => {
    // Handle OAuth error
    if (search.error) {
      toast.error('Email account connection failed', {
        description: search.error_description || 'Please try again',
      });
      navigate({
        to: "/communications/settings/inbox-accounts",
        search: {
          error: search.error,
          error_description: search.error_description,
        },
      });
      return;
    }

    // Process callback if we have code and state
    if (search.code && search.state) {
      callbackMutation.mutate(
        {
          code: search.code,
          state: search.state,
        },
        {
          onSuccess: () => {
            toast.success('Email account connected successfully');
            // Redirect to settings page on success
            navigate({
              to: "/communications/settings/inbox-accounts",
            });
          },
          onError: (error) => {
            toast.error('Failed to connect email account', {
              description: getUserFriendlyMessage(error as Error),
            });
            // Redirect to settings page with error
            navigate({
              to: "/communications/settings/inbox-accounts",
              search: {
                error: "connection_failed",
                error_description: error.message,
              },
            });
          },
        }
      );
    }
  }, [search.code, search.state, search.error, search.error_description, callbackMutation, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">
        Connecting your email account...
      </p>
    </div>
  );
}

export default InboxEmailAccountsCallbackPage;
