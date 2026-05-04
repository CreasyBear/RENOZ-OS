/**
 * ShipOrderDialog Component
 *
 * Dialog for creating a shipment from an order with item selection.
 * Uses TanStack Form per FORM-STANDARDS.md.
 *
 * @source orderData from useOrderWithCustomer hook
 * @source createShipmentMutation from useCreateShipment hook
 * @source markShippedMutation from useMarkShipped hook
 * @see _Initiation/_prd/2-domains/orders/orders.prd.json (ORD-SHIPPING-UI)
 * @see _misc/docs/reference/form-standards.md
 */

import { memo, useState, useCallback, useEffect, useRef, startTransition } from "react";
import {
  Truck,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createPendingDialogOpenChangeHandler } from "@/components/ui/dialog-pending-guards";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { toastSuccess, toastError } from "@/hooks";
import {
  useOrderWithCustomer,
  useOrderShipments,
  useCreateShipment,
  useMarkShipped,
  useShipmentShippingCostAmendment,
} from "@/hooks/orders";
import { ValidationError } from "@/lib/server/errors";
import { ordersLogger } from "@/lib/logger";
import { useTanStackForm } from "@/hooks/_shared/use-tanstack-form";
import {
  FormDialog,
  FormFieldDisplayProvider,
} from "@/components/shared/forms";
import { DEFAULT_COUNTRY } from "@/lib/country";
import {
  shipOrderFormSchema,
  type ShipOrderFormData,
} from "@/lib/schemas/orders/ship-order-form";
import {
  changeShipOrderItemQuantity,
  changeShipOrderItemSerials,
  createShipOrderItemSelections,
  getShipOrderAvailableQtyByLineItem,
  selectAllShipOrderItems,
  summarizeShipOrderItemSelection,
  toggleShipOrderItemSelection,
  type ShipOrderLineItemSelection,
} from "./ship-order-item-selection";
import { ShipOrderAddressSection } from "./ship-order-address";
import { useShipOrderAddressWorkflow } from "./ship-order-address-workflow";
import { ShipOrderCarrierSection } from "./ship-order-carrier";
import { ShipOrderConfirmationStep } from "./ship-order-confirmation";
import {
  buildShipOrderSuccessToast,
  getShipOrderCarrierLabel,
  getShipOrderShippingCostCents,
  resolveShipOrderCarrierValue,
} from "./ship-order-carrier-workflow";
import { ShipOrderItemsTable } from "./ship-order-items-table";

// ============================================================================
// TYPES
// ============================================================================

export interface ShipOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  onSuccess?: (result?: { shipmentId: string; shipmentStatus: string }) => void;
  /** When all items shipped, called when user clicks "View Shipments" to switch to fulfillment tab */
  onViewShipments?: () => void;
}

