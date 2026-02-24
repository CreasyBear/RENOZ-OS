/**
 * AmendmentRequestDialogContainer
 *
 * Container for the amendment request dialog. Handles data fetching, mutations,
 * form state, and business logic. Passes data and handlers to AmendmentRequestDialog (presenter).
 *
 * @source order from parent (OrderDetailContainer passes detail.order)
 * @source searchResults from useSearchProducts
 * @see STANDARDS.md - Container/Presenter pattern
 * @see docs/design-system/FORM-STANDARDS.md
 */

import { useState, useCallback, useEffect, useMemo, useRef, startTransition } from "react";
import { toastSuccess, toastError } from "@/hooks";
import {
  useRequestAmendment,
  useApproveAmendment,
  useApplyAmendment,
} from "@/hooks/orders";
import type { OrderWithCustomer } from "@/hooks/orders/use-order-detail";
import { useDebounce } from "@/hooks/_shared/use-debounce";
import { useSearchProducts } from "@/hooks/products";
import { useTanStackForm } from "@/hooks/_shared/use-tanstack-form";
import { useOrgFormat } from "@/hooks/use-org-format";
import type { ProductSearchHit } from "@/lib/schemas/products";
import type { AmendmentType, ItemChange, FinancialImpact, Amendment } from "@/lib/schemas/orders";
import type { AmendmentFormLineItem, AmendmentRequestFormData } from "@/lib/schemas/orders/amendment-request-form";
import { amendmentRequestFormSchema } from "@/lib/schemas/orders/amendment-request-form";
import { AmendmentRequestDialog } from "./amendment-request-dialog";

// ============================================================================
// TYPES
// ============================================================================

export interface AmendmentRequestDialogContainerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Order data from parent container (e.g. OrderDetailContainer's detail.order) */
  order: OrderWithCustomer | undefined;
  orderId: string;
  onSuccess?: () => void;
  /** When 'request-only', submit for approval without auto-approving and applying. Default: 'request-and-apply' */
  mode?: "request-and-apply" | "request-only";
}

const EMPTY_FORM_DEFAULTS: AmendmentRequestFormData = {
  amendmentType: "quantity_change",
  reason: "",
  lineItems: [],
  newShippingAmount: undefined,
  newDiscountPercent: undefined,
  newDiscountAmount: undefined,
};

function getFormDefaults(orderData: OrderWithCustomer): AmendmentRequestFormData {
  const originalItems: AmendmentFormLineItem[] =
    orderData.lineItems?.map((item) => ({
      id: item.id,
      productId: item.productId || null,
      description: item.description,
      sku: item.sku || null,
      originalQty: item.quantity,
      originalPrice: item.unitPrice,
      newQty: item.quantity,
      newPrice: item.unitPrice,
      qtyPicked: Number(item.qtyPicked) || 0,
      action: "keep" as const,
    })) ?? [];

  return {
    amendmentType: "quantity_change",
    reason: "",
    lineItems: originalItems,
    newShippingAmount: orderData.shippingAmount ?? undefined,
    newDiscountPercent: orderData.discountPercent ?? undefined,
    newDiscountAmount: orderData.discountAmount ?? undefined,
  };
}

// ============================================================================
// CONTAINER
// ============================================================================

