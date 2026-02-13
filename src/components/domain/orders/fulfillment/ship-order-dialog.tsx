/**
 * ShipOrderDialog Component
 *
 * Dialog for creating a shipment from an order with item selection.
 *
 * @see _Initiation/_prd/2-domains/orders/orders.prd.json (ORD-SHIPPING-UI)
 */

import { memo, useState, useCallback, useEffect, startTransition } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

// ============================================================================
// TYPES
// ============================================================================

export interface ShipOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  onSuccess?: () => void;
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

const CARRIER_SERVICES = {
  australia_post: ["Express Post", "Parcel Post", "Express Courier"],
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

const AU_STATES = [
  { value: "NSW", label: "New South Wales" },
  { value: "VIC", label: "Victoria" },
  { value: "QLD", label: "Queensland" },
  { value: "WA", label: "Western Australia" },
  { value: "SA", label: "South Australia" },
  { value: "TAS", label: "Tasmania" },
  { value: "ACT", label: "Australian Capital Territory" },
  { value: "NT", label: "Northern Territory" },
];

// ============================================================================
// COMPONENT
// ============================================================================

export const ShipOrderDialog = memo(function ShipOrderDialog({
  open,
  onOpenChange,
  orderId,
  onSuccess,
}: ShipOrderDialogProps) {
  // Form state
  const [carrier, setCarrier] = useState("");
  const [carrierService, setCarrierService] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [shippingCost, setShippingCost] = useState<number | "">("");
  const [notes, setNotes] = useState("");
  const [shipNow, setShipNow] = useState(true);
  const [itemSelections, setItemSelections] = useState<LineItemSelection[]>([]);

  // Dialog step: form → confirm → submit
  const [step, setStep] = useState<"form" | "confirm">("form");

  // Inline validation errors from server (keyed by lineItemId)
  const [inlineErrors, setInlineErrors] = useState<Record<string, string>>({});

  // Shipping address state
  const [addressName, setAddressName] = useState("");
  const [addressStreet1, setAddressStreet1] = useState("");
  const [addressStreet2, setAddressStreet2] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressState, setAddressState] = useState("");
  const [addressPostcode, setAddressPostcode] = useState("");
  const [addressCountry, setAddressCountry] = useState("AU");
  const [addressPhone, setAddressPhone] = useState("");
  const [addressExpanded, setAddressExpanded] = useState(false);

  // Fetch order with line items using hook
  const { data: orderData, isLoading: orderLoading } = useOrderWithCustomer({
    orderId,
    enabled: open,
  });

  // Mutation hooks
  const createShipmentMutation = useCreateShipment();
  const markShippedMutation = useMarkShipped();

  // Track whether we've already initialized from order data (prevents
  // 30s refetch from overwriting user edits to items/address)
  const [initialized, setInitialized] = useState(false);

  // Initialize item selections and address when order first loads
  useEffect(() => {
    if (!orderData || initialized) return;
    startTransition(() => {
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

    // Pre-populate shipping address from order data
    if (orderData.shippingAddress) {
      const addr = orderData.shippingAddress;
      setAddressName(addr.contactName || orderData.customer?.name || "");
      setAddressStreet1(addr.street1 || "");
      setAddressStreet2(addr.street2 || "");
      setAddressCity(addr.city || "");
      setAddressState(addr.state || "");
      setAddressPostcode(addr.postalCode || "");
      // Normalize country: if longer than 2 chars, default to AU
      const rawCountry = addr.country || "AU";
      setAddressCountry(rawCountry.length > 2 ? "AU" : rawCountry);
      setAddressPhone(addr.contactPhone || "");

      // Auto-expand if address has data
      const hasAnyField = addr.street1 || addr.city || addr.state || addr.postalCode;
      setAddressExpanded(!!hasAnyField);
    } else if (orderData.customer?.name) {
      setAddressName(orderData.customer.name);
    }
    });
  }, [orderData, initialized]);

  const isPending = createShipmentMutation.isPending || markShippedMutation.isPending;

  // Reset state when dialog closes so re-open re-initializes from fresh data
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setStep("form");
        setInitialized(false);
        setShippingCost("");
        setInlineErrors({});
      }
      onOpenChange(open);
    },
    [onOpenChange]
  );

  // Validate form, then either show confirmation or submit directly
  const handleProceedToConfirm = () => {
    const selectedItems = itemSelections.filter(
      (item) => item.selected && item.selectedQty > 0
    );

    if (selectedItems.length === 0) {
      toastError("Please select at least one item to ship");
      return;
    }

    // Client-side address validation
    const hasAnyAddress =
      addressStreet1.trim() || addressCity.trim() || addressState.trim() || addressPostcode.trim();
    if (hasAnyAddress) {
      const missing: string[] = [];
      if (!addressName.trim()) missing.push("recipient name");
      if (!addressStreet1.trim()) missing.push("street address");
      if (!addressCity.trim()) missing.push("city");
      if (!addressState.trim()) missing.push("state");
      if (!addressPostcode.trim()) missing.push("postcode");
      if (missing.length > 0) {
        toastError(`Shipping address incomplete: ${missing.join(", ")}`);
        setAddressExpanded(true);
        return;
      }
    }

    if (shipNow && !carrier) {
      toastError("Please select a carrier to mark as shipped");
      return;
    }

    if (needsConfirmation) {
      setStep("confirm");
    } else {
      // Full shipment, unchanged defaults — submit directly
      handleCreateShipment();
    }
  };

  // Execute shipment creation (called from confirm step)
  const handleCreateShipment = async () => {
    if (isPending) return;

    const selectedItems = itemSelections.filter(
      (item) => item.selected && item.selectedQty > 0
    );

    const hasAnyAddress =
      addressStreet1.trim() || addressCity.trim() || addressState.trim() || addressPostcode.trim();

    try {
      // Build shipping address from form state
      const shippingAddress = hasAnyAddress
        ? {
            name: addressName.trim() || "Recipient",
            street1: addressStreet1.trim(),
            street2: addressStreet2.trim() || undefined,
            city: addressCity.trim(),
            state: addressState.trim(),
            postcode: addressPostcode.trim(),
            country: addressCountry.trim() || "AU",
            phone: addressPhone.trim() || undefined,
          }
        : undefined;

      // Convert shipping cost to cents for API (integer)
      const shippingCostCents = shippingCost === "" ? undefined : toCents(shippingCost);

      // Create shipment
      const shipment = await createShipmentMutation.mutateAsync({
        orderId,
        carrier: carrier || undefined,
        carrierService: carrierService || undefined,
        trackingNumber: trackingNumber || undefined,
        shippingCost: shippingCostCents,
        notes: notes || undefined,
        shippingAddress,
        items: selectedItems.map((item) => ({
          orderLineItemId: item.lineItemId,
          quantity: item.selectedQty,
          serialNumbers:
            item.isSerialized && item.selectedSerials.length > 0
              ? item.selectedSerials
              : undefined,
        })),
      });

      // If ship now, mark as shipped
      if (shipNow && carrier) {
        try {
          await markShippedMutation.mutateAsync({
            id: shipment.id,
            carrier,
            carrierService: carrierService || undefined,
            trackingNumber: trackingNumber || undefined,
            shippingCost: shippingCostCents,
          });
        } catch {
          // Shipment was created but mark-shipped failed
          toastError(
            "Shipment created but could not be marked as shipped. " +
              "You can mark it as shipped from the Fulfillment tab."
          );
          handleOpenChange(false);
          onSuccess?.();
          return;
        }
      }

      if (shipNow) {
        toastSuccess("Shipment shipped", {
          description: `${totalQtyToShip} unit${totalQtyToShip !== 1 ? "s" : ""} via ${carrierLabel || "carrier"}. Inventory updated.`,
        });
      } else {
        toastSuccess("Shipment created (pending)", {
          description: `${totalQtyToShip} unit${totalQtyToShip !== 1 ? "s" : ""} ready to ship. Mark as shipped from the Fulfillment tab.`,
        });
      }

      handleOpenChange(false);
      onSuccess?.();
    } catch (error) {
      // createShipment failed — return to form so user can retry
      setStep("form");
      if (error instanceof ValidationError && error.errors) {
        const byLineItem: Record<string, string> = {};
        for (const [key, messages] of Object.entries(error.errors)) {
          if (messages.length > 0) byLineItem[key] = messages[0];
        }
        setInlineErrors(byLineItem);
      }
      toastError(
        error instanceof Error ? error.message : "Failed to create shipment"
      );
    }
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

  const services = carrier
    ? CARRIER_SERVICES[carrier as keyof typeof CARRIER_SERVICES] || []
    : [];

  const totalItemsToShip = itemSelections.filter(
    (item) => item.selected && item.selectedQty > 0
  ).length;
  const totalQtyToShip = itemSelections.reduce(
    (sum, item) => sum + (item.selected ? item.selectedQty : 0),
    0
  );
  const totalAvailableQty = itemSelections.reduce(
    (sum, item) => sum + item.availableQty,
    0
  );
  const remainingUnfulfilled = totalAvailableQty - totalQtyToShip;
  const isPartialShipment = remainingUnfulfilled > 0 && totalQtyToShip > 0;

  // Check if user changed quantities from defaults (all available)
  const quantitiesChanged = itemSelections.some(
    (item) =>
      item.availableQty > 0 &&
      (item.selectedQty !== item.availableQty || !item.selected)
  );

  // Confirmation step needed when: partial shipment or user changed quantities
  const needsConfirmation = isPartialShipment || quantitiesChanged;

  const selectedItems = itemSelections.filter(
    (item) => item.selected && item.selectedQty > 0
  );
  const carrierLabel =
    CARRIERS.find((c) => c.value === carrier)?.label ?? carrier;
  const hasAnyAddress =
    addressStreet1.trim() || addressCity.trim() || addressState.trim() || addressPostcode.trim();

  // Address is always collapsible — auto-expanded by useEffect when data exists
  const addressIsCollapsible = true;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            {step === "form" ? "Create Shipment" : "Confirm Shipment"}
          </DialogTitle>
          <DialogDescription>
            {step === "form"
              ? "Select items to ship and enter carrier details"
              : "Review the details below before confirming"}
          </DialogDescription>
        </DialogHeader>

        {orderLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() =>
                                  handleQtyChange(item.lineItemId, -1)
                                }
                                disabled={!item.selected || item.selectedQty <= 0}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center text-sm font-medium">
                                {item.selected ? item.selectedQty : 0}
                              </span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() =>
                                  handleQtyChange(item.lineItemId, 1)
                                }
                                disabled={
                                  !item.selected ||
                                  item.selectedQty >= item.availableQty
                                }
                              >
                                <Plus className="h-3 w-3" />
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
                                {inlineErrors[item.lineItemId] && (
                                  <p className="text-xs text-destructive">
                                    {inlineErrors[item.lineItemId]}
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
                  className="flex w-full items-center justify-between text-left"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-base cursor-pointer">
                      Shipping Address
                    </Label>
                    {!addressExpanded && addressStreet1 && (
                      <span className="text-sm text-muted-foreground">
                        — {addressStreet1}, {addressCity} {addressState}{" "}
                        {addressPostcode}
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
                  {/* Warning if address is incomplete */}
                  {(addressStreet1 ||
                    addressCity ||
                    addressState ||
                    addressPostcode) &&
                    (!addressName ||
                      !addressStreet1 ||
                      !addressCity ||
                      !addressState ||
                      !addressPostcode) && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Address incomplete. Fill in all required fields to
                          include a shipping address.
                        </AlertDescription>
                      </Alert>
                    )}

                  <div className="space-y-2">
                    <Label htmlFor="addr-name">Recipient Name</Label>
                    <Input
                      id="addr-name"
                      value={addressName}
                      onChange={(e) => setAddressName(e.target.value)}
                      placeholder="Recipient name"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="addr-street1">Street</Label>
                      <Input
                        id="addr-street1"
                        value={addressStreet1}
                        onChange={(e) => setAddressStreet1(e.target.value)}
                        placeholder="Street address"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="addr-street2">Unit / Suite</Label>
                      <Input
                        id="addr-street2"
                        value={addressStreet2}
                        onChange={(e) => setAddressStreet2(e.target.value)}
                        placeholder="Unit, suite, etc."
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-[1fr_auto_auto] gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="addr-city">City</Label>
                      <Input
                        id="addr-city"
                        value={addressCity}
                        onChange={(e) => setAddressCity(e.target.value)}
                        placeholder="City"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="addr-state">State</Label>
                      <Select
                        value={addressState}
                        onValueChange={setAddressState}
                      >
                        <SelectTrigger id="addr-state" className="w-[120px]">
                          <SelectValue placeholder="State" />
                        </SelectTrigger>
                        <SelectContent>
                          {AU_STATES.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="addr-postcode">Postcode</Label>
                      <Input
                        id="addr-postcode"
                        value={addressPostcode}
                        onChange={(e) => setAddressPostcode(e.target.value)}
                        placeholder="0000"
                        className="w-[100px]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="addr-country">Country</Label>
                      <Input
                        id="addr-country"
                        value={addressCountry}
                        onChange={(e) => setAddressCountry(e.target.value)}
                        placeholder="AU"
                        maxLength={2}
                        className="w-[80px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="addr-phone">Phone</Label>
                      <Input
                        id="addr-phone"
                        value={addressPhone}
                        onChange={(e) => setAddressPhone(e.target.value)}
                        placeholder="Phone number"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Carrier Details */}
            <div className="space-y-4">
              <Label className="text-base">Carrier Details</Label>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="carrier">Carrier</Label>
                  <Select value={carrier} onValueChange={setCarrier}>
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="service">Service</Label>
                  <Select
                    value={carrierService}
                    onValueChange={setCarrierService}
                    disabled={!carrier || services.length === 0}
                  >
                    <SelectTrigger id="service">
                      <SelectValue placeholder="Select service" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tracking">Tracking Number</Label>
                <Input
                  id="tracking"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Enter tracking number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shipping-cost">
                  Actual Shipping Cost ($)
                  <span className="text-muted-foreground font-normal ml-1">
                    (optional)
                  </span>
                </Label>
                <Input
                  id="shipping-cost"
                  type="number"
                  min={0}
                  step={0.01}
                  value={shippingCost}
                  onChange={(e) => {
                    const value = e.target.value;
                    setShippingCost(value === "" ? "" : Number(value));
                  }}
                  placeholder="0.00"
                  className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <p className="text-xs text-muted-foreground">
                  Record the actual cost charged by the carrier
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Internal shipping notes..."
                  rows={2}
                />
              </div>
            </div>

            <Separator />

            {/* Ship Now Toggle */}
            <div className="flex items-center gap-3">
              <Checkbox
                id="ship-now"
                checked={shipNow}
                onCheckedChange={(checked) => setShipNow(!!checked)}
              />
              <div>
                <Label
                  htmlFor="ship-now"
                  className="font-normal cursor-pointer"
                >
                  Mark as shipped immediately
                </Label>
                <p className="text-xs text-muted-foreground">
                  If unchecked, shipment will be created in pending status
                </p>
              </div>
            </div>

            {shipNow && !carrier && (
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
            {hasAnyAddress && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-base">Ship To</Label>
                  </div>
                  <div className="rounded-lg border p-3 text-sm">
                    {addressName && (
                      <p className="font-medium">{addressName}</p>
                    )}
                    {addressStreet1 && <p>{addressStreet1}</p>}
                    {addressStreet2 && <p>{addressStreet2}</p>}
                    <p>
                      {[addressCity, addressState, addressPostcode]
                        .filter(Boolean)
                        .join(" ")}
                    </p>
                    {addressCountry && addressCountry !== "AU" && (
                      <p>{addressCountry}</p>
                    )}
                    {addressPhone && (
                      <p className="text-muted-foreground mt-1">
                        {addressPhone}
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
                    {carrierService && <p>Service: {carrierService}</p>}
                    {trackingNumber && (
                      <p className="text-muted-foreground">
                        Tracking: {trackingNumber}
                      </p>
                    )}
                    {shippingCost !== "" && shippingCost > 0 && (
                      <p className="text-muted-foreground">
                        Cost: ${shippingCost.toFixed(2)}
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
              <Badge variant={shipNow ? "default" : "secondary"}>
                {shipNow ? "Shipped (in transit)" : "Pending"}
              </Badge>
            </div>

            {notes && (
              <div className="text-sm">
                <span className="text-muted-foreground">Notes:</span>{" "}
                {notes}
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
                  totalItemsToShip === 0 || (shipNow && !carrier)
                }
              >
                {needsConfirmation ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    {shipNow ? "Review & Ship" : "Review Shipment"}
                  </>
                ) : (
                  <>
                    <Truck className="h-4 w-4 mr-2" />
                    {shipNow ? "Ship Order" : "Create Shipment"}
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
                onClick={handleCreateShipment}
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {shipNow ? "Shipping..." : "Creating..."}
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    {shipNow ? "Confirm & Ship" : "Create Shipment"}
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