interface ShipmentWorkflowNotice {
  title: string;
  description: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function handleShipmentError(
  error: unknown,
  context: { orderId: string; shipmentId?: string },
  options?: {
    setStep?: () => void;
    setItemErrors?: (e: Record<string, string>) => void;
    message?: string;
  }
): void {
  ordersLogger.error("Shipment error", error, context);
  toastError(
    options?.message ?? (error instanceof Error ? error.message : "Shipment operation failed")
  );
  options?.setStep?.();
  if (error instanceof ValidationError && error.errors && options?.setItemErrors) {
    const byLineItem: Record<string, string> = {};
    for (const [key, messages] of Object.entries(error.errors)) {
      if (messages.length > 0) byLineItem[key] = messages[0];
    }
    options.setItemErrors(byLineItem);
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

const getDefaultFormValues = (): ShipOrderFormData => ({
  carrier: "",
  customCarrier: "",
  carrierService: "",
  trackingNumber: "",
  shippingCost: undefined,
  notes: "",
  shipNow: true,
  addressName: "",
  addressStreet1: "",
  addressStreet2: "",
  addressCity: "",
  addressState: "",
  addressPostcode: "",
  addressCountry: DEFAULT_COUNTRY,
  addressPhone: "",
});

export const ShipOrderDialog = memo(function ShipOrderDialog({
  open,
  onOpenChange,
  orderId,
  onSuccess,
  onViewShipments,
}: ShipOrderDialogProps) {
  const [itemSelections, setItemSelections] = useState<ShipOrderLineItemSelection[]>([]);
  const [step, setStep] = useState<"form" | "confirm">("form");
  /** Server ValidationError per lineItemId; keys = orderLineItemId */
  const [serverItemErrors, setServerItemErrors] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);
  const [workflowNotice, setWorkflowNotice] = useState<ShipmentWorkflowNotice | null>(null);
  const performCreateShipmentRef = useRef<
    (values: ShipOrderFormData) => Promise<void>
  >(null!);
  const prevAvailableQtyRef = useRef<Map<string, number>>(new Map());

  const { data: orderData, isLoading: orderLoading } = useOrderWithCustomer({
    orderId,
    enabled: open,
  });
  const { data: shipments, isLoading: shipmentsLoading } = useOrderShipments(orderId, open);
  const createShipmentMutation = useCreateShipment();
  const markShippedMutation = useMarkShipped();
  const {
    syncShippingCost,
    isPending: shippingCostAmendmentPending,
  } = useShipmentShippingCostAmendment();

  const {
    selectedItems,
    totalQtyToShip,
    totalAvailableQty,
    totalReservedQty,
    remainingUnfulfilled,
    isPartialShipment,
    needsConfirmation,
    totalItemsToShip,
  } = summarizeShipOrderItemSelection(itemSelections);

  const form = useTanStackForm<ShipOrderFormData>({
    schema: shipOrderFormSchema,
    defaultValues: getDefaultFormValues(),
    validateOnBlur: true,
    onSubmitInvalid: () => {
      toast.error("Please fix the errors below and try again.");
    },
    onSubmit: async (values) => {
      if (selectedItems.length === 0) {
        toastError("Please select at least one item to ship");
        return;
      }
      for (const item of selectedItems) {
        if (item.isSerialized && item.selectedSerials.length !== item.selectedQty) {
          toastError(
            `Select exactly ${item.selectedQty} serial number${item.selectedQty !== 1 ? "s" : ""} for "${item.productName}"`
          );
          return;
        }
      }
      if (values.shipNow && !resolveShipOrderCarrierValue(values)) {
        toastError("Please select a carrier to mark as shipped");
        return;
      }
      if (needsConfirmation && step !== "confirm") {
        setStep("confirm");
        return;
      }
      await performCreateShipmentRef.current(values);
    },
  });
  const resolvedCarrier = resolveShipOrderCarrierValue(form.state.values);
  const shipOrderAddress = useShipOrderAddressWorkflow({
    form,
    order: orderData,
  });
  const {
    addressOptions,
    addressSource,
    customerAddressId,
    handleAddressSelect,
    hasAddressForDisplay,
    isExpanded: addressExpanded,
    reset: resetAddress,
    saveToOrder: saveShipmentAddressToOrder,
    selectedAddress,
    setIsExpanded: setAddressExpanded,
    setSaveToOrder: setSaveShipmentAddressToOrder,
    shippingAddress,
  } = shipOrderAddress;

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setStep("form");
        setInitialized(false);
        form.reset(getDefaultFormValues());
        setServerItemErrors({});
        setWorkflowNotice(null);
        resetAddress();
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange, form, resetAddress]
  );

  const performCreateShipment = useCallback(
    async (values: ShipOrderFormData) => {
      if (
        createShipmentMutation.isPending ||
        markShippedMutation.isPending ||
        shippingCostAmendmentPending
      )
        return;
      setWorkflowNotice(null);
      const { selectedItems: items } = summarizeShipOrderItemSelection(itemSelections);
      for (const item of items) {
        if (item.isSerialized && item.selectedSerials.length !== item.selectedQty) {
          toastError(
            `Select exactly ${item.selectedQty} serial number${item.selectedQty !== 1 ? "s" : ""} for "${item.productName}"`
          );
          return;
        }
      }
      const carrierToUse = resolveShipOrderCarrierValue(values);
      const shippingCostCents = getShipOrderShippingCostCents(values);

      try {
        const shipment = await createShipmentMutation.mutateAsync({
          orderId,
          carrier: carrierToUse || undefined,
          carrierService: values.carrierService || undefined,
          trackingNumber: values.trackingNumber || undefined,
          shippingCost: shippingCostCents,
          notes: values.notes || undefined,
          addressSource,
          customerAddressId,
          shippingAddress,
          saveToOrderShippingAddress: saveShipmentAddressToOrder,
          items: items.map((item) => ({
            orderLineItemId: item.lineItemId,
            quantity: item.selectedQty,
            serialNumbers:
              item.isSerialized && item.selectedSerials.length > 0
                ? item.selectedSerials
                : undefined,
          })),
        });

        if (values.shipNow && carrierToUse) {
          try {
            await markShippedMutation.mutateAsync({
              id: shipment.id,
              idempotencyKey: `shipment-mark-shipped:${shipment.id}`,
              carrier: carrierToUse,
              carrierService: values.carrierService || undefined,
              trackingNumber: values.trackingNumber || undefined,
              shippingCost: shippingCostCents,
            });
          } catch (err) {
            handleShipmentError(err, { orderId, shipmentId: shipment.id }, {
              message:
                "Shipment created but could not be marked as shipped. " +
                "You can mark it as shipped from the Fulfillment tab.",
            });
            setWorkflowNotice({
              title: "Shipment created, shipping step incomplete",
              description:
                "The shipment was created and inventory was updated, but it could not be marked as shipped. Refreshing this dialog to the persisted state.",
            });
            setStep("form");
            setInitialized(false);
            onSuccess?.({ shipmentId: shipment.id, shipmentStatus: shipment.status });
            return;
          }
        }

        // When shipping cost is set, update order totals via amendment flow (reuses existing logic)
        if (shippingCostCents !== undefined) {
          const shippingCostDollars =
            typeof values.shippingCost === "number" ? values.shippingCost : 0;
          const shippingCostSyncResult = await syncShippingCost({
            orderId,
            shippingAmount: shippingCostDollars,
          });

          if (!shippingCostSyncResult.ok) {
            ordersLogger.warn(
              "Shipment created but order shipping amount could not be updated",
              { orderId, err: shippingCostSyncResult.error }
            );
            toastSuccess(values.shipNow ? "Shipment shipped" : "Shipment created", {
              description:
                "The shipment itself succeeded, but shipping cost still needs to be synced to the order totals.",
            });
            toastError("Order shipping amount could not be updated", {
              description: shippingCostSyncResult.message,
            });
            setWorkflowNotice({
              title: "Shipment created, shipping cost amendment failed",
              description:
                "The shipment was created, but the order totals were not updated with the shipping cost. Refreshing this dialog to the persisted shipment state.",
            });
            setStep("form");
            setInitialized(false);
            onSuccess?.({ shipmentId: shipment.id, shipmentStatus: shipment.status });
            return;
          }
        }

        const totalShipped = items.reduce((sum, i) => sum + i.selectedQty, 0);
        const successToast = buildShipOrderSuccessToast({
          shipNow: values.shipNow,
          totalShipped,
          remainingUnfulfilled,
          carrierLabel: getShipOrderCarrierLabel(values),
        });

        toastSuccess(successToast.title, { description: successToast.description });
        setWorkflowNotice(null);
        onSuccess?.({
          shipmentId: shipment.id,
          shipmentStatus: values.shipNow ? 'in_transit' : shipment.status,
        });
        handleOpenChange(false);
      } catch (error) {
        // Server ValidationError.errors keys are orderLineItemId (order-shipments.ts).
        // Values are string[]; we use messages[0] per line item.
        handleShipmentError(error, { orderId }, {
          setStep: () => setStep("form"),
          setItemErrors: setServerItemErrors,
        });
      }
    },
    [
      orderId,
      itemSelections,
      createShipmentMutation,
      markShippedMutation,
      syncShippingCost,
      shippingCostAmendmentPending,
      addressSource,
      customerAddressId,
      shippingAddress,
      saveShipmentAddressToOrder,
      onSuccess,
      remainingUnfulfilled,
      handleOpenChange,
    ]
  );

  useEffect(() => {
    performCreateShipmentRef.current = performCreateShipment;
  }, [performCreateShipment]);

  // Initialize item selections and form when order first loads (no address prefill)
  useEffect(() => {
    if (!orderData || shipmentsLoading || initialized) return;
    const formValues: ShipOrderFormData = {
      ...getDefaultFormValues(),
      addressCountry: DEFAULT_COUNTRY,
    };
    // Only prefill recipient name from customer (minimal hint)
    if (orderData.customer?.name) {
      formValues.addressName = orderData.customer.name;
    }
    startTransition(() => {
      resetAddress();
      setInitialized(true);
      setItemSelections(createShipOrderItemSelections(orderData, shipments ?? []));
      form.reset(formValues);
    });
  }, [orderData, shipments, shipmentsLoading, initialized, form, resetAddress]);

  // Re-sync when orderData refetches and availableQty decreased (compare orderData only; avoid itemSelections in deps)
  useEffect(() => {
    if (!orderData?.lineItems || shipmentsLoading || !initialized) return;
    const availableQtyByLineItem = getShipOrderAvailableQtyByLineItem(orderData, shipments ?? []);
    const prev = prevAvailableQtyRef.current;
    const anyDecreased = Array.from(availableQtyByLineItem.entries()).some(
      ([id, qty]) => (prev.get(id) ?? qty) > qty
    );
    prevAvailableQtyRef.current = availableQtyByLineItem;
    if (anyDecreased) {
      globalThis.queueMicrotask(() => setInitialized(false));
    }
  }, [orderData, shipments, shipmentsLoading, initialized]);

  const isPending =
    createShipmentMutation.isPending ||
    markShippedMutation.isPending ||
    shippingCostAmendmentPending;

  const handleFormDialogOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        if (step === "confirm") {
          setStep("form");
          return;
        }
        if (isPending) return;
        handleOpenChange(false);
      } else {
        onOpenChange(newOpen);
      }
    },
    [step, isPending, handleOpenChange, onOpenChange]
  );

  // Handle item selection toggle
  const handleItemToggle = useCallback((lineItemId: string) => {
    setItemSelections((prev) => toggleShipOrderItemSelection(prev, lineItemId));
  }, []);

  // Handle quantity change
  const handleQtyChange = useCallback(
    (lineItemId: string, delta: number) => {
      setItemSelections((prev) => changeShipOrderItemQuantity(prev, lineItemId, delta));
    },
    []
  );

  // Handle serial number change (for SerialPicker)
  const handleSerialsChange = useCallback(
    (lineItemId: string, serials: string[]) => {
      setItemSelections((prev) => changeShipOrderItemSerials(prev, lineItemId, serials));
    },
    []
  );

  // Select all items
  const handleSelectAll = useCallback(() => {
    setItemSelections(selectAllShipOrderItems);
  }, []);

  const carrierLabel = getShipOrderCarrierLabel(form.state.values);

  const handleDialogOpenChange = createPendingDialogOpenChangeHandler(isPending, handleOpenChange);

  if (orderLoading || shipmentsLoading || itemSelections.length === 0 || totalAvailableQty === 0) {
    return (
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent
          className="max-w-5xl sm:max-w-5xl max-h-[90vh] overflow-y-auto"
          onEscapeKeyDown={(e) => {
            if (isPending) e.preventDefault();
          }}
          onInteractOutside={(e) => {
            if (isPending) e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" aria-hidden />
              Create Shipment
            </DialogTitle>
            <DialogDescription>
              {orderLoading || shipmentsLoading
                ? "Loading order..."
                : itemSelections.length === 0
                  ? "This order has no line items."
                  : "No picked items are ready to ship yet."}
            </DialogDescription>
          </DialogHeader>
          {orderLoading || shipmentsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="py-8 text-center space-y-4">
              <p className="text-muted-foreground">
                {itemSelections.length === 0
                  ? "This order has no line items."
                  : totalReservedQty > 0
                    ? "All currently picked items are already reserved in pending shipment drafts. Review or ship those drafts first."
                    : "No picked items are ready to ship yet. Pick items first or review existing shipments."}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {itemSelections.length > 0 && totalAvailableQty === 0 && onViewShipments && (
                  <Button
                    variant="default"
                    onClick={() => {
                      handleOpenChange(false);
                      onViewShipments();
                    }}
                  >
                    View Shipments
                  </Button>
                )}
                <Button variant="outline" onClick={() => handleOpenChange(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={handleFormDialogOpenChange}
      title={
        <span className="flex items-center gap-2">
          <Truck className="h-5 w-5" aria-hidden />
          {step === "form" ? "Create Shipment" : "Confirm Shipment"}
        </span>
      }
      description={
        <>
          <span className="block text-xs text-muted-foreground mb-1">
            Step {step === "form" ? "1" : "2"} of 2
          </span>
          {step === "form"
            ? "Select items to ship and enter carrier details"
            : "Review the details below before confirming"}
        </>
      }
      form={form}
      submitLabel={
        step === "form"
          ? needsConfirmation
            ? form.state.values.shipNow
              ? "Review & Ship"
              : "Review Shipment"
            : form.state.values.shipNow
              ? "Ship Order"
              : "Create Shipment"
          : form.state.values.shipNow
            ? "Confirm & Ship"
            : "Create Shipment"
      }
      cancelLabel={step === "form" ? "Cancel" : "Back"}
      submitDisabled={
        isPending ||
        totalItemsToShip === 0 ||
        (step === "form" && form.state.values.shipNow && !resolvedCarrier)
      }
      size="full"
      className="max-w-5xl sm:max-w-5xl max-h-[90vh] overflow-y-auto"
      resetOnClose={false}
    >
      {step === "form" ? (
          <div className="space-y-6">
            <FormFieldDisplayProvider form={form}>
            {workflowNotice && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <span className="font-medium">{workflowNotice.title}</span>{" "}
                  {workflowNotice.description}
                </AlertDescription>
              </Alert>
            )}
            {/* Item Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base">Items to Ship</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  className="h-auto py-1"
                >
                  Select All
                </Button>
              </div>

              <ShipOrderItemsTable
                items={itemSelections}
                serverItemErrors={serverItemErrors}
                onItemToggle={handleItemToggle}
                onQtyChange={handleQtyChange}
                onSerialsChange={handleSerialsChange}
              />

              {totalItemsToShip > 0 && (
                <p className="text-sm text-muted-foreground">
                  {totalItemsToShip} item{totalItemsToShip !== 1 ? "s" : ""},{" "}
                  {totalQtyToShip} unit{totalQtyToShip !== 1 ? "s" : ""} selected
                </p>
              )}
            </div>

            <Separator />

            <ShipOrderAddressSection
              form={form}
              addressOptions={addressOptions}
              selectedAddress={selectedAddress}
              onAddressSelect={handleAddressSelect}
              isExpanded={addressExpanded}
              onExpandedChange={setAddressExpanded}
              saveToOrder={saveShipmentAddressToOrder}
              onSaveToOrderChange={setSaveShipmentAddressToOrder}
            />

            <Separator />

            <ShipOrderCarrierSection form={form} resolvedCarrier={resolvedCarrier} />
            </FormFieldDisplayProvider>
          </div>
        ) : (
          <ShipOrderConfirmationStep
            values={form.state.values}
            selectedItems={selectedItems}
            totalQtyToShip={totalQtyToShip}
            totalAvailableQty={totalAvailableQty}
            remainingUnfulfilled={remainingUnfulfilled}
            isPartialShipment={isPartialShipment}
            hasAddressForDisplay={hasAddressForDisplay}
            resolvedCarrier={resolvedCarrier}
            carrierLabel={carrierLabel}
          />
        )}
    </FormDialog>
  );
});

export default ShipOrderDialog;
