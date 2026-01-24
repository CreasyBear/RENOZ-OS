/**
 * Purchase Order Filters Component
 *
 * Search and filter controls for the PO list with mobile sheet support.
 */

import { useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet';
import type { PurchaseOrderFiltersState, PurchaseOrderStatus } from '@/lib/schemas/purchase-orders';

// ============================================================================
// TYPES
// ============================================================================

interface POFiltersProps {
  filters: PurchaseOrderFiltersState;
  onFiltersChange: (filters: PurchaseOrderFiltersState) => void;
  onSearch: (search: string) => void;
}

// ============================================================================
// STATUS OPTIONS
// ============================================================================

const statusOptions: { value: PurchaseOrderStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'ordered', label: 'Ordered' },
  { value: 'partial_received', label: 'Partially Received' },
  { value: 'received', label: 'Received' },
  { value: 'closed', label: 'Closed' },
  { value: 'cancelled', label: 'Cancelled' },
];

// ============================================================================
// FILTER CONTENT
// ============================================================================

function FilterContent({
  filters,
  onFiltersChange,
}: {
  filters: PurchaseOrderFiltersState;
  onFiltersChange: (filters: PurchaseOrderFiltersState) => void;
}) {
  const handleStatusChange = (value: string) => {
    if (value === 'all') {
      onFiltersChange({ ...filters, status: [] });
    } else {
      onFiltersChange({ ...filters, status: [value as PurchaseOrderStatus] });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium">Status</label>
        <Select
          value={filters.status.length > 0 ? filters.status[0] : 'all'}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// ============================================================================
// ACTIVE FILTERS
// ============================================================================

function ActiveFilters({
  filters,
  onFiltersChange,
}: {
  filters: PurchaseOrderFiltersState;
  onFiltersChange: (filters: PurchaseOrderFiltersState) => void;
}) {
  const hasActiveFilters = filters.status.length > 0 || filters.supplierId;

  if (!hasActiveFilters) return null;

  const clearStatus = () => onFiltersChange({ ...filters, status: [] });
  const clearSupplier = () => onFiltersChange({ ...filters, supplierId: null });
  const clearAll = () =>
    onFiltersChange({
      ...filters,
      status: [],
      supplierId: null,
      dateFrom: null,
      dateTo: null,
      valueMin: null,
      valueMax: null,
    });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {filters.status.map((status) => (
        <Badge key={status} variant="secondary" className="gap-1">
          {statusOptions.find((s) => s.value === status)?.label || status}
          <button onClick={clearStatus} className="hover:text-destructive ml-1">
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      {filters.supplierId && (
        <Badge variant="secondary" className="gap-1">
          Supplier filter
          <button onClick={clearSupplier} className="hover:text-destructive ml-1">
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}
      <Button variant="ghost" size="sm" onClick={clearAll} className="h-6 text-xs">
        Clear all
      </Button>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function POFilters({ filters, onFiltersChange, onSearch }: POFiltersProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(filters.search);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchValue);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
    // Debounced search on change
    if (e.target.value === '') {
      onSearch('');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="flex-1">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              value={searchValue}
              onChange={handleSearchChange}
              placeholder="Search PO number, supplier..."
              className="pl-9"
            />
          </div>
        </form>

        {/* Desktop Filters */}
        <div className="hidden gap-2 md:flex">
          <Select
            value={filters.status.length > 0 ? filters.status[0] : 'all'}
            onValueChange={(value) => {
              if (value === 'all') {
                onFiltersChange({ ...filters, status: [] });
              } else {
                onFiltersChange({ ...filters, status: [value as PurchaseOrderStatus] });
              }
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Mobile Filter Sheet */}
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="md:hidden">
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[50vh]">
            <SheetHeader>
              <SheetTitle>Filter Orders</SheetTitle>
            </SheetHeader>
            <div className="py-4">
              <FilterContent filters={filters} onFiltersChange={onFiltersChange} />
            </div>
            <SheetFooter>
              <Button
                variant="outline"
                onClick={() => {
                  onFiltersChange({
                    ...filters,
                    status: [],
                    supplierId: null,
                    dateFrom: null,
                    dateTo: null,
                    valueMin: null,
                    valueMax: null,
                  });
                }}
              >
                Clear All
              </Button>
              <Button onClick={() => setIsSheetOpen(false)}>Apply Filters</Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      {/* Active Filters */}
      <ActiveFilters filters={filters} onFiltersChange={onFiltersChange} />
    </div>
  );
}

export type { POFiltersProps };
