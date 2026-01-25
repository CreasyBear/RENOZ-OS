/**
 * ProductInventoryTab Component
 *
 * Displays inventory levels, locations, and movement history for a product.
 * Integrates with inventory server functions for real data.
 */
import { useState, useEffect, useCallback } from "react";
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
import {
  getProductInventory,
  getInventoryStats,
  getLowStockAlerts,
} from "@/lib/server/functions/product-inventory";

interface ProductInventoryTabProps {
  productId: string;
  trackInventory: boolean;
  isSerialized: boolean;
}

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

export function ProductInventoryTab({
  productId,
  trackInventory,
  isSerialized,
}: ProductInventoryTabProps) {
  const [inventorySummary, setInventorySummary] = useState<ProductInventorySummary | null>(null);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string | undefined>();
  const [isLowStock, setIsLowStock] = useState(false);

  // Load inventory data
  const loadInventory = useCallback(async () => {
    setIsLoading(true);
    try {
      const [summary, inventoryStats, lowStockAlerts] = await Promise.all([
        getProductInventory({ data: { productId } }),
        getInventoryStats({ data: { productId } }),
        getLowStockAlerts({ data: { reorderPoint: 10, criticalThreshold: 5 } }),
      ]);
      setInventorySummary(summary);
      setStats(inventoryStats);
      setIsLowStock(lowStockAlerts.some((alert) => alert.productId === productId));
    } catch (error) {
      console.error("Failed to load inventory:", error);
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    if (trackInventory) {
      loadInventory();
    }
  }, [trackInventory, loadInventory]);

  // Handle add stock at specific location
  const handleAddStock = (locationId?: string) => {
    setSelectedLocationId(locationId);
    setShowAdjustment(true);
  };

  if (!trackInventory) {
    return (
      <Card>
        <CardContent className="pt-6">
          <EmptyState
            title="Inventory tracking disabled"
            message="This product does not track inventory levels. Enable inventory tracking in product settings to manage stock."
            primaryAction={{
              label: "Enable Tracking",
              onClick: () => {},
            }}
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

  // Format currency
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(value);

  return (
    <div className="space-y-6">
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

      {/* Stock by location */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Warehouse className="h-5 w-5" />
              Stock by Location
            </CardTitle>
            <CardDescription>
              Inventory levels at each warehouse location
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => handleAddStock()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Stock
          </Button>
        </CardHeader>
        <CardContent>
          {!summary || summary.locations.length === 0 ? (
            <EmptyState
              title="No stock records"
              message="Add initial stock quantities for this product"
              primaryAction={{
                label: "Add Stock",
                onClick: () => handleAddStock(),
              }}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">On Hand</TableHead>
                  <TableHead className="text-right">Allocated</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.locations.map((loc) => (
                  <TableRow key={loc.locationId}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium">
                          {loc.locationCode}
                        </span>
                        <span className="text-muted-foreground">{loc.locationName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {loc.quantityOnHand}
                    </TableCell>
                    <TableCell className="text-right font-mono text-amber-600">
                      {loc.quantityAllocated}
                    </TableCell>
                    <TableCell className="text-right font-mono text-green-600">
                      {loc.quantityAvailable}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAddStock(loc.locationId)}
                      >
                        Adjust
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
            <Button size="sm" variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Add Serial
            </Button>
          </CardHeader>
          <CardContent>
            <EmptyState
              title="No serial numbers"
              message="This product is serialized. Add serial numbers to track individual items."
              primaryAction={{
                label: "Add Serial Number",
                onClick: () => {},
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Movement history */}
      <InventoryHistory productId={productId} />

      {/* Stock adjustment dialog */}
      <StockAdjustment
        productId={productId}
        productName={summary?.name ?? "Product"}
        currentStock={totalOnHand}
        open={showAdjustment}
        onOpenChange={setShowAdjustment}
        onAdjusted={loadInventory}
        defaultLocationId={selectedLocationId}
      />
    </div>
  );
}
