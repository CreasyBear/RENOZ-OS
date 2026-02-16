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
 * @see _misc/docs/design-system/FORM-STANDARDS.md
 */

import { memo, useState, useCallback, useEffect, useRef, startTransition } from "react";
import {
  Truck,
  Plus,
  Minus,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Check,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  MapPin,
  Package,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toCents } from "@/lib/currency";
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
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { toastSuccess, toastError } from "@/hooks";
import {
  useOrderWithCustomer,
  useCreateShipment,
  useMarkShipped,
} from "@/hooks/orders";
import { SerialPicker } from "./serial-picker";
import { ValidationError } from "@/lib/server/errors";
import { ordersLogger } from "@/lib/logger";
import { useTanStackForm } from "@/hooks/_shared/use-tanstack-form";
import {
  TextField,
  TextareaField,
  NumberField,
  SelectField,
  CheckboxField,
  FormField,
} from "@/components/shared/forms";
import {
  shipOrderFormSchema,
  type ShipOrderFormData,
} from "@/lib/schemas/orders/ship-order-form";

// Inline constants for carrier/address UI (schema is source of truth for validation)
const DEFAULT_COUNTRY = "AU";
const FALLBACK_RECIPIENT_NAME = "Recipient";
const CARRIERS = [
  { value: "australia_post", label: "Australia Post" },
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
  startrack: ["Express", "Premium", "Standard"],
  tnt: ["Express", "Road Express", "Economy"],
  dhl: ["Express Worldwide", "Express Easy"],
  fedex: ["International Priority", "International Economy"],
  sendle: ["Standard", "Express"],
  aramex: ["Express", "Economy"],
  toll: ["Priority", "IPEC"],
  couriers_please: ["Standard", "Express"],
  other: ["Standard"],
};
const AU_STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];

// ============================================================================
// TYPES
// ============================================================================

export interface ShipOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  onSuccess?: () => void;
  /** When all items shipped, called when user clicks "View Shipments" to switch to fulfillment tab */
  onViewShipments?: () => void;
}

interface LineItemSelection {
  lineItemId: string;
  productName: string;
  sku: string | null;
  availableQty: number;
  selectedQty: number;
  selected: boolean;
  allocatedSerialNumbers: string[];
  selectedSerials: string[];
  isSerialized?: boolean;
  productId?: string | null;
}

// ============================================================================
// HELPERS
// ============================================================================

function getSelectedItems(selections: LineItemSelection[]): LineItemSelection[] {
  return selections.filter((item) => item.selected && item.selectedQty > 0);
}