export function AmendmentRequestDialogContainer({
  open,
  onOpenChange,
  order,
  orderId,
  onSuccess,
  mode = "request-and-apply",
}: AmendmentRequestDialogContainerProps) {
  const { formatCurrency } = useOrgFormat();
  const formatCurrencyDisplay = useCallback(
    (amount: number) => formatCurrency(amount, { cents: false, showCents: true }),
    [formatCurrency]
  );

  const [showPickOverlay, setShowPickOverlay] = useState(false);
  const hasInitialized = useRef(false);

  const requestAmendmentMutation = useRequestAmendment();
  const approveAmendmentMutation = useApproveAmendment();
  const applyAmendmentMutation = useApplyAmendment();
  const isSubmitting =
    requestAmendmentMutation.isPending ||
    approveAmendmentMutation.isPending ||
    applyAmendmentMutation.isPending;

  const [stepError, setStepError] = useState<string | null>(null);
  const submitError =
    stepError ??
    requestAmendmentMutation.error?.message ??
    approveAmendmentMutation.error?.message ??
    applyAmendmentMutation.error?.message ??
    null;

  const [productSearch, setProductSearch] = useState("");
  const debouncedSearch = useDebounce(productSearch, 300);

  const form = useTanStackForm<AmendmentRequestFormData>({
    schema: amendmentRequestFormSchema,
    defaultValues: EMPTY_FORM_DEFAULTS,
    onSubmitInvalid: () => {
      toastError("Please fix the errors below and try again.");
    },
    onSubmit: async (values) => {
      setStepError(null);
      let amendment: Amendment;
      try {
        amendment = (await requestAmendmentMutation.mutateAsync({
          orderId,
          amendmentType: values.amendmentType,
          reason: values.reason.trim(),
          changes: buildChangesFromForm(values, computeFinancialImpact({
            lineItems: values.lineItems,
            amendmentType: values.amendmentType,
            newShippingAmount: values.newShippingAmount,
            newDiscountPercent: values.newDiscountPercent,
            newDiscountAmount: values.newDiscountAmount,
          })),
        })) as Amendment;
      } catch (e) {
        setStepError(`Request failed: ${e instanceof Error ? e.message : String(e)}`);
        return;
      }
      if (mode === "request-only") {
        toastSuccess("Amendment requested and submitted for approval");
        onOpenChange(false);
        onSuccess?.();
        return;
      }
      try {
        await approveAmendmentMutation.mutateAsync({ amendmentId: amendment.id });
      } catch (e) {
        setStepError(`Approval failed: ${e instanceof Error ? e.message : String(e)}`);
        return;
      }
      try {
        await applyAmendmentMutation.mutateAsync({ amendmentId: amendment.id });
      } catch (e) {
        setStepError(e instanceof Error ? e.message : `Apply failed: ${String(e)}`);
        return;
      }
      toastSuccess("Amendment approved and applied");
      onOpenChange(false);
      onSuccess?.();
    },
  });

  const amendmentTypeForSearch = form.state.values.amendmentType;
  const { data: searchResultsData, isFetching: isSearching } = useSearchProducts({
    query: debouncedSearch,
    limit: 10,
    enabled: open && amendmentTypeForSearch === "item_add" && debouncedSearch.length >= 2,
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

  function buildItemChangesFromForm(lineItems: AmendmentFormLineItem[]): ItemChange[] {
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
      } else if (
        item.action === "modify" ||
        (item.action !== "add" &&
          item.action !== "remove" &&
          (item.newQty !== item.originalQty || item.newPrice !== item.originalPrice))
      ) {
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
  }

  function computeFinancialImpact(params: {
    lineItems: AmendmentFormLineItem[];
    amendmentType: AmendmentType;
    newShippingAmount?: number;
    newDiscountPercent?: number;
    newDiscountAmount?: number;
  }) {
    if (!order) return null;
    const { lineItems, amendmentType: amType, newShippingAmount, newDiscountPercent, newDiscountAmount } = params;

    const shippingBefore = order.shippingAmount || 0;
    const shippingAfter =
      amType === "shipping_change" && newShippingAmount != null
        ? Number(newShippingAmount)
        : shippingBefore;

    const discountPercentBefore = order.discountPercent || 0;
    const discountAmountBefore = order.discountAmount || 0;

    const discountPercentAfter =
      amType === "discount_change" && newDiscountPercent != null
        ? Number(newDiscountPercent)
        : discountPercentBefore;

    const discountAmountAfter =
      amType === "discount_change" && newDiscountAmount != null
        ? Number(newDiscountAmount)
        : discountAmountBefore;

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

    const percentDiscountBefore = Math.round(lineSubtotalBefore * (discountPercentBefore / 100));
    const percentDiscountAfter = Math.round(lineSubtotalAfter * (discountPercentAfter / 100));

    const totalDiscountBefore = percentDiscountBefore + discountAmountBefore;
    const totalDiscountAfter = percentDiscountAfter + discountAmountAfter;

    const subtotalBefore = lineSubtotalBefore - totalDiscountBefore;
    const subtotalAfter = lineSubtotalAfter - totalDiscountAfter;

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
  }

  function buildChangesFromForm(
    values: AmendmentRequestFormData,
    fin: ReturnType<typeof computeFinancialImpact>
  ) {
    const allItemChanges = buildItemChangesFromForm(values.lineItems);
    const amendmentType = values.amendmentType;

    let itemChanges: ItemChange[] = [];
    if (amendmentType === "quantity_change" || amendmentType === "price_change") {
      itemChanges = allItemChanges.filter((c) => c.action === "modify");
    } else if (amendmentType === "item_add") {
      itemChanges = allItemChanges.filter((c) => c.action === "add");
    } else if (amendmentType === "item_remove") {
      itemChanges = allItemChanges.filter((c) => c.action === "remove");
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
      description: values.reason.trim(),
      financialImpact: fin
        ? {
            subtotalBefore: fin.subtotalBefore,
            subtotalAfter: fin.subtotalAfter,
            taxBefore: fin.taxBefore,
            taxAfter: fin.taxAfter,
            totalBefore: fin.totalBefore,
            totalAfter: fin.totalAfter,
            difference: fin.difference,
          }
        : undefined,
    };
    if (amendmentType === "shipping_change" && values.newShippingAmount != null) {
      changes.shippingAmount = Number(values.newShippingAmount);
    } else if (amendmentType === "discount_change") {
      if (values.newDiscountPercent != null) changes.discountPercent = Number(values.newDiscountPercent);
      if (values.newDiscountAmount != null) changes.discountAmount = Number(values.newDiscountAmount);
    } else if (itemChanges.length > 0) {
      changes.itemChanges = itemChanges;
    }
    return changes;
  }

  const handleQtyChange = useCallback(
    (itemId: string, newQty: number) => {
      const index = form.state.values.lineItems.findIndex((li) => li.id === itemId);
      if (index < 0) return;
      const item = form.state.values.lineItems[index];
      const hasChanged = newQty !== item.originalQty || item.newPrice !== item.originalPrice;
      const action: AmendmentFormLineItem["action"] =
        item.action === "add" ? "add" : hasChanged ? "modify" : "keep";
      form.setNestedFieldValue(`lineItems[${index}].action`, action);
    },
    [form]
  );

  const handlePriceChange = useCallback(
    (itemId: string, newPrice: number) => {
      const index = form.state.values.lineItems.findIndex((li) => li.id === itemId);
      if (index < 0) return;
      const item = form.state.values.lineItems[index];
      const hasChanged = item.newQty !== item.originalQty || newPrice !== item.originalPrice;
      const action: AmendmentFormLineItem["action"] =
        item.action === "add" ? "add" : hasChanged ? "modify" : "keep";
      form.setNestedFieldValue(`lineItems[${index}].action`, action);
    },
    [form]
  );

  const handleRemoveItem = useCallback(
    (itemId: string) => {
      const prev = form.state.values.lineItems;
      const updated: AmendmentFormLineItem[] = prev.map((item) =>
        item.id === itemId ? { ...item, action: "remove", newQty: 0 } : item
      );
      form.setFieldValue("lineItems", updated);
    },
    [form]
  );

  const handleRestoreItem = useCallback(
    (itemId: string) => {
      const prev = form.state.values.lineItems;
      const updated: AmendmentFormLineItem[] = prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              action: "keep",
              newQty: item.originalQty,
              newPrice: item.originalPrice,
            }
          : item
      );
      form.setFieldValue("lineItems", updated);
    },
    [form]
  );

  const handleAddProduct = useCallback(
    (product: ProductSearchHit) => {
      const newItem: AmendmentFormLineItem = {
        id: `new-${Date.now()}`,
        productId: product.id,
        description: product.name,
        sku: product.sku,
        originalQty: 0,
        originalPrice: 0,
        newQty: 1,
        newPrice: product.basePrice || 0,
        qtyPicked: 0,
        action: "add",
      };
      const prev = form.state.values.lineItems;
      form.setFieldValue("lineItems", [...prev, newItem]);
      setProductSearch("");
    },
    [form]
  );

  const handleRemoveAddedItem = useCallback(
    (itemId: string) => {
      const prev = form.state.values.lineItems;
      form.setFieldValue(
        "lineItems",
        prev.filter((item) => item.id !== itemId)
      );
    },
    [form]
  );

  useEffect(() => {
    if (!open) {
      hasInitialized.current = false;
      const id = setTimeout(() => setStepError(null), 0);
      return () => clearTimeout(id);
    }
  }, [open]);

  useEffect(() => {
    if (!order || !open) return;
    if (hasInitialized.current) return;

    hasInitialized.current = true;
    startTransition(() => {
      form.reset(getFormDefaults(order));
    });
  }, [order, open, form]);

  const prevAmendmentTypeRef = useRef<AmendmentType | null>(null);
  useEffect(() => {
    if (!order || !hasInitialized.current) return;

    const currentType = form.state.values.amendmentType;
    const prevType = prevAmendmentTypeRef.current;
    prevAmendmentTypeRef.current = currentType;

    if (prevType === null) return;
    if (prevType === currentType) return;

    startTransition(() => {
      const lineItems = form.state.values.lineItems;

      if (currentType === "item_add") {
        const updated = lineItems.map((item) => {
          if (item.action === "add") return item;
          return {
            ...item,
            action: "keep" as const,
            newQty: item.originalQty,
            newPrice: item.originalPrice,
          };
        });
        form.setFieldValue("lineItems", updated);
      } else if (
        currentType === "quantity_change" ||
        currentType === "price_change" ||
        currentType === "item_remove"
      ) {
        const updated = lineItems
          .filter((item) => item.action !== "add")
          .map((item) => ({
            ...item,
            action: "keep" as const,
            newQty: item.originalQty,
            newPrice: item.originalPrice,
          }));
        form.setFieldValue("lineItems", updated);
      }
    });
  }, [form.state.values.amendmentType, order, form]);

  const orderLineItems = order?.lineItems;
  useEffect(() => {
    if (!orderLineItems?.length || !hasInitialized.current) return;

    const lineItems = form.state.values.lineItems;
    if (lineItems.length === 0) return;

    startTransition(() => {
      const updated = lineItems.map((item) => {
        const fromOrder = orderLineItems.find((li: { id: string }) => li.id === item.id);
        if (!fromOrder) return item;
        return { ...item, qtyPicked: Number(fromOrder.qtyPicked) || 0 };
      });
      form.setFieldValue("lineItems", updated);
    });
  }, [orderLineItems, form]);

  return (
    <AmendmentRequestDialog
      open={open}
      onOpenChange={onOpenChange}
      order={order}
      orderId={orderId}
      mode={mode}
      onSuccess={onSuccess}
      form={form}
      formatCurrencyDisplay={formatCurrencyDisplay}
      submitError={submitError}
      isSubmitting={isSubmitting}
      showPickOverlay={showPickOverlay}
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
      computeFinancialImpact={computeFinancialImpact}
    />
  );
}
