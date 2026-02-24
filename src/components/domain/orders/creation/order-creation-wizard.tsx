/**
 * OrderCreationWizard Component
 *
 * Multi-step wizard for creating new orders.
 * Steps: Customer > Products > Pricing > Shipping > Review
 *
 * Uses TanStack Form, FormWizard, and shared field components per FORM-STANDARDS.
 *
 * @see _Initiation/_prd/2-domains/orders/orders.prd.json (ORD-CREATION-UI)
 * @see FORM-STANDARDS.md
 */

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  FormWizard,
  FormField,
  NumberField,
  TextField,
  TextareaField,
  SelectField,
  DateField,
  FormFieldDisplayProvider,
  FormErrorSummary,
  extractFieldError,
} from "@/components/shared/forms";
import { COUNTRY_OPTIONS, getCountryLabel, toCountryCode } from "@/lib/country";
import { useOrderCreationForm } from "@/hooks/orders/use-order-creation-form";
import {
  buildOrderSubmitData,
  getCustomerAddressesFromApi,
  validateOrderCreationForm,
} from "@/hooks/orders/use-order-creation-form";
import type {
  OrderCreationFormValues,
  OrderSubmitData,
} from "@/lib/schemas/orders/order-creation-form";
import { z, ZodError } from "zod";

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
                  // Apply customer address when enriched data arrives (TanStack pattern: event-driven)
                  const addr = c?.shippingAddress?.street1
                    ? c.shippingAddress
                    : c?.billingAddress?.street1
                      ? c.billingAddress
                      : null;
                  if (addr) {
                    form.setFieldValue("useBillingAsShipping", true);
                    form.setFieldValue("shippingAddress", {
                      street1: addr.street1 ?? "",
                      street2: addr.street2 ?? "",
                      city: addr.city ?? "",
                      state: addr.state ?? "",
                      postcode: addr.postcode ?? "",
                      country: toCountryCode(addr.country),
                    });
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
            selectedProducts={field.state.value ?? []}
            onProductsChange={(products) => field.handleChange(Array.isArray(products) ? products : [])}
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
          country: toCountryCode(addr.country),
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
      city: customerAddr.city ?? "",
      state: customerAddr.state ?? "",
      postcode: customerAddr.postcode ?? "",
      country: toCountryCode(customerAddr.country),
    });
  }, [customerAddr, form]);

  const switchToManualAddress = useCallback(() => {
    form.setFieldValue("useBillingAsShipping", false);
    if (customerAddr?.street1) {
      form.setFieldValue("shippingAddress", {
        street1: customerAddr.street1,
        street2: customerAddr.street2 ?? "",
        city: customerAddr.city ?? "",
        state: customerAddr.state ?? "",
        postcode: customerAddr.postcode ?? "",
        country: toCountryCode(customerAddr.country),
      });
    } else {
      const current = form.getValues().shippingAddress ?? {};
      form.setFieldValue("shippingAddress", {
        ...current,
        country: toCountryCode(current.country),
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
                  <p>{getCountryLabel(customerAddr.country)}</p>
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
                    <SelectField
                      field={field}
                      label="Country"
                      options={COUNTRY_OPTIONS}
                      placeholder="Select country"
                    />
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
          country: getCountryLabel(toCountryCode(customerAddr.country)),
        }
      : {
          street1: shippingAddress.street1 ?? "",
          street2: shippingAddress.street2,
          city: shippingAddress.city ?? "",
          state: shippingAddress.state ?? "",
          postcode: shippingAddress.postcode ?? "",
          country: getCountryLabel(shippingAddress.country ?? "AU"),
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

/** Map Zod error path to step index. Steps: 0=Customer, 1=Products, 2=Pricing, 3=Shipping, 4=Review */
function getStepFromZodPath(path: (string | number)[]): number {
  const first = path[0];
  if (first === "customerId") return 0;
  if (first === "lineItems") return 1;
  if (first === "discountPercent" || first === "discountAmount") return 2;
  if (
    first === "shippingAddress" ||
    first === "dueDate" ||
    first === "useBillingAsShipping" ||
    first === "shippingAmount"
  )
    return 3;
  return 4;
}

/** Extract field errors from Zod error for display. Uses friendly labels for known paths */
function zodErrorToFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.filter((p): p is string | number => typeof p === "string" || typeof p === "number");
    const key =
      path.length > 1 && typeof path[0] === "string" && path[0] === "lineItems" && typeof path[1] === "number"
        ? `Line item ${path[1] + 1} (${path.slice(2).join(".") || "details"})`
        : path.length === 1
          ? path[0] === "customerId"
            ? "Customer"
            : path[0] === "discountPercent"
              ? "Discount %"
              : path[0] === "discountAmount"
                ? "Discount amount"
                : String(path[0])
          : path.join(".");
    if (!(key in out) && issue.message) out[key] = issue.message;
  }
  return out;
}

/** Fast local guard so final submit can jump back to the first blocking step. */
function getBlockingStep(values: OrderCreationFormValues): number | null {
  if (!values.customerId) return 0;
  if ((values.lineItems?.length ?? 0) < 1) return 1;

  const orderPct = values.discountPercent ?? 0;
  const orderAmt = values.discountAmount ?? 0;
  if (orderPct > 0 && orderAmt > 0) return 2;

  const subtotal = (values.lineItems ?? []).reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  const discountFromPercent = Math.round(subtotal * (orderPct / 100));
  const totalDiscount = discountFromPercent + orderAmt;
  if (totalDiscount > subtotal) return 2;

  for (const item of values.lineItems ?? []) {
    const pct = item.discountPercent ?? 0;
    const amt = item.discountAmount ?? 0;
    if (pct > 0 && amt > 0) return 2;
    const lineTotal = item.quantity * item.unitPrice;
    const lineDiscount = amt + (lineTotal * pct) / 100;
    if (lineDiscount > lineTotal) return 2;
  }

  if (!values.useBillingAsShipping) {
    const shipping = values.shippingAddress;
    const hasRequiredAddress =
      !!shipping?.street1?.trim() &&
      !!shipping?.city?.trim() &&
      !!shipping?.state?.trim() &&
      !!shipping?.postcode?.trim() &&
      !!shipping?.country?.trim();
    if (!hasRequiredAddress) return 3;
  }

  return null;
}

function getStepBlockMessage(step: number): string {
  if (step === 0) return "Select a customer to continue.";
  if (step === 1) return "Add at least one product to continue.";
  if (step === 2) return "Fix pricing and discount rules before continuing.";
  if (step === 3) return "Complete shipping details before continuing.";
  return "Please fix the errors below and try again.";
}

export const OrderCreationWizard = memo(function OrderCreationWizard({
  initialCustomerId,
  onComplete,
  onCancel,
  onSubmit,
  isSubmitting = false,
  className,
}: OrderCreationWizardProps) {
  const stepContentRef = useRef<HTMLDivElement>(null);
  const customerForSubmitRef = useRef<Awaited<ReturnType<typeof useCustomer>>["data"]>(null);
  const validationErrorRef = useRef<z.ZodError | null>(null);
  const formRef = useRef<ReturnType<typeof useOrderCreationForm> | null>(null);
  const submitInFlightRef = useRef(false);

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const form = useOrderCreationForm({
    initialCustomerId,
    onSubmit: useCallback(
      async (values: OrderCreationFormValues) => {
        setValidationErrors({});
        validationErrorRef.current = null;
        validateOrderCreationForm(values);
        const customerAddr = getCustomerAddressesFromApi(customerForSubmitRef.current);
        const data = buildOrderSubmitData(values, customerAddr);
        const result = await onSubmit(data);
        onComplete(result.id, result.orderNumber);
        return result;
      },
      [onSubmit, onComplete]
    ),
    onValidationError: useCallback((error: unknown) => {
      const zodError = error instanceof ZodError ? error : null;
      validationErrorRef.current = zodError;
      setValidationErrors(zodError ? zodErrorToFieldErrors(zodError) : {});
    }, []),
    onSubmitInvalid: useCallback(() => {
      const err = validationErrorRef.current;
      const f = formRef.current;
      if (err?.issues?.[0] && f) {
        const path = err.issues[0].path.filter((p): p is string | number => typeof p === "string" || typeof p === "number");
        const targetStep = getStepFromZodPath(path);
        f.setFieldValue("currentStep", targetStep);
        setTimeout(
          () => stepContentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
          50
        );
      }
      toast.error("Please fix the errors below and try again.");
    }, []),
  });

  formRef.current = form;

  const customerId = form.useWatch("customerId") ?? "";
  const { data: customerForSubmit } = useCustomer({
    id: customerId,
    enabled: !!customerId,
  });

  useEffect(() => {
    customerForSubmitRef.current = customerForSubmit;
  }, [customerForSubmit]);

  const currentStep = form.useWatch("currentStep") ?? 0;

  const validateStep = useCallback(
    (step: number): boolean => {
      const blockingStep = getBlockingStep(form.getValues());
      if (blockingStep != null && blockingStep <= step) {
        toast.error(getStepBlockMessage(blockingStep));
        return false;
      }
      return true;
    },
    [form]
  );

  const canNavigateToStep = useCallback(
    (stepIndex: number) => {
      const step = currentStep ?? 0;
      if (stepIndex <= step) return true;
      if (stepIndex > step + 1) return false;

      const blockingStep = getBlockingStep(form.getValues());
      return blockingStep == null || blockingStep >= stepIndex;
    },
    [currentStep, form]
  );

  const handleComplete = useCallback(async () => {
    if (submitInFlightRef.current || isSubmitting) return;

    const blockingStep = getBlockingStep(form.getValues());
    if (blockingStep != null) {
      toast.error(getStepBlockMessage(blockingStep));
      form.setFieldValue("currentStep", blockingStep);
      setTimeout(
        () => stepContentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
        50
      );
      return;
    }

    submitInFlightRef.current = true;
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
    } finally {
      submitInFlightRef.current = false;
    }
  }, [form, isSubmitting]);

  const handleStepChange = useCallback(
    (step: number) => {
      if (!canNavigateToStep(step)) {
        const blockingStep = getBlockingStep(form.getValues());
        toast.error(getStepBlockMessage(blockingStep ?? step));
        return;
      }
      setValidationErrors({});
      validationErrorRef.current = null;
      form.setFieldValue("currentStep", step);
    },
    [canNavigateToStep, form]
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
        <FormErrorSummary
          form={form}
          fieldErrors={validationErrors}
          showFieldErrors={Object.keys(validationErrors).length > 0}
        />

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
