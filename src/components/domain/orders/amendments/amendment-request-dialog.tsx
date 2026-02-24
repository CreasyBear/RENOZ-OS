/**
 * AmendmentRequestDialog (Presenter)
 *
 * Pure UI component for the amendment request dialog. Receives all data and
 * handlers from AmendmentRequestDialogContainer. No data fetching or mutations.
 *
 * Supports:
 * - quantity_change: Modify item quantities
 * - price_change: Adjust item pricing
 * - item_add: Add new line items (with product search)
 * - item_remove: Remove existing items
 * - discount_change: Apply or modify order-level discounts
 * - shipping_change: Adjust shipping charges
 *
 * @see docs/design-system/FORM-STANDARDS.md
 * @see STANDARDS.md - Container/Presenter pattern
 */

import { memo } from "react";
import { Link } from "@tanstack/react-router";
import {
  FileEdit,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Package,
  Tag,
  Truck,
  Percent,
  Search,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createPendingDialogInteractionGuards,
  createPendingDialogOpenChangeHandler,
} from "@/components/ui/dialog-pending-guards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import {
  FormDialog,
  SelectField,
  TextareaField,
  NumberField,
} from "@/components/shared/forms";
import type { FormFieldWithType } from "@/components/shared/forms/types";
import type { ProductSearchHit } from "@/lib/schemas/products";
import type { AmendmentType } from "@/lib/schemas/orders";
import type { AmendmentFormLineItem, AmendmentRequestFormData } from "@/lib/schemas/orders/amendment-request-form";
import { PickItemsDialog } from "../fulfillment/pick-items-dialog";
import type { OrderWithCustomer } from "@/hooks/orders/use-order-detail";
import type { useTanStackForm } from "@/hooks/_shared/use-tanstack-form";

// ============================================================================
// TYPES
// ============================================================================

export type AmendmentRequestDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: OrderWithCustomer | undefined;
  orderId: string;
  mode: "request-and-apply" | "request-only";
  onSuccess?: () => void;
  form: ReturnType<typeof useTanStackForm<AmendmentRequestFormData>>;
  formatCurrencyDisplay: (amount: number) => string;
  submitError: string | null;
  isSubmitting: boolean;
  showPickOverlay: boolean;
  setShowPickOverlay: (v: boolean) => void;
  productSearch: string;
  setProductSearch: (v: string) => void;
  searchResults: ProductSearchHit[];
  isSearching: boolean;
  handleQtyChange: (itemId: string, val: number) => void;
  handlePriceChange: (itemId: string, val: number) => void;
  handleRemoveItem: (itemId: string) => void;
  handleRestoreItem: (itemId: string) => void;
  handleAddProduct: (product: ProductSearchHit) => void;
  handleRemoveAddedItem: (itemId: string) => void;
  computeFinancialImpact: (params: {
    lineItems: AmendmentFormLineItem[];
    amendmentType: AmendmentType;
    newShippingAmount?: number;
    newDiscountPercent?: number;
    newDiscountAmount?: number;
  }) => {
    lineSubtotalBefore: number;
    lineSubtotalAfter: number;
    shippingBefore: number;
    shippingAfter: number;
    discountPercentBefore: number;
    discountPercentAfter: number;
    discountAmountBefore: number;
    discountAmountAfter: number;
    subtotalBefore: number;
    subtotalAfter: number;
    taxBefore: number;
    taxAfter: number;
    totalBefore: number;
    totalAfter: number;
    difference: number;
  } | null;
};

type AmendmentTypeOption = { value: AmendmentType; label: string; description: string; icon: typeof Package };

