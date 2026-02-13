/**
 * Warranty Analytics Report Page
 *
 * Comprehensive warranty analytics dashboard with claims breakdown,
 * SLA compliance metrics, trend analysis, and export functionality.
 *
 * @see _Initiation/_prd/2-domains/warranty/wireframes/WAR-008.wireframe.md
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json DOM-WAR-008
 */

import { createFileRoute } from '@tanstack/react-router';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { ReportDashboardSkeleton } from '@/components/skeletons/reports';
import { WarrantyAnalyticsPage } from '@/components/domain/reports/warranty-analytics-page';
import { warrantyAnalyticsSearchSchema } from '@/lib/schemas/reports/warranty-analytics';

export const Route = createFileRoute('/_authenticated/reports/warranties')({
  component: WarrantyAnalyticsRoute,
  validateSearch: warrantyAnalyticsSearchSchema,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/reports" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Warranty Analytics"
        description="Monitor warranty performance, claims, and costs"
      />
      <PageLayout.Content>
        <ReportDashboardSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

function WarrantyAnalyticsRoute() {
  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Warranty Analytics"
        description="Monitor warranty performance, claims, and costs"
      />
      <PageLayout.Content>
        <WarrantyAnalyticsPage />
      </PageLayout.Content>
    </PageLayout>
  );
}
