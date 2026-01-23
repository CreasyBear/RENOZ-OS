/**
 * Communication Preferences Settings Route (Container)
 *
 * Organization-wide communication preference settings and audit history.
 * Shows the preference change history across all contacts.
 *
 * @see docs/plans/2026-01-24-communications-plumbing-review.md
 */
import { createFileRoute } from "@tanstack/react-router";
import { usePreferenceHistory } from "@/hooks/communications";
import { PreferenceHistory } from "@/components/domain/communications/communication-preferences";
import { ErrorState } from "@/components/shared";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Settings, Info } from "lucide-react";

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute(
  "/_authenticated/communications/settings/preferences"
)({
  component: PreferencesSettingsContainer,
});

// ============================================================================
// CONTAINER COMPONENT
// ============================================================================

function PreferencesSettingsContainer() {
  // ============================================================================
  // DATA FETCHING
  // ============================================================================
  const {
    data: historyData,
    isLoading,
    error,
    refetch,
  } = usePreferenceHistory({
    limit: 100,
  });

  // ============================================================================
  // ERROR STATE
  // ============================================================================
  if (error) {
    return (
      <ErrorState
        title="Failed to load preference history"
        description="There was an error loading the communication preference history."
        onRetry={() => refetch()}
      />
    );
  }

  // ============================================================================
  // RENDER
  // ============================================================================
  const history = historyData?.items ?? [];

  return (
    <div className="container py-6 max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Communication Preferences
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage communication preference settings and view audit history
        </p>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4" />
            About Communication Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Communication preferences control whether contacts can receive email and SMS
            communications from your organization. All preference changes are logged for
            compliance and audit purposes.
          </p>
          <p>
            To manage preferences for a specific contact, navigate to their profile page
            in the Customers section.
          </p>
        </CardContent>
      </Card>

      {/* Preference History */}
      <PreferenceHistory history={history} isLoading={isLoading} />
    </div>
  );
}

export default PreferencesSettingsContainer;
