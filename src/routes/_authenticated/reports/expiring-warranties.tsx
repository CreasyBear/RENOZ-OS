/**
 * Expiring Warranties Report Page
 *
 * Dedicated report page for warranties approaching expiration.
 * Features filter bar, data table with color-coded urgency, CSV export.
 *
 * @see _Initiation/_prd/2-domains/warranty/wireframes/WAR-003c.wireframe.md
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json DOM-WAR-003c
 */

import { useCallback } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { ReportDashboardSkeleton } from '@/components/skeletons/reports';
import { ExpiringWarrantiesReportPage, type ExpiringWarrantiesReportPageProps } from '@/components/domain/reports/expiring-warranties-page';
import { expiringWarrantiesSearchSchema } from '@/lib/schemas/reports/expiring-warranties';

export const Route = createFileRoute('/_authenticated/reports/expiring-warranties')({
  component: ExpiringWarrantiesRoute,
  validateSearch: expiringWarrantiesSearchSchema,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/reports" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Expiring Warranties"
        description="Monitor warranties approaching expiration for renewal opportunities"
      />
      <PageLayout.Content>
        <ReportDashboardSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

function ExpiringWarrantiesRoute() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const onUpdateSearch = useCallback(
    (nextSearch: ExpiringWarrantiesReportPageProps['search']) => {
      navigate({ to: '.', search: nextSearch });
    },
    [navigate]
  );
  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Expiring Warranties"
        description="Monitor warranties approaching expiration for renewal opportunities"
      />
      <PageLayout.Content>
        <ExpiringWarrantiesReportPage search={search} onUpdateSearch={onUpdateSearch} />
      </PageLayout.Content>
    </PageLayout>
  );
}
