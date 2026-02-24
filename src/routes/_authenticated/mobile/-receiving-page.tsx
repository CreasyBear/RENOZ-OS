/**
 * Mobile Receiving Page
 *
 * Extracted for code-splitting - see receiving.tsx for route definition.
 */
import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Package, MapPin, AlertTriangle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast, useOnlineStatus, useOfflineQueue } from "@/hooks";
import { logger } from "@/lib/logger";
import {
  BarcodeScanner,
  QuantityInput,
  OfflineIndicator,
  MobileInventoryCard,
  MobilePageHeader,
  type ScannedItem,
} from "@/components/mobile/inventory-actions";
import { useLocations, useReceiveInventory } from "@/hooks/inventory";
import { useProductSearch } from "@/hooks/products";
import type { ProductSearchResult } from "@/lib/schemas/products";

interface ReceiveEntry {
  id?: string;
  product: ScannedItem;
  quantity: number;
  unitCost: number;
  locationId: string;
  serialNumber?: string;
}

export default function MobileReceivingPage() {
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const [scannedItem, setScannedItem] = useState<ScannedItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [unitCost, setUnitCost] = useState(0);
  const [serialNumber, setSerialNumber] = useState("");
  const [locationId, setLocationId] = useState("");
  const [barcodeSearch, setBarcodeSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const { locations: locationsData, isLoading: isLoadingLocations } = useLocations({
    autoFetch: true,
  });
  const { data: productSearchData } = useProductSearch(
    barcodeSearch,
    { limit: 1 },
    barcodeSearch.length >= 2
  );
  const receiveMutation = useReceiveInventory();
  const {
    queue: pendingItems,
    addToQueue,
    syncQueue,
    isSyncing,
    queueLength,
  } = useOfflineQueue<ReceiveEntry>("mobile-receiving-queue");

  const locations = locationsData.map((l: { id: string; name: string; code?: string | null }) => ({
    id: l.id,
    name: l.name,
    code: l.code ?? "",
  }));

  const handleScan = useCallback((barcode: string) => {
    setBarcodeSearch(barcode);
  }, []);

  const searchResult = productSearchData as ProductSearchResult | undefined;
  useEffect(() => {
    if (searchResult?.products?.length && barcodeSearch && !scannedItem) {
      const product = searchResult.products[0];
      setScannedItem({
        barcode: barcodeSearch,
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        isSerialized: !!product.isSerialized,
      });
      setUnitCost(Number(product.basePrice ?? product.costPrice ?? 0));
      setQuantity(1);
      setSerialNumber("");
      setBarcodeSearch("");
      toast.success(`Found: ${product.name}`);
    } else if (barcodeSearch && searchResult?.products?.length === 0) {
      toast.error("Product not found", {
        description: `No product with barcode/SKU: ${barcodeSearch}`,
      });
      setBarcodeSearch("");
    }
  }, [searchResult, barcodeSearch, scannedItem]);

  const handleAddToPending = useCallback(() => {
    if (!scannedItem?.productId) {
      toast.error("Please scan a product first");
      return;
    }
    if (!locationId) {
      toast.error("Please select a location");
      return;
    }
    if (scannedItem.isSerialized) {
      if (quantity !== 1) {
        toast.error("Serialized products must be received one unit per serial");
        return;
      }
      if (!serialNumber.trim()) {
        toast.error("Serial number is required for serialized products");
        return;
      }
    }
    addToQueue({
      product: scannedItem,
      quantity,
      unitCost,
      locationId,
      serialNumber: serialNumber.trim() || undefined,
    });
    setScannedItem(null);
    setQuantity(1);
    setUnitCost(0);
    setSerialNumber("");
    toast.success("Added to queue", {
      description: `${quantity} x ${scannedItem.productName}`,
    });
  }, [scannedItem, quantity, unitCost, locationId, addToQueue, serialNumber]);

  const handleReceiveNowClick = useCallback(() => {
    if (!scannedItem?.productId) {
      toast.error("Please scan a product first");
      return;
    }
    if (!locationId) {
      toast.error("Please select a location");
      return;
    }
    if (scannedItem.isSerialized) {
      if (quantity !== 1) {
        toast.error("Serialized products must be received one unit per serial");
        return;
      }
      if (!serialNumber.trim()) {
        toast.error("Serial number is required for serialized products");
        return;
      }
    }
    setShowConfirmDialog(true);
  }, [scannedItem, locationId, quantity, serialNumber]);

  const handleConfirmedReceive = useCallback(async () => {
    setShowConfirmDialog(false);
    if (!scannedItem?.productId || !locationId) return;
    try {
      setIsSubmitting(true);
      await receiveMutation.mutateAsync({
        productId: scannedItem.productId,
        locationId,
        quantity,
        unitCost,
        serialNumber: serialNumber.trim() || undefined,
      });
      toast.success("Inventory received", {
        description: `${quantity} x ${scannedItem.productName}`,
      });
      setScannedItem(null);
      setQuantity(1);
      setUnitCost(0);
      setSerialNumber("");
    } catch (error: unknown) {
      logger.error("Failed to receive", error);
      toast.error(error instanceof Error ? error.message : "Failed to receive inventory");
    } finally {
      setIsSubmitting(false);
    }
  }, [scannedItem, quantity, unitCost, locationId, receiveMutation, serialNumber]);

  const handleSync = useCallback(async () => {
    const result = await syncQueue(async (item) => {
      await receiveMutation.mutateAsync({
        productId: item.product.productId!,
        locationId: item.locationId,
        quantity: item.quantity,
        unitCost: item.unitCost,
        serialNumber: item.serialNumber,
      });
    });
    if (result.failed === 0) {
      toast.success(`Synced ${result.success} items`);
    } else {
      toast.warning(`Synced ${result.success} items, ${result.failed} failed`);
    }
  }, [syncQueue, receiveMutation]);

  return (
    <div className="min-h-dvh bg-muted/30">
      <MobilePageHeader
        title="Receive Inventory"
        subtitle={scannedItem ? `Receiving: ${scannedItem.productName}` : "Scan a product barcode"}
        onBack={() => navigate({ to: "/mobile" })}
      />
      <div className="p-4 space-y-4">
        <OfflineIndicator
          isOnline={isOnline}
          pendingActions={queueLength}
          onSync={handleSync}
          isSyncing={isSyncing}
        />
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
        {!scannedItem && queueLength === 0 && (
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
        {scannedItem && (
          <MobileInventoryCard
            item={scannedItem}
            onCancel={() => {
              setScannedItem(null);
              setSerialNumber("");
            }}
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="location-select" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  Location
                </Label>
                {isLoadingLocations ? (
                  <Skeleton className="h-[44px] w-full" />
                ) : locations.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    No locations configured. Please set up warehouse locations first.
                  </div>
                ) : (
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
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity-input" className="flex items-center gap-2">
                  <Package className="h-4 w-4" aria-hidden="true" />
                  Quantity
                </Label>
                <QuantityInput
                  id="quantity-input"
                  value={quantity}
                  onChange={setQuantity}
                  min={1}
                  max={scannedItem.isSerialized ? 1 : undefined}
                  disabled={scannedItem.isSerialized}
                />
              </div>
              {scannedItem.isSerialized && (
                <div className="space-y-2">
                  <Label htmlFor="serial-input">Serial Number</Label>
                  <Input
                    id="serial-input"
                    value={serialNumber}
                    onChange={(event) => setSerialNumber(event.target.value)}
                    placeholder="Scan or enter serial number"
                    className="min-h-[44px] text-base font-mono"
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground">
                    Serialized products require one unit per serial number.
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="unit-cost-input">Unit Cost ($)</Label>
                <Input
                  id="unit-cost-input"
                  type="number"
                  value={unitCost}
                  onChange={(e) => setUnitCost(Number(e.target.value))}
                  min={0}
                  step={0.01}
                  className="min-h-[44px] text-base tabular-nums"
                  inputMode="decimal"
                />
              </div>
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="font-medium">Total Value</span>
                <span className="text-xl font-bold tabular-nums">
                  ${(quantity * unitCost).toFixed(2)}
                </span>
              </div>
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
                      onClick={handleReceiveNowClick}
                      disabled={!locationId || isSubmitting}
                      className="flex-1 h-14 text-lg"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Receive Now
                        </>
                      ) : (
                        "Receive Now"
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </MobileInventoryCard>
        )}
        {queueLength > 0 && !scannedItem && (
          <div className="space-y-3">
            <h2 className="font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Pending Items ({queueLength})
            </h2>
            {pendingItems.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{item.product.productName}</div>
                    <div className="text-sm text-muted-foreground">
                      {item.quantity} x ${item.unitCost.toFixed(2)}
                    </div>
                    {item.serialNumber ? (
                      <div className="text-xs font-mono text-muted-foreground">
                        SN: {item.serialNumber}
                      </div>
                    ) : null}
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
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Receive</AlertDialogTitle>
            <AlertDialogDescription>
              Receive {quantity} x {scannedItem?.productName} at ${unitCost.toFixed(2)} each?
              {scannedItem?.isSerialized && serialNumber.trim() ? (
                <>
                  <br />
                  <span className="font-mono">Serial: {serialNumber.trim()}</span>
                </>
              ) : null}
              <br />
              <span className="font-semibold">Total: ${(quantity * unitCost).toFixed(2)}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmedReceive}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
