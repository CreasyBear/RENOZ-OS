/**
 * Location Detail Component
 *
 * Shows detailed information about a warehouse location including
 * contents, utilization, and recent activity.
 *
 * Accessibility:
 * - Progress bars have aria-labels
 * - Data tables use proper headers
 * - Empty states provide clear next actions
 */
import { memo } from "react";
import {
  Warehouse,
  LayoutGrid,
  Rows3,
  Layers,
  Box,
  Package,
  MapPin,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useOrgFormat } from "@/hooks/use-org-format";
import type { LocationType, WarehouseLocation } from "./location-tree";

// ============================================================================
// TYPES
// ============================================================================

export interface LocationContents {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  quantityOnHand: number;
  quantityAllocated: number;
  quantityAvailable: number;
  unitCost: number;
  totalValue: number;
}

interface LocationDetailProps {
  location: WarehouseLocation | null;
  contents?: LocationContents[];
  metrics?: {
    itemCount: number;
    totalQuantity: number;
    totalValue: number;
  };
  isLoading?: boolean;
  isLoadingContents?: boolean;
  className?: string;
  onItemClick?: (item: LocationContents) => void;
}

// ============================================================================
// LOCATION TYPE CONFIG
// ============================================================================

const LOCATION_TYPE_CONFIG: Record<
  LocationType,
  { label: string; icon: typeof Warehouse; color: string }
> = {
  warehouse: { label: "Warehouse", icon: Warehouse, color: "text-blue-600" },
  zone: { label: "Zone", icon: LayoutGrid, color: "text-purple-600" },
  aisle: { label: "Aisle", icon: Rows3, color: "text-green-600" },
  rack: { label: "Rack", icon: Layers, color: "text-orange-600" },
  shelf: { label: "Shelf", icon: Box, color: "text-cyan-600" },
  bin: { label: "Bin", icon: Package, color: "text-gray-600" },
};

// ============================================================================
// COMPONENT
// ============================================================================

export const LocationDetail = memo(function LocationDetail({
  location,
  contents = [],
  metrics,
  isLoading,
  isLoadingContents,
  className,
  onItemClick,
}: LocationDetailProps) {
  // Loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // No selection state
  if (!location) {
    return (
      <Card className={cn("flex flex-col items-center justify-center py-12", className)}>
        <MapPin className="h-12 w-12 text-muted-foreground/50" />
        <p className="mt-4 text-sm text-muted-foreground">
          Select a location to view details
        </p>
      </Card>
    );
  }

  const config = LOCATION_TYPE_CONFIG[location.locationType];
  const Icon = config.icon;
  const utilizationPercent =
    location.capacity && location.utilization !== undefined
      ? location.utilization
      : null;

  const { formatCurrency } = useOrgFormat();
  const formatCurrencyDisplay = (value: number) =>
    formatCurrency(value, { cents: false, showCents: true });

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Icon className={cn("h-5 w-5", config.color)} aria-hidden="true" />
              {location.name}
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="font-mono">
                {location.locationCode}
              </Badge>
              <span>{config.label}</span>
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            {location.isActive ? (
              <Badge variant="outline" className="text-green-600 bg-green-50">
                <CheckCircle className="h-3 w-3 mr-1" aria-hidden="true" />
                Active
              </Badge>
            ) : (
              <Badge variant="outline" className="text-red-600 bg-red-50">
                <XCircle className="h-3 w-3 mr-1" aria-hidden="true" />
                Inactive
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Utilization */}
        {location.capacity && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Capacity Utilization</span>
              <span className="text-sm tabular-nums">
                {metrics?.totalQuantity ?? 0} / {location.capacity} items
              </span>
            </div>
            <Progress
              value={utilizationPercent ?? 0}
              className="h-3"
              aria-label={`${utilizationPercent ?? 0}% capacity utilized`}
            />
            {utilizationPercent !== null && utilizationPercent >= 90 && (
              <p className="flex items-center gap-1 text-xs text-orange-600 mt-1">
                <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                Near capacity - consider redistribution
              </p>
            )}
          </div>
        )}

        <Separator />

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold tabular-nums">
              {metrics?.itemCount ?? 0}
            </div>
            <div className="text-xs text-muted-foreground">SKUs</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold tabular-nums">
              {metrics?.totalQuantity ?? 0}
            </div>
            <div className="text-xs text-muted-foreground">Total Qty</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold tabular-nums">
              {formatCurrencyDisplay(metrics?.totalValue ?? 0)}
            </div>
            <div className="text-xs text-muted-foreground">Value</div>
          </div>
        </div>

        {/* Properties */}
        <div className="flex flex-wrap gap-2">
          <Badge variant={location.isPickable ? "default" : "secondary"}>
            {location.isPickable ? "Pickable" : "Not Pickable"}
          </Badge>
          <Badge variant={location.isReceivable ? "default" : "secondary"}>
            {location.isReceivable ? "Receivable" : "Not Receivable"}
          </Badge>
        </div>

        <Separator />

        {/* Contents Table */}
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Package className="h-4 w-4" aria-hidden="true" />
            Contents
          </h4>

          {isLoadingContents ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : contents.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
              No inventory in this location
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">On Hand</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contents.map((item) => (
                    <TableRow
                      key={item.id}
                      className={cn(onItemClick && "cursor-pointer hover:bg-accent")}
                      onClick={() => onItemClick?.(item)}
                    >
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.productName}</div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {item.productSku}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {item.quantityOnHand}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span
                          className={cn(
                            item.quantityAvailable < item.quantityOnHand &&
                              "text-orange-600"
                          )}
                        >
                          {item.quantityAvailable}
                        </span>
                        {item.quantityAllocated > 0 && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({item.quantityAllocated} alloc)
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrencyDisplay(item.totalValue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

export default LocationDetail;
