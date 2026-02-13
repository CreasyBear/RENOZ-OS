/**
 * Reports Index Route
 *
 * DOMAIN-LANDING compliant: Favorites + Scheduled reports list.
 * Primary CTA: Schedule Report. More dropdown: report links.
 *
 * @see docs/design-system/DOMAIN-LANDING-STANDARDS.md
 * @see reports_domain_remediation plan Phase 3
 */
import { createFileRoute } from '@tanstack/react-router'
import { PageLayout, RouteErrorFallback } from '@/components/layout'
import {
  ReportsLandingContent,
  ReportsLandingHeaderActions,
} from '@/components/domain/reports/reports-landing-content'

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
        actions={<ReportsLandingHeaderActions />}
      />
      <PageLayout.Content>
        <ReportsLandingContent />
      </PageLayout.Content>
    </PageLayout>
  )
}
