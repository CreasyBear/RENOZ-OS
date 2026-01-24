/**
 * Order Customer Selector Component
 *
 * Customer selection component integrated with the order form context.
 * Provides search, selection, and form integration for order creation.
 *
 * Features:
 * - Customer search and selection
 * - Integration with order form context
 * - Customer details display
 * - Form validation
 *
 * @see src/components/domain/orders/order-creation-wizard/order-form-context.tsx
 */

'use client';

import { useState, useMemo, useEffect } from 'react';
import { Search, User, Building, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';

// ============================================================================
// TYPES
// ============================================================================

export interface OrderCustomerSummary {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  type: 'individual' | 'business';
  billingAddress?: {
    street1?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

// ============================================================================
// CUSTOMER SELECTOR COMPONENT
// ============================================================================

export interface OrderCustomerSelectorProps {
  selectedCustomerId?: string | null;
  customers: OrderCustomerSummary[];
  isLoading?: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  onSelectCustomer: (customer: OrderCustomerSummary | null) => void;
  className?: string;
}

export function OrderCustomerSelector({
  selectedCustomerId,
  customers,
  isLoading = false,
  search,
  onSearchChange,
  onSelectCustomer,
  className,
}: OrderCustomerSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(search);
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [onSearchChange, searchInput]);

  // Filter customers based on search
  const filteredCustomers = useMemo(() => {
    if (!searchInput) return customers;
    return customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(searchInput.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchInput.toLowerCase())
    );
  }, [customers, searchInput]);

  // Handlers
  const handleSelectCustomer = (customer: OrderCustomerSummary) => {
    onSelectCustomer(customer);
    setOpen(false);
    setSearchInput('');
  };

  const handleClearCustomer = () => {
    onSelectCustomer(null);
  };

  return (
    <Card className={className}>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="text-muted-foreground h-5 w-5" />
              <h3 className="text-lg font-semibold">Customer</h3>
              {selectedCustomer && <Badge variant="secondary">Selected</Badge>}
            </div>
          </div>

          {/* Customer Selection */}
          {!selectedCustomer ? (
            <div className="space-y-2">
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                  >
                    <span className="text-muted-foreground">Select a customer...</span>
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Search customers..."
                      value={searchInput}
                      onValueChange={setSearchInput}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {isLoading ? 'Loading...' : 'No customers found.'}
                      </CommandEmpty>
                      <CommandGroup>
                        {filteredCustomers.map((customer) => (
                          <CommandItem
                            key={customer.id}
                            value={customer.name}
                            onSelect={() => handleSelectCustomer(customer)}
                            className="flex items-center gap-3 p-3"
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {customer.type === 'business' ? (
                                  <Building className="h-4 w-4" />
                                ) : (
                                  <User className="h-4 w-4" />
                                )}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-medium">{customer.name}</div>
                              <div className="text-muted-foreground text-sm">
                                {customer.email && (
                                  <div className="flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    <span className="truncate">{customer.email}</span>
                                  </div>
                                )}
                                {customer.phone && (
                                  <div className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    <span>{customer.phone}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {customer.type}
                            </Badge>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              <p className="text-muted-foreground text-sm">
                Search and select a customer for this order. Customer details will be used for
                billing and shipping.
              </p>
            </div>
          ) : (
            /* Selected Customer Display */
            <div className="space-y-3">
              <div className="bg-muted/20 flex items-start justify-between rounded-lg border p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {selectedCustomer.type === 'business' ? (
                        <Building className="h-5 w-5" />
                      ) : (
                        <User className="h-5 w-5" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <h4 className="font-medium">{selectedCustomer.name}</h4>
                    <div className="text-muted-foreground space-y-1 text-sm">
                      {selectedCustomer.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {selectedCustomer.email}
                        </div>
                      )}
                      {selectedCustomer.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {selectedCustomer.phone}
                        </div>
                      )}
                      {selectedCustomer.billingAddress && (
                        <div className="text-xs">
                          {[
                            selectedCustomer.billingAddress.street1,
                            selectedCustomer.billingAddress.city,
                            selectedCustomer.billingAddress.state,
                            selectedCustomer.billingAddress.postcode,
                            selectedCustomer.billingAddress.country,
                          ]
                            .filter(Boolean)
                            .join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearCustomer}
                  className="text-muted-foreground hover:text-destructive"
                >
                  Change
                </Button>
              </div>

              <p className="text-muted-foreground text-sm">
                This customer will be associated with the order. Their billing address will be used
                by default.
              </p>
            </div>
          )}

          {/* Validation Message */}
          {!selectedCustomerId && (
            <p className="text-destructive text-sm">
              Customer selection is required to create an order.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default OrderCustomerSelector;
