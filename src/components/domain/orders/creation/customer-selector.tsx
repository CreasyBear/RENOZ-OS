/**
 * CustomerSelector Component (Presenter)
 *
 * Searchable customer selection for order creation wizard.
 * Displays customer info including type, status, and contact details.
 *
 * Follows presenter pattern - NO data fetching hooks (useQuery, useMutation).
 * Data is passed via props from container (route).
 *
 * @see _Initiation/_prd/2-domains/orders/orders.prd.json (ORD-CREATION-UI)
 */

import { memo, useCallback } from 'react';
import { Search, User, Building2, Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TruncateTooltip } from '@/components/shared/truncate-tooltip';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

/** Summary of customer for display in selector */
export interface CustomerSummary {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  type: string;
  status: string;
}

/** Selected customer with full details */
export interface SelectedCustomer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  type: string;
  status: string;
  billingAddress?: {
    street1?: string;
    street2?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  shippingAddress?: {
    street1?: string;
    street2?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

export interface CustomerSelectorProps {
  /** @source useState in container */
  selectedCustomerId: string | null;
  /** @source handler in container */
  onSelect: (customer: SelectedCustomer | null) => void;
  /** @source useState(search) in container */
  search: string;
  /** @source setSearch from useState in container */
  onSearchChange: (value: string) => void;
  /** @source useQuery(getCustomers) in container */
  customers: CustomerSummary[];
  /** Selected customer details resolved independently from list filtering */
  selectedCustomer?: SelectedCustomer | null;
  /** @source useQuery loading state in container */
  isLoading?: boolean;
  /** @source useQuery error state in container */
  error?: unknown;
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const CustomerSelector = memo(function CustomerSelector({
  selectedCustomerId,
  onSelect,
  search,
  onSearchChange,
  customers,
  selectedCustomer: selectedCustomerProp = null,
  isLoading = false,
  error,
  className,
}: CustomerSelectorProps) {
  // Get selected customer details from the list
  const selectedCustomer =
    selectedCustomerProp ??
    (selectedCustomerId ? customers.find((c) => c.id === selectedCustomerId) ?? null : null);

  const handleSelect = useCallback(
    (customer: CustomerSummary) => {
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
    <div className={cn('space-y-4', className)}>
      {/* Selected Customer Display */}
      {selectedCustomer && (
        <Card className="border-primary">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Selected Customer</CardTitle>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={handleClear} className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
                <span className="sr-only">Clear selection</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3">
              <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-full">
                {selectedCustomer.type === 'business' ? (
                  <Building2 className="text-muted-foreground h-5 w-5" />
                ) : (
                  <User className="text-muted-foreground h-5 w-5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  <TruncateTooltip text={selectedCustomer.name} maxLength={30} />
                </p>
                {selectedCustomer.email && (
                  <p className="text-muted-foreground text-sm">
                    <TruncateTooltip text={selectedCustomer.email} maxLength={35} />
                  </p>
                )}
                {selectedCustomer.phone && (
                  <p className="text-muted-foreground text-sm">{selectedCustomer.phone}</p>
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
        <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder="Search customers by name, email, or phone..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Customer List */}
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>
            {isLoading
              ? 'Loading customers...'
              : `${customers.length} customer${customers.length !== 1 ? 's' : ''} found`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[300px]">
            {isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-destructive p-4 text-center text-sm">
                Failed to load customers. Please try again.
              </div>
            ) : customers.length === 0 ? (
              <div className="text-muted-foreground p-4 text-center text-sm">
                {search ? 'No customers found matching your search.' : 'No active customers found.'}
              </div>
            ) : (
              <div className="divide-y">
                {customers.map((customer) => (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => handleSelect(customer)}
                    className={cn(
                      'hover:bg-muted/50 flex w-full items-center gap-3 p-4 text-left transition-colors',
                      customer.id === selectedCustomerId && 'bg-muted'
                    )}
                  >
                    <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                      {customer.type === 'business' ? (
                        <Building2 className="text-muted-foreground h-5 w-5" />
                      ) : (
                        <User className="text-muted-foreground h-5 w-5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        <TruncateTooltip text={customer.name} maxLength={30} />
                      </p>
                      <p className="text-muted-foreground text-sm">
                        <TruncateTooltip
                          text={customer.email || customer.phone || 'No contact info'}
                          maxLength={35}
                        />
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant="outline" className="text-xs capitalize">
                        {customer.type}
                      </Badge>
                      {customer.id === selectedCustomerId && (
                        <Check className="text-primary h-4 w-4" />
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
