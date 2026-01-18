/**
 * Mobile Receiving Route
 *
 * Mobile-optimized goods receiving for warehouse handheld devices.
 *
 * Features:
 * - Barcode scanning for product lookup
 * - Touch-optimized quantity entry
 * - Offline capability with sync
 * - Location assignment
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useCallback, useEffect } from "react";
import { Package, MapPin, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  BarcodeScanner,
  QuantityInput,
  OfflineIndicator,
  MobileInventoryCard,
  MobilePageHeader,
  type ScannedItem,
} from "@/components/mobile/inventory-actions";
import { receiveInventory } from "@/server/functions/inventory";
import { listLocations } from "@/server/functions/locations";
import { listProducts } from "@/lib/server/functions/products";

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute("/_authenticated/mobile/receiving" as any)({
  component: MobileReceivingPage,
});

// ============================================================================
// TYPES
// ============================================================================

interface ReceiveEntry {
  product: ScannedItem;
  quantity: number;
  unitCost: number;
  locationId: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function MobileReceivingPage() {
  const navigate = useNavigate();

  // State
  const [scannedItem, setScannedItem] = useState<ScannedItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [unitCost, setUnitCost] = useState(0);
  const [locationId, setLocationId] = useState("");
  const [locations, setLocations] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [pendingItems, setPendingItems] = useState<ReceiveEntry[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Track online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Load locations
  useEffect(() => {
    let cancelled = false;

    async function loadLocations() {
      try {
        const data = (await (listLocations as any)({
          data: { page: 1, pageSize: 100 },
        })) as any;
        if (!cancelled && data?.locations) {
          setLocations(
            data.locations.map((l: any) => ({
              id: l.id,
              name: l.name,
              code: l.locationCode ?? l.code ?? "",
            }))
          );
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load locations:", error);
          toast.error("Failed to load locations", {
            action: {
              label: "Retry",
              onClick: () => loadLocations(),
            },
          });
        }
      }
    }
    loadLocations();

    return () => {
      cancelled = true;
    };
  }, []);

  // Handle barcode scan
  const handleScan = useCallback(async (barcode: string) => {
    try {
      // Look up product by barcode/SKU
      const data = (await listProducts({
        data: { search: barcode, page: 1, pageSize: 1 },
      })) as any;

      if (data?.products?.length > 0) {
        const product = data.products[0];
        setScannedItem({
          barcode,
          productId: product.id,
          productName: product.name,
          productSku: product.sku,
        });
        setUnitCost(Number(product.basePrice ?? product.unitCost ?? 0));
        setQuantity(1);
        toast.success(`Found: ${product.name}`);
      } else {
        toast.error("Product not found", {
          description: `No product with barcode/SKU: ${barcode}`,
        });
      }
    } catch (error) {
      console.error("Failed to lookup product:", error);
      toast.error("Lookup failed");
    }
  }, []);

  // Add to pending items (offline queue)
  const handleAddToPending = useCallback(() => {
    if (!scannedItem?.productId) {
      toast.error("Please scan a product first");
      return;
    }
    if (!locationId) {
      toast.error("Please select a location");
      return;
    }

    const entry: ReceiveEntry = {
      product: scannedItem,
      quantity,
      unitCost,
      locationId,
    };

    setPendingItems((prev) => [...prev, entry]);
    setScannedItem(null);
    setQuantity(1);
    setUnitCost(0);
    toast.success("Added to queue", {
      description: `${quantity} x ${scannedItem.productName}`,
    });
  }, [scannedItem, quantity, unitCost, locationId]);

  // Submit single item immediately
  const handleReceiveNow = useCallback(async () => {
    if (!scannedItem?.productId) {
      toast.error("Please scan a product first");
      return;
    }
    if (!locationId) {
      toast.error("Please select a location");
      return;
    }

    try {
      setIsSubmitting(true);
      await receiveInventory({
        data: {
          productId: scannedItem.productId,
          locationId,
          quantity,
          unitCost,
        },
      });

      toast.success("Inventory received", {
        description: `${quantity} x ${scannedItem.productName}`,
      });
      setScannedItem(null);
      setQuantity(1);
      setUnitCost(0);
    } catch (error: any) {
      console.error("Failed to receive:", error);
      toast.error(error.message ?? "Failed to receive inventory");
    } finally {
      setIsSubmitting(false);
    }
  }, [scannedItem, quantity, unitCost, locationId]);

  // Sync pending items
  const handleSync = useCallback(async () => {
    if (pendingItems.length === 0) return;

    setIsSyncing(true);
    let successCount = 0;
    let failedItems: ReceiveEntry[] = [];

    for (const item of pendingItems) {
      try {
        await receiveInventory({
          data: {
            productId: item.product.productId!,
            locationId: item.locationId,
            quantity: item.quantity,
            unitCost: item.unitCost,
          },
        });
        successCount++;
      } catch (error) {
        console.error("Failed to sync item:", error);
        failedItems.push(item);
      }
    }

    setPendingItems(failedItems);
    setIsSyncing(false);

    if (failedItems.length === 0) {
      toast.success(`Synced ${successCount} items`);
    } else {
      toast.warning(`Synced ${successCount} items, ${failedItems.length} failed`);
    }
  }, [pendingItems]);

  return (
    <div className="min-h-screen bg-muted/30">
      <MobilePageHeader
        title="Receive Inventory"
        subtitle={scannedItem ? `Receiving: ${scannedItem.productName}` : "Scan a product barcode"}
        onBack={() => navigate({ to: "/mobile" as any })}
      />

      <div className="p-4 space-y-4">
        {/* Offline indicator */}
        <OfflineIndicator
          isOnline={isOnline}
          pendingActions={pendingItems.length}
          onSync={handleSync}
          isSyncing={isSyncing}
        />

        {/* Scanner */}
        {!scannedItem && (
          <Card>
            <CardContent className="pt-4">
              <BarcodeScanner
                onScan={handleScan}
                placeholder="Scan product barcode or enter SKU"
              />
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {!scannedItem && pendingItems.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Ready to Receive</h3>
              <p className="text-sm text-muted-foreground">
                Scan a product barcode or enter SKU to begin receiving inventory.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Scanned item entry form */}
        {scannedItem && (
          <MobileInventoryCard
            item={scannedItem}
            onCancel={() => setScannedItem(null)}
          >
            <div className="space-y-4">
              {/* Location selector */}
              <div className="space-y-2">
                <Label htmlFor="location-select" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  Location
                </Label>
                <Select value={locationId} onValueChange={setLocationId}>
                  <SelectTrigger id="location-select" className="min-h-[44px] text-base">
                    <SelectValue placeholder="Select location..." />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name} ({loc.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quantity */}
              <div className="space-y-2">
                <Label htmlFor="quantity-input" className="flex items-center gap-2">
                  <Package className="h-4 w-4" aria-hidden="true" />
                  Quantity
                </Label>
                <QuantityInput id="quantity-input" value={quantity} onChange={setQuantity} min={1} />
              </div>

              {/* Unit cost */}
              <div className="space-y-2">
                <Label>Unit Cost ($)</Label>
                <Input
                  type="number"
                  value={unitCost}
                  onChange={(e) => setUnitCost(Number(e.target.value))}
                  min={0}
                  step={0.01}
                  className="min-h-[44px] text-base tabular-nums"
                  inputMode="decimal"
                />
              </div>

              {/* Total */}
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="font-medium">Total Value</span>
                <span className="text-xl font-bold tabular-nums">
                  ${(quantity * unitCost).toFixed(2)}
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                {!isOnline ? (
                  <Button
                    onClick={handleAddToPending}
                    disabled={!locationId}
                    className="flex-1 h-14 text-lg"
                  >
                    Add to Queue
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleAddToPending}
                      disabled={!locationId}
                      className="flex-1 h-14 text-lg"
                    >
                      Queue
                    </Button>
                    <Button
                      onClick={handleReceiveNow}
                      disabled={!locationId || isSubmitting}
                      className="flex-1 h-14 text-lg"
                    >
                      {isSubmitting ? "Saving..." : "Receive Now"}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </MobileInventoryCard>
        )}

        {/* Pending items list */}
        {pendingItems.length > 0 && !scannedItem && (
          <div className="space-y-3">
            <h2 className="font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Pending Items ({pendingItems.length})
            </h2>
            {pendingItems.map((item, i) => (
              <Card key={i}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{item.product.productName}</div>
                    <div className="text-sm text-muted-foreground">
                      {item.quantity} x ${item.unitCost.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold tabular-nums">
                      ${(item.quantity * item.unitCost).toFixed(2)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MobileReceivingPage;
