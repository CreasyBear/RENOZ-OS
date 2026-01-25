/**
 * InventoryHistory Component
 *
 * Displays inventory movement history with filtering.
 */
import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import {
  ArrowUpRight,
  ArrowDownRight,
  ArrowRightLeft,
  Package,
  Filter,
  RefreshCw,
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
import { getProductMovements } from "@/lib/server/functions/product-inventory";

interface InventoryHistoryProps {
  productId: string;
}

type MovementType =
  | "receive"
  | "allocate"
  | "deallocate"
  | "pick"
  | "ship"
  | "adjust"
  | "return"
  | "transfer";

interface Movement {
  id: string;
  movementType: MovementType;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  unitCost: number;
  totalCost: number;
  referenceType: string | null;
  referenceId: string | null;
  metadata: Record<string, unknown>;
  notes: string | null;
  createdAt: Date;
  createdBy: string | null;
  product: {
    id: string;
    sku: string;
    name: string;
  };
  location: {
    id: string;
    code: string;
    name: string;
  };
}

// Movement type configuration
const movementTypeConfig: Record<MovementType, {
  label: string;
  icon: typeof ArrowUpRight;
  variant: "default" | "secondary" | "destructive" | "outline";
  direction: "in" | "out" | "neutral";
}> = {
  receive: {
    label: "Received",
    icon: ArrowDownRight,
    variant: "default",
    direction: "in",
  },
  allocate: {
    label: "Allocated",
    icon: Package,
    variant: "secondary",
    direction: "out",
  },
  deallocate: {
    label: "Deallocated",
    icon: Package,
    variant: "outline",
    direction: "in",
  },
  pick: {
    label: "Picked",
    icon: ArrowUpRight,
    variant: "secondary",
    direction: "out",
  },
  ship: {
    label: "Shipped",
    icon: ArrowUpRight,
    variant: "destructive",
    direction: "out",
  },
  adjust: {
    label: "Adjusted",
    icon: ArrowRightLeft,
    variant: "outline",
    direction: "neutral",
  },
  return: {
    label: "Returned",
    icon: ArrowDownRight,
    variant: "default",
    direction: "in",
  },
  transfer: {
    label: "Transferred",
    icon: ArrowRightLeft,
    variant: "outline",
    direction: "neutral",
  },
};

export function InventoryHistory({ productId }: InventoryHistoryProps) {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [typeFilter, setTypeFilter] = useState<MovementType | "all">("all");

  // Load movements
  const loadMovements = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = (await getProductMovements({
        data: {
          productId,
          page,
          limit,
          movementType: typeFilter === "all" ? undefined : typeFilter,
        },
      })) as { movements: Movement[]; total: number };
      setMovements(result.movements);
      setTotal(result.total);
    } catch (error) {
      console.error("Failed to load movements:", error);
    } finally {
      setIsLoading(false);
    }
  }, [productId, page, limit, typeFilter]);

  useEffect(() => {
    loadMovements();
  }, [loadMovements]);

  const totalPages = Math.ceil(total / limit);

  // Format quantity change with sign
  const formatQuantityChange = (quantity: number) => {
    if (quantity > 0) {
      return <span className="text-green-600">+{quantity}</span>;
    } else if (quantity < 0) {
      return <span className="text-red-600">{quantity}</span>;
    }
    return <span className="text-muted-foreground">0</span>;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Movement History</CardTitle>
          <CardDescription>
            Recent inventory adjustments and transfers
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={typeFilter}
            onValueChange={(value) => {
              setTypeFilter(value as MovementType | "all");
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
            onClick={loadMovements}
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
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                  <TableHead className="text-right">New Qty</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((movement) => {
                  const config = movementTypeConfig[movement.movementType];
                  const Icon = config?.icon ?? ArrowRightLeft;

                  return (
                    <TableRow key={movement.id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(movement.createdAt), "MMM d, yyyy h:mm a")}
                      </TableCell>
                      <TableCell>
                        <Badge variant={config?.variant ?? "outline"} className="gap-1">
                          <Icon className="h-3 w-3" />
                          {config?.label ?? movement.movementType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs">
                          {movement.location.code}
                        </span>
                        <span className="text-muted-foreground ml-1">
                          {movement.location.name}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatQuantityChange(movement.quantity)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {movement.newQuantity}
                      </TableCell>
                      <TableCell>
                        {movement.referenceType ? (
                          <Badge variant="outline" className="text-xs">
                            {movement.referenceType}
                          </Badge>
                        ) : movement.notes ? (
                          <span className="text-xs text-muted-foreground truncate max-w-[150px] block">
                            {movement.notes}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
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
                  Showing {(page - 1) * limit + 1}-{Math.min(page * limit, total)} of {total}
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
