/**
 * Purchase Orders Mobile Cards Component
 *
 * Mobile-optimized card layout for purchase orders list.
 */

import { memo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusCell, PriceCell, DateCell } from "@/components/shared/data-table";
import { cn } from "@/lib/utils";
import type { PurchaseOrderTableData } from "@/lib/schemas/purchase-orders";
import { PO_STATUS_CONFIG } from "./po-status-config";
import { FALLBACK_SUPPLIER_NAME } from "@/lib/constants/procurement";

export interface POMobileCardsProps {
  /** Purchase orders to display */
  orders: PurchaseOrderTableData[];
  /** View PO handler */
  onViewPO: (id: string) => void;
  /** Additional className */
  className?: string;
}

/**
 * Mobile card layout for purchase orders list.
 * Each card is tappable to view PO details.
 */
export const POMobileCards = memo(function POMobileCards({
  orders,
  onViewPO,
  className,
}: POMobileCardsProps) {
  const handleCardClick = useCallback(
    (poId: string) => {
      onViewPO(poId);
    },
    [onViewPO]
  );

  const handleCardKeyDown = useCallback(
    (e: React.KeyboardEvent, poId: string) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onViewPO(poId);
      }
    },
    [onViewPO]
  );

  return (
    <div className={cn("space-y-3", className)}>
      {orders.map((po) => (
        <Card
          key={po.id}
          tabIndex={0}
          role="button"
          aria-label={`View purchase order ${po.poNumber}`}
          className={cn(
            "cursor-pointer hover:bg-muted/50 transition-colors",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          )}
          onClick={() => handleCardClick(po.id)}
          onKeyDown={(e) => handleCardKeyDown(e, po.id)}
        >
          <CardContent className="p-4">
            {/* Header row: PO # + Status */}
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-medium">{po.poNumber}</p>
                <p className="text-sm text-muted-foreground truncate max-w-[180px]">
                  {po.supplierName ?? FALLBACK_SUPPLIER_NAME}
                </p>
              </div>
              <StatusCell
                status={po.status}
                statusConfig={PO_STATUS_CONFIG}
                showIcon
              />
            </div>

            {/* Footer row: Dates + Total */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-3 text-muted-foreground">
                <span className="flex items-center gap-1">
                  Ordered: <DateCell value={po.orderDate} format="short" />
                </span>
                {po.requiredDate && (
                  <span className="flex items-center gap-1">
                    Due: <DateCell value={po.requiredDate} format="short" />
                  </span>
                )}
              </div>
              <PriceCell value={po.totalAmount} currency={po.currency} className="font-semibold" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
});

POMobileCards.displayName = "POMobileCards";
