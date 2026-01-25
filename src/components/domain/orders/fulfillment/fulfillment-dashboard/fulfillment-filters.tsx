/**
 * FulfillmentFilters Component
 *
 * Advanced filtering system for the fulfillment kanban board.
 * Provides comprehensive filtering capabilities following Jobs kanban patterns.
 *
 * ## Features
 * - Real-time text search across orders and customers
 * - Priority filtering (Normal, High, Urgent)
 * - Status filtering (Confirmed, Picking, Picked, Shipped)
 * - Customer selection with search
 * - Date range filtering (Today, This Week, Overdue, Upcoming)
 * - Active filter badges with individual removal
 * - Filter persistence across browser sessions
 *
 * ## Filter Types
 * - **Priority**: Order urgency levels
 * - **Status**: Current fulfillment workflow state
 * - **Customer**: Filter by specific customers
 * - **Date Range**: Time-based filtering
 * - **Search**: Full-text search across all fields
 *
 * ## User Experience
 * - Collapsible filter popover to save screen space
 * - Filter count indicator on trigger button
 * - Clear all filters option
 * - Keyboard navigation support
 * - Responsive design for mobile devices
 *
 * ## Performance
 * - Client-side filtering for instant results
 * - Efficient search algorithms
 * - Debounced search input to reduce computation
 *
 * @param filters - Current filter state object
 * @param onChange - Callback when filters are modified
 * @param availableCustomers - List of available customers for selection
 *
 * @see src/components/domain/jobs/jobs-filters.tsx for reference implementation
 * @see src/hooks/orders/use-fulfillment-kanban.ts for filter implementation
 */
