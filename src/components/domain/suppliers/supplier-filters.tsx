/**
 * Supplier Filters Component
 *
 * Filter controls for the supplier directory including search,
 * status, type, and rating filters.
 */

import { useState } from 'react';
import { Search, X, SlidersHorizontal } from 'lucide-react';
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import type { SupplierFiltersState, SupplierStatus, SupplierType } from '@/lib/schemas/suppliers';

// ============================================================================
// TYPES
// ============================================================================

interface SupplierFiltersProps {
  filters: SupplierFiltersState;
  onFiltersChange: (filters: SupplierFiltersState) => void;
  onSearch: (search: string) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const statusOptions: { value: SupplierStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'blacklisted', label: 'Blacklisted' },
];

const typeOptions: { value: SupplierType; label: string }[] = [
  { value: 'manufacturer', label: 'Manufacturer' },
  { value: 'distributor', label: 'Distributor' },
  { value: 'retailer', label: 'Retailer' },
  { value: 'service', label: 'Service Provider' },
  { value: 'raw_materials', label: 'Raw Materials' },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function SupplierFilters({ filters, onFiltersChange, onSearch }: SupplierFiltersProps) {
  const [searchValue, setSearchValue] = useState(filters.search);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const activeFilterCount =
    filters.status.length +
    filters.supplierType.length +
    (filters.ratingMin !== undefined ? 1 : 0) +
    (filters.ratingMax !== undefined ? 1 : 0);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchValue);
  };

  const handleSearchClear = () => {
    setSearchValue('');
    onSearch('');
  };

  const handleStatusChange = (value: string) => {
    if (value === 'all') {
      onFiltersChange({ ...filters, status: [] });
    } else {
      onFiltersChange({ ...filters, status: [value as SupplierStatus] });
    }
  };

  const handleTypeChange = (value: string) => {
    if (value === 'all') {
      onFiltersChange({ ...filters, supplierType: [] });
    } else {
      onFiltersChange({ ...filters, supplierType: [value as SupplierType] });
    }
  };

  const handleClearFilters = () => {
    onFiltersChange({
      search: '',
      status: [],
      supplierType: [],
      ratingMin: undefined,
      ratingMax: undefined,
    });
    setSearchValue('');
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Search */}
      <form onSubmit={handleSearchSubmit} className="relative max-w-md flex-1">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder="Search suppliers..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="pr-9 pl-9"
        />
        {searchValue && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2"
            onClick={handleSearchClear}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Clear search</span>
          </Button>
        )}
      </form>

      {/* Desktop Filters */}
      <div className="hidden items-center gap-2 md:flex">
        <Select value={filters.status[0] ?? 'all'} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.supplierType[0] ?? 'all'} onValueChange={handleTypeChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {typeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={handleClearFilters}>
            Clear
            <Badge variant="secondary" className="ml-1.5">
              {activeFilterCount}
            </Badge>
          </Button>
        )}
      </div>

      {/* Mobile Filter Sheet */}
      <div className="md:hidden">
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1.5">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[400px]">
            <SheetHeader>
              <SheetTitle>Filter Suppliers</SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-6">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={filters.status[0] ?? 'all'} onValueChange={handleStatusChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={filters.supplierType[0] ?? 'all'} onValueChange={handleTypeChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {typeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="flex-1" onClick={handleClearFilters}>
                  Clear All
                </Button>
                <Button className="flex-1" onClick={() => setIsSheetOpen(false)}>
                  Apply Filters
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

export type { SupplierFiltersState };
