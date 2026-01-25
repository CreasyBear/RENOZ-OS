/**
 * BulkSelector Component
 *
 * Advanced customer selection interface:
 * - Multi-select with checkbox list
 * - Select all / select none
 * - Filter-based selection
 * - Selection summary
 */
import { useState, useMemo, useCallback } from 'react'
import {
  CheckSquare,
  Square,
  MinusSquare,
  Filter,
  X,
  Search,
  Users,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TruncateTooltip } from '@/components/shared/truncate-tooltip'
import { cn } from '@/lib/utils'

// ============================================================================
// TYPES
// ============================================================================

export interface SelectableCustomer {
  id: string
  customerCode: string
  name: string
  type: string
  status: string
  healthScore: number | null
  lifetimeValue: number | null
  tags: string[]
}

interface SelectionCriteria {
  status?: string[]
  type?: string[]
  healthScoreMin?: number
  healthScoreMax?: number
  tags?: string[]
}

interface BulkSelectorProps {
  customers: SelectableCustomer[]
  selectedIds: Set<string>
  onSelectionChange: (selectedIds: Set<string>) => void
  className?: string
}

// ============================================================================
// QUICK FILTERS
// ============================================================================

const QUICK_FILTERS = [
  { label: 'Active Customers', criteria: { status: ['active'] } },
  { label: 'At-Risk (< 40)', criteria: { healthScoreMax: 40 } },
  { label: 'High Value', criteria: { healthScoreMin: 80 } },
  { label: 'Prospects', criteria: { status: ['prospect'] } },
  { label: 'Business Type', criteria: { type: ['business'] } },
]

// ============================================================================
// SELECTION SUMMARY
// ============================================================================

interface SelectionSummaryProps {
  customers: SelectableCustomer[]
  selectedIds: Set<string>
}

