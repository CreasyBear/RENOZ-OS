/**
 * CustomerSelector Component
 *
 * Searchable customer selection for order creation wizard.
 * Displays customer info including type, status, and contact details.
 *
 * @see _Initiation/_prd/2-domains/orders/orders.prd.json (ORD-CREATION-UI)
 */

import { memo, useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, User, Building2, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TruncateTooltip } from "@/components/shared/truncate-tooltip";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getCustomers } from "@/server/customers";
import type { Customer } from "@/../drizzle/schema";

// ============================================================================
// TYPES
// ============================================================================

export interface CustomerSelectorProps {
  selectedCustomerId: string | null;
  onSelect: (customer: SelectedCustomer | null) => void;
  className?: string;
}

export interface SelectedCustomer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  type: string;
  status: string;
  billingAddress?: {
    street1?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  shippingAddress?: {
    street1?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

// ============================================================================
// COMPONENT
// ============================================================================

export const CustomerSelector = memo(function CustomerSelector({
  selectedCustomerId,
  onSelect,
  className,
}: CustomerSelectorProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search with proper cleanup
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch customers
  const { data, isLoading, error } = useQuery({
    queryKey: ["customers", "selector", debouncedSearch],
    queryFn: () =>
      getCustomers({
        data: {
          page: 1,
          pageSize: 20,
          search: debouncedSearch || undefined,
          status: "active",
        },
      }),
  });

  const customers: Customer[] = data?.items ?? [];

  // Get selected customer details
  const selectedCustomer = selectedCustomerId
    ? customers.find((c) => c.id === selectedCustomerId)
    : null;

  const handleSelect = useCallback(
    (customer: (typeof customers)[0]) => {
      onSelect({
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        type: customer.type,
        status: customer.status,
        // Addresses are stored in separate addresses table, not included in customer query
        billingAddress: undefined,
        shippingAddress: undefined,
      });
    },
    [onSelect]
  );

  const handleClear = useCallback(() => {
    onSelect(null);
  }, [onSelect]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Selected Customer Display */}
      {selectedCustomer && (
        <Card className="border-primary">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Selected Customer</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Clear selection</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                {selectedCustomer.type === "business" ? (
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <User className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">
                  <TruncateTooltip text={selectedCustomer.name} maxLength={30} />
                </p>
                {selectedCustomer.email && (
                  <p className="text-sm text-muted-foreground">
                    <TruncateTooltip text={selectedCustomer.email} maxLength={35} />
                  </p>
                )}
                {selectedCustomer.phone && (
                  <p className="text-sm text-muted-foreground">
                    {selectedCustomer.phone}
                  </p>
                )}
              </div>
              <Badge variant="secondary" className="capitalize">
                {selectedCustomer.type}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search customers by name, email, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Customer List */}
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>
            {isLoading
              ? "Loading customers..."
              : `${customers.length} customer${customers.length !== 1 ? "s" : ""} found`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[300px]">
            {isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="p-4 text-center text-sm text-destructive">
                Failed to load customers. Please try again.
              </div>
            ) : customers.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {search
                  ? "No customers found matching your search."
                  : "No active customers found."}
              </div>
            ) : (
              <div className="divide-y">
                {customers.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => handleSelect(customer)}
                    className={cn(
                      "w-full flex items-center gap-3 p-4 text-left transition-colors hover:bg-muted/50",
                      customer.id === selectedCustomerId && "bg-muted"
                    )}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted shrink-0">
                      {customer.type === "business" ? (
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <User className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">
                        <TruncateTooltip text={customer.name} maxLength={30} />
                      </p>
                      <p className="text-sm text-muted-foreground">
                        <TruncateTooltip text={customer.email || customer.phone || "No contact info"} maxLength={35} />
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="capitalize text-xs">
                        {customer.type}
                      </Badge>
                      {customer.id === selectedCustomerId && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
});

export default CustomerSelector;
