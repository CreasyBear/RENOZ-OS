/**
 * OrderCreationWizard Component
 *
 * Multi-step wizard for creating new orders.
 * Steps: Customer > Products > Pricing > Shipping > Review
 *
 * Uses TanStack Form, useFormDraft, FormWizard, and shared field components per FORM-STANDARDS.
 *
 * @see _Initiation/_prd/2-domains/orders/orders.prd.json (ORD-CREATION-UI)
 * @see FORM-STANDARDS.md
 */

import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { User, Package, DollarSign, Truck, FileCheck, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { GST_RATE } from "@/lib/order-calculations";
import { useOrgFormat } from "@/hooks/use-org-format";
import { useCustomer } from "@/hooks/customers";
import { CustomerSelectorContainer } from "./customer-selector-container";
import { ProductSelector } from "./product-selector";
import {
  DraftRestorePrompt,
  DraftSavingIndicator,
  FormWizard,
  FormField,
  NumberField,
  TextField,
  TextareaField,
  SelectField,
  DateField,
  FormFieldDisplayProvider,
  extractFieldError,
} from "@/components/shared/forms";
import { useOrderCreationForm } from "@/hooks/orders/use-order-creation-form";
import {
  useFormDraft,
  getCreateDraftKey,
} from "@/hooks/_shared/use-form-draft";
import {
  buildOrderSubmitData,
  getCustomerAddressesFromApi,
  validateOrderCreationForm,
} from "@/hooks/orders/use-order-creation-form";
import type {
  OrderCreationFormValues,
  OrderSubmitData,
} from "@/lib/schemas/orders/order-creation-form";

// Re-export for consumers (e.g. -create-page, use-order-creation-form)
export type { OrderSubmitData };

// ============================================================================
// TYPES
// ============================================================================

export interface OrderCreationWizardProps {
  /** Pre-select customer when coming from customer context (e.g. ?customerId= in URL) */
  initialCustomerId?: string;
  /** @source callback in container route */
  onComplete: (orderId: string, orderNumber: string) => void;
  /** @source callback in container route */
  onCancel: () => void;
  /** @source useMutation(createOrder) in container route */
  onSubmit: (data: OrderSubmitData) => Promise<{ id: string; orderNumber: string }>;
  /** @source useMutation.isPending in container route */
  isSubmitting?: boolean;
  /** Called with draft API so parent can clear on cancel. Enables draft persistence. */
  onDraftReady?: (api: { clear: () => void }) => void;
  className?: string;
}

// ============================================================================
// WIZARD STEPS (for FormWizard)
// ============================================================================

const WIZARD_STEPS = [
  { id: "customer", label: "Customer", description: "Select a customer", icon: <User className="h-5 w-5" /> },
  { id: "products", label: "Products", description: "Add products", icon: <Package className="h-5 w-5" /> },
  { id: "pricing", label: "Pricing", description: "Configure pricing", icon: <DollarSign className="h-5 w-5" /> },
  { id: "shipping", label: "Shipping", description: "Shipping details", icon: <Truck className="h-5 w-5" /> },
  { id: "review", label: "Review", description: "Review and confirm", icon: <FileCheck className="h-5 w-5" /> },
];

// ============================================================================
// STEP COMPONENTS (form-driven)
// ============================================================================

/**
 * Step 1: Customer selection.
 * @source customer from useCustomer hook (via form.useWatch customerId)
 */
interface StepCustomerProps {
  form: ReturnType<typeof useOrderCreationForm>;
  initialCustomerId?: string;
}

const StepCustomer = memo(function StepCustomer({ form, initialCustomerId }: StepCustomerProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Select Customer</h3>
        <p className="text-sm text-muted-foreground">
          Choose the customer for this order
        </p>
      </div>
      <form.Field name="customerId">
        {(field) => {
          const error = extractFieldError(field);
          const currentId = (field.state.value ?? "") as string;
          return (
            <FormField
              label="Customer"
              name={field.name}
              error={error}
              required
            >
              <CustomerSelectorContainer
                selectedCustomerId={currentId || null}
                initialCustomerId={initialCustomerId}
                onSelect={(c) => {
                  const newId = c?.id ?? "";
                  if (currentId !== newId) {
                    field.handleChange(newId);
                  }
                }}
              />
            </FormField>
          );
        }}
      </form.Field>
    </div>
  );
});

