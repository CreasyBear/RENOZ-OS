/**
 * Customer Detail Route
 *
 * Shows the Customer Detail View - a comprehensive dashboard for a single customer.
 * Uses Container/Presenter pattern with render props for flexible layout composition.
 *
 * LAYOUT: full-width (data-rich detail view with 360 widgets)
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 * @see STANDARDS.md - Container/Presenter pattern
 */
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useCallback } from 'react'
import { ArrowLeft } from 'lucide-react'
import { PageLayout, RouteErrorFallback } from '@/components/layout'
import { CustomerDetailSkeleton } from '@/components/skeletons/customers'
import { buttonVariants } from '@/components/ui/button'
import { CustomerDetailContainer } from '@/components/domain/customers'
import { cn } from '@/lib/utils'

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute('/_authenticated/customers/$customerId')({
  component: CustomerDetailPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/customers" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header title={null} />
      <PageLayout.Content>
        <CustomerDetailSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
})

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function CustomerDetailPage() {
  const { customerId } = Route.useParams()
  const navigate = useNavigate()

  // Navigation callbacks for container
  const handleBack = useCallback(() => {
    navigate({ to: '/customers' })
  }, [navigate])

  const handleEdit = useCallback(() => {
    navigate({ to: '/customers/$customerId/edit', params: { customerId } })
  }, [navigate, customerId])

  const handleAddNote = useCallback(() => {
    navigate({
      to: '/customers/communications',
      search: { customerId, tab: 'timeline' }
    })
  }, [navigate, customerId])

  const handleScheduleMeeting = useCallback(() => {
    navigate({
      to: '/customers/communications',
      search: { customerId, tab: 'timeline' }
    })
  }, [navigate, customerId])

  const handleCreateQuote = useCallback(() => {
    navigate({
      to: '/pipeline/new',
      search: { stage: 'proposal' }
    })
  }, [navigate])

  const handleCreateOrder = useCallback(() => {
    navigate({ to: '/orders' })
  }, [navigate])

  return (
    <CustomerDetailContainer
      customerId={customerId}
      onBack={handleBack}
      onEdit={handleEdit}
      onAddNote={handleAddNote}
      onScheduleMeeting={handleScheduleMeeting}
      onCreateQuote={handleCreateQuote}
      onCreateOrder={handleCreateOrder}
    >
      {({ headerActions, content }) => (
        <PageLayout variant="full-width">
          {/*
           * title={null} - Entity identity is shown by CustomerHeader in content
           * Breadcrumbs are handled by global Header, not PageLayout.Header
           * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
           */}
          <PageLayout.Header
            title={null}
            actions={
              <div className="flex items-center gap-2">
                <Link
                  to="/customers"
                  className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}
                  aria-label="Back to customers"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Link>
                {headerActions}
              </div>
            }
          />
          <PageLayout.Content>
            {content}
          </PageLayout.Content>
        </PageLayout>
      )}
    </CustomerDetailContainer>
  )
}
