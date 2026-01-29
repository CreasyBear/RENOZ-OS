/**
 * Reports Index Route
 *
 * Landing page for the Reports domain. Provides navigation to all reports:
 * - Customer Reports
 * - Warranty Reports
 * - Pipeline Forecast
 * - Job Costing
 * - Procurement Reports
 * - Expiring Warranties
 */
import { createFileRoute } from '@tanstack/react-router'
import { PageLayout, RouteErrorFallback } from '@/components/layout'
import { ReportsIndexContent } from '@/components/domain/reports/reports-index-page'

export const Route = createFileRoute('/_authenticated/reports/')({
  component: ReportsIndexRoute,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/" />
  ),
})

function ReportsIndexRoute() {
  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Reports"
        description="Analytics and insights across all domains"
      />
      <PageLayout.Content>
        <ReportsIndexContent />
      </PageLayout.Content>
    </PageLayout>
  )
}
