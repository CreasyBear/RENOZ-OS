/**
 * Suppliers Mobile Cards Component
 *
 * Mobile-optimized card layout for suppliers list.
 */

import { memo, useCallback } from "react";
import { Star, Mail, Phone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusCell, DateCell } from "@/components/shared/data-table";
import { cn } from "@/lib/utils";
import type { SupplierTableItem } from "./supplier-columns";
import { SUPPLIER_STATUS_CONFIG, formatLeadTime } from "./supplier-status-config";

export interface SuppliersMobileCardsProps {
  /** Suppliers to display */
  suppliers: SupplierTableItem[];
  /** Set of selected supplier IDs */
  selectedIds: Set<string>;
  /** Handle selection toggle */
  onSelect: (id: string, checked: boolean) => void;
  /** View supplier handler */
  onViewSupplier: (id: string) => void;
  /** Additional className */
  className?: string;
}

/**
 * Compact rating display for mobile cards
 */
function MobileRating({ rating }: { rating: number | null }) {
  if (rating === null || rating === undefined) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 text-sm">
      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
      <span className="font-medium">{rating.toFixed(1)}</span>
    </div>
  );
}

/**
 * Mobile card layout for suppliers list.
 * Each card is tappable to view supplier details.
 */
export const SuppliersMobileCards = memo(function SuppliersMobileCards({
  suppliers,
  selectedIds,
  onViewSupplier,
  className,
}: SuppliersMobileCardsProps) {
  const handleCardClick = useCallback(
    (supplierId: string) => {
      onViewSupplier(supplierId);
    },
    [onViewSupplier]
  );

  const handleCardKeyDown = useCallback(
    (e: React.KeyboardEvent, supplierId: string) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onViewSupplier(supplierId);
      }
    },
    [onViewSupplier]
  );

  return (
    <div className={cn("space-y-3", className)}>
      {suppliers.map((supplier) => {
        const isSelected = selectedIds.has(supplier.id);

        return (
          <Card
            key={supplier.id}
            tabIndex={0}
            role="button"
            aria-label={`View supplier ${supplier.name}`}
            className={cn(
              "cursor-pointer hover:bg-muted/50 transition-colors",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isSelected && "bg-muted/50 ring-1 ring-primary"
            )}
            onClick={() => handleCardClick(supplier.id)}
            onKeyDown={(e) => handleCardKeyDown(e, supplier.id)}
          >
            <CardContent className="p-4">
              {/* Header row: Name + Status */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{supplier.name}</p>
                  {supplier.supplierCode && (
                    <p className="text-xs text-muted-foreground">
                      {supplier.supplierCode}
                    </p>
                  )}
                </div>
                <StatusCell
                  status={supplier.status}
                  statusConfig={SUPPLIER_STATUS_CONFIG}
                  showIcon
                  className="ml-2"
                />
              </div>

              {/* Contact info */}
              {(supplier.email || supplier.phone) && (
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-2">
                  {supplier.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      <span className="truncate max-w-[150px]">{supplier.email}</span>
                    </span>
                  )}
                  {supplier.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {supplier.phone}
                    </span>
                  )}
                </div>
              )}

              {/* Footer row: Rating + Orders + Lead Time + Last Order */}
              <div className="flex items-center justify-between flex-wrap gap-2 text-sm">
                <div className="flex items-center gap-4">
                  <MobileRating rating={supplier.overallRating} />
                  <span className="text-muted-foreground">
                    {supplier.totalPurchaseOrders ?? 0} orders
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{formatLeadTime(supplier.leadTimeDays)}</span>
                  {supplier.lastOrderDate && (
                    <>
                      <span>·</span>
                      <DateCell value={supplier.lastOrderDate} format="short" />
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
});

SuppliersMobileCards.displayName = "SuppliersMobileCards";
