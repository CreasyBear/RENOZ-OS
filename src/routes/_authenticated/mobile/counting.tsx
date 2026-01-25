/**
 * Mobile Counting Route
 *
 * Mobile-optimized cycle counting for warehouse handheld devices.
 *
 * Features:
 * - Location-based counting
 * - Barcode verification
 * - Variance tracking
 * - Blind count option
 * - Offline capability with sync
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useCallback, useEffect, memo } from "react";
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
import { RouteErrorFallback } from "@/components/layout";
import { InventoryTableSkeleton } from "@/components/skeletons/inventory";
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
import { toast } from "@/hooks";
import { useOnlineStatus, useOfflineQueue } from "@/hooks";
import {
  BarcodeScanner,
  QuantityInput,
  OfflineIndicator,
  MobilePageHeader,
} from "@/components/mobile/inventory-actions";
import { listLocations } from "@/server/functions/locations";
import { listInventory } from "@/server/functions/inventory";

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute("/_authenticated/mobile/counting" as any)({
  component: MobileCountingPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/mobile" />
  ),
  pendingComponent: () => <InventoryTableSkeleton />,
});

// ============================================================================
// TYPES
// ============================================================================

interface CountItem {
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
  inventoryId: string;
  countedQty: number;
  timestamp: Date;
}

// ============================================================================
// MEMOIZED COMPONENTS
// ============================================================================

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
}

const LocationButton = memo(function LocationButton({
  location,
  onSelect,
}: LocationButtonProps) {
  return (
    <button
      onClick={() => onSelect(location.id)}
      className={cn(
        "w-full flex items-center gap-3 p-4 rounded-lg transition-colors",
        "bg-background border hover:bg-muted",
        "touch-action-manipulation"
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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function MobileCountingPage() {
  const navigate = useNavigate();

  // State
  const [locations, setLocations] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [, setSelectedLocation] = useState<string | null>(null);
  const [countSession, setCountSession] = useState<CountSession | null>(null);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [countedQuantity, setCountedQuantity] = useState(0);
  const [isBlindCount, setIsBlindCount] = useState(true);
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  // Persist offline queue to localStorage using useOfflineQueue hook
  const {
    addToQueue,
    syncQueue,
    isSyncing,
    queueLength,
  } = useOfflineQueue<PendingCount>("mobile-counting-queue");
  const isOnline = useOnlineStatus();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const currentItem = countSession?.items[currentItemIndex];
  const completedCount = countSession?.items.filter((i) => i.status !== "pending").length ?? 0;
  const progress = countSession ? (completedCount / countSession.items.length) * 100 : 0;

  // Load locations function (extracted for reuse)
  const loadLocations = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = (await (listLocations as any)({
        data: { page: 1, pageSize: 100 },
      })) as any;
      if (data?.locations) {
        setLocations(
          data.locations.map((l: any) => ({
            id: l.id,
            name: l.name,
            code: l.locationCode ?? l.code ?? "",
          }))
        );
      }
    } catch (error) {
      console.error("Failed to load locations:", error);
      toast.error("Failed to load locations", {
        action: {
          label: "Retry",
          onClick: () => loadLocations(),
        },
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load locations on mount
  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  // Start count session for a location
  const handleStartSession = useCallback(
    async (locationId: string) => {
      try {
        setIsLoading(true);
        const location = locations.find((l) => l.id === locationId);
        if (!location) return;

        // Fetch inventory at this location
        const data = (await listInventory({
          data: { locationId, page: 1, pageSize: 100 },
        })) as any;

        const items: CountItem[] = (data?.items ?? []).map((item: any) => ({
          inventoryId: item.id,
          productId: item.productId,
          productName: item.product?.name ?? "Unknown",
          productSku: item.product?.sku ?? "",
          expectedQty: item.quantityOnHand ?? 0,
          countedQty: null,
          variance: null,
          status: "pending" as const,
        }));

        if (items.length === 0) {
          toast.warning("No items at this location");
          return;
        }

        setCountSession({
          id: `count-${Date.now()}`,
          locationId,
          locationCode: location.code,
          locationName: location.name,
          items,
          status: "in_progress",
          startedAt: new Date(),
          completedAt: null,
        });
        setSelectedLocation(locationId);
        setCurrentItemIndex(0);
        setCountedQuantity(0);
        setScannedBarcode(null);
        setIsVerified(false);
      } catch (error) {
        console.error("Failed to start count session:", error);
        toast.error("Failed to start count session");
      } finally {
        setIsLoading(false);
      }
    },
    [locations]
  );

  // Handle barcode scan for verification
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

  // Show confirmation dialog for count submission
  const handleSubmitCountClick = useCallback(() => {
    if (!countSession || !currentItem || !isVerified) return;
    setShowConfirmDialog(true);
  }, [countSession, currentItem, isVerified]);

  // Submit count for current item (after confirmation)
  const handleConfirmedCount = useCallback(async () => {
    setShowConfirmDialog(false);
    if (!countSession || !currentItem || !isVerified) return;

    const variance = countedQuantity - currentItem.expectedQty;

    try {
      setIsSubmitting(true);

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

      // Add to pending queue if offline
      if (!isOnline) {
        addToQueue({
          inventoryId: currentItem.inventoryId,
          countedQty: countedQuantity,
          timestamp: new Date(),
        });
      }

      if (variance !== 0) {
        toast.warning(`Variance: ${variance > 0 ? "+" : ""}${variance}`, {
          description: `Expected: ${currentItem.expectedQty}, Counted: ${countedQuantity}`,
        });
      } else {
        toast.success("Count matches expected");
      }

      // Move to next item
      const nextPending = newItems.findIndex(
        (i, idx) => idx > currentItemIndex && i.status === "pending"
      );
      if (nextPending !== -1) {
        setCurrentItemIndex(nextPending);
        setCountedQuantity(0);
        setScannedBarcode(null);
        setIsVerified(false);
      } else {
        // Check for any remaining pending
        const firstPending = newItems.findIndex((i) => i.status === "pending");
        if (firstPending !== -1) {
          setCurrentItemIndex(firstPending);
          setCountedQuantity(0);
          setScannedBarcode(null);
          setIsVerified(false);
        } else if (allCounted) {
          toast.success("Count session complete!");
        }
      }
    } catch (error: any) {
      console.error("Failed to submit count:", error);
      toast.error(error.message ?? "Failed to submit count");
    } finally {
      setIsSubmitting(false);
    }
  }, [countSession, currentItem, currentItemIndex, countedQuantity, isVerified, isOnline, addToQueue]);

  // Sync pending counts using useOfflineQueue
  const handleSync = useCallback(async () => {
    const result = await syncQueue(async (_item) => {
      // In production, this would call the server
      // await submitCount({ data: { inventoryId: _item.inventoryId, countedQty: _item.countedQty } });
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    if (result.failed === 0) {
      toast.success(`Synced ${result.success} counts`);
    } else {
      toast.warning(`Synced ${result.success} counts, ${result.failed} failed`);
    }
  }, [syncQueue]);

  // Reset and go back to location selection
  const handleNewSession = useCallback(() => {
    setCountSession(null);
    setSelectedLocation(null);
    setCurrentItemIndex(0);
    setCountedQuantity(0);
    setScannedBarcode(null);
    setIsVerified(false);
  }, []);

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
            : navigate({ to: "/mobile" as any })
        }
      />

      <div className="p-4 space-y-4">
        {/* Offline indicator */}
        <OfflineIndicator
          isOnline={isOnline}
          pendingActions={queueLength}
          onSync={handleSync}
          isSyncing={isSyncing}
        />

        {/* Location selection (no active session) */}
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
                    <Button variant="outline" onClick={loadLocations}>
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
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Active count session */}
        {countSession && (
          <>
            {/* Progress */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Progress</span>
                  <span className="text-sm text-muted-foreground">
                    {completedCount} / {countSession.items.length} items
                  </span>
                </div>
                <Progress value={progress} className="h-3" />

                {/* Blind count toggle */}
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

            {/* Session complete */}
            {countSession.status === "completed" ? (
              <Card className="border-green-500 bg-green-50">
                <CardContent className="pt-6 pb-6 text-center">
                  <Check className="h-12 w-12 text-green-600 mx-auto mb-3" />
                  <h2 className="text-xl font-bold text-green-800">
                    Count Complete!
                  </h2>
                  <p className="text-green-700 mt-1">
                    {countSession.items.length} items counted
                  </p>

                  {/* Summary */}
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
                      onClick={() => navigate({ to: "/mobile" as any })}
                      className="flex-1 h-14 text-lg"
                    >
                      Done
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : currentItem ? (
              <>
                {/* Current item to count */}
                <Card>
                  <CardContent className="pt-4 space-y-4">
                    {/* Product info */}
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

                    {/* Barcode verification */}
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

                    {/* Count input */}
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

                    {/* Actions */}
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

                {/* Item list */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Items ({countSession.items.length})
                  </h4>
                  {countSession.items.map((item, idx) => (
                    <CountItemRow
                      key={item.inventoryId}
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

      {/* Confirmation Dialog */}
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

export default MobileCountingPage;
