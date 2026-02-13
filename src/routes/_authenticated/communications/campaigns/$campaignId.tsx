/**
 * Campaign Detail Route (Container)
 *
 * Container component that renders CampaignDetailPanel with campaign ID.
 */
import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { RouteErrorFallback } from "@/components/layout";
import { CommunicationsListSkeleton } from "@/components/skeletons/communications";

const CampaignDetailPage = lazy(() => import("./-campaign-detail-page"));

export const Route = createFileRoute("/_authenticated/communications/campaigns/$campaignId")({
  component: () => (
    <Suspense fallback={<CommunicationsListSkeleton />}>
      <CampaignDetailPage />
    </Suspense>
  ),
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/communications/campaigns" />
  ),
  pendingComponent: () => <CommunicationsListSkeleton />,
});
