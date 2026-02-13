/**
 * InventoryHistory Component
 *
 * Displays aggregated inventory movement history with running balance.
 * Movements are grouped by type + reference + date. Each row shows a
 * rolling counter from zero establishing the inventory position.
 *
 * @see WORKFLOW-CONTINUITY-STANDARDS.md - P3: Cross-Entity Navigation
 */
import { useState } from "react";
import { format } from "date-fns";
import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  ArrowDownRight,
  ArrowRightLeft,
  Package,
  Filter,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { useAggregatedProductMovements } from "@/hooks/products";
import type { MovementType, NavigationLink } from "@/lib/schemas/products";

interface InventoryHistoryProps {
  productId: string;
}

// Movement type configuration
const movementTypeConfig: Record<MovementType, {
  label: string;
  icon: typeof ArrowUpRight;
  variant: "default" | "secondary" | "destructive" | "outline";
}> = {
  receive: { label: "Received", icon: ArrowDownRight, variant: "default" },
  allocate: { label: "Allocated", icon: Package, variant: "secondary" },
  deallocate: { label: "Deallocated", icon: Package, variant: "outline" },
  pick: { label: "Picked", icon: ArrowUpRight, variant: "secondary" },
  ship: { label: "Shipped", icon: ArrowUpRight, variant: "destructive" },
  adjust: { label: "Adjusted", icon: ArrowRightLeft, variant: "outline" },
  return: { label: "Returned", icon: ArrowDownRight, variant: "default" },
  transfer: { label: "Transferred", icon: ArrowRightLeft, variant: "outline" },
};

// Map reference types to routes (P3: Cross-Entity Navigation)
function getReferenceLink(
  referenceType: string | null,
  referenceId: string | null
): NavigationLink | null {
  if (!referenceType || !referenceId) return null;

  switch (referenceType) {
    case "order":
      return {
        to: "/orders/$orderId",
        params: { orderId: referenceId },
        label: "Order",
      };
    case "purchase_order":
      return {
        to: "/purchase-orders/$poId",
        params: { poId: referenceId },
        label: "Purchase Order",
      };
    default:
      return null;
  }
}

// Friendly reference type labels (for non-linkable types)
function formatReferenceType(type: string | null): string {
  if (!type) return "";
  const labels: Record<string, string> = {
    order: "Order",
    purchase_order: "Purchase Order",
    transfer: "Transfer",
    reconciliation: "Reconciliation",
    shipment: "Shipment",
  };
  return labels[type] ?? type;
}

export function InventoryHistory({ productId }: InventoryHistoryProps) {
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [typeFilter, setTypeFilter] = useState<MovementType | "all">("all");

  const { data, isLoading, refetch } = useAggregatedProductMovements({
    productId,
    movementType: typeFilter === "all" ? undefined : typeFilter,
    limit,
    page,
  });

  const movements = data?.movements ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  // Format quantity change with sign
  const formatQuantityChange = (quantity: number) => {
    if (quantity > 0) {
      return <span className="text-green-600 font-mono">+{quantity}</span>;
    } else if (quantity < 0) {
      return <span className="text-red-600 font-mono">{quantity}</span>;
    }
    return <span className="text-muted-foreground font-mono">0</span>;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Movement History</CardTitle>
          <CardDescription>
            Inventory ledger with running balance from zero
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={typeFilter}
            onValueChange={(value) => {
              setTypeFilter(value as MovementType | "all"); // Select component value is validated
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[150px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.entries(movementTypeConfig).map(([type, config]) => (
                <SelectItem key={type} value={type}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && movements.length === 0 ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : movements.length === 0 ? (
          <EmptyState
            title="No movement history"
            message="Stock movements will appear here as inventory changes"
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Records</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((movement, idx) => {
                  const config = movementTypeConfig[movement.movementType];
                  const Icon = config?.icon ?? ArrowRightLeft;
                  const link = getReferenceLink(movement.referenceType, movement.referenceId);

                  return (
                    <TableRow key={`${movement.movementType}-${movement.referenceId ?? 'none'}-${movement.movementDate}-${idx}`}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {movement.movementDate
                          ? format(new Date(movement.movementDate), "MMM d, yyyy")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={config?.variant ?? "outline"} className="gap-1">
                          <Icon className="h-3 w-3" />
                          {config?.label ?? movement.movementType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {link ? (
                          <Link
                            to={link.to}
                            params={link.params}
                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            {link.label}
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        ) : movement.referenceType ? (
                          <span className="text-sm text-muted-foreground">
                            {formatReferenceType(movement.referenceType)}
                          </span>
                        ) : movement.notes ? (
                          <span className="text-xs text-muted-foreground truncate max-w-[200px] block">
                            {movement.notes}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatQuantityChange(movement.totalQuantity)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-mono text-sm font-medium">
                          {movement.runningBalance}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {movement.movementCount > 1 ? (
                          <Badge variant="outline" className="text-xs font-mono">
                            {movement.movementCount}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">1</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {(page - 1) * limit + 1}-{Math.min(page * limit, total)} of {total} groups
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