interface StepProductsProps {
  form: ReturnType<typeof useOrderCreationForm>;
}

const StepProducts = memo(function StepProducts({ form }: StepProductsProps) {
  const lineItems = form.useWatch("lineItems") ?? [];
  const hasNoItems = lineItems.length === 0;
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Add Products</h3>
        <p className="text-sm text-muted-foreground">
          Select products and quantities for this order
        </p>
        {hasNoItems && (
          <p className="text-sm text-amber-600 dark:text-amber-500 mt-1">
            Add at least one product to continue.
          </p>
        )}
      </div>
      <form.Field name="lineItems">
        {(field) => (
          <ProductSelector
            selectedProducts={field.state.value}
            onProductsChange={field.handleChange}
          />
        )}
      </form.Field>
    </div>
  );
});

interface StepPricingProps {
  form: ReturnType<typeof useOrderCreationForm>;
}

const StepPricing = memo(function StepPricing({ form }: StepPricingProps) {
  const { formatCurrency } = useOrgFormat();
  const formatPrice = (amount: number) => formatCurrency(amount, { cents: false, showCents: true });

  const lineItems = form.useWatch("lineItems") ?? [];
  const discountPercent = form.useWatch("discountPercent") ?? 0;
  const discountAmount = form.useWatch("discountAmount") ?? 0;

  const subtotal = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  const discountFromPercent = Math.round(subtotal * (discountPercent / 100));
  const totalDiscount = discountFromPercent + discountAmount;
  const afterDiscount = subtotal - totalDiscount;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Configure Pricing</h3>
        <p className="text-sm text-muted-foreground">
          Apply discounts and review line item pricing
        </p>
      </div>

      {/* Line Items - editable qty and unit price */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Line Items</CardTitle>
          <CardDescription>
            Adjust quantity and unit price for each item
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Line Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineItems.map((item, index) => (
                <TableRow key={item.productId}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{item.description}</p>
                      {item.sku && (
                        <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <form.Field name={`lineItems[${index}].quantity`}>
                      {(field) => (
                        <Input
                          type="number"
                          min={0.01}
                          step={0.01}
                          value={field.state.value ?? ""}
                          onChange={(e) => {
                            const qty = parseFloat(e.target.value) || 0;
                            field.handleChange(qty);
                          }}
                          onWheel={(e) => e.currentTarget.blur()}
                          className="h-8 w-20 text-right font-mono"
                          inputMode="decimal"
                        />
                      )}
                    </form.Field>
                  </TableCell>
                  <TableCell className="text-right">
                    <form.Field name={`lineItems[${index}].unitPrice`}>
                      {(field) => (
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={field.state.value ?? ""}
                          onChange={(e) => {
                            const price = parseFloat(e.target.value) || 0;
                            field.handleChange(price);
                          }}
                          onWheel={(e) => e.currentTarget.blur()}
                          className="h-8 w-24 text-right font-mono"
                          inputMode="decimal"
                        />
                      )}
                    </form.Field>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatPrice(item.quantity * item.unitPrice)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Discounts */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Discounts</CardTitle>
          <CardDescription>Apply order-level discounts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <form.Field name="discountPercent">
                {(field) => (
                  <NumberField
                    field={field}
                    label="Discount %"
                    min={0}
                    max={100}
                    step={0.5}
                  />
                )}
              </form.Field>
            </div>
            <div className="space-y-2">
              <form.Field name="discountAmount">
                {(field) => (
                  <NumberField
                    field={field}
                    label="Fixed Discount ($)"
                    min={0}
                    step={1}
                  />
                )}
              </form.Field>
            </div>
          </div>
          {discountPercent > 0 && (
            <p className="text-xs text-muted-foreground">
              Saves {formatPrice(discountFromPercent)}
            </p>
          )}

          {/* Summary */}
          <div className="space-y-2 pt-4">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            {totalDiscount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount</span>
                <span>-{formatPrice(totalDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between font-medium">
              <span>After Discount</span>
              <span>{formatPrice(afterDiscount)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

function getAddressSourceLabel(customer: { shippingAddress?: { street1?: string }; billingAddress?: { street1?: string } } | null): string | null {
  if (!customer) return null;
  const hasShipping = !!customer.shippingAddress?.street1;
  const hasBilling = !!customer.billingAddress?.street1;
  if (hasShipping) return "Using shipping address";
  if (hasBilling) return "Using billing address (no shipping address on file)";
  return null;
}

const STATE_OPTIONS = [
  { value: "NSW", label: "NSW" },
  { value: "VIC", label: "VIC" },
  { value: "QLD", label: "QLD" },
  { value: "WA", label: "WA" },
  { value: "SA", label: "SA" },
  { value: "TAS", label: "TAS" },
  { value: "ACT", label: "ACT" },
  { value: "NT", label: "NT" },
];

interface StepShippingProps {
  form: ReturnType<typeof useOrderCreationForm>;
}

const StepShipping = memo(function StepShipping({ form }: StepShippingProps) {
  const customerId = form.useWatch("customerId") ?? "";
  const useBillingAsShipping = form.useWatch("useBillingAsShipping") ?? true;

  const { data: customerData, isFetching: isEnriching } = useCustomer({
    id: customerId,
    enabled: !!customerId,
  });

  const customerAddr = useMemo(() => {
    const addr =
      customerData?.addresses?.find((a) => a.type === "shipping") ||
      customerData?.addresses?.find((a) => a.type === "billing");
    return addr
      ? {
          street1: addr.street1 ?? "",
          street2: addr.street2 ?? undefined,
          city: addr.city ?? "",
          state: addr.state ?? "",
          postcode: addr.postcode ?? "",
          country: addr.country ?? "AU",
        }
      : null;
  }, [customerData?.addresses]);
  const shippingAddr = customerData?.addresses?.find((a) => a.type === "shipping");
  const billingAddr = customerData?.addresses?.find((a) => a.type === "billing");
  const addressSourceLabel = customerData
    ? getAddressSourceLabel({
        shippingAddress: shippingAddr ? { street1: shippingAddr.street1 ?? undefined } : undefined,
        billingAddress: billingAddr ? { street1: billingAddr.street1 ?? undefined } : undefined,
      })
    : null;

  const needsEnrichment =
    !!customerId &&
    !customerAddr?.street1;
  const isLoadingAddress = needsEnrichment && isEnriching;

  const applyCustomerAddress = useCallback(() => {
    if (!customerAddr?.street1) return;
    form.setFieldValue("useBillingAsShipping", true);
    form.setFieldValue("shippingAddress", {
      street1: customerAddr.street1,
      street2: customerAddr.street2 ?? "",
      city: customerAddr.city,
      state: customerAddr.state,
      postcode: customerAddr.postcode,
      country: customerAddr.country,
    });
  }, [customerAddr, form]);

  const switchToManualAddress = useCallback(() => {
    form.setFieldValue("useBillingAsShipping", false);
    if (customerAddr?.street1) {
      form.setFieldValue("shippingAddress", {
        street1: customerAddr.street1,
        street2: customerAddr.street2 ?? "",
        city: customerAddr.city,
        state: customerAddr.state,
        postcode: customerAddr.postcode,
        country: customerAddr.country,
      });
    }
  }, [customerAddr, form]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Shipping Details</h3>
        <p className="text-sm text-muted-foreground">
          Configure shipping address and costs
        </p>
      </div>

      {/* Shipping Cost */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Shipping Cost</CardTitle>
        </CardHeader>
        <CardContent>
          <form.Field name="shippingAmount">
            {(field) => (
              <NumberField
                field={field}
                label="Shipping Amount"
                min={0}
                step={1}
              />
            )}
          </form.Field>
        </CardContent>
      </Card>

      {/* Shipping Address */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Shipping Address</CardTitle>
          {customerData && (
            <CardDescription>
              Shipping for <strong>{customerData.name}</strong>
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingAddress ? (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading customer address…
            </div>
          ) : useBillingAsShipping && customerAddr ? (
            <>
              <div className="space-y-1">
                <div className="p-3 bg-muted rounded-lg text-sm">
                  <p>{customerAddr.street1}</p>
                  {customerAddr.street2 && <p>{customerAddr.street2}</p>}
                  <p>
                    {customerAddr.city}, {customerAddr.state} {customerAddr.postcode}
                  </p>
                  <p>{customerAddr.country}</p>
                </div>
                {addressSourceLabel && (
                  <p className="text-xs text-muted-foreground">{addressSourceLabel}</p>
                )}
              </div>
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-sm"
                onClick={switchToManualAddress}
                aria-label="Edit shipping address"
              >
                Edit address
              </Button>
            </>
          ) : (
            <>
              {customerAddr && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={applyCustomerAddress}
                  aria-label="Use customer's address"
                >
                  Use customer&apos;s address
                </Button>
              )}
              {customerAddr && (
                <p className="text-sm text-muted-foreground">
                  — or enter a different address —
                </p>
              )}
              <div className="grid grid-cols-2 gap-4">
                <form.Field name="shippingAddress.street1">
                  {(field) => (
                    <TextField
                      field={field}
                      label="Street Address"
                      placeholder="123 Main St"
                    />
                  )}
                </form.Field>
                <form.Field name="shippingAddress.street2">
                  {(field) => (
                    <TextField
                      field={field}
                      label="Unit / Suite"
                      placeholder="Unit, suite, etc."
                    />
                  )}
                </form.Field>
                <form.Field name="shippingAddress.city">
                  {(field) => (
                    <TextField field={field} label="City" placeholder="Sydney" />
                  )}
                </form.Field>
                <form.Field name="shippingAddress.state">
                  {(field) => (
                    <SelectField
                      field={field}
                      label="State"
                      options={STATE_OPTIONS}
                      placeholder="Select state"
                    />
                  )}
                </form.Field>
                <form.Field name="shippingAddress.postcode">
                  {(field) => (
                    <TextField field={field} label="Postcode" placeholder="2000" />
                  )}
                </form.Field>
                <form.Field name="shippingAddress.country">
                  {(field) => (
                    <TextField field={field} label="Country" placeholder="AU" disabled />
                  )}
                </form.Field>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Due Date */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Payment Terms</CardTitle>
        </CardHeader>
        <CardContent>
          <form.Field name="dueDate">
            {(field) => (
              <DateField field={field} label="Due Date" />
            )}
          </form.Field>
        </CardContent>
      </Card>
    </div>
  );
});

interface StepReviewProps {
  form: ReturnType<typeof useOrderCreationForm>;
}

const StepReview = memo(function StepReview({ form }: StepReviewProps) {
  const { formatCurrency } = useOrgFormat();
  const formatPrice = (amount: number) => formatCurrency(amount, { cents: false, showCents: true });

  const customerId = form.useWatch("customerId") ?? "";
  const lineItems = form.useWatch("lineItems") ?? [];
  const discountPercent = form.useWatch("discountPercent") ?? 0;
  const discountAmount = form.useWatch("discountAmount") ?? 0;
  const shippingAmount = form.useWatch("shippingAmount") ?? 0;
  const useBillingAsShipping = form.useWatch("useBillingAsShipping") ?? true;
  const shippingAddress = form.useWatch("shippingAddress") ?? {};
  const dueDate = form.useWatch("dueDate");

  const { data: customerData } = useCustomer({ id: customerId, enabled: !!customerId });
  const customerAddr = customerData?.addresses
    ? (customerData.addresses.find((a) => a.type === "shipping") ||
        customerData.addresses.find((a) => a.type === "billing"))
    : null;
  const displayShipping =
    useBillingAsShipping && customerAddr?.street1
      ? {
          street1: customerAddr.street1 || "",
          street2: customerAddr.street2,
          city: customerAddr.city || "",
          state: customerAddr.state || "",
          postcode: customerAddr.postcode || "",
          country: customerAddr.country || "AU",
        }
      : {
          street1: shippingAddress.street1 ?? "",
          street2: shippingAddress.street2,
          city: shippingAddress.city ?? "",
          state: shippingAddress.state ?? "",
          postcode: shippingAddress.postcode ?? "",
          country: shippingAddress.country ?? "AU",
        };

  const subtotal = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  const discountFromPercent = Math.round(subtotal * (discountPercent / 100));
  const totalDiscount = discountFromPercent + discountAmount;
  const afterDiscount = subtotal - totalDiscount;
  const gstAmount = Math.round(afterDiscount * GST_RATE);
  const total = afterDiscount + gstAmount + shippingAmount;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Review Order</h3>
        <p className="text-sm text-muted-foreground">
          Review all details before creating the order
        </p>
      </div>

      {/* Customer */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Customer</CardTitle>
        </CardHeader>
        <CardContent>
          {customerData && (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">{customerData.name}</p>
                <p className="text-sm text-muted-foreground">
                  {customerData.email || customerData.phone}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Items ({lineItems.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineItems.map((item) => (
                <TableRow key={item.productId}>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">
                    {formatPrice(item.quantity * item.unitPrice)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Shipping */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Shipping</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm">
            <p>{displayShipping.street1}</p>
            {displayShipping.street2 && <p>{displayShipping.street2}</p>}
            <p>
              {displayShipping.city}, {displayShipping.state} {displayShipping.postcode}
            </p>
            <p>{displayShipping.country}</p>
          </div>
        </CardContent>
      </Card>

      {/* Order Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          {totalDiscount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount</span>
              <span>-{formatPrice(totalDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span>GST (10%)</span>
            <span>{formatPrice(gstAmount)}</span>
          </div>
          {shippingAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span>Shipping</span>
              <span>{formatPrice(shippingAmount)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-lg pt-2">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
          {dueDate && (
            <p className="text-xs text-muted-foreground pt-2">
              Due: {format(dueDate, "dd/MM/yyyy")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Notes - editable */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Notes (Optional)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form.Field name="internalNotes">
            {(field) => (
              <TextareaField
                field={field}
                label="Internal Notes"
                placeholder="Notes visible only to staff..."
                rows={2}
              />
            )}
          </form.Field>
          <form.Field name="customerNotes">
            {(field) => (
              <TextareaField
                field={field}
                label="Customer Notes"
                placeholder="Notes visible to customer..."
                rows={2}
              />
            )}
          </form.Field>
        </CardContent>
      </Card>
    </div>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/** Map validation error messages to the step index (0-based) that needs fixing */
function getStepFromError(error: unknown): number {
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (msg.includes("customer") && (msg.includes("required") || msg.includes("invalid"))) return 0;
  if (msg.includes("item") || msg.includes("lineitem") || msg.includes("line item")) return 1;
  if (msg.includes("address") || msg.includes("shipping") || msg.includes("billing")) return 3;
  return 4; // Default to Review so user can use Back
}

const DRAFT_VERSION = 2;

export const OrderCreationWizard = memo(function OrderCreationWizard({
  initialCustomerId,
  onComplete,
  onCancel,
  onSubmit,
  isSubmitting = false,
  onDraftReady,
  className,
}: OrderCreationWizardProps) {
  const stepContentRef = useRef<HTMLDivElement>(null);
  const customerForSubmitRef = useRef<Awaited<ReturnType<typeof useCustomer>>["data"]>(null);
  const draftClearRef = useRef<(() => void) | null>(null);

  const form = useOrderCreationForm({
    initialCustomerId,
    onSubmit: useCallback(
      async (values: OrderCreationFormValues) => {
        validateOrderCreationForm(values);
        const customerAddr = getCustomerAddressesFromApi(customerForSubmitRef.current);
        const data = buildOrderSubmitData(values, customerAddr);
        const result = await onSubmit(data);
        draftClearRef.current?.();
        onComplete(result.id, result.orderNumber);
        return result;
      },
      [onSubmit, onComplete]
    ),
    onSubmitInvalid: () => {
      toast.error("Please fix the errors below and try again.");
    },
  });

  const customerId = form.useWatch("customerId") ?? "";
  const { data: customerForSubmit } = useCustomer({
    id: customerId,
    enabled: !!customerId,
  });

  const draft = useFormDraft({
    key: getCreateDraftKey("order"),
    version: DRAFT_VERSION,
    form,
    enabled: !initialCustomerId,
    debounceMs: 1500,
  });

  useEffect(() => {
    customerForSubmitRef.current = customerForSubmit;
    draftClearRef.current = draft.clear;
  }, [customerForSubmit, draft.clear]);

  useEffect(() => {
    onDraftReady?.({ clear: draft.clear });
  }, [onDraftReady, draft.clear]);

  const currentStep = form.useWatch("currentStep") ?? 0;

  const validateStep = useCallback(
    (step: number): boolean => {
      const values = form.state.values;
      if (step === 0) {
        const isValid = !!values.customerId;
        if (!isValid) {
          toast.error("Select a customer to continue.");
        }
        return isValid;
      }
      if (step === 1) {
        const isValid = (values.lineItems?.length ?? 0) >= 1;
        if (!isValid) {
          toast.error("Add at least one product to continue.");
        }
        return isValid;
      }
      return true;
    },
    [form.state.values]
  );

  const canNavigateToStep = useCallback(
    (stepIndex: number) => stepIndex <= (currentStep ?? 0) + 1,
    [currentStep]
  );

  const handleComplete = useCallback(async () => {
    try {
      await form.handleSubmit();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create order";
      toast.error(message);
      const targetStep = getStepFromError(error);
      form.setFieldValue("currentStep", targetStep);
      setTimeout(
        () => stepContentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
        50
      );
    }
  }, [form]);

  const handleStepChange = useCallback(
    (step: number) => {
      form.setFieldValue("currentStep", step);
    },
    [form]
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return <StepCustomer form={form} initialCustomerId={initialCustomerId} />;
      case 1:
        return <StepProducts form={form} />;
      case 2:
        return <StepPricing form={form} />;
      case 3:
        return <StepShipping form={form} />;
      case 4:
        return <StepReview form={form} />;
      default:
        return null;
    }
  };

  return (
    <form
      className={cn("space-y-6", className)}
      onSubmit={(e) => {
        e.preventDefault();
        if (currentStep === WIZARD_STEPS.length - 1) {
          void handleComplete();
        }
      }}
    >
      <FormFieldDisplayProvider form={form}>
        <DraftRestorePrompt
          hasDraft={draft.hasDraft}
          savedAt={draft.savedAt}
          onRestore={draft.restore}
          onDiscard={draft.clear}
          variant="banner"
        />
        <DraftSavingIndicator isSaving={draft.isSaving} savedAt={draft.savedAt} />

        <div className="flex items-start gap-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>

        <FormWizard
          steps={WIZARD_STEPS}
          currentStep={currentStep}
          onStepChange={handleStepChange}
          onComplete={handleComplete}
          validateStep={validateStep}
          canNavigateToStep={canNavigateToStep}
          isSubmitting={isSubmitting}
          submitOnLastStep
          labels={{
            previous: "Back",
            next: "Next",
            complete: "Create Order",
            completing: "Creating...",
          }}
          showStepNumbers={true}
          allowStepClick={true}
        >
          <div ref={stepContentRef} className="min-h-[400px] scroll-mt-4">
            {renderStepContent()}
          </div>
        </FormWizard>
      </FormFieldDisplayProvider>
    </form>
  );
});

export default OrderCreationWizard;
