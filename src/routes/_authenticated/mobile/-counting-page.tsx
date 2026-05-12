/**
 * Mobile Counting Page
 *
 * Extracted for code-splitting - see counting.tsx for route definition.
 */
import { useState, useCallback, memo, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Package,
  MapPin,
  Check,
  AlertTriangle,
  ClipboardList,
  Eye,
  EyeOff,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast, useOnlineStatus, useOfflineQueue } from "@/hooks";
import { logger } from "@/lib/logger";
import {
  useCreateStockCount,
  useInventory,
  useLocations,
  useStartStockCount,
  useUpdateStockCountItem,
} from "@/hooks/inventory";
import {
  BarcodeScanner,
  QuantityInput,
  OfflineIndicator,
  MobilePageHeader,
} from "@/components/mobile/inventory-actions";
import { formatMobileWarehouseActionError } from "./mobile-warehouse-action-errors";

interface CountItem {
  countItemId: string;
  inventoryId: string;
  productId: string;
  productName: string;
  productSku: string;
  expectedQty: number;
  countedQty: number | null;
  variance: number | null;
  status: "pending" | "counted" | "variance";
}

interface CountSession {
  id: string;
  stockCountId: string;
  locationId: string;
  locationCode: string;
  locationName: string;
  items: CountItem[];
  status: "pending" | "in_progress" | "completed";
  startedAt: Date | null;
  completedAt: Date | null;
}

interface PendingCount {
  id?: string;
  countId?: string;
  countItemId?: string;
  inventoryId: string;
  countedQty: number;
  timestamp: Date;
}

interface CountItemRowProps {
  item: CountItem;
  index: number;
  isActive: boolean;
  onSelect: (index: number) => void;
}