function SelectionSummary({ customers, selectedIds }: SelectionSummaryProps) {
  const selectedCustomers = customers.filter((c) => selectedIds.has(c.id))

  const stats = useMemo(() => {
    if (selectedCustomers.length === 0) return null

    const totalValue = selectedCustomers.reduce((sum, c) => sum + (c.lifetimeValue ?? 0), 0)
    const avgHealth =
      selectedCustomers.filter((c) => c.healthScore !== null).length > 0
        ? selectedCustomers.reduce((sum, c) => sum + (c.healthScore ?? 0), 0) /
          selectedCustomers.filter((c) => c.healthScore !== null).length
        : null

    const byStatus = selectedCustomers.reduce(
      (acc, c) => {
        acc[c.status] = (acc[c.status] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    return { totalValue, avgHealth, byStatus }
  }, [selectedCustomers])

  if (!stats) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        No customers selected
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-2 rounded bg-muted">
          <p className="text-lg font-bold">{selectedCustomers.length}</p>
          <p className="text-xs text-muted-foreground">Selected</p>
        </div>
        <div className="text-center p-2 rounded bg-muted">
          <p className="text-lg font-bold">
            ${(stats.totalValue / 1000).toFixed(0)}K
          </p>
          <p className="text-xs text-muted-foreground">Total Value</p>
        </div>
        <div className="text-center p-2 rounded bg-muted">
          <p className="text-lg font-bold">
            {stats.avgHealth !== null ? Math.round(stats.avgHealth) : 'N/A'}
          </p>
          <p className="text-xs text-muted-foreground">Avg Health</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {Object.entries(stats.byStatus).map(([status, count]) => (
          <Badge key={status} variant="outline" className="text-xs">
            {status}: {count}
          </Badge>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// FILTER POPOVER
// ============================================================================

interface FilterPopoverProps {
  criteria: SelectionCriteria
  onApply: (criteria: SelectionCriteria) => void
  onClear: () => void
  availableTags: string[]
}

function FilterPopover({ criteria, onApply, onClear, availableTags: _availableTags }: FilterPopoverProps) {
  const [localCriteria, setLocalCriteria] = useState<SelectionCriteria>(criteria)
  const [open, setOpen] = useState(false)

  const handleApply = () => {
    onApply(localCriteria)
    setOpen(false)
  }

  const handleClear = () => {
    setLocalCriteria({})
    onClear()
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Filter Selection
          {Object.keys(criteria).length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {Object.keys(criteria).length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <h4 className="font-medium">Filter Criteria</h4>

          {/* Status */}
          <div className="space-y-2">
            <Label className="text-sm">Status</Label>
            <Select
              value={localCriteria.status?.[0] ?? 'all'}
              onValueChange={(v) =>
                setLocalCriteria({
                  ...localCriteria,
                  status: v === 'all' ? undefined : [v],
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Any status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="prospect">Prospect</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label className="text-sm">Type</Label>
            <Select
              value={localCriteria.type?.[0] ?? 'all'}
              onValueChange={(v) =>
                setLocalCriteria({
                  ...localCriteria,
                  type: v === 'all' ? undefined : [v],
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Any type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Type</SelectItem>
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="individual">Individual</SelectItem>
                <SelectItem value="government">Government</SelectItem>
                <SelectItem value="non_profit">Non-Profit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Health Score Range */}
          <div className="space-y-2">
            <Label className="text-sm">Health Score Range</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Min"
                min={0}
                max={100}
                value={localCriteria.healthScoreMin ?? ''}
                onChange={(e) =>
                  setLocalCriteria({
                    ...localCriteria,
                    healthScoreMin: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                className="w-20"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="number"
                placeholder="Max"
                min={0}
                max={100}
                value={localCriteria.healthScoreMax ?? ''}
                onChange={(e) =>
                  setLocalCriteria({
                    ...localCriteria,
                    healthScoreMax: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                className="w-20"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" size="sm" onClick={handleClear}>
              Clear
            </Button>
            <Button size="sm" onClick={handleApply}>
              Apply Filter
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function BulkSelector({
  customers,
  selectedIds,
  onSelectionChange,
  className,
}: BulkSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCriteria, setFilterCriteria] = useState<SelectionCriteria>({})

  // Get unique tags from all customers
  const availableTags = useMemo(() => {
    const tags = new Set<string>()
    customers.forEach((c) => c.tags.forEach((t) => tags.add(t)))
    return Array.from(tags)
  }, [customers])

  // Filter customers based on search and criteria
  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matches =
          customer.name.toLowerCase().includes(query) ||
          customer.customerCode.toLowerCase().includes(query)
        if (!matches) return false
      }

      // Criteria filters
      if (filterCriteria.status?.length) {
        if (!filterCriteria.status.includes(customer.status)) return false
      }
      if (filterCriteria.type?.length) {
        if (!filterCriteria.type.includes(customer.type)) return false
      }
      if (filterCriteria.healthScoreMin !== undefined) {
        if ((customer.healthScore ?? 0) < filterCriteria.healthScoreMin) return false
      }
      if (filterCriteria.healthScoreMax !== undefined) {
        if ((customer.healthScore ?? 100) > filterCriteria.healthScoreMax) return false
      }
      if (filterCriteria.tags?.length) {
        if (!filterCriteria.tags.some((t) => customer.tags.includes(t))) return false
      }

      return true
    })
  }, [customers, searchQuery, filterCriteria])

  // Selection state
  const allFilteredSelected = filteredCustomers.every((c) => selectedIds.has(c.id))
  const someFilteredSelected = filteredCustomers.some((c) => selectedIds.has(c.id))

  // Toggle individual customer
  const toggleCustomer = useCallback(
    (customerId: string) => {
      const newSelected = new Set(selectedIds)
      if (newSelected.has(customerId)) {
        newSelected.delete(customerId)
      } else {
        newSelected.add(customerId)
      }
      onSelectionChange(newSelected)
    },
    [selectedIds, onSelectionChange]
  )

  // Select all filtered customers
  const selectAllFiltered = useCallback(() => {
    const newSelected = new Set(selectedIds)
    filteredCustomers.forEach((c) => newSelected.add(c.id))
    onSelectionChange(newSelected)
  }, [selectedIds, filteredCustomers, onSelectionChange])

  // Deselect all filtered customers
  const deselectAllFiltered = useCallback(() => {
    const newSelected = new Set(selectedIds)
    filteredCustomers.forEach((c) => newSelected.delete(c.id))
    onSelectionChange(newSelected)
  }, [selectedIds, filteredCustomers, onSelectionChange])

  // Toggle all filtered
  const toggleAllFiltered = useCallback(() => {
    if (allFilteredSelected) {
      deselectAllFiltered()
    } else {
      selectAllFiltered()
    }
  }, [allFilteredSelected, selectAllFiltered, deselectAllFiltered])

  // Clear all selections
  const clearSelection = useCallback(() => {
    onSelectionChange(new Set())
  }, [onSelectionChange])

  // Apply quick filter
  const applyQuickFilter = (criteria: SelectionCriteria) => {
    setFilterCriteria(criteria)
    // Select all matching
    const newSelected = new Set<string>()
    customers.forEach((customer) => {
      let matches = true
      if (criteria.status?.length && !criteria.status.includes(customer.status)) {
        matches = false
      }
      if (criteria.type?.length && !criteria.type.includes(customer.type)) {
        matches = false
      }
      if (criteria.healthScoreMin !== undefined && (customer.healthScore ?? 0) < criteria.healthScoreMin) {
        matches = false
      }
      if (criteria.healthScoreMax !== undefined && (customer.healthScore ?? 100) > criteria.healthScoreMax) {
        matches = false
      }
      if (matches) {
        newSelected.add(customer.id)
      }
    })
    onSelectionChange(newSelected)
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium">
            {selectedIds.size} of {customers.length} selected
          </span>
        </div>
        {selectedIds.size > 0 && (
          <Button variant="ghost" size="sm" onClick={clearSelection}>
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <FilterPopover
          criteria={filterCriteria}
          onApply={setFilterCriteria}
          onClear={() => setFilterCriteria({})}
          availableTags={availableTags}
        />
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2">
        {QUICK_FILTERS.map((filter) => (
          <Button
            key={filter.label}
            variant="outline"
            size="sm"
            onClick={() => applyQuickFilter(filter.criteria)}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {/* Selection Summary */}
      <Card>
        <CardContent className="pt-4">
          <SelectionSummary customers={customers} selectedIds={selectedIds} />
        </CardContent>
      </Card>

      {/* Customer List */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Customers ({filteredCustomers.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={selectAllFiltered}>
                Select All
              </Button>
              <Button variant="ghost" size="sm" onClick={deselectAllFiltered}>
                Deselect All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-1">
              {/* Header row */}
              <div
                className="flex items-center gap-3 p-2 bg-muted rounded cursor-pointer"
                onClick={toggleAllFiltered}
              >
                {allFilteredSelected ? (
                  <CheckSquare className="h-5 w-5 text-primary" />
                ) : someFilteredSelected ? (
                  <MinusSquare className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <Square className="h-5 w-5 text-muted-foreground" />
                )}
                <span className="font-medium text-sm">
                  {allFilteredSelected ? 'Deselect all' : 'Select all visible'}
                </span>
              </div>

              {/* Customer rows */}
              {filteredCustomers.map((customer) => (
                <div
                  key={customer.id}
                  className={cn(
                    'flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-muted/50 transition-colors',
                    selectedIds.has(customer.id) && 'bg-primary/5'
                  )}
                  onClick={() => toggleCustomer(customer.id)}
                >
                  <Checkbox
                    checked={selectedIds.has(customer.id)}
                    onCheckedChange={() => toggleCustomer(customer.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <TruncateTooltip text={customer.name} maxLength={30} className="font-medium" />
                    <p className="text-sm text-muted-foreground">
                      {customer.customerCode} • {customer.status}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {customer.healthScore !== null && (
                      <Badge
                        variant="outline"
                        className={cn(
                          customer.healthScore >= 80
                            ? 'border-green-200 text-green-700'
                            : customer.healthScore >= 60
                              ? 'border-yellow-200 text-yellow-700'
                              : customer.healthScore >= 40
                                ? 'border-orange-200 text-orange-700'
                                : 'border-red-200 text-red-700'
                        )}
                      >
                        {customer.healthScore}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}

              {filteredCustomers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No customers match the current filters
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
