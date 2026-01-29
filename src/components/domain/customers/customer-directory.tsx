/**
 * CustomerDirectory Component
 *
 * Main customer directory interface with search, filtering, table, and bulk operations.
 * Coordinates state between CustomerFilters and CustomerTable components.
 */
import { useState, useCallback } from 'react'
import {
  Download,
  Plus,
  Trash2,
  Tag,
  RefreshCw,
  LayoutGrid,
  Table as TableIcon,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { CustomerTable, type CustomerTableData } from './customer-table'
import { CustomerCard, CustomerCardSkeleton } from './customer-card'
import { CustomerFilters, ActiveFilterChips, type CustomerFiltersState } from './customer-filters'
import { EmptyState } from '@/components/shared/empty-state'
import { cn } from '@/lib/utils'

// ============================================================================
// TYPES
// ============================================================================

interface CustomerDirectoryProps {
  customers: CustomerTableData[]
  isLoading?: boolean
  tags?: Array<{ id: string; name: string; color: string }>
  // Pagination
  page?: number
  pageSize?: number
  totalCount?: number
  onPageChange?: (page: number) => void
  // Sorting
  sortColumn?: string
  sortDirection?: 'asc' | 'desc'
  onSort?: (column: string, direction: 'asc' | 'desc') => void
  // Actions
  onCreateCustomer?: () => void
  onEditCustomer?: (customer: CustomerTableData) => void
  onDeleteCustomer?: (customer: CustomerTableData) => void
  onBulkDelete?: (ids: string[]) => Promise<void>
  onBulkAssignTags?: (ids: string[], tagIds: string[]) => Promise<void>
  onExport?: (ids: string[], format: 'csv' | 'xlsx' | 'json') => Promise<void>
  onRefresh?: () => void
  // Filtering
  onFiltersChange?: (filters: CustomerFiltersState) => void
}

// ============================================================================
// BULK OPERATION DIALOG
// ============================================================================

interface BulkDeleteDialogProps {
  open: boolean
  count: number
  onConfirm: () => void
  onCancel: () => void
  isProcessing: boolean
}

function BulkDeleteDialog({
  open,
  count,
  onConfirm,
  onCancel,
  isProcessing,
}: BulkDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {count} customers?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. All selected customers and their
            associated data (contacts, addresses, activities) will be permanently
            deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isProcessing}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isProcessing ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ============================================================================
// BULK ACTIONS BAR
// ============================================================================

interface BulkActionsBarProps {
  selectedCount: number
  onDelete: () => void
  onAssignTags: () => void
  onExport: (format: 'csv' | 'xlsx' | 'json') => void
  onClearSelection: () => void
}

function BulkActionsBar({
  selectedCount,
  onDelete,
  onAssignTags,
  onExport,
  onClearSelection,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null

  return (
    <div className="flex items-center justify-between rounded-lg border bg-muted/50 px-4 py-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">
          {selectedCount} customer{selectedCount > 1 ? 's' : ''} selected
        </span>
        <Button variant="ghost" size="sm" onClick={onClearSelection}>
          Clear
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onAssignTags}>
          <Tag className="mr-2 h-4 w-4" />
          Assign Tags
        </Button>
        <Button variant="outline" size="sm" onClick={() => onExport('csv')}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
        <Button variant="destructive" size="sm" onClick={onDelete}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// PAGINATION
// ============================================================================

interface PaginationProps {
  page: number
  pageSize: number
  totalCount: number
  onPageChange: (page: number) => void
}

function Pagination({ page, pageSize, totalCount, onPageChange }: PaginationProps) {
  const totalPages = Math.ceil(totalCount / pageSize)
  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, totalCount)

  if (totalCount === 0) return null

  return (
    <div className="flex items-center justify-between px-2 py-4">
      <div className="text-sm text-muted-foreground">
        Showing {start} to {end} of {totalCount} customers
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          Previous
        </Button>
        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            // Show first pages, last page, and pages around current
            let pageNum: number
            if (totalPages <= 5) {
              pageNum = i + 1
            } else if (page <= 3) {
              pageNum = i + 1
            } else if (page >= totalPages - 2) {
              pageNum = totalPages - 4 + i
            } else {
              pageNum = page - 2 + i
            }

            return (
              <Button
                key={pageNum}
                variant={pageNum === page ? 'default' : 'outline'}
                size="sm"
                className="w-9"
                onClick={() => onPageChange(pageNum)}
              >
                {pageNum}
              </Button>
            )
          })}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CustomerDirectory({
  customers,
  isLoading = false,
  tags = [],
  page = 1,
  pageSize = 20,
  totalCount = 0,
  onPageChange,
  sortColumn,
  sortDirection = 'asc',
  onSort,
  onCreateCustomer,
  onEditCustomer,
  onDeleteCustomer,
  onBulkDelete,
  onBulkAssignTags: _onBulkAssignTags,
  onExport,
  onRefresh,
  onFiltersChange,
}: CustomerDirectoryProps) {
  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // View mode state (auto-detect mobile, but allow override)
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')

  // Filter state
  const [filters, setFilters] = useState<CustomerFiltersState>({
    search: '',
    status: [],
    type: [],
    size: [],
    tags: [],
  })

  // Bulk operation state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  // TODO: Implement progress tracking for bulk operations
  // const [bulkProgress, setBulkProgress] = useState<number | null>(null)

  // Selection handlers
  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedIds(new Set(customers.map((c) => c.id)))
      } else {
        setSelectedIds(new Set())
      }
    },
    [customers]
  )

  const handleSelectOne = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }, [])

  // Sort handler
  const handleSort = useCallback(
    (column: string) => {
      if (!onSort) return

      if (sortColumn === column) {
        // Toggle direction
        onSort(column, sortDirection === 'asc' ? 'desc' : 'asc')
      } else {
        // New column, default to ascending
        onSort(column, 'asc')
      }
    },
    [sortColumn, sortDirection, onSort]
  )

  // Filter handler
  const handleFiltersChange = useCallback(
    (newFilters: CustomerFiltersState) => {
      setFilters(newFilters)
      onFiltersChange?.(newFilters)
    },
    [onFiltersChange]
  )

  // Bulk delete
  const handleBulkDelete = async () => {
    if (!onBulkDelete) return

    setIsProcessing(true)
    try {
      await onBulkDelete(Array.from(selectedIds))
      setSelectedIds(new Set())
      setShowDeleteDialog(false)
    } finally {
      setIsProcessing(false)
    }
  }

  // Bulk assign tags (placeholder - would open a modal)
  const handleBulkAssignTags = () => {
    // TODO: Open tag assignment modal
    console.log('Assign tags to:', Array.from(selectedIds))
  }

  // Export
  const handleExport = async (format: 'csv' | 'xlsx' | 'json') => {
    if (!onExport) return

    setIsProcessing(true)
    try {
      await onExport(Array.from(selectedIds), format)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          )}
          {/* View Mode Toggle - Desktop only */}
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(v) => v && setViewMode(v as 'table' | 'grid')}
            className="hidden sm:flex"
          >
            <ToggleGroupItem value="table" aria-label="Table view">
              <TableIcon className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="grid" aria-label="Grid view">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="flex items-center gap-2">
          {onCreateCustomer && (
            <Button onClick={onCreateCustomer}>
              <Plus className="mr-2 h-4 w-4" />
              Add Customer
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <CustomerFilters
        filters={filters}
        onChange={handleFiltersChange}
        availableTags={tags}
        resultCount={totalCount}
      />

      {/* Active Filter Chips */}
      <ActiveFilterChips
        filters={filters}
        availableTags={tags}
        onChange={handleFiltersChange}
      />

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedIds.size}
        onDelete={() => setShowDeleteDialog(true)}
        onAssignTags={handleBulkAssignTags}
        onExport={handleExport}
        onClearSelection={() => setSelectedIds(new Set())}
      />

      {/* TODO: Progress Bar for bulk operations
      {bulkProgress !== null && (
        <div className="space-y-1">
          <Progress value={bulkProgress} className="h-2" />
          <p className="text-xs text-muted-foreground">
            Processing... {bulkProgress}%
          </p>
        </div>
      )}
      */}

      {/* Customer List - Table or Grid based on view mode */}
      {viewMode === 'table' ? (
        <div className="hidden md:block">
          <CustomerTable
            customers={customers}
            isLoading={isLoading}
            selectedIds={selectedIds}
            onSelectAll={handleSelectAll}
            onSelectOne={handleSelectOne}
            onSort={handleSort}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onEdit={onEditCustomer}
            onDelete={onDeleteCustomer}
          />
        </div>
      ) : null}
      
      {/* Mobile Card View - Always show on mobile, or when grid mode selected */}
      <div className={cn(
        'space-y-3',
        viewMode === 'table' ? 'md:hidden' : 'block'
      )}>
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <CustomerCardSkeleton key={i} />
          ))
        ) : customers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No customers yet"
            message="Get started by adding your first customer to the directory."
            primaryAction={onCreateCustomer ? {
              label: 'Add Customer',
              onClick: onCreateCustomer,
            } : undefined}
          />
        ) : (
          customers.map((customer) => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              isSelected={selectedIds.has(customer.id)}
              onSelect={(checked) => handleSelectOne(customer.id, checked)}
              onEdit={onEditCustomer}
              onDelete={onDeleteCustomer}
              onClick={(c) => {
                // Navigate to detail view
                window.location.href = `/customers/${c.id}`
              }}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {onPageChange && (
        <Pagination
          page={page}
          pageSize={pageSize}
          totalCount={totalCount}
          onPageChange={onPageChange}
        />
      )}

      {/* Bulk Delete Confirmation */}
      <BulkDeleteDialog
        open={showDeleteDialog}
        count={selectedIds.size}
        onConfirm={handleBulkDelete}
        onCancel={() => setShowDeleteDialog(false)}
        isProcessing={isProcessing}
      />
    </div>
  )
}
