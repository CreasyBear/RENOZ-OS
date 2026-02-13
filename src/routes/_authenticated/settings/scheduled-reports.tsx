/**
 * Scheduled Reports Settings Route
 *
 * Thin wrapper that renders ScheduledReportsListContainer.
 * URL search state is synced with container filters.
 *
 * @see DASH-REPORTS-UI acceptance criteria
 * @see src/components/domain/settings/scheduled-reports-list-container.tsx
 */

import { useCallback, useMemo } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { PageLayout } from '@/components/layout/page-layout';
import { RouteErrorFallback } from '@/components/layout';
import { SettingsPageSkeleton } from '@/components/skeletons/settings';
import { ScheduledReportsListContainer } from '@/components/domain/settings/scheduled-reports-list-container';
import type { ScheduledReportsFiltersState } from '@/components/domain/settings/scheduled-reports-filter-config';
import { scheduledReportsSearchSchema } from '@/lib/schemas/reports';
import type { ReportFrequency, ReportFormat } from '@/lib/schemas/reports/scheduled-reports';

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute('/_authenticated/settings/scheduled-reports')({
  validateSearch: scheduledReportsSearchSchema,
  component: ScheduledReportsPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/settings" />
  ),
  pendingComponent: () => <SettingsPageSkeleton />,
});

// ============================================================================
// URL <-> FILTER MAPPING
// ============================================================================

function urlToFilters(search: ReturnType<typeof Route.useSearch>): ScheduledReportsFiltersState {
  return {
    search: search.search ?? '',
    frequency: search.frequency === 'all' ? null : (search.frequency as ReportFrequency),
    format: search.format === 'all' ? null : (search.format as ReportFormat),
    isActive:
      search.isActive === 'all'
        ? null
        : (search.isActive === 'active' ? 'active' : 'inactive'),
  };
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================

function ScheduledReportsPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();

  const filters = useMemo(() => urlToFilters(search), [search]);

  const handleFiltersChange = useCallback(
    (newFilters: ScheduledReportsFiltersState) => {
      navigate({
        to: '/settings/scheduled-reports',
        search: scheduledReportsSearchSchema.parse({
          search: newFilters.search || undefined,
          frequency: newFilters.frequency ?? 'all',
          format: newFilters.format ?? 'all',
          isActive: newFilters.isActive ?? 'all',
          id: search.id,
        }),
        replace: true,
      });
    },
    [navigate, search.id]
  );

  const handleClearDeepLink = useCallback(() => {
    navigate({
      to: '/settings/scheduled-reports',
      search: scheduledReportsSearchSchema.parse({
        search: search.search,
        frequency: search.frequency,
        format: search.format,
        isActive: search.isActive,
      }),
      replace: true,
    });
  }, [navigate, search]);

  return (
    <PageLayout variant="full-width">
      <ScheduledReportsListContainer
        filters={filters}
        onFiltersChange={handleFiltersChange}
        deepLinkId={search.id}
        onClearDeepLink={handleClearDeepLink}
      />
    </PageLayout>
  );
}
