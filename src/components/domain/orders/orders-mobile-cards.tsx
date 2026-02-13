/**
 * Orders Mobile Cards Component
 *
 * Mobile-optimized card layout for orders list.
 */

import { memo, useCallback } from "react";
import { ShoppingCart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusCell, PriceCell, DateCell } from "@/components/shared/data-table";
import { cn } from "@/lib/utils";
import type { OrderTableItem } from "@/lib/schemas/orders";
import { ORDER_STATUS_CONFIG, formatDueDateRelative } from "./order-status-config";

export interface OrdersMobileCardsProps {
  /** Orders to display */
  orders: OrderTableItem[];
  /** Set of selected order IDs */
  selectedIds: Set<string>;
  /** Handle selection toggle */
  onSelect: (id: string, checked: boolean) => void;
  /** View order handler */
  onViewOrder: (id: string) => void;
  /** Additional className */
  className?: string;
}

/**
 * Mobile card layout for orders list.
 * Each card is tappable to view order details.
 */
export const OrdersMobileCards = memo(function OrdersMobileCards({
  orders,
  selectedIds,
  onViewOrder,
  className,
}: OrdersMobileCardsProps) {
  const handleCardClick = useCallback(
    (orderId: string) => {
      onViewOrder(orderId);
    },
    [onViewOrder]
  );

  const handleCardKeyDown = useCallback(
    (e: React.KeyboardEvent, orderId: string) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onViewOrder(orderId);
      }
    },
    [onViewOrder]
  );

  return (
    <div className={cn("space-y-3", className)}>
      {orders.map((order) => {
        const isSelected = selectedIds.has(order.id);
        const { text: dueText, isOverdue } = formatDueDateRelative(order.dueDate);

        return (
          <Card
            key={order.id}
            tabIndex={0}
            role="button"
            aria-label={`View order ${order.orderNumber}`}
            className={cn(
              "cursor-pointer hover:bg-muted/50 transition-colors",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isSelected && "bg-muted/50 ring-1 ring-primary"
            )}
            onClick={() => handleCardClick(order.id)}
            onKeyDown={(e) => handleCardKeyDown(e, order.id)}
          >
            <CardContent className="p-4">
              {/* Header row: Order # + Date + Status */}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium">{order.orderNumber}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <DateCell value={order.orderDate} format="short" />
                    {order.dueDate && (
                      <span
                        className={cn(
                          "text-xs",
                          isOverdue && "text-destructive font-medium"
                        )}
                      >
                        · Due {dueText}
                      </span>
                    )}
                  </div>
                </div>
                <StatusCell
                  status={order.status}
                  statusConfig={ORDER_STATUS_CONFIG}
                  showIcon
                />
              </div>

              {/* Footer row: Customer + Items + Total */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground truncate max-w-[140px]">
                  {order.customer?.name ?? order.customerId.slice(0, 8)}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <ShoppingCart className="h-3 w-3" />
                    {order.itemCount ?? 0}
                  </span>
                  <PriceCell value={order.total} className="font-semibold" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
});

OrdersMobileCards.displayName = "OrdersMobileCards";
