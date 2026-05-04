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
  AlertCircle,
  AlertTriangle,
  Loader2,
  MapPin,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toCents } from "@/lib/currency";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createPendingDialogOpenChangeHandler } from "@/components/ui/dialog-pending-guards";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { toastSuccess, toastError } from "@/hooks";
import {
  useOrderWithCustomer,
  useOrderShipments,
  useCreateShipment,
  useMarkShipped,
  useShipmentShippingCostAmendment,
} from "@/hooks/orders";
import { SerialNumbersList } from "../components/serial-numbers-list";
import { ValidationError } from "@/lib/server/errors";
import { ordersLogger } from "@/lib/logger";
import { useTanStackForm } from "@/hooks/_shared/use-tanstack-form";
import {
  FormDialog,
  TextField,
  TextareaField,
  NumberField,
  SelectField,
  CheckboxField,
  FormField,
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
import { ShipOrderItemsTable } from "./ship-order-items-table";

const SELECT_PLACEHOLDER_VALUE = "__placeholder__";
const CARRIERS = [
  { value: "australia_post", label: "Australia Post" },
  { value: "chemcouriers", label: "Chemcouriers" },
  { value: "startrack", label: "StarTrack" },
  { value: "tnt", label: "TNT" },
  { value: "dhl", label: "DHL" },
  { value: "fedex", label: "FedEx" },
  { value: "sendle", label: "Sendle" },
  { value: "aramex", label: "Aramex" },
  { value: "toll", label: "Toll" },
  { value: "couriers_please", label: "Couriers Please" },
  { value: "other", label: "Other" },
];
const CARRIER_SERVICES: Record<string, readonly string[]> = {
  australia_post: ["Express Post", "Parcel Post", "Express Courier"],
  chemcouriers: ["Road", "Air", "Express"],
  startrack: ["Express", "Premium", "Standard"],
  tnt: ["Express", "Road Express", "Economy"],
  dhl: ["Express Worldwide", "Express Easy"],
  fedex: ["International Priority", "International Economy"],
  sendle: ["Standard", "Express"],
  aramex: ["Express", "Economy"],
  toll: ["Priority", "IPEC"],
  couriers_please: ["Standard", "Express"],
  other: [],
};
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

function resolveCarrierValue(values: Pick<ShipOrderFormData, "carrier" | "customCarrier">) {
  return (
    values.carrier === "other" ? values.customCarrier?.trim() : values.carrier?.trim()
  ) ?? "";
}

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
      if (values.shipNow && !resolveCarrierValue(values)) {
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
  const resolvedCarrier = resolveCarrierValue(form.state.values);
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
      const carrierToUse = resolveCarrierValue(values);
      const shippingCostCents =
        values.shippingCost != null &&
        typeof values.shippingCost === "number" &&
        Number.isFinite(values.shippingCost) &&
        values.shippingCost >= 0
          ? toCents(values.shippingCost)
          : undefined;

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
        const carrierLabel =
          values.carrier === "other"
            ? carrierToUse
            : CARRIERS.find((c) => c.value === values.carrier)?.label ?? carrierToUse;

        // Always close and show toast on success.
        if (remainingUnfulfilled > 0) {
          toastSuccess(
            values.shipNow ? "Shipment shipped" : "Shipment created (pending)",
            {
              description: `${totalShipped} unit${totalShipped !== 1 ? "s" : ""} ${values.shipNow ? "shipped" : "created"}. ${remainingUnfulfilled} unit${remainingUnfulfilled !== 1 ? "s" : ""} remaining — reopen to ship again.`,
            }
          );
        } else {
          if (values.shipNow) {
            toastSuccess("Shipment shipped", {
              description: `${totalShipped} unit${totalShipped !== 1 ? "s" : ""} via ${carrierLabel || "carrier"}. Inventory updated.`,
            });
          } else {
            toastSuccess("Shipment created (pending)", {
              description: `${totalShipped} unit${totalShipped !== 1 ? "s" : ""} ready to ship. Mark as shipped from the Fulfillment tab.`,
            });
          }
        }
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

  const carrier = form.state.values.carrier ?? "";
  const services = carrier ? (CARRIER_SERVICES[carrier] ?? []) : [];
  const carrierLabel =
    carrier === "other"
      ? resolvedCarrier
      : CARRIERS.find((c) => c.value === carrier)?.label ?? carrier;

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

            {/* Carrier Details */}
            <div className="space-y-4">
              <Label className="text-base">Carrier Details</Label>

              <div
                className={cn(
                  "grid gap-4",
                  carrier === "other" ? "grid-cols-1 md:grid-cols-3" : "grid-cols-2"
                )}
              >
                <form.Field name="carrier">
                  {(field) => (
                    <FormField
                      label="Carrier"
                      name={field.name}
                      error={
                        field.state.meta.isTouched && field.state.meta.errors[0]
                          ? String(field.state.meta.errors[0])
                          : undefined
                      }
                    >
                      <Select
                        value={field.state.value || SELECT_PLACEHOLDER_VALUE}
                        onValueChange={(v) => {
                          if (v === SELECT_PLACEHOLDER_VALUE) return;
                          field.handleChange(v);
                          if (v !== "other") {
                            form.setFieldValue("customCarrier", "");
                          }
                          form.setFieldValue("carrierService", "");
                        }}
                      >
                        <SelectTrigger id="carrier">
                          <SelectValue placeholder="Select carrier" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={SELECT_PLACEHOLDER_VALUE} disabled>
                            Select carrier
                          </SelectItem>
                          {CARRIERS.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>
                  )}
                </form.Field>
                {carrier === "other" && (
                  <form.Field name="customCarrier">
                    {(field) => (
                      <TextField
                        field={field}
                        label="Carrier Name"
                        placeholder="Enter carrier name"
                      />
                    )}
                  </form.Field>
                )}
                <form.Field name="carrierService">
                  {(field) => (
                    <SelectField
                      field={field}
                      label="Service"
                      options={services.map((s) => ({ value: s, label: s }))}
                      placeholder={carrier === "other" ? "No preset services" : "Select service"}
                      disabled={!carrier || carrier === "other" || services.length === 0}
                    />
                  )}
                </form.Field>
              </div>

              <form.Field name="trackingNumber">
                {(field) => (
                  <TextField
                    field={field}
                    label="Tracking Number"
                    placeholder="Enter tracking number"
                  />
                )}
              </form.Field>

              <form.Field name="shippingCost">
                {(field) => (
                  <NumberField
                    field={field}
                    label="Actual Shipping Cost ($)"
                    placeholder="0.00"
                    min={0}
                    step={0.01}
                    description="Record the actual cost charged by the carrier (optional)"
                  />
                )}
              </form.Field>

              <form.Field name="notes">
                {(field) => (
                  <TextareaField
                    field={field}
                    label="Notes (Optional)"
                    placeholder="Internal shipping notes..."
                    rows={2}
                  />
                )}
              </form.Field>
            </div>

            <Separator />

            <form.Field name="shipNow">
              {(field) => (
                <CheckboxField
                  field={field}
                  label="Mark as shipped immediately"
                  description="If unchecked, shipment will be created in pending status"
                />
              )}
            </form.Field>

            {form.state.values.shipNow && !resolvedCarrier && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please select a carrier to mark as shipped
                </AlertDescription>
              </Alert>
            )}
            </FormFieldDisplayProvider>
          </div>
        ) : (
          /* ============================================================
             CONFIRMATION STEP
             ============================================================ */
          <div className="space-y-6">
            {/* Partial Shipment Warning */}
            {isPartialShipment && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Partial shipment.</strong> Shipping{" "}
                  {totalQtyToShip} of {totalAvailableQty} available unit
                  {totalAvailableQty !== 1 ? "s" : ""}. {remainingUnfulfilled}{" "}
                  unit{remainingUnfulfilled !== 1 ? "s" : ""} will remain and
                  can be shipped separately.
                </AlertDescription>
              </Alert>
            )}

            {/* Items Summary */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <Label className="text-base">
                  Items ({totalQtyToShip} unit
                  {totalQtyToShip !== 1 ? "s" : ""})
                </Label>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right w-24">Qty</TableHead>
                      <TableHead className="w-40">Serials</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedItems.map((item) => (
                      <TableRow key={item.lineItemId}>
                        <TableCell>
                          <p className="font-medium">{item.productName}</p>
                          {item.sku && (
                            <p className="text-xs text-muted-foreground">
                              SKU: {item.sku}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {item.selectedQty}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {item.selectedSerials.length > 0 ? (
                            <SerialNumbersList serials={item.selectedSerials} />
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Address Summary */}
            {hasAddressForDisplay && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-base">Ship To</Label>
                  </div>
                  <div className="rounded-lg border p-3 text-sm">
                    {form.state.values.addressName && (
                      <p className="font-medium">{form.state.values.addressName}</p>
                    )}
                    {form.state.values.addressStreet1 && (
                      <p>{form.state.values.addressStreet1}</p>
                    )}
                    {form.state.values.addressStreet2 && (
                      <p>{form.state.values.addressStreet2}</p>
                    )}
                    <p>
                      {[
                        form.state.values.addressCity,
                        form.state.values.addressState,
                        form.state.values.addressPostcode,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    </p>
                    {form.state.values.addressCountry &&
                      form.state.values.addressCountry !== "AU" && (
                        <p>{form.state.values.addressCountry}</p>
                      )}
                    {form.state.values.addressPhone && (
                      <p className="text-muted-foreground mt-1">
                        {form.state.values.addressPhone}
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Carrier Summary */}
            {resolvedCarrier && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-base">Carrier</Label>
                  </div>
                  <div className="rounded-lg border p-3 text-sm space-y-1">
                    <p className="font-medium">{carrierLabel}</p>
                    {form.state.values.carrierService && (
                      <p>Service: {form.state.values.carrierService}</p>
                    )}
                    {form.state.values.trackingNumber && (
                      <p className="text-muted-foreground">
                        Tracking: {form.state.values.trackingNumber}
                      </p>
                    )}
                    {form.state.values.shippingCost != null &&
                      typeof form.state.values.shippingCost === "number" &&
                      form.state.values.shippingCost > 0 && (
                        <p className="text-muted-foreground">
                          Cost: $
                          {form.state.values.shippingCost.toFixed(2)}
                        </p>
                      )}
                  </div>
                </div>
              </>
            )}

            {/* Status badge */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Shipment will be created as:
              </span>
              <Badge
                variant={
                  form.state.values.shipNow ? "default" : "secondary"
                }
              >
                {form.state.values.shipNow
                  ? "Shipped (in transit)"
                  : "Pending"}
              </Badge>
            </div>

            {form.state.values.notes && (
              <div className="text-sm">
                <span className="text-muted-foreground">Notes:</span>{" "}
                {form.state.values.notes}
              </div>
            )}
          </div>
        )}
    </FormDialog>
  );
});

export default ShipOrderDialog;
