/**
 * Customer Detail Route
 *
 * Shows the Customer 360 View - a comprehensive dashboard for a single customer.
 * Displays metrics, activity timeline, contacts, addresses, and quick actions.
 */
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Edit, Trash2, MoreHorizontal } from 'lucide-react'
import { PageLayout } from '@/components/layout'
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
import { getCustomerById } from '@/server/customers'

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute('/_authenticated/customers/$customerId')({
  component: CustomerDetailPage,
})

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function CustomerDetailPage() {
  const { customerId } = Route.useParams()

  // Fetch customer with all related data
  const {
    data: customer,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: async () => {
      const result = await getCustomerById({ data: { id: customerId } })
      return result
    },
  })

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
            <Button variant="outline" onClick={() => window.history.back()}>
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
            <Button variant="outline" onClick={() => window.history.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                (window.location.href = `/customers/${customerId}/edit`)
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
