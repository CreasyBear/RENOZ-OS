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
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useCallback, useMemo } from 'react'
import { Plus, Users, DollarSign, TrendingUp, AlertCircle } from 'lucide-react'
import { z } from 'zod'
import { PageLayout, RouteErrorFallback } from '@/components/layout'
import { CustomerTableSkeleton } from '@/components/skeletons/customers'
import { Button } from '@/components/ui/button'
import { toastSuccess, toastError } from '@/hooks'
import { MetricCard } from '@/components/shared/metric-card'
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
  useCustomerKpis,
} from '@/hooks/customers'
import { generateCSV, downloadCSV, formatDateForFilename } from '@/lib/utils/csv'

// Search params schema for URL-based filtering
const searchParamsSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(10).max(100).optional().default(20),
  search: z.string().optional(),
  status: z.enum(['prospect', 'active', 'inactive', 'suspended', 'blacklisted']).optional(),
  type: z.enum(['individual', 'business', 'government', 'non_profit']).optional(),
  sortBy: z.string().optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
})

type SearchParams = z.infer<typeof searchParamsSchema>

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute('/_authenticated/customers/')({
  validateSearch: searchParamsSchema,
  component: CustomersPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header title="Customers" />
      <PageLayout.Content>
        <CustomerTableSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
})

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function CustomersPage() {
  const navigate = useNavigate()
  const search = Route.useSearch() as SearchParams

  // Compute filters from URL search params
  const filters = useMemo<CustomerFiltersState>(() => ({
    search: search.search || '',
    status: search.status ? [search.status] : [],
    type: search.type ? [search.type] : [],
    size: [],
    tags: [],
  }), [search])

  // Fetch customers using centralized hook
  const {
    data: customersData,
    isLoading: isLoadingCustomers,
    refetch: refetchCustomers,
  } = useCustomers({
    page: search.page,
    pageSize: search.pageSize,
    sortBy: search.sortBy,
    sortOrder: search.sortOrder,
    search: search.search,
    status: search.status,
    type: search.type,
  })

  // Fetch available tags using centralized hook
  const { data: tagsData } = useCustomerTags()

  // Fetch KPIs for summary stats
  const { data: kpisData, isLoading: isLoadingKpis } = useCustomerKpis('30d')

  // Delete mutation using centralized hook (handles cache invalidation)
  const deleteMutation = useDeleteCustomer()

  // Bulk delete mutation using centralized hook (handles cache invalidation)
  const bulkDeleteMutation = useBulkDeleteCustomers()

  // Handlers
  const handleCreateCustomer = useCallback(() => {
    navigate({ to: '/customers/new' })
  }, [navigate])

  const handleEditCustomer = useCallback((customer: CustomerTableData) => {
    navigate({ to: '/customers/$customerId/edit', params: { customerId: customer.id } })
  }, [navigate])

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

  // Update URL search params helper
  const updateSearch = useCallback((updates: Partial<SearchParams>) => {
    navigate({
      to: '.',
      search: {
        ...search,
        ...updates,
        // Reset to page 1 when filters change (unless page is explicitly set)
        page: updates.page ?? (updates.search !== undefined || updates.status !== undefined || updates.type !== undefined ? 1 : search.page),
      } as Record<string, unknown>,
    })
  }, [navigate, search])

  const handlePageChange = useCallback((newPage: number) => {
    updateSearch({ page: newPage })
  }, [updateSearch])

  const handleSort = useCallback((column: string, direction: 'asc' | 'desc') => {
    updateSearch({ sortBy: column, sortOrder: direction })
  }, [updateSearch])

  const handleFiltersChange = useCallback((newFilters: CustomerFiltersState) => {
    updateSearch({
      search: newFilters.search || undefined,
      status: newFilters.status[0] as SearchParams['status'],
      type: newFilters.type[0] as SearchParams['type'],
      page: 1,
    })
  }, [updateSearch])

  // Export handler for selected customers
  const handleExport = useCallback(async (ids: string[], _format: 'csv' | 'xlsx' | 'json') => {
    const customersToExport = customersData?.items?.filter((c) => ids.includes(c.id)) || []
    
    if (customersToExport.length === 0) {
      toastError('No customers selected for export')
      return
    }

    try {
      const csv = generateCSV({
        headers: ['ID', 'Name', 'Code', 'Email', 'Phone', 'Status', 'Type', 'Health Score', 'Lifetime Value'],
        rows: customersToExport.map((customer) => [
          customer.id,
          customer.name,
          customer.customerCode || '',
          customer.email || '',
          customer.phone || '',
          customer.status,
          customer.type,
          customer.healthScore?.toString() || '',
          customer.lifetimeValue?.toString() || '',
        ]),
      })

      const filename = `customers-${formatDateForFilename()}.csv`
      downloadCSV(csv, filename)
      toastSuccess(`Exported ${customersToExport.length} customers to ${filename}`)
    } catch (error) {
      toastError('Failed to export customers')
      console.error('Export error:', error)
    }
  }, [customersData?.items])

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
      <PageLayout.Content className="space-y-6">
        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Customers"
            value={kpisData?.kpis[0]?.value ?? '—'}
            subtitle={kpisData?.kpis[0]?.changeLabel}
            trend={kpisData?.kpis[0]?.change ? `${kpisData.kpis[0].change > 0 ? '+' : ''}${kpisData.kpis[0].change}%` : undefined}
            trendUp={kpisData?.kpis[0]?.change ? kpisData.kpis[0].change > 0 : undefined}
            icon={Users}
            isLoading={isLoadingKpis}
          />
          <MetricCard
            title="Total Revenue"
            value={kpisData?.kpis[1]?.value ?? '—'}
            subtitle={kpisData?.kpis[1]?.changeLabel}
            trend={kpisData?.kpis[1]?.change ? `${kpisData.kpis[1].change > 0 ? '+' : ''}${kpisData.kpis[1].change}%` : undefined}
            trendUp={kpisData?.kpis[1]?.change ? kpisData.kpis[1].change > 0 : undefined}
            icon={DollarSign}
            isLoading={isLoadingKpis}
          />
          <MetricCard
            title="Average LTV"
            value={kpisData?.kpis[2]?.value ?? '—'}
            subtitle={kpisData?.kpis[2]?.changeLabel}
            icon={TrendingUp}
            isLoading={isLoadingKpis}
          />
          <MetricCard
            title="Active Rate"
            value={kpisData?.kpis[3]?.value ?? '—'}
            subtitle={kpisData?.kpis[3]?.changeLabel}
            icon={AlertCircle}
            isLoading={isLoadingKpis}
          />
        </div>

        <CustomerDirectory
          customers={customersData?.items || []}
          isLoading={isLoadingCustomers}
          tags={availableTags}
          page={search.page}
          pageSize={search.pageSize}
          totalCount={customersData?.pagination?.totalItems || 0}
          onPageChange={handlePageChange}
          sortColumn={search.sortBy}
          sortDirection={search.sortOrder}
          onSort={handleSort}
          onCreateCustomer={handleCreateCustomer}
          onEditCustomer={handleEditCustomer}
          onDeleteCustomer={handleDeleteCustomer}
          onBulkDelete={handleBulkDelete}
          onExport={handleExport}
          onRefresh={() => refetchCustomers()}
          onFiltersChange={handleFiltersChange}
        />
      </PageLayout.Content>
    </PageLayout>
  )
}
