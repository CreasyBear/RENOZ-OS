/**
 * Pricing Filters Component
 *
 * Search and filter controls for price list management.
 * Supports supplier, product, status, and preferred filtering.
 *
 * @see SUPP-PRICING-MANAGEMENT story
 */

import { useState } from 'react';
import { Search, SlidersHorizontal, X, Star } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import {
  priceListStatuses,
  priceListStatusLabels,
  type PriceListStatus,
  type PriceListFilters,
} from '@/lib/schemas/pricing';

// ============================================================================
// TYPES
// ============================================================================

interface Supplier {
  id: string;
  name: string;
}

interface PricingFiltersProps {
  filters: PriceListFilters;
  onFiltersChange: (filters: Partial<PriceListFilters>) => void;
  suppliers?: Supplier[];
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function PricingFilters({ filters, onFiltersChange, suppliers = [] }: PricingFiltersProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ search: e.target.value || undefined, page: 1 });
  };

  const handleStatusChange = (value: string) => {
    onFiltersChange({
      status: value === 'all' ? undefined : (value as PriceListStatus),
      page: 1,
    });
  };

  const handleSupplierChange = (value: string) => {
    onFiltersChange({
      supplierId: value === 'all' ? undefined : value,
      page: 1,
    });
  };

  const handlePreferredChange = (checked: boolean) => {
    onFiltersChange({
      isPreferred: checked ? true : undefined,
      page: 1,
    });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      search: undefined,
      status: undefined,
      supplierId: undefined,
      productId: undefined,
      isPreferred: undefined,
      page: 1,
    });
  };

  const activeFilterCount = [
    filters.status,
    filters.supplierId,
    filters.productId,
    filters.isPreferred,
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Search */}
      <div className="relative flex-1 sm:max-w-sm">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder="Search products, suppliers, SKUs..."
          value={filters.search || ''}
          onChange={handleSearchChange}
          className="pl-9"
        />
      </div>

      {/* Desktop filters */}
      <div className="hidden items-center gap-2 sm:flex">
        <Select value={filters.status || 'all'} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {priceListStatuses.map((status) => (
              <SelectItem key={status} value={status}>
                {priceListStatusLabels[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {suppliers.length > 0 && (
          <Select value={filters.supplierId || 'all'} onValueChange={handleSupplierChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Supplier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Suppliers</SelectItem>
              {suppliers.map((supplier) => (
                <SelectItem key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Button
          variant={filters.isPreferred ? 'default' : 'outline'}
          size="sm"
          onClick={() => handlePreferredChange(!filters.isPreferred)}
          className="gap-1"
        >
          <Star className={`h-4 w-4 ${filters.isPreferred ? 'fill-current' : ''}`} />
          Preferred
        </Button>

        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={handleClearFilters} className="gap-1">
            <X className="h-4 w-4" />
            Clear ({activeFilterCount})
          </Button>
        )}
      </div>

      {/* Mobile filters */}
      <div className="flex items-center gap-2 sm:hidden">
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={filters.status || 'all'} onValueChange={handleStatusChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {priceListStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {priceListStatusLabels[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {suppliers.length > 0 && (
                <div className="space-y-2">
                  <Label>Supplier</Label>
                  <Select value={filters.supplierId || 'all'} onValueChange={handleSupplierChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Suppliers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Suppliers</SelectItem>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label htmlFor="preferred-only">Preferred Only</Label>
                <Switch
                  id="preferred-only"
                  checked={filters.isPreferred || false}
                  onCheckedChange={handlePreferredChange}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    handleClearFilters();
                    setIsSheetOpen(false);
                  }}
                >
                  Clear All
                </Button>
                <Button className="flex-1" onClick={() => setIsSheetOpen(false)}>
                  Apply
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

export { PricingFilters };
export type { PricingFiltersProps };
