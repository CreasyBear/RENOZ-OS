/**
 * Customers Index Route
 *
 * Main customer directory page with advanced search, filtering, and management.
 * Uses TanStack Query for data fetching with real-time updates.
 *
 * Features:
 * - Paginated customer list with sorting
 * - Advanced filtering by status, type, size, health score, tags
 * - Full-text search across customer fields
 * - Bulk operations (delete, assign tags, export)
 * - Mobile-responsive design
 */
import { createFileRoute } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { PageLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { toastSuccess, toastError } from '@/hooks/use-toast'
import {
  CustomerDirectory,
  type CustomerFiltersState,
  type CustomerTableData,
} from '@/components/domain/customers'
import {
  useCustomers,
  useCustomerTags,
  useDeleteCustomer,
  useBulkDeleteCustomers,
} from '@/hooks/customers'

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute('/_authenticated/customers/')({
  component: CustomersPage,
})

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function CustomersPage() {
  // Pagination state
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [sortBy, setSortBy] = useState('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // Filter state
  const [filters, setFilters] = useState<CustomerFiltersState>({
    search: '',
    status: [],
    type: [],
    size: [],
    tags: [],
  })

  // Fetch customers using centralized hook
  const {
    data: customersData,
    isLoading: isLoadingCustomers,
    refetch: refetchCustomers,
  } = useCustomers({
    page,
    pageSize,
    sortBy,
    sortOrder,
    search: filters.search || undefined,
    status: filters.status.length > 0 ? (filters.status[0] as 'prospect' | 'active' | 'inactive' | 'suspended' | 'blacklisted') : undefined,
    type: filters.type.length > 0 ? (filters.type[0] as 'individual' | 'business' | 'government' | 'non_profit') : undefined,
  })

  // Fetch available tags using centralized hook
  const { data: tagsData } = useCustomerTags()

  // Delete mutation using centralized hook (handles cache invalidation)
  const deleteMutation = useDeleteCustomer()

  // Bulk delete mutation using centralized hook (handles cache invalidation)
  const bulkDeleteMutation = useBulkDeleteCustomers()

  // Handlers
  const handleCreateCustomer = useCallback(() => {
    // TODO: Navigate to customer creation form
    window.location.href = '/customers/new'
  }, [])

  const handleEditCustomer = useCallback((customer: CustomerTableData) => {
    window.location.href = `/customers/${customer.id}/edit`
  }, [])

  const handleDeleteCustomer = useCallback(
    (customer: CustomerTableData) => {
      deleteMutation.mutate(customer.id, {
        onSuccess: () => toastSuccess('Customer deleted successfully'),
        onError: () => toastError('Failed to delete customer'),
      })
    },
    [deleteMutation]
  )

  const handleBulkDelete = useCallback(
    async (ids: string[]) => {
      try {
        const result = await bulkDeleteMutation.mutateAsync(ids)
        toastSuccess(`Deleted ${result.deleted} customers`)
      } catch {
        toastError('Failed to delete customers')
      }
    },
    [bulkDeleteMutation]
  )

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage)
  }, [])

  const handleSort = useCallback((column: string, direction: 'asc' | 'desc') => {
    setSortBy(column)
    setSortOrder(direction)
  }, [])

  const handleFiltersChange = useCallback((newFilters: CustomerFiltersState) => {
    setFilters(newFilters)
    setPage(1) // Reset to page 1 when filters change
  }, [])

  // Transform tags for the filter component
  const availableTags = (tagsData || []).map((tag) => ({
    id: tag.id,
    name: tag.name,
    color: tag.color,
  }))

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Customers"
        description="Manage your customer relationships and track interactions"
        actions={
          <Button onClick={handleCreateCustomer}>
            <Plus className="mr-2 h-4 w-4" />
            Add Customer
          </Button>
        }
      />
      <PageLayout.Content>
        <CustomerDirectory
          customers={customersData?.items || []}
          isLoading={isLoadingCustomers}
          tags={availableTags}
          page={page}
          pageSize={pageSize}
          totalCount={customersData?.pagination?.totalItems || 0}
          onPageChange={handlePageChange}
          sortColumn={sortBy}
          sortDirection={sortOrder}
          onSort={handleSort}
          onCreateCustomer={handleCreateCustomer}
          onEditCustomer={handleEditCustomer}
          onDeleteCustomer={handleDeleteCustomer}
          onBulkDelete={handleBulkDelete}
          onRefresh={() => refetchCustomers()}
          onFiltersChange={handleFiltersChange}
        />
      </PageLayout.Content>
    </PageLayout>
  )
}
