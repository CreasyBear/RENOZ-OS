/**
 * Customers Mobile Cards Component
 *
 * Mobile-optimized card layout for customers list.
 */

import { memo, useCallback } from "react";
import { Mail, Phone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusCell, ScoreCell, PriceCell, TagsCell } from "@/components/shared/data-table";
import type { TagItem } from "@/components/shared/data-table";
import { cn } from "@/lib/utils";
import type { CustomerTableData } from "./customer-columns";
import {
  CUSTOMER_STATUS_CONFIG,
  type CustomerStatus,
} from "./customer-status-config";

export interface CustomersMobileCardsProps {
  /** Customers to display */
  customers: CustomerTableData[];
  /** Set of selected customer IDs */
  selectedIds: Set<string>;
  /** Handle selection toggle */
  onSelect: (id: string, checked: boolean) => void;
  /** View customer handler */
  onViewCustomer: (id: string) => void;
  /** Additional className */
  className?: string;
}

/**
 * Mobile card layout for customers list.
 * Each card is tappable to view customer details.
 */
export const CustomersMobileCards = memo(function CustomersMobileCards({
  customers,
  selectedIds,
  onViewCustomer,
  className,
}: CustomersMobileCardsProps) {
  const handleCardClick = useCallback(
    (customerId: string) => {
      onViewCustomer(customerId);
    },
    [onViewCustomer]
  );

  const handleCardKeyDown = useCallback(
    (e: React.KeyboardEvent, customerId: string) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onViewCustomer(customerId);
      }
    },
    [onViewCustomer]
  );

  return (
    <div className={cn("space-y-3", className)}>
      {customers.map((customer) => {
        const isSelected = selectedIds.has(customer.id);
        const tags: TagItem[] = (customer.tags ?? []).map((tag, idx) => ({
          id: `${customer.id}-tag-${idx}`,
          name: tag,
        }));
        const ltvValue =
          typeof customer.lifetimeValue === "string"
            ? parseFloat(customer.lifetimeValue)
            : customer.lifetimeValue;

        return (
          <Card
            key={customer.id}
            tabIndex={0}
            role="button"
            aria-label={`View customer ${customer.name}`}
            className={cn(
              "cursor-pointer hover:bg-muted/50 transition-colors",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isSelected && "bg-muted/50 ring-1 ring-primary"
            )}
            onClick={() => handleCardClick(customer.id)}
            onKeyDown={(e) => handleCardKeyDown(e, customer.id)}
          >
            <CardContent className="p-4">
              {/* Header row: Name + Status */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{customer.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {customer.customerCode}
                  </p>
                </div>
                <StatusCell
                  status={customer.status as CustomerStatus}
                  statusConfig={CUSTOMER_STATUS_CONFIG}
                  showIcon
                  className="flex-shrink-0 ml-2"
                />
              </div>

              {/* Contact row */}
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-2">
                {customer.email && (
                  <span className="flex items-center gap-1 truncate max-w-[140px]">
                    <Mail className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{customer.email}</span>
                  </span>
                )}
                {customer.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3 flex-shrink-0" />
                    <span>{customer.phone}</span>
                  </span>
                )}
              </div>

              {/* Tags row (if any) */}
              {tags.length > 0 && (
                <div className="mb-3">
                  <TagsCell tags={tags} maxVisible={3} />
                </div>
              )}

              {/* Footer row: LTV + Orders + Health */}
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-4">
                  {ltvValue !== null && (
                    <div className="flex flex-col">
                      <span className="text-[10px] text-muted-foreground uppercase">
                        LTV
                      </span>
                      <PriceCell
                        value={ltvValue}
                        showCents={false}
                        className="font-semibold"
                      />
                    </div>
                  )}
                  {customer.totalOrders !== null && customer.totalOrders > 0 && (
                    <div className="flex flex-col">
                      <span className="text-[10px] text-muted-foreground uppercase">
                        Orders
                      </span>
                      <span className="text-sm font-medium">
                        {customer.totalOrders}
                      </span>
                    </div>
                  )}
                </div>
                {customer.healthScore !== null && (
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-muted-foreground uppercase">
                      Health
                    </span>
                    <ScoreCell score={customer.healthScore} size="sm" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
});

CustomersMobileCards.displayName = "CustomersMobileCards";