// Line item qty/price fields that use form.Field for validation while syncing action on change
function LineItemQtyField({
  form,
  index,
  item,
  onQtyChange,
  className,
}: {
  form: ReturnType<typeof useTanStackForm<AmendmentRequestFormData>>;
  index: number;
  item: AmendmentFormLineItem;
  onQtyChange: (itemId: string, val: number) => void;
  className?: string;
}) {
  return (
    <form.Field name={`lineItems[${index}].newQty`}>
      {(field) => {
        const originalHandleChange = field.handleChange;
        return (
          <NumberField
            field={
              {
                ...field,
                handleChange: (val: number | null | undefined) => {
                  const num = val ?? 0;
                  originalHandleChange(num);
                  onQtyChange(item.id, num);
                },
              } as FormFieldWithType<number | null | undefined>
            }
            label=""
            hideLabel
            min={0}
            step={1}
            className={className}
          />
        );
      }}
    </form.Field>
  );
}

function LineItemPriceField({
  form,
  index,
  item,
  onPriceChange,
  className,
}: {
  form: ReturnType<typeof useTanStackForm<AmendmentRequestFormData>>;
  index: number;
  item: AmendmentFormLineItem;
  onPriceChange: (itemId: string, val: number) => void;
  className?: string;
}) {
  return (
    <form.Field name={`lineItems[${index}].newPrice`}>
      {(field) => {
        const originalHandleChange = field.handleChange;
        return (
          <NumberField
            field={
              {
                ...field,
                handleChange: (val: number | null | undefined) => {
                  const num = val ?? 0;
                  originalHandleChange(num);
                  onPriceChange(item.id, num);
                },
              } as FormFieldWithType<number | null | undefined>
            }
            label=""
            hideLabel
            min={0}
            step={0.01}
            className={className}
          />
        );
      }}
    </form.Field>
  );
}

const AMENDMENT_TYPES: AmendmentTypeOption[] = [
  { value: "quantity_change", label: "Quantity Change", description: "Modify item quantities", icon: Package },
  { value: "price_change", label: "Price Change", description: "Adjust item pricing", icon: Tag },
  { value: "item_add", label: "Add Item", description: "Add new line items", icon: Plus },
  { value: "item_remove", label: "Remove Item", description: "Remove existing items", icon: Trash2 },
  { value: "discount_change", label: "Discount", description: "Apply order-level discounts", icon: Percent },
  { value: "shipping_change", label: "Shipping Cost", description: "Adjust shipping charges", icon: Truck },
];

// ============================================================================
// PRESENTER
// ============================================================================

