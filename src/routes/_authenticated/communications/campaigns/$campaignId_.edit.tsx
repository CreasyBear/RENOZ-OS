/**
 * Edit Campaign Route (Container)
 *
 * Container component that wires the CampaignWizard presenter for editing.
 */
import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { RouteErrorFallback } from "@/components/layout";
import { FormSkeleton } from "@/components/skeletons/shared";

const EditCampaignPage = lazy(() => import("./-edit-campaign-page"));

export const Route = createFileRoute(
  "/_authenticated/communications/campaigns/$campaignId_/edit"
)({
  component: () => (
    <Suspense fallback={<FormSkeleton sections={3} />}>
      <EditCampaignPage />
    </Suspense>
  ),
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/communications/campaigns" />
  ),
  pendingComponent: () => <FormSkeleton sections={3} />,
});
