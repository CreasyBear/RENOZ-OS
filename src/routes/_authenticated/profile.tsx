/**
 * Profile Route
 *
 * User profile page for viewing and editing personal information.
 * Includes profile editing, password change, avatar upload, and notification preferences.
 *
 * ARCHITECTURE: Container pattern - route handles data fetching, components are presenters
 *
 * @lastReviewed 2026-02-10
 * @see _Initiation/_prd/sprints/sprint-01-route-cleanup.prd.json (SPRINT-01-006)
 * @see STANDARDS.md for container/presenter patterns
 */
import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { PageLayout, RouteErrorFallback } from "@/components/layout";
import { SettingsCardsSkeleton } from "@/components/skeletons/settings";

const ProfilePage = lazy(() => import("./-profile-page"));

export const Route = createFileRoute("/_authenticated/profile")({
  component: () => (
    <Suspense fallback={
      <PageLayout variant="full-width">
        <PageLayout.Header title="Profile" />
        <PageLayout.Content>
          <SettingsCardsSkeleton sections={4} />
        </PageLayout.Content>
      </PageLayout>
    }>
      <ProfilePage />
    </Suspense>
  ),
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header title="Profile" />
      <PageLayout.Content>
        <SettingsCardsSkeleton sections={4} />
      </PageLayout.Content>
    </PageLayout>
  ),
});
