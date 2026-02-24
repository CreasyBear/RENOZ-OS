/**
 * ProductInventoryTab View (Presenter)
 *
 * Pure presentation component for inventory tab.
 * Receives all data via props per Container/Presenter pattern.
 *
 * @see STANDARDS.md - Container/Presenter pattern
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Plus,
  AlertTriangle,
  Package,
  ArrowRightLeft,
  TrendingUp,
  TrendingDown,
  Warehouse,
  ChevronDown,
  Layers,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { StockAdjustment } from "../inventory/stock-adjustment";
import { InventoryHistory } from "../inventory/inventory-history";
import { Link } from "@tanstack/react-router";
import { format } from "date-fns";

// ============================================================================
// TYPES
// ============================================================================

interface ProductInventorySummary {
  productId: string;
  sku: string;
  name: string;
  totalOnHand: number;
  totalAllocated: number;
  totalAvailable: number;
  totalValue: number;
  locationCount: number;
  locations: Array<{
    locationId: string;
    locationCode: string;
    locationName: string;
    quantityOnHand: number;
    quantityAllocated: number;
    quantityAvailable: number;
  }>;
}

interface InventoryStats {
  totalOnHand: number;
  totalAllocated: number;
  totalAvailable: number;
  totalValue: number;
  locationCount: number;
  avgUnitCost: number;
  last30Days: {
    movementCount: number;
    totalIn: number;
    totalOut: number;
  };
}

interface LowStockAlert {
  productId: string;
  sku: string;
  name: string;
  locationId: string;
  locationCode: string;
  locationName: string;
  quantityAvailable: number;
  reorderPoint: number;
  status: "critical" | "warning";
}

interface CostLayerItem {
  id: string;
  receivedAt: Date | string | null;
  quantityReceived: number;
  quantityRemaining: number;
  unitCost: number;
  referenceType: string | null;
  referenceId: string | null;
}

interface CostLayersData {
  layers: CostLayerItem[];
  summary: {
    totalLayers: number;
    activeLayers: number;
    totalRemaining: number;
    totalValue: number;
    weightedAvgCost: number;
    lastPurchaseCost: number;
  };
}

export interface ProductInventoryTabViewProps {
  productId: string;
  trackInventory: boolean;
  isSerialized: boolean;
  inventorySummary: ProductInventorySummary | null | undefined;
  stats: InventoryStats | null | undefined;
  lowStockAlerts: LowStockAlert[] | null | undefined;
  isLowStock: boolean;
  costLayersData: CostLayersData | null | undefined;
  isLoading: boolean;
  showAdjustment: boolean;
  selectedLocationId: string | undefined;
  onShowAdjustmentChange: (open: boolean) => void;
  onAddStock: (locationId?: string) => void;
  onRefresh: () => void;
  onEnableTracking?: () => void;
  onAddSerial?: () => void;
}

// ============================================================================
// PRESENTER
// ============================================================================

export function ProductInventoryTabView({
  productId,
  trackInventory,
  isSerialized,
  inventorySummary,
  stats,
  isLowStock,
  costLayersData,
  isLoading,
  showAdjustment,
  selectedLocationId,
  onShowAdjustmentChange,
  onAddStock,
  onRefresh,
  onEnableTracking,
  onAddSerial,
}: ProductInventoryTabViewProps) {
  // Format currency
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(value);

  if (!trackInventory) {
    return (
      <Card>
        <CardContent className="pt-6">
          <EmptyState
            title="Inventory tracking disabled"
            message="This product does not track inventory levels. Enable inventory tracking in product settings to manage stock."
            primaryAction={
              onEnableTracking
                ? {
                    label: "Enable Tracking",
                    onClick: onEnableTracking,
                  }
                : undefined
            }
          />
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const summary = inventorySummary;
  const totalOnHand = summary?.totalOnHand ?? 0;
  const totalAllocated = summary?.totalAllocated ?? 0;
  const totalAvailable = summary?.totalAvailable ?? 0;
  const locationCount = summary?.locationCount ?? 0;

  return (
    <div className="space-y-4">
      {/* Low stock alert */}
      {isLowStock && (
        <div className="p-3 rounded-lg border border-amber-200 bg-amber-50">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-800">
              Low stock warning - consider reordering
            </span>
          </div>
        </div>
      )}

      {/* Stock summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Package className="h-4 w-4" />
              Total Stock
            </CardDescription>
            <CardTitle className="text-2xl">{totalOnHand}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">
              {locationCount} Location{locationCount !== 1 ? "s" : ""}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Available</CardDescription>
            <CardTitle className="text-2xl text-green-600">{totalAvailable}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="default">Ready to sell</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Allocated</CardDescription>
            <CardTitle className="text-2xl text-amber-600">{totalAllocated}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">Reserved for orders</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Value</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(summary?.totalValue ?? 0)}</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-xs text-muted-foreground">
              Avg cost: {formatCurrency(stats?.avgUnitCost ?? 0)}/unit
            </span>
          </CardContent>
        </Card>
      </div>

      {/* 30-day activity summary */}
      {stats && stats.last30Days.movementCount > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Last 30 Days Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-sm">
                  <strong>{stats.last30Days.totalIn}</strong> received
                </span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-600" />
                <span className="text-sm">
                  <strong>{stats.last30Days.totalOut}</strong> shipped
                </span>
              </div>
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4 text-blue-600" />
                <span className="text-sm">
                  <strong>{stats.last30Days.movementCount}</strong> movements
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stock actions — compact for single-warehouse setups */}
      {!summary || summary.locations.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              title="No stock records"
              message="Add initial stock quantities for this product"
              primaryAction={{
                label: "Add Stock",
                onClick: () => onAddStock(),
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="flex items-center justify-between rounded-lg border px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Warehouse className="h-4 w-4" />
            <span className="font-medium text-foreground">
              {summary.locations[0]?.locationName ?? "Warehouse"}
            </span>
            {summary.locations.length > 1 && (
              <Badge variant="outline" className="text-[10px]">
                +{summary.locations.length - 1} more
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAddStock(summary.locations[0]?.locationId)}
            >
              Adjust Stock
            </Button>
            <Button size="sm" onClick={() => onAddStock()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Stock
            </Button>
          </div>
        </div>
      )}

      {/* Serial numbers (if serialized) */}
      {isSerialized && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Serial Numbers</CardTitle>
              <CardDescription>
                Track individual items by serial number
              </CardDescription>
            </div>
            {onAddSerial && (
              <Button
                size="sm"
                variant="outline"
                onClick={onAddSerial}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Serial
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <EmptyState
              title="No serial numbers"
              message="This product is serialized. Add serial numbers to track individual items."
              primaryAction={
                onAddSerial
                  ? {
                      label: "Add Serial Number",
                      onClick: onAddSerial,
                    }
                  : undefined
              }
            />
          </CardContent>
        </Card>
      )}

      {/* Cost Layers (FIFO) — active layers shown, consumed aggregated */}
      {costLayersData && costLayersData.layers.length > 0 && (
        <CostLayersCard costLayersData={costLayersData} formatCurrency={formatCurrency} />
      )}

      {/* Movement history */}
      <InventoryHistory productId={productId} />

      {/* Stock adjustment dialog */}
      <StockAdjustment
        productId={productId}
        productName={summary?.name ?? "Product"}
        currentStock={totalOnHand}
        open={showAdjustment}
        onOpenChange={onShowAdjustmentChange}
        onAdjusted={onRefresh}
        defaultLocationId={selectedLocationId}
      />
    </div>
  );
}

// ============================================================================
// COST LAYERS CARD — aggregated view
// ============================================================================

interface CostLayersCardProps {
  costLayersData: CostLayersData;
  formatCurrency: (value: number) => string;
}

/** Group key: date (day) + unitCost + referenceType + referenceId */
function groupKey(layer: CostLayerItem): string {
  const day = layer.receivedAt
    ? format(new Date(layer.receivedAt), "yyyy-MM-dd")
    : "none";
  const cost = layer.unitCost.toFixed(2);
  const ref = `${layer.referenceType ?? "manual"}:${layer.referenceId ?? ""}`;
  return `${day}|${cost}|${ref}`;
}

interface AggregatedRow {
  key: string;
  date: string | null;
  referenceType: string | null;
  referenceId: string | null;
  unitCost: number;
  totalReceived: number;
  totalRemaining: number;
  layerCount: number;
}

function aggregateLayers(layers: CostLayerItem[]): AggregatedRow[] {
  const map = new Map<string, AggregatedRow>();
  for (const layer of layers) {
    const k = groupKey(layer);
    const existing = map.get(k);
    if (existing) {
      existing.totalReceived += layer.quantityReceived;
      existing.totalRemaining += layer.quantityRemaining;
      existing.layerCount += 1;
    } else {
      map.set(k, {
        key: k,
        date: layer.receivedAt instanceof Date ? layer.receivedAt.toISOString() : (layer.receivedAt ?? null),
        referenceType: layer.referenceType,
        referenceId: layer.referenceId,
        unitCost: layer.unitCost,
        totalReceived: layer.quantityReceived,
        totalRemaining: layer.quantityRemaining,
        layerCount: 1,
      });
    }
  }
  return Array.from(map.values());
}

function CostLayersCard({ costLayersData, formatCurrency }: CostLayersCardProps) {
  const [showConsumed, setShowConsumed] = useState(false);

  const activeLayers = costLayersData.layers.filter((l) => l.quantityRemaining > 0);
  const consumedLayers = costLayersData.layers.filter((l) => l.quantityRemaining === 0);

  // Aggregate both active and consumed into compact rows
  const activeRows = aggregateLayers(activeLayers);
  const consumedRows = aggregateLayers(consumedLayers);

  const consumedTotals = consumedLayers.length > 0
    ? {
        count: consumedLayers.length,
        totalReceived: consumedLayers.reduce((s, l) => s + l.quantityReceived, 0),
        totalCost: consumedLayers.reduce((s, l) => s + l.quantityReceived * l.unitCost, 0),
      }
    : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Cost Layers (FIFO)
            </CardTitle>
            <CardDescription>
              Landed cost breakdown from purchase receipts
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Weighted Avg Cost</div>
            <div className="text-lg font-semibold tabular-nums">
              {formatCurrency(costLayersData.summary.weightedAvgCost)}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 mb-4 text-xs text-muted-foreground">
          <span>{costLayersData.summary.totalRemaining} units remaining</span>
          <span>Value: {formatCurrency(costLayersData.summary.totalValue)}</span>
          {costLayersData.summary.lastPurchaseCost > 0 && (
            <span>Last: {formatCurrency(costLayersData.summary.lastPurchaseCost)}/unit</span>
          )}
          {consumedLayers.length > 0 && (
            <span>{consumedLayers.length} fully consumed</span>
          )}
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead className="text-right">Qty Received</TableHead>
              <TableHead className="text-right">Qty Remaining</TableHead>
              <TableHead className="text-right">Unit Cost</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Active layers — aggregated by date + cost + reference */}
            {activeRows.map((row) => (
              <TableRow key={row.key}>
                <TableCell className="text-sm">
                  {row.date ? format(new Date(row.date), "PP") : "---"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <CostLayerReference referenceType={row.referenceType} referenceId={row.referenceId} />
                    {row.layerCount > 1 && (
                      <span className="text-[10px] text-muted-foreground">
                        ({row.layerCount} layers)
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.totalReceived}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  <span className={row.totalRemaining < row.totalReceived ? "text-amber-600" : ""}>
                    {row.totalRemaining}
                  </span>
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {formatCurrency(row.unitCost)}
                </TableCell>
              </TableRow>
            ))}

            {/* Consumed layers — single summary row, expandable */}
            {consumedTotals && !showConsumed && (
              <TableRow className="opacity-60">
                <TableCell colSpan={2}>
                  <button
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                    onClick={() => setShowConsumed(true)}
                  >
                    <ChevronDown className="h-3 w-3" />
                    {consumedTotals.count} consumed layers
                  </button>
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {consumedTotals.totalReceived}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  0
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {formatCurrency(consumedTotals.totalReceived > 0
                    ? consumedTotals.totalCost / consumedTotals.totalReceived
                    : 0)}
                </TableCell>
              </TableRow>
            )}

            {/* Consumed layers — expanded (also aggregated) */}
            {showConsumed && consumedRows.map((row) => (
              <TableRow key={row.key} className="opacity-50">
                <TableCell className="text-sm">
                  {row.date ? format(new Date(row.date), "PP") : "---"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <CostLayerReference referenceType={row.referenceType} referenceId={row.referenceId} />
                    {row.layerCount > 1 && (
                      <span className="text-[10px] text-muted-foreground">
                        ({row.layerCount} layers)
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.totalReceived}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  0
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {formatCurrency(row.unitCost)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {showConsumed && consumedRows.length > 0 && (
          <button
            className="mt-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={() => setShowConsumed(false)}
          >
            Collapse consumed layers
          </button>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// COST LAYER REFERENCE BADGE
// ============================================================================

function CostLayerReference({ referenceType, referenceId }: { referenceType: string | null; referenceId: string | null }) {
  if (referenceType === "purchase_order" && referenceId) {
    return (
      <Link
        to="/purchase-orders/$poId"
        params={{ poId: referenceId }}
        className="inline-flex"
      >
        <Badge variant="outline" className="text-[10px] hover:bg-muted cursor-pointer">
          Purchase Order
        </Badge>
      </Link>
    );
  }

  return (
    <Badge variant="outline" className="text-[10px]">
      {referenceType === "adjustment"
        ? "Adjustment"
        : referenceType ?? "Manual"}
    </Badge>
  );
}
