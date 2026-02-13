/**
 * Organization Settings Route
 *
 * Unified Cursor-style settings page with tight row-based layout.
 * Uses container/presenter pattern per STANDARDS.md.
 *
 * @see Phase 3 of settings rationalization
 */

import { createFileRoute } from "@tanstack/react-router";
import { PageLayout, RouteErrorFallback } from "@/components/layout";
import { SettingsPageSkeleton } from "@/components/skeletons/settings";
import { OrganizationSettingsContainer } from "@/components/domain/settings";

export const Route = createFileRoute("/_authenticated/settings/organization")({
  component: OrganizationSettingsPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/settings" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header title="Organization Settings" />
      <PageLayout.Content>
        <SettingsPageSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

function OrganizationSettingsPage() {
  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Organization Settings"
        description="Manage organization profile, regional, and financial settings"
      />
      <PageLayout.Content>
        <OrganizationSettingsContainer />
      </PageLayout.Content>
    </PageLayout>
  );
}
