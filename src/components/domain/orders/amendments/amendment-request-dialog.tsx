/**
 * AmendmentRequestDialog Component
 *
 * Dialog for requesting order amendments with a clean, inline-editing interface
 * similar to the order creation wizard.
 *
 * Supports:
 * - quantity_change: Modify item quantities
 * - price_change: Adjust item pricing
 * - item_add: Add new line items (with product search)
 * - item_remove: Remove existing items
 * - discount_change: Apply or modify order-level discounts
 * - shipping_change: Adjust shipping charges
 */

import { memo, useState, useCallback, useEffect, useMemo, startTransition } from "react";
import { Link } from "@tanstack/react-router";
import {
  FileEdit,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
  Check,
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useOrgFormat } from "@/hooks/use-org-format";
import { toastSuccess, toastError } from "@/hooks";
import {
  useOrderWithCustomer,
  useRequestAmendment,
  useApproveAmendment,
  useApplyAmendment,
} from "@/hooks/orders";
import { useDebounce } from "@/hooks/_shared/use-debounce";
import { useSearchProducts } from "@/hooks/products";
import type { ProductSearchHit } from "@/lib/schemas/products";
import type { AmendmentType, ItemChange, FinancialImpact, Amendment } from "@/lib/schemas/orders";

// ============================================================================
// TYPES
// ============================================================================

export interface AmendmentRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  onSuccess?: () => void;
}

interface LineItemDraft {
  id: string;
  productId: string | null;
  description: string;
  sku: string | null;
  originalQty: number;
  originalPrice: number;
  newQty: number;
  newPrice: number;
  action: "keep" | "modify" | "remove" | "add";
}

// Only show types that are actually implemented in the UI
const AMENDMENT_TYPES: { value: AmendmentType; label: string; description: string; icon: typeof Package }[] = [
  { value: "quantity_change", label: "Quantity Change", description: "Modify item quantities", icon: Package },
  { value: "price_change", label: "Price Change", description: "Adjust item pricing", icon: Tag },
  { value: "item_add", label: "Add Item", description: "Add new line items", icon: Plus },
  { value: "item_remove", label: "Remove Item", description: "Remove existing items", icon: Trash2 },
  { value: "discount_change", label: "Discount", description: "Apply order-level discounts", icon: Percent },
  { value: "shipping_change", label: "Shipping Cost", description: "Adjust shipping charges", icon: Truck },
];

// ============================================================================
// COMPONENT
// ============================================================================

