/**
 * Win/Loss Reasons Settings Route
 *
 * Route for managing win/loss reasons.
 * The WinLossReasonsManager component handles its own data fetching via hooks.
 *
 * @see _Initiation/_prd/2-domains/pipeline/pipeline.prd.json (PIPE-WINLOSS-UI)
 */

import { createFileRoute } from '@tanstack/react-router';
import { RouteErrorFallback } from '@/components/layout';
import { SettingsPageSkeleton } from '@/components/skeletons/settings';
import { PageLayout } from '@/components/layout/page-layout';
import { WinLossReasonsManager } from '@/components/domain/settings';

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute('/_authenticated/settings/win-loss-reasons')({
  component: WinLossReasonsPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/settings" />
  ),
  pendingComponent: () => <SettingsPageSkeleton />,
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Win/Loss Reasons page container.
 * The WinLossReasonsManager component handles data fetching using hooks from @/hooks/settings.
 */
function WinLossReasonsPage() {
  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Win/Loss Reasons"
        description="Manage reasons for winning and losing opportunities"
      />

      <PageLayout.Content>
        <WinLossReasonsManager />
      </PageLayout.Content>
    </PageLayout>
  );
}