export const AmendmentRequestDialog = memo(function AmendmentRequestDialog({
  open,
  onOpenChange,
  order,
  orderId,
  mode,
  onSuccess: _onSuccess,
  form,
  formatCurrencyDisplay,
  submitError,
  isSubmitting,
  showPickOverlay,
  setShowPickOverlay,
  productSearch,
  setProductSearch,
  searchResults,
  isSearching,
  handleQtyChange,
  handlePriceChange,
  handleRemoveItem,
  handleRestoreItem,
  handleAddProduct,
  handleRemoveAddedItem,
  computeFinancialImpact,
}: AmendmentRequestDialogProps) {
  const pendingInteractionGuards = createPendingDialogInteractionGuards(isSubmitting);
  const handleDialogOpenChange = createPendingDialogOpenChangeHandler(isSubmitting, (o) => {
    if (!o) {
      setShowPickOverlay(false);
      setProductSearch("");
    }
    onOpenChange(o);
  });

  // Loading state when order not yet available
  if (!order && open) {
    return (
      <>
        <Dialog open={open} onOpenChange={handleDialogOpenChange}>
          <DialogContent
            className="max-w-4xl sm:max-w-4xl max-h-[90vh] overflow-y-auto"
            onEscapeKeyDown={pendingInteractionGuards.onEscapeKeyDown}
            onInteractOutside={pendingInteractionGuards.onInteractOutside}
          >
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileEdit className="h-5 w-5" />
                Request Order Amendment
              </DialogTitle>
              <DialogDescription>Request changes to order...</DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </DialogContent>
        </Dialog>
        <PickItemsDialog
          open={open && showPickOverlay}
          onOpenChange={(o) => !o && setShowPickOverlay(false)}
          orderId={orderId}
          onSuccess={() => {
            setShowPickOverlay(false);
            // Do NOT call onSuccess - that closes the amendment dialog. Unpick mutation
            // already invalidates order; parent will refetch and form syncs qtyPicked.
          }}
        />
      </>
    );
  }

  const isOrderIneligible =
    order &&
    (order.status === "cancelled" ||
      (order.status === "delivered" &&
        (order.paymentStatus === "paid" || Number(order.balanceDue ?? 0) <= 0)));

  if (isOrderIneligible) {
    return (
      <>
        <Dialog open={open} onOpenChange={handleDialogOpenChange}>
          <DialogContent
            className="max-w-md"
            onEscapeKeyDown={pendingInteractionGuards.onEscapeKeyDown}
            onInteractOutside={pendingInteractionGuards.onInteractOutside}
          >
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileEdit className="h-5 w-5" />
                Request Order Amendment
              </DialogTitle>
              <DialogDescription>
                Request changes to order {order?.orderNumber ?? "..."}
              </DialogDescription>
            </DialogHeader>
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {order?.status === "cancelled"
                  ? "Cannot amend cancelled orders."
                  : "Cannot amend delivered and fully paid orders."}
              </AlertDescription>
            </Alert>
          </DialogContent>
        </Dialog>
        <PickItemsDialog
          open={open && showPickOverlay}
          onOpenChange={(o) => !o && setShowPickOverlay(false)}
          orderId={orderId}
          onSuccess={() => {
            setShowPickOverlay(false);
            // Do NOT call onSuccess - that closes the amendment dialog. Unpick mutation
            // already invalidates order; parent will refetch and form syncs qtyPicked.
          }}
        />
      </>
    );
  }

  return (
    <>
      <form.Subscribe
        selector={(state) => {
          const lineItems = state.values.lineItems;
          return {
            amendmentType: state.values.amendmentType,
            lineItems,
            newShippingAmount: state.values.newShippingAmount,
            newDiscountPercent: state.values.newDiscountPercent,
            newDiscountAmount: state.values.newDiscountAmount,
            lineItemsKey: lineItems.map((li) => `${li.id}:${li.newQty}:${li.newPrice}:${li.action}`).join("|"),
          };
        }}
      >
        {({ amendmentType, lineItems, newShippingAmount, newDiscountPercent, newDiscountAmount }) => {
          const unpickBlockedLines =
            amendmentType === "quantity_change" || amendmentType === "item_remove"
              ? lineItems.filter(
                  (item) =>
                    (item.action === "modify" || item.action === "remove") &&
                    item.qtyPicked > item.newQty
                )
              : [];

          const isUnpickBlocked = unpickBlockedLines.length > 0;
          const totalToUnpick = unpickBlockedLines.reduce(
            (sum, item) => sum + (item.qtyPicked - item.newQty),
            0
          );

          const hasChanges = (() => {
            switch (amendmentType) {
              case "shipping_change":
                return (
                  newShippingAmount != null &&
                  Number(newShippingAmount) !== (order?.shippingAmount || 0)
                );
              case "discount_change": {
                const pctChanged =
                  newDiscountPercent != null &&
                  Number(newDiscountPercent) !== (order?.discountPercent || 0);
                const amtChanged =
                  newDiscountAmount != null &&
                  Number(newDiscountAmount) !== (order?.discountAmount || 0);
                return pctChanged || amtChanged;
              }
              case "item_add":
                return lineItems.some((item) => item.action === "add");
              case "item_remove":
                return lineItems.some((item) => item.action === "remove");
              default:
                return lineItems.some(
                  (item) =>
                    item.action === "modify" ||
                    item.action === "remove" ||
                    (item.action !== "add" &&
                      (item.newQty !== item.originalQty ||
                        item.newPrice !== item.originalPrice))
                );
            }
          })();

          const CurrentIcon = AMENDMENT_TYPES.find((t) => t.value === amendmentType)?.icon || FileEdit;
          const financialImpact = computeFinancialImpact({
            lineItems,
            amendmentType,
            newShippingAmount,
            newDiscountPercent,
            newDiscountAmount,
          });

          return (
            <FormDialog
              open={open}
              onOpenChange={handleDialogOpenChange}
              title={
                <span className="flex items-center gap-2">
                  <CurrentIcon className="h-5 w-5" />
                  Request Order Amendment
                </span>
              }
              description={`Request changes to order ${order ? order.orderNumber : "..."}`}
              form={form}
              submitLabel={
                isUnpickBlocked
                  ? "Unpick first"
                  : mode === "request-only"
                    ? "Submit Request"
                    : "Approve & Apply"
              }
              loadingLabel={mode === "request-only" ? "Submitting..." : "Applying..."}
              submitError={submitError}
              submitDisabled={isSubmitting || !hasChanges || isUnpickBlocked}
              size="full"
              className="max-w-4xl sm:max-w-4xl max-h-[90vh] overflow-y-auto"
              resetOnClose={true}
              submitVariant="default"
            >
              <AmendmentFormContent
                form={form}
                orderData={order}
                amendmentType={amendmentType}
                lineItems={lineItems}
                hasChanges={hasChanges}
                formatCurrencyDisplay={formatCurrencyDisplay}
                isUnpickBlocked={isUnpickBlocked}
                totalToUnpick={totalToUnpick}
                setShowPickOverlay={setShowPickOverlay}
                productSearch={productSearch}
                setProductSearch={setProductSearch}
                searchResults={searchResults}
                isSearching={isSearching}
                handleQtyChange={handleQtyChange}
                handlePriceChange={handlePriceChange}
                handleRemoveItem={handleRemoveItem}
                handleRestoreItem={handleRestoreItem}
                handleAddProduct={handleAddProduct}
                handleRemoveAddedItem={handleRemoveAddedItem}
                financialImpact={financialImpact}
                amendmentTypes={AMENDMENT_TYPES}
              />
            </FormDialog>
          );
        }}
      </form.Subscribe>
      <PickItemsDialog
        open={open && showPickOverlay}
        onOpenChange={(o) => !o && setShowPickOverlay(false)}
        orderId={orderId}
        onSuccess={() => {
          setShowPickOverlay(false);
          // Do NOT call onSuccess - that closes the amendment dialog. Unpick mutation
          // already invalidates order; parent will refetch and form syncs qtyPicked.
        }}
      />
    </>
  );
});

