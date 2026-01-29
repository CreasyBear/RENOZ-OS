/**
 * Customer Detail Route
 *
 * Shows the Customer 360 View - a comprehensive dashboard for a single customer.
 * Displays metrics, activity timeline, contacts, addresses, and quick actions.
 *
 * LAYOUT: full-width (data-rich detail view with 360 widgets)
 *
 * @see UI_UX_STANDARDIZATION_PRD.md
 */
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useCallback } from 'react'
import { ArrowLeft, Edit, Trash2, MoreHorizontal } from 'lucide-react'
import { PageLayout, RouteErrorFallback } from '@/components/layout'
import { CustomerDetailSkeleton } from '@/components/skeletons/customers'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Customer360View } from '@/components/domain/customers/customer-360-view'
import { useCustomer, useDeleteCustomer } from '@/hooks/customers'
import { useConfirmation } from '@/hooks'

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
      <PageLayout.Header title="Loading..." />
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
  const confirm = useConfirmation()

  // Fetch customer using centralized hook
  const {
    data: customer,
    isLoading,
    error,
  } = useCustomer({ id: customerId })

  const deleteMutation = useDeleteCustomer()

  const handleDelete = useCallback(async () => {
    const result = await confirm.confirm({
      title: 'Delete Customer',
      description: `Are you sure you want to delete "${customer?.name}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'destructive',
    })

    if (result.confirmed) {
      deleteMutation.mutate(customerId, {
        onSuccess: () => {
          navigate({ to: '/customers' })
        },
      })
    }
  }, [confirm, deleteMutation, navigate, customerId, customer?.name])

  const handleAddNote = useCallback(() => {
    // Navigate to communications with this customer
    navigate({ 
      to: '/customers/communications',
      search: { customerId, tab: 'timeline' }
    })
  }, [navigate, customerId])

  const handleScheduleMeeting = useCallback(() => {
    // Navigate to communications - meetings would be a tab
    navigate({ 
      to: '/customers/communications',
      search: { customerId, tab: 'timeline' }
    })
  }, [navigate, customerId])

  const handleCreateQuote = useCallback(() => {
    // Navigate to pipeline new opportunity
    // TODO: Pass customerId when pipeline/new supports it
    navigate({ 
      to: '/pipeline/new',
      search: { stage: 'proposal' }
    })
  }, [navigate])

  // Determine title and content based on state
  const title = isLoading ? "Loading..." : error || !customer ? "Customer Not Found" : customer.name
  const description = !isLoading && !error && customer ? (
    <span className="text-muted-foreground">
      {customer.customerCode} · {customer.type}
    </span>
  ) : undefined

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title={title}
        description={description}
        actions={
          !isLoading && !error && customer ? (
            <div className="flex items-center gap-2">
              <Button variant="outline" asChild>
                <Link to="/customers">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Link>
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  navigate({ to: '/customers/$customerId/edit', params: { customerId } })
                }
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleAddNote}>Add Note</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleScheduleMeeting}>Schedule Meeting</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCreateQuote}>Create Quote</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={handleDelete}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Customer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : undefined
        }
      />
      <PageLayout.Content>
        {isLoading ? (
          <CustomerDetailSkeleton />
        ) : error || !customer ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              The customer you're looking for doesn't exist or you don't have access.
            </p>
            <Button variant="outline" onClick={() => navigate({ to: '/customers' })}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </div>
        ) : (
          <Customer360View customer={customer as Parameters<typeof Customer360View>[0]['customer']} />
        )}
      </PageLayout.Content>
    </PageLayout>
  )
}