const CountItemRow = memo(function CountItemRow({
  item,
  index,
  isActive,
  onSelect,
}: CountItemRowProps) {
  return (
    <button
      onClick={() => item.status === "pending" && onSelect(index)}
      disabled={item.status !== "pending"}
      className={cn(
        "w-full flex items-center justify-between p-3 rounded-lg transition-colors",
        "touch-action-manipulation",
        isActive
          ? "bg-primary/10 border-2 border-primary"
          : item.status === "counted"
            ? "bg-green-50"
            : item.status === "variance"
              ? "bg-orange-50"
              : "bg-background border",
        item.status !== "pending" && "cursor-default"
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold",
            item.status === "counted"
              ? "bg-green-500 text-white"
              : item.status === "variance"
                ? "bg-orange-500 text-white"
                : "bg-muted"
          )}
        >
          {item.status === "counted" || item.status === "variance" ? (
            <Check className="h-4 w-4" />
          ) : (
            index + 1
          )}
        </div>
        <div className="text-left">
          <div className="font-medium truncate max-w-[200px]">
            {item.productName}
          </div>
          <div className="text-sm text-muted-foreground">
            {item.productSku}
            {item.variance !== null && item.variance !== 0 && (
              <span
                className={cn(
                  "ml-2 font-medium",
                  item.variance > 0 ? "text-green-600" : "text-red-600"
                )}
              >
                ({item.variance > 0 ? "+" : ""}
                {item.variance})
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
});

interface LocationButtonProps {
  location: { id: string; name: string; code: string };
  onSelect: (id: string) => void;
  disabled?: boolean;
}

const LocationButton = memo(function LocationButton({
  location,
  onSelect,
  disabled,
}: LocationButtonProps) {
  return (
    <button
      onClick={() => onSelect(location.id)}
      disabled={disabled}
      className={cn(
        "w-full flex items-center gap-3 p-4 rounded-lg transition-colors",
        "bg-background border hover:bg-muted",
        "touch-action-manipulation",
        disabled && "opacity-60 cursor-not-allowed"
      )}
    >
      <MapPin className="h-6 w-6 text-muted-foreground" />
      <div className="text-left flex-1">
        <div className="font-medium">{location.name}</div>
        <div className="text-sm text-muted-foreground">
          {location.code}
        </div>
      </div>
    </button>
  );
});

export default function MobileCountingPage() {
  const navigate = useNavigate();
  const [countSession, setCountSession] = useState<CountSession | null>(null);
  const [pendingLocationId, setPendingLocationId] = useState<string | null>(null);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [countedQuantity, setCountedQuantity] = useState(0);
  const [isBlindCount, setIsBlindCount] = useState(true);
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const {
    addToQueue,
    syncQueue,
    isSyncing,
    queueLength,
  } = useOfflineQueue<PendingCount>("mobile-counting-queue");
  const isOnline = useOnlineStatus();

  const { locations: locationsData, isLoading: isLocationsLoading, fetchLocations: refetchLocations } = useLocations({
    autoFetch: true,
  });
  const createCountMutation = useCreateStockCount();
  const startCountMutation = useStartStockCount();
  const updateCountItemMutation = useUpdateStockCountItem();
  const {
    data: preflightInventoryData,
    error: preflightInventoryError,
    isLoading: isInventoryPreflightLoading,
  } = useInventory({
    locationId: pendingLocationId ?? undefined,
    page: 1,
    pageSize: 1,
    enabled: !!pendingLocationId && !countSession,
  });

  const locations = (locationsData ?? []).map((l: { id: string; name: string; code?: string | null }) => ({
    id: l.id,
    name: l.name,
    code: l.code ?? "",
  }));

  const currentItem = countSession?.items[currentItemIndex];
  const completedCount = countSession?.items.filter((i) => i.status !== "pending").length ?? 0;
  const progress = countSession ? (completedCount / countSession.items.length) * 100 : 0;

  const startAuditableSession = useCallback(
    async (locationId: string) => {
      const location = locations.find((l) => l.id === locationId);
      if (!location) return;

      try {
        setIsStartingSession(true);
        const countCode = `MOB-${Date.now().toString(36).toUpperCase()}`.slice(0, 20);
        const created = await createCountMutation.mutateAsync({
          countCode,
          countType: "cycle",
          locationId,
          notes: `Mobile cycle count for ${location.code || location.name}`,
          metadata: { source: "mobile_counting" },
        });
        const started = await startCountMutation.mutateAsync(created.count.id);
        const items: CountItem[] = started.items
          .map((item) => ({
            countItemId: item.id,
            inventoryId: item.inventoryId,
            productId: item.inventory?.productId ?? "",
            productName: item.product?.name ?? "Unknown",
            productSku: item.product?.sku ?? "",
            expectedQty: item.expectedQuantity ?? 0,
            countedQty: null,
            variance: null,
            status: "pending" as const,
          }))
          .filter((item) => item.countItemId && item.inventoryId);

        if (items.length === 0) {
          toast.warning("No items at this location");
          return;
        }

        setCountSession({
          id: `count-${Date.now()}`,
          stockCountId: created.count.id,
          locationId,
          locationCode: location.code,
          locationName: location.name,
          items,
          status: "in_progress",
          startedAt: new Date(),
          completedAt: null,
        });
        setCurrentItemIndex(0);
        setCountedQuantity(0);
        setScannedBarcode(null);
        setIsVerified(false);
      } catch (error: unknown) {
        logger.error("Failed to start mobile count", error);
        toast.error(formatMobileWarehouseActionError(error, "startCount"));
      } finally {
        setIsStartingSession(false);
      }
    },
    [createCountMutation, locations, startCountMutation]
  );

  const handleStartSession = useCallback(
    (locationId: string) => {
      if (!isOnline) {
        toast.error("Connect before starting a count", {
          description: "Mobile counts create an auditable stock-count sheet before quantities are recorded.",
        });
        return;
      }
      setPendingLocationId(locationId);
    },
    [isOnline]
  );

  useEffect(() => {
    if (!pendingLocationId || isInventoryPreflightLoading) return;

    if (preflightInventoryError) {
      setPendingLocationId(null);
      toast.error(formatMobileWarehouseActionError(preflightInventoryError, "startCount"));
      return;
    }

    if (!preflightInventoryData) return;

    const hasInventory = (preflightInventoryData.items ?? []).length > 0;
    const locationId = pendingLocationId;
    setPendingLocationId(null);

    if (!hasInventory) {
      toast.warning("No items at this location");
      return;
    }

    void startAuditableSession(locationId);
  }, [
    isInventoryPreflightLoading,
    pendingLocationId,
    preflightInventoryData,
    preflightInventoryError,
    startAuditableSession,
  ]);

  const handleScan = useCallback(
    (barcode: string) => {
      setScannedBarcode(barcode);
      if (
        barcode.toLowerCase() === currentItem?.productSku.toLowerCase() ||
        barcode === currentItem?.productId
      ) {
        setIsVerified(true);
        toast.success("Product verified");
      } else {
        setIsVerified(false);
        toast.error("Wrong product", {
          description: `Expected: ${currentItem?.productSku}`,
        });
      }
    },
    [currentItem]
  );

  const handleSubmitCountClick = useCallback(() => {
    if (!countSession || !currentItem || !isVerified) return;
    setShowConfirmDialog(true);
  }, [countSession, currentItem, isVerified]);

  const handleConfirmedCount = useCallback(async () => {
    setShowConfirmDialog(false);
    if (!countSession || !currentItem || !isVerified) return;
    const variance = countedQuantity - currentItem.expectedQty;
    try {
      setIsSubmitting(true);
      if (isOnline) {
        await updateCountItemMutation.mutateAsync({
          countId: countSession.stockCountId,
          itemId: currentItem.countItemId,
          data: { countedQuantity },
        });
      } else {
        addToQueue({
          countId: countSession.stockCountId,
          countItemId: currentItem.countItemId,
          inventoryId: currentItem.inventoryId,
          countedQty: countedQuantity,
          timestamp: new Date(),
        });
      }
      const newItems = [...countSession.items];
      newItems[currentItemIndex] = {
        ...currentItem,
        countedQty: countedQuantity,
        variance,
        status: variance !== 0 ? "variance" : "counted",
      };
      const allCounted = newItems.every((i) => i.status !== "pending");
      setCountSession({
        ...countSession,
        items: newItems,
        status: allCounted ? "completed" : "in_progress",
        completedAt: allCounted ? new Date() : null,
      });
      if (variance !== 0) {
        toast.warning(`Variance: ${variance > 0 ? "+" : ""}${variance}`, {
          description: `Expected: ${currentItem.expectedQty}, Counted: ${countedQuantity}`,
        });
      } else {
        toast.success("Count matches expected");
      }
      const nextPending = newItems.findIndex(
        (i, idx) => idx > currentItemIndex && i.status === "pending"
      );
      if (nextPending !== -1) {
        setCurrentItemIndex(nextPending);
        setCountedQuantity(0);
        setScannedBarcode(null);
        setIsVerified(false);
      } else {
        const firstPending = newItems.findIndex((i) => i.status === "pending");
        if (firstPending !== -1) {
          setCurrentItemIndex(firstPending);
          setCountedQuantity(0);
          setScannedBarcode(null);
          setIsVerified(false);
        } else if (allCounted) {
          toast.success(isOnline ? "Counts saved for review" : "Counts queued for sync");
        }
      }
    } catch (error: unknown) {
      logger.error("Failed to submit count", error);
      toast.error(formatMobileWarehouseActionError(error, "submitCount"));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    addToQueue,
    countSession,
    countedQuantity,
    currentItem,
    currentItemIndex,
    isOnline,
    isVerified,
    updateCountItemMutation,
  ]);

  const handleSync = useCallback(async () => {
    const result = await syncQueue(async (item) => {
      if (!item.countId || !item.countItemId) {
        throw new Error("Legacy queue item missing count binding - cannot sync");
      }
      await updateCountItemMutation.mutateAsync({
        countId: item.countId,
        itemId: item.countItemId,
        data: { countedQuantity: item.countedQty },
      });
    });
    if (result.failed === 0) {
      toast.success(`Synced ${result.success} counts`);
    } else {
      toast.warning(`Synced ${result.success} counts, ${result.failed} failed`);
    }
  }, [syncQueue, updateCountItemMutation]);

  const handleNewSession = useCallback(() => {
    setCountSession(null);
    setCurrentItemIndex(0);
    setCountedQuantity(0);
    setScannedBarcode(null);
    setIsVerified(false);
  }, []);

  const isLoading = isLocationsLoading || isInventoryPreflightLoading || isStartingSession;

  return (
    <div className="min-h-dvh bg-muted/30">
      <MobilePageHeader
        title="Cycle Count"
        subtitle={
          countSession
            ? `${countSession.locationCode} - ${countSession.locationName}`
            : "Select a location to count"
        }
        onBack={() =>
          countSession
            ? handleNewSession()
            : navigate({ to: "/mobile" })
        }
      />
      <div className="p-4 space-y-4">
        <OfflineIndicator
          isOnline={isOnline}
          pendingActions={queueLength}
          onSync={handleSync}
          isSyncing={isSyncing}
        />
        {!countSession && (
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-4">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold">Select Location to Count</h2>
                </div>
                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : locations.length === 0 ? (
                  <div className="text-center py-12">
                    <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold text-lg mb-2">No locations configured</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      Warehouse locations need to be set up before counting.
                    </p>
                    <Button variant="outline" onClick={() => refetchLocations()}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {locations.map((loc) => (
                      <LocationButton
                        key={loc.id}
                        location={loc}
                        onSelect={handleStartSession}
                        disabled={isStartingSession}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
        {countSession && (
          <>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Progress</span>
                  <span className="text-sm text-muted-foreground">
                    {completedCount} / {countSession.items.length} items
                  </span>
                </div>
                <Progress value={progress} className="h-3" />
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    {isBlindCount ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                    <Label htmlFor="blind-count" className="text-sm">
                      Blind Count
                    </Label>
                  </div>
                  <Switch
                    id="blind-count"
                    checked={isBlindCount}
                    onCheckedChange={setIsBlindCount}
                  />
                </div>
              </CardContent>
            </Card>
            {countSession.status === "completed" ? (
              <Card className="border-green-500 bg-green-50">
                <CardContent className="pt-6 pb-6 text-center">
                  <Check className="h-12 w-12 text-green-600 mx-auto mb-3" />
                  <h2 className="text-xl font-bold text-green-800">
                    Counts Saved
                  </h2>
                  <p className="text-green-700 mt-1">
                    {countSession.items.length} items counted
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-white/50 rounded p-2">
                      <div className="font-bold text-green-800">
                        {countSession.items.filter((i) => i.status === "counted").length}
                      </div>
                      <div className="text-green-600">Match</div>
                    </div>
                    <div className="bg-white/50 rounded p-2">
                      <div className="font-bold text-orange-800">
                        {countSession.items.filter((i) => i.status === "variance").length}
                      </div>
                      <div className="text-orange-600">Variance</div>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <Button
                      variant="outline"
                      onClick={handleNewSession}
                      className="flex-1 h-14 text-lg"
                    >
                      New Count
                    </Button>
                    <Button
                      onClick={() => navigate({ to: "/mobile" })}
                      className="flex-1 h-14 text-lg"
                    >
                      Done
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : currentItem ? (
              <>
                <Card>
                  <CardContent className="pt-4 space-y-4">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {currentItem.productName}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="font-mono">
                          {currentItem.productSku}
                        </Badge>
                        {!isBlindCount && (
                          <Badge variant="secondary">
                            Expected: {currentItem.expectedQty}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="barcode-scanner-counting" className="text-sm font-medium flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Scan to Verify
                      </label>
                      <BarcodeScanner
                        id="barcode-scanner-counting"
                        onScan={handleScan}
                        placeholder="Scan product barcode"
                        autoFocus={true}
                      />
                      {scannedBarcode && (
                        <div
                          className={cn(
                            "flex items-center gap-2 p-2 rounded",
                            isVerified
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          )}
                        >
                          {isVerified ? (
                            <Check className="h-5 w-5" />
                          ) : (
                            <AlertTriangle className="h-5 w-5" />
                          )}
                          <span className="font-mono text-sm">{scannedBarcode}</span>
                        </div>
                      )}
                    </div>
                    {isVerified && (
                      <div className="space-y-2">
                        <label htmlFor="count-input" className="text-sm font-medium">
                          Enter Count
                        </label>
                        <QuantityInput
                          id="count-input"
                          value={countedQuantity}
                          onChange={setCountedQuantity}
                          min={0}
                        />
                      </div>
                    )}
                    <div className="pt-2">
                      <Button
                        onClick={handleSubmitCountClick}
                        disabled={!isVerified || isSubmitting}
                        className="w-full h-14 text-lg"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                            Submit Count
                          </>
                        ) : (
                          <>
                            <Check className="h-5 w-5 mr-2" />
                            Submit Count
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Items ({countSession.items.length})
                  </h4>
                  {countSession.items.map((item, idx) => (
                    <CountItemRow
                      key={item.countItemId}
                      item={item}
                      index={idx}
                      isActive={idx === currentItemIndex}
                      onSelect={setCurrentItemIndex}
                    />
                  ))}
                </div>
              </>
            ) : null}
          </>
        )}
      </div>
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Count</AlertDialogTitle>
            <AlertDialogDescription>
              Submit count of {countedQuantity} for {currentItem?.productName}?
              {currentItem && countedQuantity !== currentItem.expectedQty && (
                <>
                  <br />
                  <span className="font-semibold text-orange-600">
                    Variance: {countedQuantity - currentItem.expectedQty > 0 ? '+' : ''}{countedQuantity - currentItem.expectedQty}
                  </span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmedCount}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
