/**
 * Create Campaign Route (Container)
 *
 * Container component that wires the CampaignWizard presenter.
 */
import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { RouteErrorFallback } from "@/components/layout";
import { FormSkeleton } from "@/components/skeletons/shared";

const CreateCampaignPage = lazy(() => import("./-create-campaign-page"));

export const Route = createFileRoute("/_authenticated/communications/campaigns/new")({
  component: () => (
    <Suspense fallback={<FormSkeleton sections={3} />}>
      <CreateCampaignPage />
    </Suspense>
  ),
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/communications/campaigns" />
  ),
  pendingComponent: () => <FormSkeleton sections={3} />,
});
