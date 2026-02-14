/**
 * Mobile Picking Page
 *
 * Extracted for code-splitting - see picking.tsx and picking.$orderId.tsx for route definitions.
 * When orderId is provided, fetches real order data and calls pickOrderItems API.
 */
import { useState, useCallback, useEffect, memo, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
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
import { toast } from "@/hooks";
import { logger } from "@/lib/logger";
import { useOnlineStatus, useOfflineQueue } from "@/hooks";
import {
  BarcodeScanner,
  QuantityInput,
  OfflineIndicator,
  MobilePageHeader,
} from "@/components/mobile/inventory-actions";
import { useOrderWithCustomer } from "@/hooks/orders/use-order-detail";
import { usePickOrderItems } from "@/hooks/orders/use-picking";
import { useAvailableSerials } from "@/hooks/inventory";
import { SerialPicker } from "@/components/domain/orders/fulfillment/serial-picker";
import type { PickItem, PickList, PendingPick } from "./picking-types";

interface PickItemRowProps {
  item: PickItem;
  index: number;
  isActive: boolean;
  onSelect: (index: number) => void;
  isShort?: boolean;
}

const PickItemRow = memo(function PickItemRow({
  item,
  index,
  isActive,
  onSelect,
  isShort = false,
}: PickItemRowProps) {
  const effectiveStatus = isShort ? "short" : item.status;
  return (
    <button
      onClick={() => effectiveStatus !== "completed" && effectiveStatus !== "short" && onSelect(index)}
      disabled={effectiveStatus === "completed" || effectiveStatus === "short"}
      className={cn(
        "w-full flex items-center justify-between p-3 rounded-lg transition-colors",
        "touch-action-manipulation",
        isActive
          ? "bg-primary/10 border-2 border-primary"
          : effectiveStatus === "completed"
            ? "bg-green-50 opacity-60"
            : effectiveStatus === "short"
              ? "bg-orange-50"
              : "bg-background border",
        effectiveStatus === "completed" && "cursor-default"
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold",
            effectiveStatus === "completed"
              ? "bg-green-500 text-white"
              : effectiveStatus === "short"
                ? "bg-orange-500 text-white"
                : "bg-muted"
          )}
        >
          {effectiveStatus === "completed" ? (
            <Check className="h-4 w-4" />
          ) : (
            index + 1
          )}
        </div>
        <div className="text-left">
          <div className="font-medium truncate max-w-[200px]">
            {item.productName}
          </div>
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            {item.locationCode} - Qty: {item.quantityRequired}
            {item.isSerialized && (
              <Badge variant="outline" className="text-[10px] font-normal">
                Serialized
              </Badge>
            )}
          </div>
        </div>
      </div>
      {effectiveStatus !== "completed" && effectiveStatus !== "short" && (
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      )}
    </button>
  );
});

interface OrderLineItemForPick {
  id: string;
  productId: string | null;
  quantity: number;
  qtyPicked: number | null;
  description: string;
  product?: { name: string; sku: string | null; isSerialized?: boolean } | null;
  sku?: string | null;
}

function mapOrderToPickList(
  orderId: string,
  order: { orderNumber: string; customer?: { name: string } | null },
  lineItems: OrderLineItemForPick[]
): PickList {
  const items: PickItem[] = lineItems.map((li) => {
    const ordered = Number(li.quantity);
    const picked = Number(li.qtyPicked) || 0;
    const remaining = ordered - picked;
    const isSerialized = !!li.product?.isSerialized;
    return {
      id: li.id,
      productId: li.productId ?? "",
      productName: li.product?.name ?? li.description,
      productSku: li.product?.sku ?? li.sku ?? "—",
      locationId: "",
      locationCode: "—",
      locationName: "—",
      quantityRequired: ordered,
      quantityPicked: picked,
      status: remaining <= 0 ? "completed" : picked > 0 ? "in_progress" : "pending",
      isSerialized,
    };
  });
  return {
    id: `pick-${orderId}`,
    orderId,
    orderNumber: order.orderNumber,
    customerName: order.customer?.name ?? "—",
    status: items.every((i) => i.status === "completed") ? "completed" : items.some((i) => i.status !== "pending") ? "in_progress" : "pending",
    createdAt: new Date(),
    items,
  };
}

export default function MobilePickingPage({ orderId }: { orderId?: string }) {
  const navigate = useNavigate();
  const { data: orderData, isLoading: orderLoading } = useOrderWithCustomer({
    orderId: orderId ?? "",
    enabled: !!orderId,
  });
  const pickMutation = usePickOrderItems();

  const pickList = useMemo(() => {
    if (!orderId || !orderData) return null;
    return mapOrderToPickList(orderId, orderData, orderData.lineItems as OrderLineItemForPick[]);
  }, [orderId, orderData]);

  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const [quantityToPick, setQuantityToPick] = useState(0);
  const [selectedSerials, setSelectedSerials] = useState<string[]>([]);
  const [isVerified, setIsVerified] = useState(false);
  const {
    addToQueue,
    syncQueue,
    isSyncing,
    queueLength,
  } = useOfflineQueue<PendingPick>("mobile-picking-queue");
  const isOnline = useOnlineStatus();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const currentItem = pickList?.items[currentItemIndex];
  const completedCount = pickList ? pickList.items.filter((i) => i.status === "completed").length : 0;
  const progress = pickList && pickList.items.length > 0 ? (completedCount / pickList.items.length) * 100 : 0;

  useEffect(() => {
    if (currentItem) {
      setQuantityToPick(currentItem.quantityRequired - currentItem.quantityPicked);
      setSelectedSerials([]);
      setScannedBarcode(null);
      setIsVerified(false);
    }
  }, [currentItemIndex, currentItem]);

  const { data: availableSerialsData, isLoading: serialsLoading } = useAvailableSerials({
    productId: currentItem?.productId ?? "",
    enabled: !!currentItem?.isSerialized && !!currentItem?.productId,
  });

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

  const handleConfirmPickClick = useCallback(() => {
    if (!currentItem || !isVerified) return;
    if (currentItem.isSerialized) {
      if (selectedSerials.length !== quantityToPick) return;
    }
    setShowConfirmDialog(true);
  }, [currentItem, isVerified, selectedSerials.length, quantityToPick]);

  const handleConfirmedPick = useCallback(async () => {
    setShowConfirmDialog(false);
    if (!currentItem || !isVerified || !pickList || !orderId) return;
    const serialsToUse = currentItem.isSerialized ? selectedSerials : undefined;
    if (currentItem.isSerialized && (!serialsToUse || serialsToUse.length !== quantityToPick)) return;
    try {
      setIsSubmitting(true);
      if (isOnline) {
        await pickMutation.mutateAsync({
          orderId,
          items: [
            {
              lineItemId: currentItem.id,
              qtyPicked: quantityToPick,
              serialNumbers: serialsToUse,
            },
          ],
        });
      } else {
        addToQueue({
          orderId,
          pickItemId: currentItem.id,
          quantityPicked: quantityToPick,
          serialNumbers: serialsToUse,
          verifiedBarcode: scannedBarcode ?? undefined,
          timestamp: new Date(),
        });
      }
      const newItems = pickList.items.map((it, idx) =>
        idx === currentItemIndex
          ? {
              ...it,
              quantityPicked: it.quantityPicked + quantityToPick,
              status:
                it.quantityPicked + quantityToPick >= it.quantityRequired
                  ? ("completed" as const)
                  : ("in_progress" as const),
            }
          : it
      );
      toast.success(`Picked ${quantityToPick} units`, {
        description: currentItem.productName,
      });
      const nextPending = newItems.findIndex(
        (i, idx) => idx > currentItemIndex && i.status !== "completed"
      );
      if (nextPending !== -1) {
        setCurrentItemIndex(nextPending);
      } else {
        const firstPending = newItems.findIndex((i) => i.status !== "completed");
        if (firstPending !== -1) {
          setCurrentItemIndex(firstPending);
        } else {
          toast.success("Pick list completed!");
        }
      }
    } catch (error: unknown) {
      logger.error("Failed to confirm pick", error);
      toast.error(error instanceof Error ? error.message : "Failed to confirm pick");
    } finally {
      setIsSubmitting(false);
    }
  }, [currentItem, isVerified, quantityToPick, selectedSerials, scannedBarcode, pickList, currentItemIndex, isOnline, addToQueue, orderId, pickMutation]);

  const [shortItemIds, setShortItemIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setShortItemIds(new Set());
  }, [orderId]);

  const handleMarkShort = useCallback(() => {
    if (!currentItem || !pickList) return;
    const updatedShortIds = new Set(shortItemIds).add(currentItem.id);
    setShortItemIds(updatedShortIds);
    toast.warning("Item marked as short", {
      description: `${currentItem.quantityRequired - currentItem.quantityPicked} units short`,
    });
    const isShort = (item: PickItem) => updatedShortIds.has(item.id);
    const nextPending = pickList.items.findIndex(
      (i, idx) => idx > currentItemIndex && i.status !== "completed" && !isShort(i)
    );
    if (nextPending !== -1) {
      setCurrentItemIndex(nextPending);
    } else {
      const firstPending = pickList.items.findIndex(
        (i) => i.status !== "completed" && !isShort(i)
      );
      if (firstPending !== -1) setCurrentItemIndex(firstPending);
    }
  }, [currentItem, pickList, currentItemIndex, shortItemIds]);

  const handleSync = useCallback(async () => {
    const result = await syncQueue(async (item: PendingPick) => {
      if (!item.orderId) {
        throw new Error("Legacy queue item missing orderId - cannot sync");
      }
      if (
        item.serialNumbers &&
        item.serialNumbers.length !== item.quantityPicked
      ) {
        throw new Error(
          "Serialized pick has mismatched serial count - open order on desktop to complete"
        );
      }
      try {
        await pickMutation.mutateAsync({
          orderId: item.orderId,
          items: [
            {
              lineItemId: item.pickItemId,
              qtyPicked: item.quantityPicked,
              serialNumbers: item.serialNumbers,
            },
          ],
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (
          /serial|Serial/.test(msg) &&
          (!item.serialNumbers || item.serialNumbers.length === 0)
        ) {
          throw new Error(
            "Serialized pick could not sync - open order on desktop to complete"
          );
        }
        throw err;
      }
    });
    if (result.failed === 0) {
      toast.success(`Synced ${result.success} picks`);
    } else {
      toast.warning(`Synced ${result.success} picks, ${result.failed} failed`);
    }
  }, [syncQueue, pickMutation]);

  const allCompleted = pickList
    ? pickList.items.every(
        (i) => i.status === "completed" || shortItemIds.has(i.id)
      )
    : false;

  if (!orderId) {
    return (
      <div className="min-h-dvh bg-muted/30">
        <MobilePageHeader
          title="Pick Order"
          subtitle="No order selected"
          onBack={() => navigate({ to: "/mobile" })}
        />
        <div className="p-4">
          <Card>
            <CardContent className="pt-6 pb-6 text-center">
              <p className="text-muted-foreground">
                Open an order from the fulfillment dashboard and tap &quot;Pick on device&quot; to start picking.
              </p>
              <Button
                className="mt-4"
                onClick={() => navigate({ to: "/mobile" })}
              >
                Return to Menu
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (orderLoading || !pickList) {
    return (
      <div className="min-h-dvh bg-muted/30">
        <MobilePageHeader
          title="Pick Order"
          subtitle="Loading..."
          onBack={() => navigate({ to: "/mobile" })}
        />
        <div className="p-4 flex justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (pickList.items.length === 0) {
    return (
      <div className="min-h-dvh bg-muted/30">
        <MobilePageHeader
          title="Pick Order"
          subtitle={`${pickList.orderNumber} - ${pickList.customerName}`}
          onBack={() => navigate({ to: "/mobile" })}
        />
        <div className="p-4">
          <Card>
            <CardContent className="pt-6 pb-6 text-center">
              <p className="text-muted-foreground">
                No pickable items. This order may only have serialized products (pick from desktop).
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    navigate({
                      to: "/orders/$orderId",
                      params: { orderId: pickList.orderId },
                      search: { pick: true },
                    })
                  }
                >
                  Open order to pick
                </Button>
                <Button onClick={() => navigate({ to: "/mobile" })}>
                  Return to Menu
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-muted/30">
      <MobilePageHeader
        title="Pick Order"
        subtitle={`${pickList.orderNumber} - ${pickList.customerName}`}
        onBack={() => navigate({ to: "/mobile" })}
      />
      <div className="p-4 space-y-4">
        <OfflineIndicator
          isOnline={isOnline}
          pendingActions={queueLength}
          onSync={handleSync}
          isSyncing={isSyncing}
        />
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
                onClick={() => navigate({ to: "/mobile" })}
              >
                Return to Menu
              </Button>
            </CardContent>
          </Card>
        ) : currentItem ? (
          <>
            <Card>
              <CardContent className="pt-4 space-y-4">
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
                {isVerified &&
                  (currentItem.isSerialized ? (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Scan or select {quantityToPick} serial{quantityToPick !== 1 ? "s" : ""}
                      </label>
                      {!serialsLoading &&
                        (availableSerialsData?.availableSerials ?? []).length === 0 ? (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                          <p className="font-medium">No serials available in inventory</p>
                          <p className="mt-1 text-amber-700">
                            This product requires serial numbers but none are in stock or unallocated.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-3"
                            onClick={() =>
                              navigate({
                                to: "/orders/$orderId",
                                params: { orderId: pickList.orderId },
                                search: { pick: true },
                              })
                            }
                          >
                            Open on desktop to pick
                          </Button>
                        </div>
                      ) : (
                        <SerialPicker
                          options={(availableSerialsData?.availableSerials ?? []).map((s) => ({
                            serialNumber: s.serialNumber,
                            locationName: s.locationName ?? undefined,
                            receivedAt: s.receivedAt ?? undefined,
                          }))}
                          selectedSerials={selectedSerials}
                          onChange={setSelectedSerials}
                          maxSelections={quantityToPick}
                          isLoading={serialsLoading}
                          ariaLabel="Select serial numbers"
                          variant="inline"
                          scanMode
                        />
                      )}
                    </div>
                  ) : (
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
                  ))}
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
                    disabled={
                      !isVerified ||
                      isSubmitting ||
                      (currentItem.isSerialized
                        ? selectedSerials.length !== quantityToPick ||
                          (availableSerialsData?.availableSerials ?? []).length === 0
                        : false)
                    }
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
                  isShort={shortItemIds.has(item.id)}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Pick</AlertDialogTitle>
            <AlertDialogDescription>
              {currentItem?.isSerialized
                ? `Pick ${selectedSerials.length} serial(s) for ${currentItem?.productName}?`
                : `Pick ${quantityToPick} x ${currentItem?.productName}?`}
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