// ============================================================================
// FORM CONTENT (internal presenter sub-component)
// ============================================================================

function AmendmentFormContent({
  form,
  orderData,
  amendmentType,
  lineItems,
  hasChanges,
  formatCurrencyDisplay,
  isUnpickBlocked,
  totalToUnpick,
  setShowPickOverlay,
  productSearch,
  setProductSearch,
  searchResults,
  isSearching,
  handleQtyChange,
  handlePriceChange,
  handleRemoveItem,
  handleRestoreItem,
  handleAddProduct,
  handleRemoveAddedItem,
  financialImpact,
  amendmentTypes,
}: {
  form: ReturnType<typeof useTanStackForm<AmendmentRequestFormData>>;
  orderData: OrderWithCustomer | undefined;
  amendmentType: AmendmentType;
  lineItems: AmendmentFormLineItem[];
  hasChanges: boolean;
  formatCurrencyDisplay: (amount: number) => string;
  isUnpickBlocked: boolean;
  totalToUnpick: number;
  setShowPickOverlay: (v: boolean) => void;
  productSearch: string;
  setProductSearch: (v: string) => void;
  searchResults: ProductSearchHit[];
  isSearching: boolean;
  handleQtyChange: (itemId: string, val: number) => void;
  handlePriceChange: (itemId: string, val: number) => void;
  handleRemoveItem: (itemId: string) => void;
  handleRestoreItem: (itemId: string) => void;
  handleAddProduct: (product: ProductSearchHit) => void;
  handleRemoveAddedItem: (itemId: string) => void;
  financialImpact: {
    lineSubtotalBefore: number;
    lineSubtotalAfter: number;
    shippingBefore: number;
    shippingAfter: number;
    discountPercentBefore: number;
    discountPercentAfter: number;
    discountAmountBefore: number;
    discountAmountAfter: number;
    subtotalBefore: number;
    subtotalAfter: number;
    taxBefore: number;
    taxAfter: number;
    totalBefore: number;
    totalAfter: number;
    difference: number;
  } | null;
  amendmentTypes: AmendmentTypeOption[];
}) {
  const newShippingAmount = form.state.values.newShippingAmount;
  const newDiscountPercent = form.state.values.newDiscountPercent;
  const newDiscountAmount = form.state.values.newDiscountAmount;

  return (
    <div className="space-y-6">
      <form.Field name="amendmentType">
        {(field) => (
          <SelectField
            field={field}
            label="Amendment Type"
            options={amendmentTypes.map((t) => ({ value: t.value, label: t.label }))}
            placeholder="Select type"
          />
        )}
      </form.Field>

      <form.Field name="reason">
        {(field) => (
          <TextareaField
            field={field}
            label="Reason for Amendment"
            placeholder="Explain why this amendment is needed..."
            rows={2}
            required
          />
        )}
      </form.Field>

      <Separator />

      {(amendmentType === "quantity_change" ||
        amendmentType === "price_change" ||
        amendmentType === "item_remove") && (
        <div className="space-y-3">
          <Label className="text-base">Line Items</Label>

          {isUnpickBlocked && (
            <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/30">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="flex flex-col gap-3">
                <span>
                  {totalToUnpick} unit{totalToUnpick !== 1 ? "s" : ""} already picked.
                  Unpick before applying the quantity change.
                </span>
                <Button
                  size="sm"
                  onClick={() => setShowPickOverlay(true)}
                  className="w-fit transition-colors duration-200"
                  aria-label={`Unpick ${totalToUnpick} unit${totalToUnpick !== 1 ? "s" : ""} before applying amendment`}
                >
                  <Package className="h-4 w-4 mr-2" />
                  Unpick {totalToUnpick} unit{totalToUnpick !== 1 ? "s" : ""}
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right w-28">Original</TableHead>
                  {(amendmentType === "quantity_change" || amendmentType === "item_remove") && (
                    <TableHead className="text-right w-20">Picked</TableHead>
                  )}
                  <TableHead className="text-right w-32">
                    {amendmentType === "quantity_change" ? "New Qty" : "New Price"}
                  </TableHead>
                  <TableHead className="text-right w-28">New Total</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.map((item) => {
                  const index = lineItems.findIndex((li) => li.id === item.id);
                  if (index < 0) return null;
                  return (
                  <TableRow
                    key={item.id}
                    className={cn(
                      item.action === "remove" && "opacity-50 bg-destructive/5 line-through",
                      (item.action === "modify" || item.action === "remove") &&
                        item.qtyPicked > item.newQty &&
                        "bg-amber-50 dark:bg-amber-950/20 border-l-2 border-l-amber-500"
                    )}
                  >
                    <TableCell>
                      <div>
                        <p className={cn("font-medium", item.action === "remove" && "line-through")}>
                          {item.description}
                        </p>
                        {item.sku && (
                          <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="text-sm text-muted-foreground">
                        {amendmentType === "quantity_change"
                          ? item.originalQty
                          : formatCurrencyDisplay(item.originalPrice)}
                      </div>
                    </TableCell>
                    {(amendmentType === "quantity_change" || amendmentType === "item_remove") && (
                      <TableCell className="text-right">
                        <span
                          className={cn(
                            "text-sm",
                            item.qtyPicked > 0 && "text-amber-600 dark:text-amber-400 font-medium"
                          )}
                        >
                          {item.qtyPicked}
                        </span>
                      </TableCell>
                    )}
                    <TableCell>
                      {item.action !== "remove" ? (
                        <div className="flex justify-end">
                          {(amendmentType === "quantity_change" || amendmentType === "item_remove") ? (
                            <LineItemQtyField
                              form={form}
                              index={index}
                              item={item}
                              onQtyChange={handleQtyChange}
                              className={cn(
                                "w-24 text-right",
                                item.newQty !== item.originalQty && "border-amber-500"
                              )}
                            />
                          ) : amendmentType === "price_change" ? (
                            <LineItemPriceField
                              form={form}
                              index={index}
                              item={item}
                              onPriceChange={handlePriceChange}
                              className={cn(
                                "w-24 text-right",
                                item.newPrice !== item.originalPrice && "border-amber-500"
                              )}
                            />
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {item.action !== "remove" && (
                        formatCurrencyDisplay(item.newQty * item.newPrice)
                      )}
                    </TableCell>
                    <TableCell>
                      {item.action === "remove" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRestoreItem(item.id)}
                          className="transition-colors duration-200"
                          aria-label="Restore item"
                        >
                          Restore
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 min-w-[44px] min-h-[44px] text-destructive hover:text-destructive transition-colors duration-200"
                          onClick={() => handleRemoveItem(item.id)}
                          aria-label="Remove item from amendment"
                        >
                          <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {amendmentType === "item_add" && (
        <div className="space-y-3">
          <Label className="text-base">Add Products</Label>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
            <Input
              type="search"
              placeholder="Search products by name or SKU..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="pl-9"
              aria-label="Search products to add"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {searchResults.length > 0 && (
            <div className="border rounded-lg divide-y">
              {searchResults.map((product) => (
                <div
                  key={product.id}
                  role="button"
                  tabIndex={0}
                  className="flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer transition-colors duration-200"
                  onClick={() => handleAddProduct(product)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleAddProduct(product);
                    }
                  }}
                  aria-label={`Add ${product.name} to amendment`}
                >
                  <div>
                    <Link
                      to="/products/$productId"
                      params={{ productId: product.id }}
                      className="font-medium hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {product.name}
                    </Link>
                    {product.sku && (
                      <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm">
                      {product.basePrice
                        ? formatCurrencyDisplay(product.basePrice)
                        : "No price"}
                    </span>
                    <Button size="sm" variant="secondary" className="transition-colors duration-200" tabIndex={-1} aria-hidden>
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {lineItems.some((item) => item.action === "add") && (
            <>
              <Separator />
              <Label className="text-sm text-muted-foreground">Items to Add</Label>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right w-24">Qty</TableHead>
                      <TableHead className="text-right w-28">Price</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems
                      .filter((item) => item.action === "add")
                      .map((item) => {
                        const index = lineItems.findIndex((li) => li.id === item.id);
                        if (index < 0) return null;
                        return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <p className="font-medium">{item.description}</p>
                            {item.sku && <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>}
                          </TableCell>
                          <TableCell>
                            <LineItemQtyField
                              form={form}
                              index={index}
                              item={item}
                              onQtyChange={handleQtyChange}
                              className="w-20 text-right"
                            />
                          </TableCell>
                          <TableCell>
                            <LineItemPriceField
                              form={form}
                              index={index}
                              item={item}
                              onPriceChange={handlePriceChange}
                              className="w-24 text-right"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 min-w-[44px] min-h-[44px] text-destructive transition-colors duration-200"
                              onClick={() => handleRemoveAddedItem(item.id)}
                              aria-label="Remove item from list"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      )}

      {amendmentType === "shipping_change" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Shipping Cost
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Current Shipping</p>
                <p className="text-2xl font-semibold">
                  {formatCurrencyDisplay(orderData?.shippingAmount || 0)}
                </p>
              </div>
              <div>
                <form.Field name="newShippingAmount">
                  {(field) => (
                    <NumberField
                      field={field}
                      label="New Shipping"
                      placeholder="0.00"
                      min={0}
                      step={0.01}
                      prefix="$"
                      className={cn(
                        "w-32 text-lg",
                        newShippingAmount != null &&
                          Number(newShippingAmount) !== (orderData?.shippingAmount || 0) &&
                          "border-amber-500"
                      )}
                    />
                  )}
                </form.Field>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              GST will be recalculated automatically based on the new shipping amount.
            </p>
          </CardContent>
        </Card>
      )}

      {amendmentType === "discount_change" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Order Discount
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <form.Field name="newDiscountPercent">
                  {(field) => (
                    <NumberField
                      field={field}
                      label="Discount Percentage"
                      placeholder={String(orderData?.discountPercent || 0)}
                      min={0}
                      max={100}
                      step={0.5}
                      suffix="%"
                      className={cn(
                        "w-32",
                        newDiscountPercent != null &&
                          Number(newDiscountPercent) !== (orderData?.discountPercent || 0) &&
                          "border-amber-500"
                      )}
                    />
                  )}
                </form.Field>
                {newDiscountPercent != null && Number(newDiscountPercent) > 0 && financialImpact && (
                  <p className="text-sm text-green-600">
                    Saves {formatCurrencyDisplay(Math.round(financialImpact.lineSubtotalAfter * (Number(newDiscountPercent) / 100)))}
                  </p>
                )}
              </div>
              <div>
                <form.Field name="newDiscountAmount">
                  {(field) => (
                    <NumberField
                      field={field}
                      label="Fixed Discount Amount"
                      placeholder={
                        orderData?.discountAmount
                          ? orderData.discountAmount.toFixed(2)
                          : "0.00"
                      }
                      min={0}
                      step={0.01}
                      prefix="$"
                      className={cn(
                        "w-32",
                        newDiscountAmount != null &&
                          Number(newDiscountAmount) !== (orderData?.discountAmount || 0) &&
                          "border-amber-500"
                      )}
                    />
                  )}
                </form.Field>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {financialImpact && (
        <>
          <Separator />
          <Card className="bg-muted/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Estimated Financial Impact</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase">Before</p>
                  <p className="text-xl font-semibold">{formatCurrencyDisplay(financialImpact.totalBefore)}</p>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p>Items: {formatCurrencyDisplay(financialImpact.lineSubtotalBefore)}</p>
                    {(orderData?.discountAmount || 0) > 0 && (
                      <p>Discount: -{formatCurrencyDisplay(financialImpact.discountAmountBefore || 0)}</p>
                    )}
                    <p>Shipping: {formatCurrencyDisplay(financialImpact.shippingBefore)}</p>
                    <p>GST: {formatCurrencyDisplay(financialImpact.taxBefore)}</p>
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center">
                  <ArrowRight className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase">After</p>
                  <p className="text-xl font-semibold">{formatCurrencyDisplay(financialImpact.totalAfter)}</p>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p>Items: {formatCurrencyDisplay(financialImpact.lineSubtotalAfter)}</p>
                    {(financialImpact.discountAmountAfter || financialImpact.discountPercentAfter) > 0 && (
                      <p>Discount: -{formatCurrencyDisplay(financialImpact.discountAmountAfter || 0)}</p>
                    )}
                    <p>Shipping: {formatCurrencyDisplay(financialImpact.shippingAfter)}</p>
                    <p>GST: {formatCurrencyDisplay(financialImpact.taxAfter)}</p>
                  </div>
                </div>
              </div>
              <div
                className={cn(
                  "mt-4 text-center font-medium",
                  financialImpact.difference > 0 && "text-green-600",
                  financialImpact.difference < 0 && "text-red-600"
                )}
              >
                Difference: {financialImpact.difference >= 0 ? "+" : ""}
                {formatCurrencyDisplay(financialImpact.difference)}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!hasChanges && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {amendmentType === "shipping_change" && "Enter a new shipping amount to create an amendment request"}
            {amendmentType === "discount_change" && "Enter a discount percentage or amount to create an amendment request"}
            {amendmentType === "item_add" && "Search and add products above to create an amendment request"}
            {amendmentType === "item_remove" && "Select items to remove from the order"}
            {(amendmentType === "quantity_change" || amendmentType === "price_change") && "Modify quantities or prices above to create an amendment request"}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