function hasAnyAddress(
  values: Pick<
    ShipOrderFormData,
    "addressStreet1" | "addressCity" | "addressState" | "addressPostcode"
  >
): boolean {
  return !!(
    values.addressStreet1?.trim() ||
    values.addressCity?.trim() ||
    values.addressState?.trim() ||
    values.addressPostcode?.trim()
  );
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
  const [itemSelections, setItemSelections] = useState<LineItemSelection[]>([]);
  const [step, setStep] = useState<"form" | "confirm">("form");
  /** Server ValidationError per lineItemId; keys = orderLineItemId */
  const [serverItemErrors, setServerItemErrors] = useState<Record<string, string>>({});
  const [addressExpanded, setAddressExpanded] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const performCreateShipmentRef = useRef<
    (values: ShipOrderFormData) => Promise<void>
  >(null!);
  const prevAvailableQtyRef = useRef<Map<string, number>>(new Map());

  const { data: orderData, isLoading: orderLoading } = useOrderWithCustomer({
    orderId,
    enabled: open,
  });
  const createShipmentMutation = useCreateShipment();
  const markShippedMutation = useMarkShipped();

  const selectedItems = getSelectedItems(itemSelections);
  const totalQtyToShip = selectedItems.reduce((sum, i) => sum + i.selectedQty, 0);
  const totalAvailableQty = itemSelections.reduce((sum, i) => sum + i.availableQty, 0);
  const remainingUnfulfilled = totalAvailableQty - totalQtyToShip;
  const isPartialShipment = remainingUnfulfilled > 0 && totalQtyToShip > 0;
  const quantitiesChanged = itemSelections.some(
    (item) =>
      item.availableQty > 0 &&
      (item.selectedQty !== item.availableQty || !item.selected)
  );
  const needsConfirmation = isPartialShipment || quantitiesChanged;

  const form = useTanStackForm<ShipOrderFormData>({
    schema: shipOrderFormSchema,
    defaultValues: getDefaultFormValues(),
    validateOnBlur: true,
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
      if (values.shipNow && !values.carrier) {
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

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setStep("form");
        setInitialized(false);
        form.reset(getDefaultFormValues());
        setServerItemErrors({});
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange, form]
  );

  const performCreateShipment = useCallback(
    async (values: ShipOrderFormData) => {
      if (createShipmentMutation.isPending || markShippedMutation.isPending) return;
      const items = getSelectedItems(itemSelections);
      for (const item of items) {
        if (item.isSerialized && item.selectedSerials.length !== item.selectedQty) {
          toastError(
            `Select exactly ${item.selectedQty} serial number${item.selectedQty !== 1 ? "s" : ""} for "${item.productName}"`
          );
          return;
        }
      }
      // Field mapping: form addressPostcode -> API postcode; server/order uses postalCode
      const shippingAddress = hasAnyAddress(values)
        ? {
            name: values.addressName?.trim() || FALLBACK_RECIPIENT_NAME,
            street1: values.addressStreet1!.trim(),
            street2: values.addressStreet2?.trim() || undefined,
            city: values.addressCity!.trim(),
            state: values.addressState!.trim(),
            postcode: values.addressPostcode!.trim(),
            country: values.addressCountry?.trim() || DEFAULT_COUNTRY,
            phone: values.addressPhone?.trim() || undefined,
          }
        : undefined;
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
          carrier: values.carrier || undefined,
          carrierService: values.carrierService || undefined,
          trackingNumber: values.trackingNumber || undefined,
          shippingCost: shippingCostCents,
          notes: values.notes || undefined,
          shippingAddress,
          items: items.map((item) => ({
            orderLineItemId: item.lineItemId,
            quantity: item.selectedQty,
            serialNumbers:
              item.isSerialized && item.selectedSerials.length > 0
                ? item.selectedSerials
                : undefined,
          })),
        });

        if (values.shipNow && values.carrier) {
          try {
            await markShippedMutation.mutateAsync({
              id: shipment.id,
              carrier: values.carrier,
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
            handleOpenChange(false);
            onSuccess?.();
            return;
          }
        }

        const totalShipped = items.reduce((sum, i) => sum + i.selectedQty, 0);
        const carrierLabel =
          CARRIERS.find((c) => c.value === values.carrier)?.label ?? values.carrier;

        // Ship-and-continue: init effect re-syncs from orderData on refetch.
        // Custom address for first shipment would be overwritten. Split-address not supported.
        if (remainingUnfulfilled > 0) {
          setInitialized(false);
          setStep("form");
          toastSuccess(
            values.shipNow ? "Shipment shipped" : "Shipment created (pending)",
            {
              description: `${totalShipped} unit${totalShipped !== 1 ? "s" : ""} ${values.shipNow ? "shipped" : "created"}. ${remainingUnfulfilled} unit${remainingUnfulfilled !== 1 ? "s" : ""} remaining — adjust and ship again.`,
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
          handleOpenChange(false);
          onSuccess?.();
        }
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
      onSuccess,
      remainingUnfulfilled,
      handleOpenChange,
    ]
  );

  useEffect(() => {
    performCreateShipmentRef.current = performCreateShipment;
  }, [performCreateShipment]);

  // Initialize item selections and form when order first loads
  useEffect(() => {
    if (!orderData || initialized) return;
    const formValues: ShipOrderFormData = {
      ...getDefaultFormValues(),
      addressCountry: DEFAULT_COUNTRY,
    };
    if (orderData.shippingAddress) {
      const addr = orderData.shippingAddress;
      formValues.addressName = addr.contactName || orderData.customer?.name || "";
      formValues.addressStreet1 = addr.street1 || "";
      formValues.addressStreet2 = addr.street2 || "";
      formValues.addressCity = addr.city || "";
      formValues.addressState = addr.state || "";
      formValues.addressPostcode = addr.postalCode || "";
      formValues.addressCountry =
        (addr.country && addr.country.length <= 2 ? addr.country : DEFAULT_COUNTRY) ||
        DEFAULT_COUNTRY;
      formValues.addressPhone = addr.contactPhone || "";
    } else if (orderData.customer?.name) {
      formValues.addressName = orderData.customer.name;
    }
    const hasAnyAddressField = orderData.shippingAddress
      ? !!(orderData.shippingAddress.street1 || orderData.shippingAddress.city || orderData.shippingAddress.state || orderData.shippingAddress.postalCode)
      : false;
    startTransition(() => {
      setAddressExpanded(hasAnyAddressField);
      setInitialized(true);
      if (orderData.lineItems) {
        setItemSelections(
          orderData.lineItems.map((item) => {
            const allocated = (item.allocatedSerialNumbers as string[] | null) ?? [];
            const availableQty = item.quantity - item.qtyShipped;
            const initialQty = Math.max(0, availableQty);
            return {
              lineItemId: item.id,
              productName: item.description,
              sku: item.sku,
              availableQty,
              selectedQty: initialQty,
              selected: initialQty > 0,
              allocatedSerialNumbers: allocated,
              selectedSerials: allocated.slice(0, initialQty),
              isSerialized: item.product?.isSerialized ?? false,
              productId: item.productId ?? item.product?.id ?? null,
            };
          })
        );
      }
      form.reset(formValues);
    });
  }, [orderData, initialized, form]);

  // Re-sync when orderData refetches and availableQty decreased (compare orderData only; avoid itemSelections in deps)
  useEffect(() => {
    if (!orderData?.lineItems || !initialized) return;
    const availableQtyByLineItem = new Map<string, number>();
    for (const item of orderData.lineItems) {
      availableQtyByLineItem.set(
        item.id,
        Math.max(0, item.quantity - item.qtyShipped)
      );
    }
    const prev = prevAvailableQtyRef.current;
    const anyDecreased = Array.from(availableQtyByLineItem.entries()).some(
      ([id, qty]) => (prev.get(id) ?? qty) > qty
    );
    prevAvailableQtyRef.current = availableQtyByLineItem;
    if (anyDecreased) {
      globalThis.queueMicrotask(() => setInitialized(false));
    }
  }, [orderData, initialized]);

  const isPending = createShipmentMutation.isPending || markShippedMutation.isPending;

  const handleProceedToConfirm = () => {
    form.handleSubmit();
  };

  // Handle item selection toggle
  const handleItemToggle = useCallback((lineItemId: string) => {
    setItemSelections((prev) =>
      prev.map((item) =>
        item.lineItemId === lineItemId
          ? { ...item, selected: !item.selected }
          : item
      )
    );
  }, []);

  // Handle quantity change
  const handleQtyChange = useCallback(
    (lineItemId: string, delta: number) => {
      setItemSelections((prev) =>
        prev.map((item) => {
          if (item.lineItemId !== lineItemId) return item;
          const newQty = Math.max(0, Math.min(item.availableQty, item.selectedQty + delta));
          const selectedSerials =
            item.isSerialized && newQty < item.selectedSerials.length
              ? item.selectedSerials.slice(0, newQty)
              : item.selectedSerials;
          return {
            ...item,
            selectedQty: newQty,
            selected: newQty > 0,
            selectedSerials,
          };
        })
      );
    },
    []
  );

  // Handle serial number change (for SerialPicker)
  const handleSerialsChange = useCallback(
    (lineItemId: string, serials: string[]) => {
      setItemSelections((prev) =>
        prev.map((item) =>
          item.lineItemId === lineItemId ? { ...item, selectedSerials: serials } : item
        )
      );
    },
    []
  );

  // Select all items
  const handleSelectAll = useCallback(() => {
    setItemSelections((prev) =>
      prev.map((item) => ({
        ...item,
        selected: item.availableQty > 0,
        selectedQty: item.availableQty,
        selectedSerials:
          item.isSerialized && item.allocatedSerialNumbers.length > 0
            ? item.allocatedSerialNumbers.slice(0, item.availableQty)
            : item.selectedSerials,
      }))
    );
  }, []);

  const carrier = form.state.values.carrier ?? "";
  const services = carrier ? (CARRIER_SERVICES[carrier] ?? []) : [];
  const totalItemsToShip = selectedItems.length;
  const carrierLabel =
    CARRIERS.find((c) => c.value === carrier)?.label ?? carrier;
  const hasAddrForDisplay = hasAnyAddress(form.state.values);
  const addressIsCollapsible = true;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-5xl sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" aria-hidden />
            {step === "form" ? "Create Shipment" : "Confirm Shipment"}
          </DialogTitle>
          <DialogDescription>
            <span className="block text-xs text-muted-foreground mb-1">
              Step {step === "form" ? "1" : "2"} of 2
            </span>
            {step === "form"
              ? "Select items to ship and enter carrier details"
              : "Review the details below before confirming"}
          </DialogDescription>
        </DialogHeader>

        {orderLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (itemSelections.length === 0 || totalAvailableQty === 0) ? (
          <div className="py-8 text-center space-y-4">
            <p className="text-muted-foreground">
              {itemSelections.length === 0
                ? "This order has no line items."
                : "All items have been shipped. No items to ship."}
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
        ) : step === "form" ? (
          /* ============================================================
             FORM STEP
             ============================================================ */
          <div className="space-y-6">
            {/* Item Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base">Items to Ship</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  className="h-auto py-1"
                >
                  Select All
                </Button>
              </div>

              <div className="border rounded-lg overflow-x-auto overflow-y-visible">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right w-24">Available</TableHead>
                      <TableHead className="text-right w-32">Quantity</TableHead>
                      <TableHead className="w-44">Serial Numbers</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemSelections.map((item) => {
                      const needsPickFirst =
                        item.isSerialized &&
                        item.allocatedSerialNumbers.length === 0 &&
                        item.availableQty > 0;
                      return (
                      <TableRow
                        key={item.lineItemId}
                        className={cn(
                          (item.availableQty === 0 || needsPickFirst) && "opacity-50"
                        )}
                      >
                        <TableCell>
                          <Checkbox
                            checked={item.selected}
                            onCheckedChange={() =>
                              handleItemToggle(item.lineItemId)
                            }
                            disabled={
                              item.availableQty === 0 ||
                              (item.isSerialized &&
                                item.allocatedSerialNumbers.length === 0 &&
                                item.availableQty > 0)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.productName}</p>
                            {item.sku && (
                              <p className="text-xs text-muted-foreground">
                                SKU: {item.sku}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {item.availableQty === 0 ? (
                            <Badge variant="secondary">Shipped</Badge>
                          ) : (
                            item.availableQty
                          )}
                        </TableCell>
                        <TableCell>
                          {item.availableQty > 0 && (
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7 min-h-[44px] min-w-[44px] sm:h-7 sm:w-7 sm:min-h-0 sm:min-w-0"
                                onClick={() =>
                                  handleQtyChange(item.lineItemId, -1)
                                }
                                disabled={!item.selected || item.selectedQty <= 0}
                                aria-label={`Decrease quantity for ${item.productName}`}
                              >
                                <Minus className="h-3 w-3" aria-hidden />
                              </Button>
                              <span className="w-8 text-center text-sm font-medium">
                                {item.selected ? item.selectedQty : 0}
                              </span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7 min-h-[44px] min-w-[44px] sm:h-7 sm:w-7 sm:min-h-0 sm:min-w-0"
                                onClick={() =>
                                  handleQtyChange(item.lineItemId, 1)
                                }
                                disabled={
                                  !item.selected ||
                                  item.selectedQty >= item.availableQty
                                }
                                aria-label={`Increase quantity for ${item.productName}`}
                              >
                                <Plus className="h-3 w-3" aria-hidden />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.availableQty > 0 && item.selected ? (
                            item.isSerialized && item.allocatedSerialNumbers.length > 0 ? (
                              <div className="space-y-1">
                                <SerialPicker
                                  options={item.allocatedSerialNumbers.map((s) => ({
                                    serialNumber: s,
                                    locationName: undefined,
                                  }))}
                                  selectedSerials={item.selectedSerials}
                                  onChange={(serials) =>
                                    handleSerialsChange(item.lineItemId, serials)
                                  }
                                  maxSelections={item.selectedQty}
                                  disabled={item.selectedQty <= 0}
                                  ariaLabel={`Select serials for ${item.productName}`}
                                />
                                {serverItemErrors[item.lineItemId] && (
                                  <p className="text-xs text-destructive" role="alert">
                                    {serverItemErrors[item.lineItemId]}
                                  </p>
                                )}
                              </div>
                            ) : item.isSerialized && item.allocatedSerialNumbers.length === 0 ? (
                              <p className="text-xs text-amber-600">
                                Pick items first
                              </p>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                No serials required
                              </span>
                            )
                          ) : null}
                        </TableCell>
                      </TableRow>
                    );
                    })}
                  </TableBody>
                </Table>
              </div>

              {totalItemsToShip > 0 && (
                <p className="text-sm text-muted-foreground">
                  {totalItemsToShip} item{totalItemsToShip !== 1 ? "s" : ""},{" "}
                  {totalQtyToShip} unit{totalQtyToShip !== 1 ? "s" : ""} selected
                </p>
              )}
            </div>

            <Separator />

            {/* Shipping Address */}
            <div className="space-y-3">
              {addressIsCollapsible ? (
                <button
                  type="button"
                  onClick={() => setAddressExpanded(!addressExpanded)}
                  className="flex w-full items-center justify-between text-left cursor-pointer rounded-md transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-base cursor-pointer">
                      Shipping Address
                    </Label>
                    {!addressExpanded &&
                      form.state.values.addressStreet1 && (
                        <span className="text-sm text-muted-foreground">
                          — {form.state.values.addressStreet1},{" "}
                          {form.state.values.addressCity}{" "}
                          {form.state.values.addressState}{" "}
                          {form.state.values.addressPostcode}
                        </span>
                      )}
                  </div>
                  {addressExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-base">Shipping Address</Label>
                </div>
              )}

              {(addressExpanded || !addressIsCollapsible) && (
                <div className="space-y-4 rounded-lg border p-4">
                  {(form.state.values.addressStreet1 ||
                    form.state.values.addressCity ||
                    form.state.values.addressState ||
                    form.state.values.addressPostcode) &&
                    (!form.state.values.addressName ||
                      !form.state.values.addressStreet1 ||
                      !form.state.values.addressCity ||
                      !form.state.values.addressState ||
                      !form.state.values.addressPostcode) && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Address incomplete. Fill in all required fields to
                          include a shipping address.
                        </AlertDescription>
                      </Alert>
                    )}

                  <form.Field name="addressName">
                    {(field) => (
                      <TextField
                        field={field}
                        label="Recipient Name"
                        placeholder="Recipient name"
                      />
                    )}
                  </form.Field>

                  <div className="grid grid-cols-2 gap-4">
                    <form.Field name="addressStreet1">
                      {(field) => (
                        <TextField
                          field={field}
                          label="Street"
                          placeholder="Street address"
                        />
                      )}
                    </form.Field>
                    <form.Field name="addressStreet2">
                      {(field) => (
                        <TextField
                          field={field}
                          label="Unit / Suite"
                          placeholder="Unit, suite, etc."
                        />
                      )}
                    </form.Field>
                  </div>

                  <div className="grid grid-cols-[1fr_auto_auto] gap-4">
                    <form.Field name="addressCity">
                      {(field) => (
                        <TextField
                          field={field}
                          label="City"
                          placeholder="City"
                        />
                      )}
                    </form.Field>
                    <form.Field name="addressState">
                      {(field) => (
                        <SelectField
                          field={field}
                          label="State"
                          options={AU_STATES.map((s) => ({ value: s, label: s }))}
                          placeholder="State"
                        />
                      )}
                    </form.Field>
                    <form.Field name="addressPostcode">
                      {(field) => (
                        <TextField
                          field={field}
                          label="Postcode"
                          placeholder="0000"
                          className="w-[100px]"
                        />
                      )}
                    </form.Field>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <form.Field name="addressCountry">
                      {(field) => (
                        <TextField
                          field={field}
                          label="Country"
                          placeholder="AU"
                          className="w-[80px]"
                        />
                      )}
                    </form.Field>
                    <form.Field name="addressPhone">
                      {(field) => (
                        <TextField
                          field={field}
                          label="Phone"
                          placeholder="Phone number"
                          type="tel"
                        />
                      )}
                    </form.Field>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Carrier Details */}
            <div className="space-y-4">
              <Label className="text-base">Carrier Details</Label>

              <div className="grid grid-cols-2 gap-4">
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
                        value={field.state.value ?? ""}
                        onValueChange={(v) => {
                          field.handleChange(v);
                          form.setFieldValue("carrierService", "");
                        }}
                      >
                        <SelectTrigger id="carrier">
                          <SelectValue placeholder="Select carrier" />
                        </SelectTrigger>
                        <SelectContent>
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
                <form.Field name="carrierService">
                  {(field) => (
                    <SelectField
                      field={field}
                      label="Service"
                      options={services.map((s) => ({ value: s, label: s }))}
                      placeholder="Select service"
                      disabled={!carrier || services.length === 0}
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

            {form.state.values.shipNow && !carrier && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please select a carrier to mark as shipped
                </AlertDescription>
              </Alert>
            )}
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
                          {item.selectedSerials.length > 0 ? item.selectedSerials.join(", ") : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Address Summary */}
            {hasAddrForDisplay && (
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
            {carrier && (
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

        <DialogFooter>
          {step === "form" ? (
            <>
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleProceedToConfirm}
                disabled={
                  isPending ||
                  totalItemsToShip === 0 ||
                  (form.state.values.shipNow && !carrier)
                }
              >
                {needsConfirmation ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    {form.state.values.shipNow ? "Review & Ship" : "Review Shipment"}
                  </>
                ) : (
                  <>
                    <Truck className="h-4 w-4 mr-2" />
                    {form.state.values.shipNow ? "Ship Order" : "Create Shipment"}
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setStep("form")}
                disabled={isPending}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={() => form.handleSubmit()}
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {form.state.values.shipNow ? "Shipping..." : "Creating..."}
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    {form.state.values.shipNow ? "Confirm & Ship" : "Create Shipment"}
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

export default ShipOrderDialog;