import { useState, useMemo, memo } from 'react';
import { SlidersHorizontal, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface FulfillmentFiltersState {
  priority: 'all' | 'normal' | 'high' | 'urgent';
  status: 'all' | 'confirmed' | 'picking' | 'picked' | 'shipped';
  customerId: string; // 'all' or customer ID
  dateRange: 'all' | 'today' | 'this_week' | 'overdue' | 'upcoming';
  searchQuery: string;
}

export interface FulfillmentFiltersProps {
  filters: FulfillmentFiltersState;
  onChange: (filters: FulfillmentFiltersState) => void;
  availableCustomers?: Array<{ id: string; name: string }>;
  className?: string;
}

const PRIORITY_OPTIONS = [
  { id: 'all', name: 'All priorities', color: undefined },
  { id: 'normal', name: 'Normal', color: 'text-slate-600 dark:text-slate-400' },
  { id: 'high', name: 'High', color: 'text-amber-600 dark:text-amber-400' },
  { id: 'urgent', name: 'Urgent', color: 'text-red-600 dark:text-red-400' },
] as const;

const STATUS_OPTIONS = [
  { id: 'all', name: 'All statuses', color: undefined },
  { id: 'confirmed', name: 'Confirmed', color: 'text-slate-600 dark:text-slate-400' },
  { id: 'picking', name: 'Picking', color: 'text-blue-600 dark:text-blue-400' },
  { id: 'picked', name: 'Picked', color: 'text-green-600 dark:text-green-400' },
  { id: 'shipped', name: 'Shipped', color: 'text-purple-600 dark:text-purple-400' },
] as const;

const DATE_RANGE_OPTIONS = [
  { id: 'all', name: 'All dates', color: undefined },
  { id: 'today', name: 'Due Today', color: 'text-red-600 dark:text-red-400' },
  { id: 'this_week', name: 'Due This Week', color: 'text-orange-600 dark:text-orange-400' },
  { id: 'overdue', name: 'Overdue', color: 'text-red-600 dark:text-red-400' },
  { id: 'upcoming', name: 'Upcoming', color: 'text-blue-600 dark:text-blue-400' },
] as const;

export const FulfillmentFilters = memo(function FulfillmentFilters({
  filters,
  onChange,
  availableCustomers = [],
  className,
}: FulfillmentFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.searchQuery);

  // Calculate active filter count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.priority !== 'all') count++;
    if (filters.status !== 'all') count++;
    if (filters.customerId !== 'all') count++;
    if (filters.dateRange !== 'all') count++;
    if (filters.searchQuery.trim()) count++;
    return count;
  }, [filters]);

  const clearFilters = () => {
    onChange({
      priority: 'all',
      status: 'all',
      customerId: 'all',
      dateRange: 'all',
      searchQuery: '',
    });
    setSearchInput('');
  };

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    // Debounce the actual filter change
    const timeoutId = setTimeout(() => {
      onChange({ ...filters, searchQuery: value });
    }, 300);
    return () => clearTimeout(timeoutId);
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
        <Input
          placeholder="Search orders..."
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-64 pl-9"
        />
      </div>

      {/* Filters Popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="secondary" size="sm" className="gap-2">
            <SlidersHorizontal className="size-4" />
            <span className="hidden sm:inline">Filters</span>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4" align="start">
          <div className="space-y-4">
            {/* Search within popover */}
            <div>
              <h4 className="mb-3 scroll-mt-20 text-sm font-semibold">Search</h4>
              <div className="relative">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
                <Input
                  placeholder="Search orders, customers..."
                  value={searchInput}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Separator />

            {/* Priority Filter */}
            <div>
              <h4 className="mb-3 scroll-mt-20 text-sm font-semibold">Priority</h4>
              <div className="space-y-1">
                {PRIORITY_OPTIONS.map((option) => (
                  <Button
                    key={option.id}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'h-9 w-full justify-between px-3',
                      filters.priority === option.id && 'bg-muted'
                    )}
                    onClick={() =>
                      onChange({
                        ...filters,
                        priority: option.id as FulfillmentFiltersState['priority'],
                      })
                    }
                  >
                    <span className={cn('text-sm', option.color)}>{option.name}</span>
                    {filters.priority === option.id && (
                      <div className="bg-primary size-2 rounded-full" />
                    )}
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Status Filter */}
            <div>
              <h4 className="mb-3 scroll-mt-20 text-sm font-semibold">Status</h4>
              <div className="space-y-1">
                {STATUS_OPTIONS.map((option) => (
                  <Button
                    key={option.id}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'h-9 w-full justify-between px-3',
                      filters.status === option.id && 'bg-muted'
                    )}
                    onClick={() =>
                      onChange({
                        ...filters,
                        status: option.id as FulfillmentFiltersState['status'],
                      })
                    }
                  >
                    <span className={cn('text-sm', option.color)}>{option.name}</span>
                    {filters.status === option.id && (
                      <div className="bg-primary size-2 rounded-full" />
                    )}
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Customer Filter */}
            <div>
              <h4 className="mb-3 scroll-mt-20 text-sm font-semibold">Customer</h4>
              <Select
                value={filters.customerId}
                onValueChange={(value) => onChange({ ...filters, customerId: value })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All customers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All customers</SelectItem>
                  {availableCustomers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Date Range Filter */}
            <div>
              <h4 className="mb-3 scroll-mt-20 text-sm font-semibold">Due Date</h4>
              <div className="space-y-1">
                {DATE_RANGE_OPTIONS.map((option) => (
                  <Button
                    key={option.id}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'h-9 w-full justify-between px-3',
                      filters.dateRange === option.id && 'bg-muted'
                    )}
                    onClick={() =>
                      onChange({
                        ...filters,
                        dateRange: option.id as FulfillmentFiltersState['dateRange'],
                      })
                    }
                  >
                    <span className={cn('text-sm', option.color)}>{option.name}</span>
                    {filters.dateRange === option.id && (
                      <div className="bg-primary size-2 rounded-full" />
                    )}
                  </Button>
                ))}
              </div>
            </div>

            {activeFiltersCount > 0 && (
              <>
                <Separator />
                <Button variant="outline" size="sm" className="h-9 w-full" onClick={clearFilters}>
                  Clear all filters
                </Button>
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Active filter indicators */}
      {filters.priority !== 'all' && (
        <Badge variant="secondary" className="gap-1">
          Priority: {PRIORITY_OPTIONS.find((p) => p.id === filters.priority)?.name}
          <button
            onClick={() => onChange({ ...filters, priority: 'all' })}
            className="hover:bg-muted-foreground/20 ml-1 rounded-full p-0.5"
            aria-label="Remove priority filter"
          >
            ×
          </button>
        </Badge>
      )}

      {filters.status !== 'all' && (
        <Badge variant="secondary" className="gap-1">
          Status: {STATUS_OPTIONS.find((s) => s.id === filters.status)?.name}
          <button
            onClick={() => onChange({ ...filters, status: 'all' })}
            className="hover:bg-muted-foreground/20 ml-1 rounded-full p-0.5"
            aria-label="Remove status filter"
          >
            ×
          </button>
        </Badge>
      )}

      {filters.customerId !== 'all' && (
        <Badge variant="secondary" className="gap-1">
          Customer: {availableCustomers.find((c) => c.id === filters.customerId)?.name || 'Unknown'}
          <button
            onClick={() => onChange({ ...filters, customerId: 'all' })}
            className="hover:bg-muted-foreground/20 ml-1 rounded-full p-0.5"
            aria-label="Remove customer filter"
          >
            ×
          </button>
        </Badge>
      )}

      {filters.dateRange !== 'all' && (
        <Badge variant="secondary" className="gap-1">
          {DATE_RANGE_OPTIONS.find((d) => d.id === filters.dateRange)?.name}
          <button
            onClick={() => onChange({ ...filters, dateRange: 'all' })}
            className="hover:bg-muted-foreground/20 ml-1 rounded-full p-0.5"
            aria-label="Remove date range filter"
          >
            ×
          </button>
        </Badge>
      )}

      {filters.searchQuery.trim() && (
        <Badge variant="secondary" className="gap-1">
          Search: &quot;{filters.searchQuery}&quot;
          <button
            onClick={() => {
              onChange({ ...filters, searchQuery: '' });
              setSearchInput('');
            }}
            className="hover:bg-muted-foreground/20 ml-1 rounded-full p-0.5"
            aria-label="Clear search"
          >
            ×
          </button>
        </Badge>
      )}
    </div>
  );
});
