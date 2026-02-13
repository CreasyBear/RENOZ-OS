/**
 * Order Association Card Component
 *
 * Displays order association info for inventory items linked to orders.
 * Shows order number, customer name, status, and provides a link to the order.
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md (Zone 5A: Main Content)
 */
import { memo } from 'react';
import { Link } from '@tanstack/react-router';
import { format } from 'date-fns';
import { ShoppingCart, User, ExternalLink, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface OrderAssociation {
  orderId: string;
  orderNumber: string;
  customerName?: string;
  status: string;
  orderDate?: Date | string;
}

export interface OrderAssociationCardProps {
  /** Order association data derived from movements */
  order: OrderAssociation | null | undefined;
  className?: string;
}

// ============================================================================
// ORDER STATUS CONFIG
// ============================================================================

const ORDER_STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  processing: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  shipped: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  delivered: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

// ============================================================================
// COMPONENT
// ============================================================================

export const OrderAssociationCard = memo(function OrderAssociationCard({
  order,
  className,
}: OrderAssociationCardProps) {
  if (!order) {
    return null;
  }

  const statusStyle = ORDER_STATUS_STYLES[order.status.toLowerCase()] || ORDER_STATUS_STYLES.pending;
  const formattedDate = order.orderDate
    ? format(new Date(order.orderDate), 'MMM d, yyyy')
    : null;

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" aria-hidden="true" />
            Order Association
          </CardTitle>
          <Link to="/orders/$orderId" params={{ orderId: order.orderId }}>
            <Button variant="outline" size="sm">
              View Order
              <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Order Number and Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono font-semibold text-lg">{order.orderNumber}</span>
            <Badge className={cn('text-xs', statusStyle)}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </Badge>
          </div>
        </div>

        {/* Customer and Date */}
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          {order.customerName && (
            <div className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{order.customerName}</span>
            </div>
          )}
          {formattedDate && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{formattedDate}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

export default OrderAssociationCard;
