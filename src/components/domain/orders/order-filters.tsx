/**
 * OrderFilters Component
 *
 * Filter controls for order list including search, status, date range, and amount.
 *
 * @see _Initiation/_prd/2-domains/orders/orders.prd.json (ORD-LIST-UI)
 */

import { memo, useState } from "react";
import { Search, Filter, X, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/lib/schemas/orders";

// ============================================================================
// TYPES
// ============================================================================

export interface OrderFiltersProps {
  filters: OrderFiltersState;
  onFiltersChange: (filters: OrderFiltersState) => void;
  className?: string;
}

export interface OrderFiltersState {
  search: string;
  status: OrderStatus | null;
  paymentStatus: string | null;
  dateFrom: Date | null;
  dateTo: Date | null;
  minTotal: number | null;
  maxTotal: number | null;
}

const ORDER_STATUSES: { value: OrderStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "confirmed", label: "Confirmed" },
  { value: "picking", label: "Picking" },
  { value: "picked", label: "Picked" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const PAYMENT_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "partial", label: "Partial" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "refunded", label: "Refunded" },
];

// ============================================================================
// COMPONENT
// ============================================================================

export const OrderFilters = memo(function OrderFilters({
  filters,
  onFiltersChange,
  className,
}: OrderFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateFilter = <K extends keyof OrderFiltersState>(
    key: K,
    value: OrderFiltersState[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: "",
      status: null,
      paymentStatus: null,
      dateFrom: null,
      dateTo: null,
      minTotal: null,
      maxTotal: null,
    });
  };

  const activeFilterCount = [
    filters.status,
    filters.paymentStatus,
    filters.dateFrom,
    filters.dateTo,
    filters.minTotal,
    filters.maxTotal,
  ].filter((v) => v !== null).length;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Primary Filters Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Status Filter */}
        <Select
          value={filters.status ?? "all"}
          onValueChange={(v) =>
            updateFilter("status", v === "all" ? null : (v as OrderStatus))
          }
        >
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {ORDER_STATUSES.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Advanced Filters Toggle */}
        <Button
          variant="outline"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={cn(
            "gap-2",
            activeFilterCount > 0 && "border-primary"
          )}
        >
          <Filter className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Advanced Filters Panel */}
      {showAdvanced && (
        <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Advanced Filters</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-auto p-1 text-muted-foreground"
            >
              Clear all
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Payment Status */}
            <div className="space-y-2">
              <Label htmlFor="payment-status">Payment Status</Label>
              <Select
                value={filters.paymentStatus ?? "all"}
                onValueChange={(v) =>
                  updateFilter("paymentStatus", v === "all" ? null : v)
                }
              >
                <SelectTrigger id="payment-status">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {PAYMENT_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date From */}
            <div className="space-y-2">
              <Label>From Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !filters.dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateFrom
                      ? format(filters.dateFrom, "dd/MM/yyyy")
                      : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dateFrom ?? undefined}
                    onSelect={(date) => updateFilter("dateFrom", date ?? null)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Date To */}
            <div className="space-y-2">
              <Label>To Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !filters.dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateTo
                      ? format(filters.dateTo, "dd/MM/yyyy")
                      : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dateTo ?? undefined}
                    onSelect={(date) => updateFilter("dateTo", date ?? null)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Amount Range */}
            <div className="space-y-2">
              <Label>Total Range</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={filters.minTotal ?? ""}
                  onChange={(e) =>
                    updateFilter(
                      "minTotal",
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                  className="w-full"
                />
                <span className="text-muted-foreground">-</span>
                <Input
                  type="number"
                  placeholder="Max"
                  value={filters.maxTotal ?? ""}
                  onChange={(e) =>
                    updateFilter(
                      "maxTotal",
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Active Filter Tags */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              {filters.status && (
                <Badge variant="secondary" className="gap-1">
                  Status: {filters.status}
                  <button
                    onClick={() => updateFilter("status", null)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filters.paymentStatus && (
                <Badge variant="secondary" className="gap-1">
                  Payment: {filters.paymentStatus}
                  <button
                    onClick={() => updateFilter("paymentStatus", null)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filters.dateFrom && (
                <Badge variant="secondary" className="gap-1">
                  From: {format(filters.dateFrom, "dd/MM/yyyy")}
                  <button
                    onClick={() => updateFilter("dateFrom", null)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filters.dateTo && (
                <Badge variant="secondary" className="gap-1">
                  To: {format(filters.dateTo, "dd/MM/yyyy")}
                  <button
                    onClick={() => updateFilter("dateTo", null)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filters.minTotal !== null && (
                <Badge variant="secondary" className="gap-1">
                  Min: ${filters.minTotal}
                  <button
                    onClick={() => updateFilter("minTotal", null)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filters.maxTotal !== null && (
                <Badge variant="secondary" className="gap-1">
                  Max: ${filters.maxTotal}
                  <button
                    onClick={() => updateFilter("maxTotal", null)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default OrderFilters;
