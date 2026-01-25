/**
 * OrderCreationWizard Component
 *
 * Multi-step wizard for creating new orders.
 * Steps: Customer > Products > Pricing > Shipping > Review
 *
 * @see _Initiation/_prd/2-domains/orders/orders.prd.json (ORD-CREATION-UI)
 */

import { memo, useState, useCallback, useMemo } from "react";
import {
  User,
  Package,
  DollarSign,
  Truck,
  FileCheck,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
} from "lucide-react";
import { format, addDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { cn } from "@/lib/utils";
import { CustomerSelector, type SelectedCustomer } from "./customer-selector";
import { ProductSelector, type OrderLineItemDraft } from "./product-selector";

// ============================================================================
// TYPES
// ============================================================================

/** Order data to be submitted */
export interface OrderSubmitData {
  customerId: string;
  status: 'draft' | 'confirmed';
  paymentStatus: 'pending';
  orderDate: Date;
  dueDate?: Date | null;
  shippingAddress?: {
    street1: string;
    street2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  billingAddress?: {
    street1: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  discountPercent?: number;
  discountAmount?: number;
  shippingAmount: number;
  internalNotes?: string;
  customerNotes?: string;
  lineItems: Array<{
    productId: string;
    lineNumber: string;
    sku?: string;
    description: string;
    quantity: number;
    unitPrice: number;
    discountPercent?: number;
    discountAmount?: number;
    taxType: string;
    notes?: string;
  }>;
}

export interface OrderCreationWizardProps {
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

interface WizardState {
  // Step 1: Customer
  customer: SelectedCustomer | null;
  // Step 2: Products
  lineItems: OrderLineItemDraft[];
  // Step 3: Pricing
  discountPercent: number;
  discountAmount: number;
  // Step 4: Shipping
  shippingAmount: number;
  useBillingAsShipping: boolean;
  shippingAddress: {
    street1: string;
    street2?: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  dueDate: Date | null;
  // Step 5: Notes
  internalNotes: string;
  customerNotes: string;
}

type Step = {
  id: number;
  name: string;
  description: string;
  icon: typeof User;
};

const STEPS: Step[] = [
  { id: 1, name: "Customer", description: "Select a customer", icon: User },
  { id: 2, name: "Products", description: "Add products", icon: Package },
  { id: 3, name: "Pricing", description: "Configure pricing", icon: DollarSign },
  { id: 4, name: "Shipping", description: "Shipping details", icon: Truck },
  { id: 5, name: "Review", description: "Review and confirm", icon: FileCheck },
];

const GST_RATE = 0.1; // 10% GST for Australia

// ============================================================================
// HELPERS
// ============================================================================

const formatPrice = (cents: number) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(cents / 100);

const initialState: WizardState = {
  customer: null,
  lineItems: [],
  discountPercent: 0,
  discountAmount: 0,
  shippingAmount: 0,
  useBillingAsShipping: true,
  shippingAddress: {
    street1: "",
    city: "",
    state: "",
    postcode: "",
    country: "AU",
  },
  dueDate: addDays(new Date(), 14), // Default 14 day payment terms
  internalNotes: "",
  customerNotes: "",
};

// ============================================================================
// STEP COMPONENTS
// ============================================================================

interface StepProps {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
}

const StepCustomer = memo(function StepCustomer({ state, setState }: StepProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Select Customer</h3>
        <p className="text-sm text-muted-foreground">
          Choose the customer for this order
        </p>
      </div>
      <CustomerSelector
        selectedCustomerId={state.customer?.id ?? null}
        onSelect={(customer) => setState((s) => ({ ...s, customer }))}
      />
    </div>
  );
});

const StepProducts = memo(function StepProducts({ state, setState }: StepProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Add Products</h3>
        <p className="text-sm text-muted-foreground">
          Select products and quantities for this order
        </p>
      </div>
      <ProductSelector
        selectedProducts={state.lineItems}
        onProductsChange={(lineItems) => setState((s) => ({ ...s, lineItems }))}
      />
    </div>
  );
});

const StepPricing = memo(function StepPricing({ state, setState }: StepProps) {
  // Calculate subtotal before discounts
  const subtotal = state.lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  // Calculate discount
  const discountFromPercent = Math.round(subtotal * (state.discountPercent / 100));
  const totalDiscount = discountFromPercent + state.discountAmount;
  const afterDiscount = subtotal - totalDiscount;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Configure Pricing</h3>
        <p className="text-sm text-muted-foreground">
          Apply discounts and review line item pricing
        </p>
      </div>

      {/* Line Items Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Line Items</CardTitle>
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
              {state.lineItems.map((item) => (
                <TableRow key={item.productId}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{item.description}</p>
                      {item.sku && (
                        <p className="text-xs text-muted-foreground">
                          SKU: {item.sku}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">
                    {formatPrice(item.unitPrice)}
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
              <Label htmlFor="discount-percent">Discount %</Label>
              <div className="relative">
                <Input
                  id="discount-percent"
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={state.discountPercent || ""}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      discountPercent: Number(e.target.value) || 0,
                    }))
                  }
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  %
                </span>
              </div>
              {state.discountPercent > 0 && (
                <p className="text-xs text-muted-foreground">
                  Saves {formatPrice(discountFromPercent)}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount-amount">Fixed Discount ($)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="discount-amount"
                  type="number"
                  min={0}
                  step={1}
                  value={state.discountAmount ? state.discountAmount / 100 : ""}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      discountAmount: Math.round(Number(e.target.value) * 100) || 0,
                    }))
                  }
                  className="pl-8"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Summary */}
          <div className="space-y-2">
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

const StepShipping = memo(function StepShipping({ state, setState }: StepProps) {
  const customerAddress = state.customer?.shippingAddress || state.customer?.billingAddress;

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
          <div className="space-y-2">
            <Label htmlFor="shipping-amount">Shipping Amount</Label>
            <div className="relative w-48">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="shipping-amount"
                type="number"
                min={0}
                step={1}
                value={state.shippingAmount ? state.shippingAmount / 100 : ""}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    shippingAmount: Math.round(Number(e.target.value) * 100) || 0,
                  }))
                }
                className="pl-8"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shipping Address */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Shipping Address</CardTitle>
          <CardDescription>
            {customerAddress
              ? "Use customer's address or enter a different one"
              : "Enter the shipping address"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {customerAddress && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="use-customer-address"
                checked={state.useBillingAsShipping}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    useBillingAsShipping: e.target.checked,
                    shippingAddress: e.target.checked
                      ? {
                          street1: customerAddress.street1 || "",
                          city: customerAddress.city || "",
                          state: customerAddress.state || "",
                          postcode: customerAddress.postcode || "",
                          country: customerAddress.country || "AU",
                        }
                      : s.shippingAddress,
                  }))
                }
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="use-customer-address" className="font-normal">
                Use customer's address
              </Label>
            </div>
          )}

          {state.useBillingAsShipping && customerAddress ? (
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p>{customerAddress.street1}</p>
              <p>
                {customerAddress.city}, {customerAddress.state}{" "}
                {customerAddress.postcode}
              </p>
              <p>{customerAddress.country}</p>
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="street1">Street Address</Label>
                <Input
                  id="street1"
                  value={state.shippingAddress.street1}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      shippingAddress: {
                        ...s.shippingAddress,
                        street1: e.target.value,
                      },
                    }))
                  }
                  placeholder="123 Main St"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={state.shippingAddress.city}
                    onChange={(e) =>
                      setState((s) => ({
                        ...s,
                        shippingAddress: {
                          ...s.shippingAddress,
                          city: e.target.value,
                        },
                      }))
                    }
                    placeholder="Sydney"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Select
                    value={state.shippingAddress.state}
                    onValueChange={(value) =>
                      setState((s) => ({
                        ...s,
                        shippingAddress: {
                          ...s.shippingAddress,
                          state: value,
                        },
                      }))
                    }
                  >
                    <SelectTrigger id="state">
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NSW">NSW</SelectItem>
                      <SelectItem value="VIC">VIC</SelectItem>
                      <SelectItem value="QLD">QLD</SelectItem>
                      <SelectItem value="WA">WA</SelectItem>
                      <SelectItem value="SA">SA</SelectItem>
                      <SelectItem value="TAS">TAS</SelectItem>
                      <SelectItem value="ACT">ACT</SelectItem>
                      <SelectItem value="NT">NT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="postcode">Postcode</Label>
                  <Input
                    id="postcode"
                    value={state.shippingAddress.postcode}
                    onChange={(e) =>
                      setState((s) => ({
                        ...s,
                        shippingAddress: {
                          ...s.shippingAddress,
                          postcode: e.target.value,
                        },
                      }))
                    }
                    placeholder="2000"
                    maxLength={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={state.shippingAddress.country}
                    onChange={(e) =>
                      setState((s) => ({
                        ...s,
                        shippingAddress: {
                          ...s.shippingAddress,
                          country: e.target.value,
                        },
                      }))
                    }
                    placeholder="AU"
                    disabled
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Due Date */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Payment Terms</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="due-date">Due Date</Label>
            <Input
              id="due-date"
              type="date"
              value={state.dueDate ? format(state.dueDate, "yyyy-MM-dd") : ""}
              onChange={(e) =>
                setState((s) => ({
                  ...s,
                  dueDate: e.target.value ? new Date(e.target.value) : null,
                }))
              }
              className="w-48"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

const StepReview = memo(function StepReview({ state }: { state: WizardState }) {
  // Calculate totals
  const subtotal = state.lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  const discountFromPercent = Math.round(subtotal * (state.discountPercent / 100));
  const totalDiscount = discountFromPercent + state.discountAmount;
  const afterDiscount = subtotal - totalDiscount;
  const gstAmount = Math.round(afterDiscount * GST_RATE);
  const total = afterDiscount + gstAmount + state.shippingAmount;

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
          {state.customer && (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">{state.customer.name}</p>
                <p className="text-sm text-muted-foreground">
                  {state.customer.email || state.customer.phone}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Items ({state.lineItems.length})
          </CardTitle>
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
              {state.lineItems.map((item) => (
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
            <p>{state.shippingAddress.street1}</p>
            <p>
              {state.shippingAddress.city}, {state.shippingAddress.state}{" "}
              {state.shippingAddress.postcode}
            </p>
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
          {state.shippingAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span>Shipping</span>
              <span>{formatPrice(state.shippingAmount)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-semibold text-lg">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
          {state.dueDate && (
            <p className="text-xs text-muted-foreground pt-2">
              Due: {format(state.dueDate, "dd/MM/yyyy")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      {(state.internalNotes || state.customerNotes) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {state.internalNotes && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Internal Notes
                </p>
                <p className="text-sm">{state.internalNotes}</p>
              </div>
            )}
            {state.customerNotes && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Customer Notes
                </p>
                <p className="text-sm">{state.customerNotes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notes Input */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Add Notes (Optional)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="internal-notes">Internal Notes</Label>
            <Textarea
              id="internal-notes"
              placeholder="Notes visible only to staff..."
              value={state.internalNotes}
              onChange={() => {}}
              disabled
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer-notes">Customer Notes</Label>
            <Textarea
              id="customer-notes"
              placeholder="Notes visible to customer..."
              value={state.customerNotes}
              onChange={() => {}}
              disabled
              rows={2}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const OrderCreationWizard = memo(function OrderCreationWizard({
  onComplete,
  onCancel,
  onSubmit,
  isSubmitting = false,
  className,
}: OrderCreationWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [state, setState] = useState<WizardState>(initialState);

  // Build submit data from wizard state
  const buildSubmitData = useCallback((): OrderSubmitData => {
    if (!state.customer) throw new Error("Customer is required");
    if (state.lineItems.length === 0) throw new Error("At least one item is required");

    return {
      customerId: state.customer.id,
      status: "draft",
      paymentStatus: "pending",
      orderDate: new Date(),
      dueDate: state.dueDate || undefined,
      shippingAddress: state.shippingAddress.street1
        ? {
            street1: state.shippingAddress.street1,
            street2: state.shippingAddress.street2,
            city: state.shippingAddress.city,
            state: state.shippingAddress.state,
            postalCode: state.shippingAddress.postcode,
            country: state.shippingAddress.country,
          }
        : undefined,
      billingAddress: state.customer.billingAddress
        ? {
            street1: state.customer.billingAddress.street1 || "",
            city: state.customer.billingAddress.city || "",
            state: state.customer.billingAddress.state || "",
            postalCode: state.customer.billingAddress.postcode || "",
            country: state.customer.billingAddress.country || "AU",
          }
        : undefined,
      discountPercent: state.discountPercent || undefined,
      discountAmount: state.discountAmount || undefined,
      shippingAmount: state.shippingAmount,
      internalNotes: state.internalNotes || undefined,
      customerNotes: state.customerNotes || undefined,
      lineItems: state.lineItems.map((item) => ({
        productId: item.productId,
        lineNumber: item.lineNumber,
        sku: item.sku || undefined,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPercent: item.discountPercent,
        discountAmount: item.discountAmount,
        taxType: item.taxType,
        notes: item.notes,
      })),
    };
  }, [state]);

  // Step validation
  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 1:
        return state.customer !== null;
      case 2:
        return state.lineItems.length > 0;
      case 3:
        return true; // Pricing is optional
      case 4:
        return true; // Shipping is optional
      case 5:
        return true;
      default:
        return false;
    }
  }, [currentStep, state]);

  // Navigation
  const goNext = useCallback(() => {
    if (currentStep < STEPS.length) {
      setCurrentStep((s) => s + 1);
    }
  }, [currentStep]);

  const goBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  const handleSubmit = useCallback(async () => {
    try {
      const data = buildSubmitData();
      const result = await onSubmit(data);
      onComplete(result.id, result.orderNumber);
    } catch {
      // Error handling is done by the container
    }
  }, [buildSubmitData, onSubmit, onComplete]);

  // Render current step
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <StepCustomer state={state} setState={setState} />;
      case 2:
        return <StepProducts state={state} setState={setState} />;
      case 3:
        return <StepPricing state={state} setState={setState} />;
      case 4:
        return <StepShipping state={state} setState={setState} />;
      case 5:
        return <StepReview state={state} />;
      default:
        return null;
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Progress Indicator */}
      <nav aria-label="Progress">
        <ol className="flex items-center">
          {STEPS.map((step, stepIdx) => (
            <li
              key={step.id}
              className={cn(
                "relative",
                stepIdx !== STEPS.length - 1 ? "flex-1 pr-8" : ""
              )}
            >
              <div className="flex items-center">
                <div
                  className={cn(
                    "relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
                    currentStep > step.id
                      ? "border-primary bg-primary"
                      : currentStep === step.id
                        ? "border-primary bg-background"
                        : "border-muted bg-background"
                  )}
                >
                  {currentStep > step.id ? (
                    <Check className="h-5 w-5 text-primary-foreground" />
                  ) : (
                    <step.icon
                      className={cn(
                        "h-5 w-5",
                        currentStep === step.id
                          ? "text-primary"
                          : "text-muted-foreground"
                      )}
                    />
                  )}
                </div>
                {stepIdx !== STEPS.length - 1 && (
                  <div
                    className={cn(
                      "absolute left-10 right-0 top-5 h-0.5",
                      currentStep > step.id ? "bg-primary" : "bg-muted"
                    )}
                  />
                )}
              </div>
              <div className="mt-2">
                <p
                  className={cn(
                    "text-xs font-medium",
                    currentStep >= step.id
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {step.name}
                </p>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  {step.description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </nav>

      <Separator />

      {/* Step Content */}
      <div className="min-h-[400px]">{renderStep()}</div>

      <Separator />

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <div className="flex items-center gap-2">
          {currentStep > 1 && (
            <Button variant="outline" onClick={goBack}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          )}
          {currentStep < STEPS.length ? (
            <Button onClick={goNext} disabled={!canProceed}>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Create Order
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
});

export default OrderCreationWizard;
