/**
 * Settings Index Route
 *
 * Main entry point for all settings at /settings.
 * Renders the unified settings container with grouped sidebar.
 */

import { createFileRoute } from "@tanstack/react-router";
import { UnifiedSettingsContainer } from "@/components/domain/settings";

export const Route = createFileRoute("/_authenticated/settings/")({
  component: SettingsPage,
  errorComponent: ({ error }) => (
    <div className="container mx-auto py-12 text-center">
      <h2 className="text-xl font-semibold text-destructive mb-2">Failed to load settings</h2>
      <p className="text-muted-foreground">{error.message}</p>
    </div>
  ),
});

function SettingsPage() {
  return (
    <div className="container mx-auto py-6 px-4">
      <UnifiedSettingsContainer />
    </div>
  );
}
