/**
 * Organization Settings Route
 *
 * Unified Cursor-style settings page with tight row-based layout.
 * Uses container/presenter pattern per STANDARDS.md.
 *
 * @see Phase 3 of settings rationalization
 */

import { createFileRoute } from "@tanstack/react-router";
import { OrganizationSettingsContainer } from "@/components/domain/settings";

export const Route = createFileRoute("/_authenticated/settings/organization")({
  component: OrganizationSettingsPage,
  errorComponent: ({ error }) => (
    <div className="container mx-auto py-12 text-center">
      <h2 className="text-xl font-semibold text-destructive mb-2">Failed to load settings</h2>
      <p className="text-muted-foreground">{error.message}</p>
    </div>
  ),
});

function OrganizationSettingsPage() {
  return (
    <div className="container mx-auto py-6 px-4">
      <OrganizationSettingsContainer />
    </div>
  );
}
