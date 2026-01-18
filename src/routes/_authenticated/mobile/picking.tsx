/**
 * Mobile Picking Route
 *
 * Mobile-optimized order picking for warehouse handheld devices.
 *
 * Features:
 * - Pick list with location guidance
 * - Barcode verification
 * - Touch-optimized quantity confirmation
 * - Offline capability with sync
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useCallback, useEffect, memo } from "react";
import { Package, MapPin, Check, AlertTriangle, ChevronRight, Loader2 } from "lucide-react";
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
import { toast } from "@/hooks/use-toast";
import { useOnlineStatus, useOfflineQueue } from "@/hooks";
import {
  BarcodeScanner,
  QuantityInput,
  OfflineIndicator,
  MobilePageHeader,
} from "@/components/mobile/inventory-actions";
import { MOCK_PICK_LIST } from "./__fixtures__";

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute("/_authenticated/mobile/picking" as any)({
  component: MobilePickingPage,
});

// ============================================================================
// TYPES
// ============================================================================

export interface PickItem {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  locationId: string;
  locationCode: string;
  locationName: string;
  quantityRequired: number;
  quantityPicked: number;
  status: "pending" | "in_progress" | "completed" | "short";
}

export interface PickList {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  items: PickItem[];
  status: "pending" | "in_progress" | "completed";
  createdAt: Date;
}

export interface PendingPick {
  id?: string;
  pickItemId: string;
  quantityPicked: number;
  verifiedBarcode: string;
  timestamp: Date;
}

// ============================================================================
// MEMOIZED COMPONENTS
// ============================================================================

interface PickItemRowProps {
  item: PickItem;
  index: number;
  isActive: boolean;
  onSelect: (index: number) => void;
}

const PickItemRow = memo(function PickItemRow({
  item,
  index,
  isActive,
  onSelect,
}: PickItemRowProps) {
  return (
    <button
      onClick={() => item.status !== "completed" && onSelect(index)}
      disabled={item.status === "completed"}
      className={cn(
        "w-full flex items-center justify-between p-3 rounded-lg transition-colors",
        "touch-action-manipulation",
        isActive
          ? "bg-primary/10 border-2 border-primary"
          : item.status === "completed"
            ? "bg-green-50 opacity-60"
            : item.status === "short"
              ? "bg-orange-50"
              : "bg-background border",
        item.status === "completed" && "cursor-default"
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold",
            item.status === "completed"
              ? "bg-green-500 text-white"
              : item.status === "short"
                ? "bg-orange-500 text-white"
                : "bg-muted"
          )}
        >
          {item.status === "completed" ? (
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
            {item.locationCode} - Qty: {item.quantityRequired}
          </div>
        </div>
      </div>
      {item.status !== "completed" && (
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      )}
    </button>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function MobilePickingPage() {
  const navigate = useNavigate();

  // State
  const [pickList, setPickList] = useState<PickList>(MOCK_PICK_LIST);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const [quantityToPick, setQuantityToPick] = useState(0);
  const [isVerified, setIsVerified] = useState(false);
  // Persist offline queue to localStorage using useOfflineQueue hook
  const {
    addToQueue,
    syncQueue,
    isSyncing,
    queueLength,
  } = useOfflineQueue<PendingPick>("mobile-picking-queue");
  const isOnline = useOnlineStatus();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const currentItem = pickList.items[currentItemIndex];
  const completedCount = pickList.items.filter((i) => i.status === "completed").length;
  const progress = (completedCount / pickList.items.length) * 100;

  // Initialize quantity when item changes
  useEffect(() => {
    if (currentItem) {
      setQuantityToPick(currentItem.quantityRequired - currentItem.quantityPicked);
      setScannedBarcode(null);
      setIsVerified(false);
    }
  }, [currentItemIndex, currentItem]);

  // Handle barcode scan for verification
  const handleScan = useCallback(
    (barcode: string) => {
      setScannedBarcode(barcode);

      // Verify barcode matches product SKU
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

  // Show confirmation dialog for pick
  const handleConfirmPickClick = useCallback(() => {
    if (!currentItem || !isVerified) return;
    setShowConfirmDialog(true);
  }, [currentItem, isVerified]);

  // Confirm pick (after confirmation)
  const handleConfirmedPick = useCallback(async () => {
    setShowConfirmDialog(false);
    if (!currentItem || !isVerified) return;

    try {
      setIsSubmitting(true);

      // Update local state
      const newItems = [...pickList.items];
      const item = newItems[currentItemIndex];
      item.quantityPicked += quantityToPick;
      item.status =
        item.quantityPicked >= item.quantityRequired ? "completed" : "in_progress";

      setPickList({
        ...pickList,
        items: newItems,
        status: newItems.every((i) => i.status === "completed")
          ? "completed"
          : "in_progress",
      });

      // Add to pending queue if offline
      if (!isOnline) {
        addToQueue({
          pickItemId: currentItem.id,
          quantityPicked: quantityToPick,
          verifiedBarcode: scannedBarcode!,
          timestamp: new Date(),
        });
      }

      toast.success(`Picked ${quantityToPick} units`, {
        description: currentItem.productName,
      });

      // Move to next item
      const nextPending = newItems.findIndex(
        (i, idx) => idx > currentItemIndex && i.status !== "completed"
      );
      if (nextPending !== -1) {
        setCurrentItemIndex(nextPending);
      } else {
        // Check if there are any remaining pending items at the beginning
        const firstPending = newItems.findIndex((i) => i.status !== "completed");
        if (firstPending !== -1) {
          setCurrentItemIndex(firstPending);
        } else {
          toast.success("Pick list completed!");
        }
      }
    } catch (error: any) {
      console.error("Failed to confirm pick:", error);
      toast.error(error.message ?? "Failed to confirm pick");
    } finally {
      setIsSubmitting(false);
    }
  }, [currentItem, isVerified, quantityToPick, scannedBarcode, pickList, currentItemIndex, isOnline, addToQueue]);

  // Mark as short
  const handleMarkShort = useCallback(() => {
    if (!currentItem) return;

    const newItems = [...pickList.items];
    newItems[currentItemIndex].status = "short";

    setPickList({
      ...pickList,
      items: newItems,
    });

    toast.warning("Item marked as short", {
      description: `${currentItem.quantityRequired - currentItem.quantityPicked} units short`,
    });

    // Move to next item
    const nextPending = newItems.findIndex(
      (i, idx) => idx > currentItemIndex && i.status === "pending"
    );
    if (nextPending !== -1) {
      setCurrentItemIndex(nextPending);
    }
  }, [currentItem, pickList, currentItemIndex]);

  // Sync pending picks using useOfflineQueue
  const handleSync = useCallback(async () => {
    const result = await syncQueue(async (_item) => {
      // In production, this would call the server
      // await confirmPick({ data: { pickItemId: _item.pickItemId, quantityPicked: _item.quantityPicked } });
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    if (result.failed === 0) {
      toast.success(`Synced ${result.success} picks`);
    } else {
      toast.warning(`Synced ${result.success} picks, ${result.failed} failed`);
    }
  }, [syncQueue]);

  const allCompleted = pickList.items.every(
    (i) => i.status === "completed" || i.status === "short"
  );

  return (
    <div className="min-h-dvh bg-muted/30">
      <MobilePageHeader
        title="Pick Order"
        subtitle={`${pickList.orderNumber} - ${pickList.customerName}`}
        onBack={() => navigate({ to: "/mobile" as any })}
      />

      <div className="p-4 space-y-4">
        {/* Offline indicator */}
        <OfflineIndicator
          isOnline={isOnline}
          pendingActions={queueLength}
          onSync={handleSync}
          isSyncing={isSyncing}
        />

        {/* Progress */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-muted-foreground">
                {completedCount} / {pickList.items.length} items
              </span>
            </div>
            <Progress value={progress} className="h-3" />
          </CardContent>
        </Card>

        {/* All completed message */}
        {allCompleted ? (
          <Card className="border-green-500 bg-green-50">
            <CardContent className="pt-6 pb-6 text-center">
              <Check className="h-12 w-12 text-green-600 mx-auto mb-3" />
              <h2 className="text-xl font-bold text-green-800">Pick Complete!</h2>
              <p className="text-green-700 mt-1">
                All items have been picked for this order.
              </p>
              <Button
                className="mt-4 h-14 text-lg"
                onClick={() => navigate({ to: "/mobile" as any })}
              >
                Return to Menu
              </Button>
            </CardContent>
          </Card>
        ) : currentItem ? (
          <>
            {/* Current item card */}
            <Card>
              <CardContent className="pt-4 space-y-4">
                {/* Location guidance */}
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <MapPin className="h-8 w-8 text-blue-600" />
                  <div>
                    <div className="text-lg font-bold text-blue-800">
                      {currentItem.locationCode}
                    </div>
                    <div className="text-sm text-blue-600">
                      {currentItem.locationName}
                    </div>
                  </div>
                </div>

                {/* Product info */}
                <div>
                  <h3 className="font-semibold text-lg">{currentItem.productName}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="font-mono">
                      {currentItem.productSku}
                    </Badge>
                    <Badge
                      variant={currentItem.status === "pending" ? "secondary" : "default"}
                    >
                      {currentItem.quantityPicked} / {currentItem.quantityRequired}
                    </Badge>
                  </div>
                </div>

                {/* Barcode verification */}
                <div className="space-y-2">
                  <label htmlFor="barcode-scanner-input" className="text-sm font-medium flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Scan to Verify
                  </label>
                  <BarcodeScanner
                    id="barcode-scanner-input"
                    onScan={handleScan}
                    placeholder="Scan product barcode"
                    autoFocus={true}
                  />
                  {scannedBarcode && (
                    <div
                      className={cn(
                        "flex items-center gap-2 p-2 rounded",
                        isVerified ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
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

                {/* Quantity to pick */}
                {isVerified && (
                  <div className="space-y-2">
                    <label htmlFor="qty-to-pick" className="text-sm font-medium">Quantity to Pick</label>
                    <QuantityInput
                      id="qty-to-pick"
                      value={quantityToPick}
                      onChange={setQuantityToPick}
                      min={1}
                      max={currentItem.quantityRequired - currentItem.quantityPicked}
                    />
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={handleMarkShort}
                    className="flex-1 h-14 text-lg"
                  >
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    Short
                  </Button>
                  <Button
                    onClick={handleConfirmPickClick}
                    disabled={!isVerified || isSubmitting}
                    className="flex-1 h-14 text-lg"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Confirm
                      </>
                    ) : (
                      <>
                        <Check className="h-5 w-5 mr-2" />
                        Confirm
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Item list navigation */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                Pick List ({pickList.items.length} items)
              </h4>
              {pickList.items.map((item, idx) => (
                <PickItemRow
                  key={item.id}
                  item={item}
                  index={idx}
                  isActive={idx === currentItemIndex}
                  onSelect={setCurrentItemIndex}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Pick</AlertDialogTitle>
            <AlertDialogDescription>
              Pick {quantityToPick} x {currentItem?.productName}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmedPick}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default MobilePickingPage;
