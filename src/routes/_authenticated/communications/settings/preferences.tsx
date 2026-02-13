/**
 * Communication Preferences Settings Route
 *
 * Organization-wide communication preference settings and audit history.
 */
import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { RouteErrorFallback } from "@/components/layout";
import { CommunicationsListSkeleton } from "@/components/skeletons/communications";

const PreferencesSettingsPage = lazy(() => import("./-preferences-page"));

export const Route = createFileRoute(
  "/_authenticated/communications/settings/preferences"
)({
  component: () => (
    <Suspense fallback={<CommunicationsListSkeleton />}>
      <PreferencesSettingsPage />
    </Suspense>
  ),
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/communications" />
  ),
  pendingComponent: () => <CommunicationsListSkeleton />,
});