export const AmendmentRequestDialog = memo(function AmendmentRequestDialog({
  open,
  onOpenChange,
  orderId,
  onSuccess,
}: AmendmentRequestDialogProps) {
  const { formatCurrency } = useOrgFormat();
  const formatCurrencyDisplay = (amount: number) =>
    formatCurrency(amount, { cents: false, showCents: true });

  // Form state
  const [amendmentType, setAmendmentType] = useState<AmendmentType>("quantity_change");
  const [reason, setReason] = useState("");
  const [lineItems, setLineItems] = useState<LineItemDraft[]>([]);
  const [newShippingAmount, setNewShippingAmount] = useState<number | "">("");
  const [newDiscountPercent, setNewDiscountPercent] = useState<number | "">("");
  const [newDiscountAmount, setNewDiscountAmount] = useState<number | "">("");

  // Product search state (for item_add)
  const [productSearch, setProductSearch] = useState("");
  const debouncedSearch = useDebounce(productSearch, 300);
  const { data: searchResultsData, isFetching: isSearching } = useSearchProducts({
    query: debouncedSearch,
    limit: 10,
    enabled: amendmentType === "item_add" && debouncedSearch.length >= 2,
  });
  const searchResults = useMemo(
    (): ProductSearchHit[] =>
      searchResultsData?.results?.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku ?? null,
        basePrice: p.basePrice ?? null,
      })) ?? [],
    [searchResultsData?.results]
  );

  // Fetch order with line items using hook
  const { data: orderData, isLoading: orderLoading } = useOrderWithCustomer({
    orderId,
    enabled: open,
  });

  // Request amendment mutation hook
  const requestAmendmentMutation = useRequestAmendment();
  const approveAmendmentMutation = useApproveAmendment();
  const applyAmendmentMutation = useApplyAmendment();
  const isSubmitting =
    requestAmendmentMutation.isPending ||
    approveAmendmentMutation.isPending ||
    applyAmendmentMutation.isPending;

  // Initialize form when order loads or type changes
  useEffect(() => {
    if (!orderData) return;

    startTransition(() => {
      // Reset to original line items
      const originalItems = orderData.lineItems?.map((item) => ({
        id: item.id,
        productId: item.productId || null,
        description: item.description,
        sku: item.sku || null,
        originalQty: item.quantity,
        originalPrice: item.unitPrice,
        newQty: item.quantity,
        newPrice: item.unitPrice,
        action: "keep" as const,
      })) || [];

      setLineItems(originalItems);

      // Initialize other fields from order data
      if (orderData.shippingAmount !== undefined) {
        setNewShippingAmount(orderData.shippingAmount);
      }
      if (orderData.discountPercent !== undefined && orderData.discountPercent !== null) {
        setNewDiscountPercent(orderData.discountPercent);
      }
      if (orderData.discountAmount !== undefined) {
        setNewDiscountAmount(orderData.discountAmount);
      }
    });
  }, [orderData]);

  // Calculate financial impact
  const financialImpact = useMemo(() => {
    if (!orderData) return null;

    const shippingBefore = orderData.shippingAmount || 0;
    const shippingAfter =
      amendmentType === "shipping_change" && newShippingAmount !== ""
        ? Number(newShippingAmount)
        : shippingBefore;

    const discountPercentBefore = orderData.discountPercent || 0;
    const discountAmountBefore = orderData.discountAmount || 0;

    const discountPercentAfter = amendmentType === "discount_change" && newDiscountPercent !== ""
      ? Number(newDiscountPercent)
      : discountPercentBefore;

    const discountAmountAfter =
      amendmentType === "discount_change" && newDiscountAmount !== ""
        ? Number(newDiscountAmount)
        : discountAmountBefore;

    // Calculate line item totals
    let lineSubtotalBefore = 0;
    let lineSubtotalAfter = 0;

    for (const item of lineItems) {
      if (item.action !== "add") {
        lineSubtotalBefore += item.originalQty * item.originalPrice;
      }
      if (item.action !== "remove") {
        lineSubtotalAfter += item.newQty * item.newPrice;
      }
    }

    // Apply percentage discount
    const percentDiscountBefore = Math.round(lineSubtotalBefore * (discountPercentBefore / 100));
    const percentDiscountAfter = Math.round(lineSubtotalAfter * (discountPercentAfter / 100));

    const totalDiscountBefore = percentDiscountBefore + discountAmountBefore;
    const totalDiscountAfter = percentDiscountAfter + discountAmountAfter;

    const subtotalBefore = lineSubtotalBefore - totalDiscountBefore;
    const subtotalAfter = lineSubtotalAfter - totalDiscountAfter;

    // GST on (subtotal + shipping)
    const taxableBefore = subtotalBefore + shippingBefore;
    const taxableAfter = subtotalAfter + shippingAfter;

    const taxBefore = Math.round(taxableBefore * 0.1);
    const taxAfter = Math.round(taxableAfter * 0.1);

    const totalBefore = taxableBefore + taxBefore;
    const totalAfter = taxableAfter + taxAfter;
    const difference = totalAfter - totalBefore;

    return {
      lineSubtotalBefore,
      lineSubtotalAfter,
      shippingBefore,
      shippingAfter,
      discountPercentBefore,
      discountPercentAfter,
      discountAmountBefore,
      discountAmountAfter,
      subtotalBefore,
      subtotalAfter,
      taxBefore,
      taxAfter,
      totalBefore,
      totalAfter,
      difference,
    };
  }, [orderData, lineItems, amendmentType, newShippingAmount, newDiscountPercent, newDiscountAmount]);

  // Build item changes for submission
  const buildItemChanges = useCallback((): ItemChange[] => {
    const changes: ItemChange[] = [];

    for (const item of lineItems) {
      if (item.action === "add" && item.productId) {
        changes.push({
          productId: item.productId,
          action: "add",
          after: {
            quantity: item.newQty,
            unitPrice: item.newPrice,
            description: item.description,
          },
        });
      } else if (item.action === "modify") {
        changes.push({
          orderLineItemId: item.id,
          action: "modify",
          before: {
            quantity: item.originalQty,
            unitPrice: item.originalPrice,
            description: item.description,
          },
          after: {
            quantity: item.newQty,
            unitPrice: item.newPrice,
            description: item.description,
          },
        });
      } else if (item.action === "remove") {
        changes.push({
          orderLineItemId: item.id,
          action: "remove",
          before: {
            quantity: item.originalQty,
            unitPrice: item.originalPrice,
            description: item.description,
          },
        });
      }
    }

    return changes;
  }, [lineItems]);

  // Handle create amendment using hook
  const handleSubmitRequest = async () => {
    if (!reason.trim()) {
      toastError("Please provide a reason for the amendment");
      return;
    }

    // Validate based on amendment type
    if (amendmentType === "shipping_change") {
      if (newShippingAmount === "" || isNaN(Number(newShippingAmount))) {
        toastError("Please enter a valid shipping amount");
        return;
      }
    } else if (amendmentType === "discount_change") {
      if (newDiscountPercent === "" && newDiscountAmount === "") {
        toastError("Please enter a discount percentage or amount");
        return;
      }
    } else {
      const itemChanges = buildItemChanges();
      const hasValidChanges = itemChanges.length > 0;
      if (!hasValidChanges) {
        toastError("No changes to submit");
        return;
      }
    }

    const changes: {
      type: string;
      description: string;
      itemChanges?: ItemChange[];
      shippingAmount?: number;
      discountPercent?: number;
      discountAmount?: number;
      financialImpact?: FinancialImpact;
    } = {
      type: amendmentType,
      description: reason.trim(),
      financialImpact: financialImpact ?? undefined,
    };

    // Add type-specific changes
    if (amendmentType === "shipping_change") {
      changes.shippingAmount = Number(newShippingAmount);
    } else if (amendmentType === "discount_change") {
      if (newDiscountPercent !== "") changes.discountPercent = Number(newDiscountPercent);
      if (newDiscountAmount !== "") changes.discountAmount = Number(newDiscountAmount);
    } else {
      changes.itemChanges = buildItemChanges();
    }

    try {
      const amendment = (await requestAmendmentMutation.mutateAsync({
        orderId,
        amendmentType,
        reason: reason.trim(),
        changes,
      })) as Amendment;

      await approveAmendmentMutation.mutateAsync({
        amendmentId: amendment.id,
      });

      await applyAmendmentMutation.mutateAsync({
        amendmentId: amendment.id,
      });

      toastSuccess("Amendment approved and applied");
      onOpenChange(false);
      onSuccess?.();
      // Reset form
      setAmendmentType("quantity_change");
      setReason("");
      setNewShippingAmount("");
      setNewDiscountPercent("");
      setNewDiscountAmount("");
      setProductSearch("");
    } catch (error) {
      toastError(
        error instanceof Error ? error.message : "Failed to submit amendment"
      );
    }
  };

  // Handle quantity change
  const handleQtyChange = useCallback((itemId: string, newQty: number) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const hasChanged = newQty !== item.originalQty || item.newPrice !== item.originalPrice;
        return {
          ...item,
          newQty: Math.max(0, newQty),
          action: hasChanged ? "modify" : "keep",
        };
      })
    );
  }, []);

  // Handle price change
  const handlePriceChange = useCallback((itemId: string, newPrice: number) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const hasChanged = item.newQty !== item.originalQty || newPrice !== item.originalPrice;
        return {
          ...item,
          newPrice: Math.max(0, newPrice),
          action: hasChanged ? "modify" : "keep",
        };
      })
    );
  }, []);

  // Handle remove item
  const handleRemoveItem = useCallback((itemId: string) => {
    setLineItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, action: "remove", newQty: 0 } : item
      )
    );
  }, []);

  // Handle restore item
  const handleRestoreItem = useCallback((itemId: string) => {
    setLineItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              action: "keep",
              newQty: item.originalQty,
              newPrice: item.originalPrice,
            }
          : item
      )
    );
  }, []);

  // Handle add product from search
  const handleAddProduct = useCallback((product: ProductSearchHit) => {
    const newItem: LineItemDraft = {
      id: `new-${Date.now()}`,
      productId: product.id,
      description: product.name,
      sku: product.sku,
      originalQty: 0,
      originalPrice: 0,
      newQty: 1,
      newPrice: product.basePrice || 0,
      action: "add",
    };
    setLineItems((prev) => [...prev, newItem]);
    setProductSearch("");
  }, []);

  // Handle remove added item
  const handleRemoveAddedItem = useCallback((itemId: string) => {
    setLineItems((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  // Check if there are changes based on amendment type
  const hasChanges = useMemo(() => {
    switch (amendmentType) {
      case "shipping_change":
        return (
          newShippingAmount !== "" &&
          Number(newShippingAmount) !== (orderData?.shippingAmount || 0)
        );
      case "discount_change": {
        const pctChanged = newDiscountPercent !== "" && Number(newDiscountPercent) !== (orderData?.discountPercent || 0);
        const amtChanged =
          newDiscountAmount !== "" &&
          Number(newDiscountAmount) !== (orderData?.discountAmount || 0);
        return pctChanged || amtChanged;
      }
      case "item_add":
        return lineItems.some((item) => item.action === "add");
      case "item_remove":
        return lineItems.some((item) => item.action === "remove");
      default:
        return lineItems.some((item) => item.action === "modify" || item.action === "remove");
    }
  }, [amendmentType, lineItems, newShippingAmount, newDiscountPercent, newDiscountAmount, orderData]);

  // Get the icon for current amendment type
  const CurrentIcon = AMENDMENT_TYPES.find(t => t.value === amendmentType)?.icon || FileEdit;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CurrentIcon className="h-5 w-5" />
            Request Order Amendment
          </DialogTitle>
          <DialogDescription>
            Request changes to order {orderData?.orderNumber || "..."}
          </DialogDescription>
        </DialogHeader>

        {orderLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Amendment Type */}
            <div className="space-y-2">
              <Label htmlFor="amendment-type">Amendment Type</Label>
              <Select
                value={amendmentType}
                onValueChange={(v) => setAmendmentType(v as AmendmentType)}
              >
                <SelectTrigger id="amendment-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {AMENDMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        <div className="flex flex-col">
                          <span>{type.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {type.description}
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Amendment</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why this amendment is needed..."
                rows={2}
              />
            </div>

            <Separator />

            {/* LINE ITEMS SECTION (quantity, price, remove, add) */}
            {(amendmentType === "quantity_change" ||
              amendmentType === "price_change" ||
              amendmentType === "item_remove") && (
              <div className="space-y-3">
                <Label className="text-base">Line Items</Label>

                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right w-28">Original</TableHead>
                        <TableHead className="text-right w-32">
                          {amendmentType === "quantity_change" ? "New Qty" : "New Price"}
                        </TableHead>
                        <TableHead className="text-right w-28">New Total</TableHead>
                        <TableHead className="w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lineItems.map((item) => (
                        <TableRow
                          key={item.id}
                          className={cn(
                            item.action === "remove" && "opacity-50 bg-destructive/5 line-through"
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
                          <TableCell>
                            {item.action !== "remove" ? (
                              <div className="flex justify-end">
                                <Input
                                  type="number"
                                  min={0}
                                  step={amendmentType === "quantity_change" ? 1 : 0.01}
                                  value={
                                    amendmentType === "quantity_change"
                                      ? item.newQty
                                      : item.newPrice
                                  }
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    if (amendmentType === "quantity_change") {
                                      handleQtyChange(item.id, val);
                                    } else {
                                      handlePriceChange(item.id, val);
                                    }
                                  }}
                                  className={cn(
                                    "w-24 text-right",
                                    amendmentType === "quantity_change"
                                      ? item.newQty !== item.originalQty && "border-amber-500"
                                      : item.newPrice !== item.originalPrice && "border-amber-500"
                                  )}
                                />
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
                              >
                                Restore
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleRemoveItem(item.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* ADD ITEMS SECTION */}
            {amendmentType === "item_add" && (
              <div className="space-y-3">
                <Label className="text-base">Add Products</Label>

                {/* Product Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products by name or SKU..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="pl-9"
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="border rounded-lg divide-y">
                    {searchResults.map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer"
                        onClick={() => handleAddProduct(product)}
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
                          <Button size="sm" variant="secondary">
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Added Items */}
                {lineItems.some(item => item.action === "add") && (
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
                          {lineItems.filter(item => item.action === "add").map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>
                                <p className="font-medium">{item.description}</p>
                                {item.sku && <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>}
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min={1}
                                  value={item.newQty}
                                  onChange={(e) => handleQtyChange(item.id, Number(e.target.value))}
                                  className="w-20 text-right"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step={0.01}
                                  min={0}
                                  value={item.newPrice}
                                  onChange={(e) =>
                                    handlePriceChange(item.id, Number(e.target.value))
                                  }
                                  className="w-24 text-right"
                                />
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => handleRemoveAddedItem(item.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* SHIPPING COST SECTION */}
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
                      <p className="text-sm text-muted-foreground mb-1">New Shipping</p>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">$</span>
                        <Input
                          type="number"
                          step={0.01}
                          min={0}
                          placeholder="0.00"
                          value={newShippingAmount}
                          onChange={(e) => setNewShippingAmount(e.target.value === "" ? "" : Number(e.target.value))}
                          className={cn(
                            "w-32 text-lg",
                            newShippingAmount !== "" &&
                              Number(newShippingAmount) !== (orderData?.shippingAmount || 0) &&
                              "border-amber-500"
                          )}
                        />
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    GST will be recalculated automatically based on the new shipping amount.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* DISCOUNT SECTION */}
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
                      <Label>Discount Percentage</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={0.5}
                          placeholder={String(orderData?.discountPercent || 0)}
                          value={newDiscountPercent}
                          onChange={(e) => setNewDiscountPercent(e.target.value === "" ? "" : Number(e.target.value))}
                          className={cn(
                            "w-32",
                            newDiscountPercent !== "" && Number(newDiscountPercent) !== (orderData?.discountPercent || 0) && "border-amber-500"
                          )}
                        />
                        <span className="text-muted-foreground">%</span>
                      </div>
                      {newDiscountPercent !== "" && Number(newDiscountPercent) > 0 && financialImpact && (
                        <p className="text-sm text-green-600">
                          Saves {formatCurrencyDisplay(Math.round(financialImpact.lineSubtotalAfter * (Number(newDiscountPercent) / 100)))}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Fixed Discount Amount</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">$</span>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          placeholder={
                            orderData?.discountAmount
                              ? orderData.discountAmount.toFixed(2)
                              : "0.00"
                          }
                          value={newDiscountAmount}
                          onChange={(e) => setNewDiscountAmount(e.target.value === "" ? "" : Number(e.target.value))}
                          className={cn(
                            "w-32",
                            newDiscountAmount !== "" &&
                              Number(newDiscountAmount) !== (orderData?.discountAmount || 0) &&
                              "border-amber-500"
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* FINANCIAL IMPACT */}
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

            {/* EMPTY STATE ALERTS */}
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
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmitRequest}
            disabled={
              isSubmitting ||
              !hasChanges ||
              !reason.trim()
            }
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Applying...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Approve & Apply
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

export default AmendmentRequestDialog;
