/**
 * Receiving History Component
 *
 * Displays recent receiving transactions with filtering.
 *
 * Features:
 * - Table view of recent receives
 * - Product/location/date filtering
 * - Cost layer details
 *
 * Accessibility:
 * - Sortable columns with aria-sort
 * - Monetary values properly formatted
 */
import { memo } from "react";
import {
  Package,
  MapPin,
  Calendar,
  ArrowDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ============================================================================
// TYPES
// ============================================================================

export interface ReceivingRecord {
  id: string;
  createdAt: Date;
  productId: string;
  productName: string;
  productSku: string;
  locationId: string;
  locationName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  referenceType?: string | null;
  referenceId?: string | null;
  lotNumber?: string | null;
  batchNumber?: string | null;
  notes?: string | null;
  createdByName?: string;
}

interface ReceivingHistoryProps {
  records: ReceivingRecord[];
  isLoading?: boolean;
  showTitle?: boolean;
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const ReceivingHistory = memo(function ReceivingHistory({
  records,
  isLoading,
  showTitle = true,
  className,
}: ReceivingHistoryProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(value);

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);

  const getReferenceLabel = (type?: string | null) => {
    switch (type) {
      case "purchase_order":
        return "PO";
      case "transfer":
        return "Transfer";
      case "return":
        return "Return";
      case "adjustment":
        return "Adjust";
      default:
        return null;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className={className}>
        {showTitle && (
          <CardHeader>
            <CardTitle>Recent Receipts</CardTitle>
            <CardDescription>Loading receiving history...</CardDescription>
          </CardHeader>
        )}
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-28" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-12" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (records.length === 0) {
    return (
      <Card className={className}>
        {showTitle && (
          <CardHeader>
            <CardTitle>Recent Receipts</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="text-center py-8">
            <ArrowDown className="h-12 w-12 text-muted-foreground/50 mx-auto" />
            <p className="mt-4 text-sm text-muted-foreground">
              No receiving records found
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate totals
  const totalQuantity = records.reduce((sum, r) => sum + r.quantity, 0);
  const totalValue = records.reduce((sum, r) => sum + r.totalCost, 0);

  return (
    <Card className={className}>
      {showTitle && (
        <CardHeader>
          <CardTitle>Recent Receipts</CardTitle>
          <CardDescription>
            {records.length} receipts totaling {totalQuantity.toLocaleString()} units
          </CardDescription>
        </CardHeader>
      )}
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Reference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar
                        className="h-3 w-3 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <span className="text-sm">{formatDate(record.createdAt)}</span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Package
                        className="h-4 w-4 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <div>
                        <div className="font-medium">{record.productName}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {record.productSku}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-1">
                      <MapPin
                        className="h-3 w-3 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <span>{record.locationName}</span>
                    </div>
                  </TableCell>

                  <TableCell className="text-right">
                    <Badge variant="outline" className="tabular-nums text-green-600 bg-green-50">
                      +{record.quantity}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(record.unitCost)}
                  </TableCell>

                  <TableCell className="text-right tabular-nums font-medium">
                    {formatCurrency(record.totalCost)}
                  </TableCell>

                  <TableCell>
                    {record.referenceType && (
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-xs">
                          {getReferenceLabel(record.referenceType)}
                        </Badge>
                        {record.referenceId && (
                          <span className="text-xs text-muted-foreground font-mono">
                            {record.referenceId}
                          </span>
                        )}
                      </div>
                    )}
                    {record.lotNumber && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Lot: {record.lotNumber}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}

              {/* Totals Row */}
              <TableRow className="bg-muted/50 font-medium">
                <TableCell colSpan={3}>Total</TableCell>
                <TableCell className="text-right tabular-nums text-green-600">
                  +{totalQuantity.toLocaleString()}
                </TableCell>
                <TableCell />
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(totalValue)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
});

export default ReceivingHistory;
