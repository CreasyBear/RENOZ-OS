/**
 * Customer Detail Route
 *
 * Shows the Customer 360 View - a comprehensive dashboard for a single customer.
 * Displays metrics, activity timeline, contacts, addresses, and quick actions.
 */
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { ArrowLeft, Edit, Trash2, MoreHorizontal } from 'lucide-react'
import { PageLayout, RouteErrorFallback } from '@/components/layout'
import { CustomerDetailSkeleton } from '@/components/skeletons/customers'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Customer360View } from '@/components/domain/customers/customer-360-view'
import { useCustomer } from '@/hooks/customers'

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
      <CustomerDetailSkeleton />
    </PageLayout>
  ),
})

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function CustomerDetailPage() {
  const { customerId } = Route.useParams()
  const navigate = useNavigate()

  // Fetch customer using centralized hook
  const {
    data: customer,
    isLoading,
    error,
  } = useCustomer(customerId)

  // Loading state
  if (isLoading) {
    return (
      <PageLayout variant="full-width">
        <PageLayout.Header title="Loading..." />
        <PageLayout.Content>
          <div className="space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </PageLayout.Content>
      </PageLayout>
    )
  }

  // Error state
  if (error || !customer) {
    return (
      <PageLayout variant="container">
        <PageLayout.Header title="Customer Not Found" />
        <PageLayout.Content>
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              The customer you're looking for doesn't exist or you don't have access.
            </p>
            <Button variant="outline" onClick={() => navigate({ to: '/customers' })}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </div>
        </PageLayout.Content>
      </PageLayout>
    )
  }

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title={customer.name}
        description={
          <span className="text-muted-foreground">
            {customer.customerCode} · {customer.type}
          </span>
        }
        actions={
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
                <DropdownMenuItem>Add Note</DropdownMenuItem>
                <DropdownMenuItem>Schedule Meeting</DropdownMenuItem>
                <DropdownMenuItem>Create Quote</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Customer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />
      <PageLayout.Content>
        <Customer360View customer={customer as Parameters<typeof Customer360View>[0]['customer']} />
      </PageLayout.Content>
    </PageLayout>
  )
}
