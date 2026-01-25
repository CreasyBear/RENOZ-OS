/**
 * AmendmentRequestDialog Component
 *
 * Dialog for requesting order amendments with reason and type selection.
 *
 * @see _Initiation/_prd/2-domains/orders/orders.prd.json (ORD-AMENDMENTS-UI)
 */

import { memo, useState, useCallback, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  FileEdit,
  Plus,
  Minus,
  DollarSign,
  AlertCircle,
  Loader2,
  Check,
  Trash2,
  ArrowRight,
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
import { formatCurrency } from "@/lib/formatters";
import { toastSuccess, toastError } from "@/hooks";
import { getOrderWithCustomer } from "@/lib/server/functions/orders";
import { requestAmendment } from "@/lib/server/functions/order-amendments";
import type { AmendmentType, ItemChange } from "@/lib/schemas/orders";

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
  action: "keep" | "modify" | "remove";
}

const AMENDMENT_TYPES: { value: AmendmentType; label: string; description: string }[] = [
  { value: "quantity_change", label: "Quantity Change", description: "Modify item quantities" },
  { value: "price_change", label: "Price Change", description: "Adjust item pricing" },
  { value: "item_add", label: "Add Item", description: "Add new line items" },
  { value: "item_remove", label: "Remove Item", description: "Remove existing items" },
  { value: "discount_change", label: "Discount", description: "Apply or modify discounts" },
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
  const queryClient = useQueryClient();

  // Form state
  const [amendmentType, setAmendmentType] = useState<AmendmentType>("quantity_change");
  const [reason, setReason] = useState("");
  const [lineItems, setLineItems] = useState<LineItemDraft[]>([]);

  // Fetch order with line items
  const { data: orderData, isLoading: orderLoading } = useQuery({
    queryKey: queryKeys.orders.withCustomer(orderId),
    queryFn: () => getOrderWithCustomer({ data: { id: orderId } }),
    enabled: open,
  });

  // Initialize line items when order loads
  useEffect(() => {
    if (orderData?.lineItems) {
      setLineItems(
        orderData.lineItems.map((item) => ({
          id: item.id,
          productId: item.productId,
          description: item.description,
          sku: item.sku,
          originalQty: item.quantity,
          originalPrice: item.unitPrice,
          newQty: item.quantity,
          newPrice: item.unitPrice,
          action: "keep" as const,
        }))
      );
    }
  }, [orderData]);

  // Calculate financial impact
  const financialImpact = useMemo(() => {
    if (!orderData) return null;

    let subtotalBefore = 0;
    let subtotalAfter = 0;

    for (const item of lineItems) {
      subtotalBefore += item.originalQty * item.originalPrice;
      if (item.action !== "remove") {
        subtotalAfter += item.newQty * item.newPrice;
      }
    }

    const taxBefore = Math.round(subtotalBefore * 0.1);
    const taxAfter = Math.round(subtotalAfter * 0.1);
    const totalBefore = subtotalBefore + taxBefore;
    const totalAfter = subtotalAfter + taxAfter;
    const difference = totalAfter - totalBefore;

    return {
      subtotalBefore,
      subtotalAfter,
      taxBefore,
      taxAfter,
      totalBefore,
      totalAfter,
      difference,
    };
  }, [orderData, lineItems]);

  // Build item changes for submission
  const buildItemChanges = useCallback((): ItemChange[] => {
    const changes: ItemChange[] = [];

    for (const item of lineItems) {
      if (item.action === "modify") {
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

  // Create amendment mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!reason.trim()) {
        throw new Error("Please provide a reason for the amendment");
      }

      const itemChanges = buildItemChanges();
      if (itemChanges.length === 0) {
        throw new Error("No changes to submit");
      }

      return requestAmendment({
        data: {
          orderId,
          amendmentType,
          reason: reason.trim(),
          changes: {
            type: amendmentType,
            description: reason.trim(),
            itemChanges,
            financialImpact: financialImpact ?? undefined,
          },
        },
      });
    },
    onSuccess: () => {
      toastSuccess("Amendment request submitted");
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.withCustomer(orderId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.amendments(orderId) });
      onOpenChange(false);
      onSuccess?.();
      // Reset form
      setAmendmentType("quantity_change");
      setReason("");
    },
    onError: (error) => {
      toastError(
        error instanceof Error ? error.message : "Failed to submit amendment"
      );
    },
  });

  // Handle quantity change
  const handleQtyChange = useCallback((itemId: string, delta: number) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const newQty = Math.max(0, item.newQty + delta);
        const hasChanged = newQty !== item.originalQty || item.newPrice !== item.originalPrice;
        return {
          ...item,
          newQty,
          action: newQty === 0 ? "remove" : hasChanged ? "modify" : "keep",
        };
      })
    );
  }, []);

  // Handle price change
  const handlePriceChange = useCallback((itemId: string, newPrice: string) => {
    const price = parseFloat(newPrice) || 0;
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const hasChanged = item.newQty !== item.originalQty || price !== item.originalPrice;
        return {
          ...item,
          newPrice: Math.round(price * 100), // Convert to cents
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

  const hasChanges = lineItems.some((item) => item.action !== "keep");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileEdit className="h-5 w-5" />
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
                      <div className="flex flex-col">
                        <span>{type.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {type.description}
                        </span>
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
                rows={3}
              />
            </div>

            <Separator />

            {/* Line Items */}
            <div className="space-y-3">
              <Label className="text-base">Line Items</Label>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right w-24">Original</TableHead>
                      <TableHead className="text-right w-32">New Qty</TableHead>
                      <TableHead className="text-right w-32">New Price</TableHead>
                      <TableHead className="text-right w-24">Line Total</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems.map((item) => (
                      <TableRow
                        key={item.id}
                        className={cn(
                          item.action === "remove" && "opacity-50 bg-destructive/5",
                          item.action === "modify" && "bg-amber-50/50"
                        )}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.description}</p>
                            {item.sku && (
                              <p className="text-xs text-muted-foreground">
                                SKU: {item.sku}
                              </p>
                            )}
                            {item.action === "modify" && (
                              <Badge variant="outline" className="mt-1 text-amber-600">
                                Modified
                              </Badge>
                            )}
                            {item.action === "remove" && (
                              <Badge variant="destructive" className="mt-1">
                                Removed
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="text-sm">
                            <p>{item.originalQty} x {formatCurrency(item.originalPrice)}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.action !== "remove" && (
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleQtyChange(item.id, -1)}
                                disabled={item.newQty <= 0}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center text-sm font-medium">
                                {item.newQty}
                              </span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleQtyChange(item.id, 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.action !== "remove" && (
                            <div className="flex items-center justify-end gap-1">
                              <DollarSign className="h-3 w-3 text-muted-foreground" />
                              <Input
                                type="number"
                                step="0.01"
                                className="w-20 h-7 text-right"
                                value={(item.newPrice / 100).toFixed(2)}
                                onChange={(e) => handlePriceChange(item.id, e.target.value)}
                              />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {item.action !== "remove"
                            ? formatCurrency(item.newQty * item.newPrice)
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {item.action === "remove" ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleRestoreItem(item.id)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
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

            <Separator />

            {/* Financial Impact */}
            {financialImpact && (
              <div className="space-y-3">
                <Label className="text-base">Estimated Impact</Label>
                <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Before</p>
                    <p className="text-lg font-semibold">
                      {formatCurrency(financialImpact.totalBefore)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Subtotal: {formatCurrency(financialImpact.subtotalBefore)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      GST: {formatCurrency(financialImpact.taxBefore)}
                    </p>
                  </div>
                  <div className="flex items-center justify-center">
                    <ArrowRight className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">After</p>
                    <p className="text-lg font-semibold">
                      {formatCurrency(financialImpact.totalAfter)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Subtotal: {formatCurrency(financialImpact.subtotalAfter)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      GST: {formatCurrency(financialImpact.taxAfter)}
                    </p>
                  </div>
                </div>
                <div
                  className={cn(
                    "text-center font-medium",
                    financialImpact.difference > 0 && "text-green-600",
                    financialImpact.difference < 0 && "text-red-600"
                  )}
                >
                  Difference: {financialImpact.difference >= 0 ? "+" : ""}
                  {formatCurrency(financialImpact.difference)}
                </div>
              </div>
            )}

            {!hasChanges && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Make changes to line items above to create an amendment request
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={
              createMutation.isPending ||
              !hasChanges ||
              !reason.trim()
            }
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Submit Request
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

export default AmendmentRequestDialog;
