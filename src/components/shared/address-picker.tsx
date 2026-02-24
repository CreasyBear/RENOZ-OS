/**
 * AddressPicker Component
 *
 * Combobox-style picker for selecting a shipping address from customer addresses
 * or entering manually. Matches ComboboxField patterns (Command + Popover).
 *
 * @example
 * ```tsx
 * <AddressPicker
 *   addresses={customer.addresses}
 *   selectedAddress={selected}
 *   onSelect={(addr) => applyAddress(addr)}
 *   placeholder="Choose shipping address"
 *   customerName={customer?.name}
 * />
 * ```
 */

import { useState } from "react";
import { Check, ChevronsUpDown, MapPin, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

/** Minimal address shape for picker (customer addresses or order address) */
export interface AddressOption {
  /** Unique key (address.id or synthetic e.g. "order-shipping") */
  id: string;
  type?: "shipping" | "billing" | "service" | "headquarters";
  street1: string;
  street2?: string | null;
  city: string;
  state?: string | null;
  postcode?: string | null;
  postalCode?: string | null;
  country?: string | null;
  /** Optional contact name (from order address) */
  contactName?: string | null;
  contactPhone?: string | null;
}

export interface AddressPickerProps {
  /** Available addresses to choose from */
  addresses: AddressOption[];
  /** Currently selected address (for display) */
  selectedAddress: AddressOption | null;
  /** Callback when user selects an address or "Enter manually" (null) */
  onSelect: (address: AddressOption | null) => void;
  /** Placeholder when nothing selected */
  placeholder?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Additional class names */
  className?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatAddressLine(addr: AddressOption): string {
  const parts = [
    addr.street1,
    addr.street2,
    [addr.city, addr.state ?? addr.postcode ?? addr.postalCode].filter(Boolean).join(" "),
  ].filter(Boolean);
  return parts.join(", ");
}

function getPostcode(addr: AddressOption): string {
  return addr.postcode ?? addr.postalCode ?? "";
}

// ============================================================================
// COMPONENT
// ============================================================================

export function AddressPicker({
  addresses,
  selectedAddress,
  onSelect,
  placeholder = "Choose shipping address",
  disabled,
  className,
}: AddressPickerProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (addr: AddressOption | null) => {
    onSelect(addr);
    setOpen(false);
  };

  const displayText = selectedAddress
    ? formatAddressLine(selectedAddress)
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal h-auto min-h-10 py-2",
            !selectedAddress && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <span className="flex items-center gap-2 truncate text-left">
            <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
            {displayText}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandList>
            {addresses.length === 0 ? (
              <CommandEmpty>No saved addresses</CommandEmpty>
            ) : (
              <CommandGroup heading="Saved addresses">
                {addresses.map((addr) => {
                  const isSelected =
                    selectedAddress?.id === addr.id &&
                    selectedAddress?.street1 === addr.street1;
                  return (
                    <CommandItem
                      key={addr.id}
                      value={`${addr.id}-${addr.street1}-${addr.city}`}
                      onSelect={() => handleSelect(addr)}
                      className="cursor-pointer py-3"
                    >
                      <Check
                        className={cn(
                          "mr-3 h-4 w-4 shrink-0",
                          isSelected ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-1 flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          {addr.type && (
                            <span
                              className={cn(
                                "rounded px-1.5 py-0.5 text-xs font-medium capitalize",
                                addr.type === "shipping"
                                  ? "bg-primary/10 text-primary"
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              {addr.type}
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-medium">
                          {addr.street1}
                          {addr.street2 ? `, ${addr.street2}` : ""}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {[addr.city, addr.state, getPostcode(addr)].filter(Boolean).join(", ")}
                          {addr.country && addr.country !== "AU" ? `, ${addr.country}` : ""}
                        </span>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
            <CommandGroup>
              <CommandItem
                value="__manual__"
                onSelect={() => handleSelect(null)}
                className="cursor-pointer"
              >
                <Pencil className="mr-3 h-4 w-4 shrink-0 text-muted-foreground" />
                <span>Enter address manually</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
