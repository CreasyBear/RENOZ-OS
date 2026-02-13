/**
 * Inbox Email Accounts Settings Route
 *
 * Settings page for managing external email account connections via OAuth.
 */
import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { RouteErrorFallback } from "@/components/layout";
import { CommunicationsListSkeleton } from "@/components/skeletons/communications";

const InboxEmailAccountsSettingsPage = lazy(() => import("./-inbox-accounts-page"));

export const Route = createFileRoute(
  "/_authenticated/communications/settings/inbox-accounts"
)({
  component: () => (
    <Suspense fallback={<CommunicationsListSkeleton />}>
      <InboxEmailAccountsSettingsPage />
    </Suspense>
  ),
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/communications" />
  ),
  pendingComponent: () => <CommunicationsListSkeleton />,
});
