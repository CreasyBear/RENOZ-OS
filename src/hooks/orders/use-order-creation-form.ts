/**
 * Order Creation Form Hook
 *
 * TanStack Form for the order creation wizard.
 * Integrates with useFormDraft for auto-save.
 *
 * @see order-creation-wizard.tsx
 * @see order-creation-form.ts schema
 */

import { addDays } from 'date-fns';
import { useTanStackForm } from '@/hooks/_shared/use-tanstack-form';
import {
  orderCreationFormSchema,
  type OrderCreationFormValues,
  type OrderSubmitData,
} from '@/lib/schemas/orders/order-creation-form';
import { validateOrderBusinessRules, calculateTotal } from '@/lib/order-calculations';

// ============================================================================
// DEFAULT VALUES
// ============================================================================

export function getOrderCreationDefaultValues(initialCustomerId?: string): OrderCreationFormValues {
  return {
    customerId: initialCustomerId ?? '',
    lineItems: [],
    discountPercent: 0,
    discountAmount: 0,
    shippingAmount: 0,
    useBillingAsShipping: true,
    shippingAddress: {
      street1: '',
      street2: '',
      city: '',
      state: '',
      postcode: '',
      country: 'AU',
    },
    dueDate: addDays(new Date(), 14),
    internalNotes: '',
    customerNotes: '',
    currentStep: 0,
  };
}

// ============================================================================
// TRANSFORM TO SUBMIT PAYLOAD
// ============================================================================

export interface UseOrderCreationFormOptions {
  initialCustomerId?: string;
  /** Receives validated form values. Caller (wizard) builds OrderSubmitData and calls parent onSubmit. */
  onSubmit: (values: OrderCreationFormValues) => Promise<{ id: string; orderNumber: string }>;
  onValidationError?: (error: unknown) => void;
  onSubmitInvalid?: (props: { value: OrderCreationFormValues }) => void;
}

/** Customer address shape from useCustomer / getCustomerById (addresses array) */
export interface CustomerAddressesForSubmit {
  shippingAddress?: { street1?: string; street2?: string; city?: string; state?: string; postcode?: string; country?: string };
  billingAddress?: { street1?: string; street2?: string; city?: string; state?: string; postcode?: string; country?: string };
}

/**
 * Extract addresses from customer API response (addresses array with type).
 * Use with useCustomer(id).data
 */
export function getCustomerAddressesFromApi(customer: {
  addresses?: Array<{
    type: string;
    street1?: string | null;
    street2?: string | null;
    city?: string | null;
    state?: string | null;
    postcode?: string | null;
    country?: string | null;
  }>;
} | null | undefined): CustomerAddressesForSubmit {
  if (!customer?.addresses) return {};
  const billing = customer.addresses.find((a) => a.type === 'billing');
  const shipping = customer.addresses.find((a) => a.type === 'shipping');
  return {
    shippingAddress: shipping
      ? {
          street1: shipping.street1 ?? undefined,
          street2: shipping.street2 ?? undefined,
          city: shipping.city ?? undefined,
          state: shipping.state ?? undefined,
          postcode: shipping.postcode ?? undefined,
          country: shipping.country ?? undefined,
        }
      : undefined,
    billingAddress: billing
      ? {
          street1: billing.street1 ?? undefined,
          street2: billing.street2 ?? undefined,
          city: billing.city ?? undefined,
          state: billing.state ?? undefined,
          postcode: billing.postcode ?? undefined,
          country: billing.country ?? undefined,
        }
      : undefined,
  };
}

/**
 * Build OrderSubmitData from form values.
 * Requires customer addresses - use getCustomerAddressesFromApi(useCustomer(customerId).data) in caller.
 */
export function buildOrderSubmitData(
  values: OrderCreationFormValues,
  customerAddresses: CustomerAddressesForSubmit
): OrderSubmitData {
  const { customerId, useBillingAsShipping, shippingAddress, ...rest } = values;
  if (!customerId) throw new Error('Customer is required');
  if (values.lineItems.length === 0) throw new Error('At least one item is required');

  const customerAddr = customerAddresses.shippingAddress || customerAddresses.billingAddress;
  const effectiveShipping =
    useBillingAsShipping && customerAddr?.street1
      ? {
          street1: customerAddr.street1 || '',
          street2: customerAddr.street2,
          city: customerAddr.city || '',
          state: customerAddr.state || '',
          postalCode: customerAddr.postcode || '',
          country: customerAddr.country || 'AU',
        }
      : shippingAddress.street1
        ? {
            street1: shippingAddress.street1,
            street2: shippingAddress.street2,
            city: shippingAddress.city,
            state: shippingAddress.state,
            postalCode: shippingAddress.postcode,
            country: shippingAddress.country,
          }
        : undefined;

  const billingAddr = customerAddresses.billingAddress;
  const billingAddress = billingAddr?.street1
    ? {
        street1: billingAddr.street1 || '',
        city: billingAddr.city || '',
        state: billingAddr.state || '',
        postalCode: billingAddr.postcode || '',
        country: billingAddr.country || 'AU',
      }
    : undefined;

  return {
    customerId,
    status: 'draft',
    paymentStatus: 'pending',
    orderDate: new Date(),
    dueDate: rest.dueDate ?? undefined,
    shippingAddress: effectiveShipping,
    billingAddress,
    discountPercent: rest.discountPercent || undefined,
    discountAmount: rest.discountAmount || undefined,
    shippingAmount: rest.shippingAmount,
    internalNotes: rest.internalNotes || undefined,
    customerNotes: rest.customerNotes || undefined,
    lineItems: values.lineItems.map((item) => ({
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
}

/**
 * Validate order business rules before submit.
 * Throws with user-friendly message if invalid.
 */
export function validateOrderCreationForm(values: OrderCreationFormValues): void {
  // Line-level: each item cannot have both % and $ discount
  for (let i = 0; i < values.lineItems.length; i++) {
    const item = values.lineItems[i];
    const pct = item.discountPercent ?? 0;
    const amt = item.discountAmount ?? 0;
    if (pct > 0 && amt > 0) {
      throw new Error(
        `Line item "${item.description}": cannot specify both percentage and fixed discount`
      );
    }
    const lineTotal = item.quantity * item.unitPrice;
    const lineDiscount = amt + (lineTotal * pct) / 100;
    if (lineDiscount > lineTotal) {
      throw new Error(
        `Line item "${item.description}": discount cannot exceed line total`
      );
    }
  }

  const calcResult = calculateTotal({
    lineItems: values.lineItems.map((li) => ({
      price: li.unitPrice,
      quantity: li.quantity,
      discountPercent: li.discountPercent ?? 0,
      discountAmount: li.discountAmount ?? 0,
    })),
    discountPercent: values.discountPercent ?? 0,
    discountAmount: values.discountAmount ?? 0,
    shippingAmount: values.shippingAmount,
  });
  const businessRules = validateOrderBusinessRules(calcResult);
  if (!businessRules.isValid) {
    throw new Error(businessRules.warnings.join('. '));
  }
}

// ============================================================================
// HOOK
// ============================================================================

export function useOrderCreationForm({
  initialCustomerId,
  onSubmit,
  onValidationError,
  onSubmitInvalid,
}: UseOrderCreationFormOptions) {
  const defaultValues = getOrderCreationDefaultValues(initialCustomerId);

  const form = useTanStackForm<OrderCreationFormValues>({
    schema: orderCreationFormSchema,
    defaultValues,
    onSubmit: async (values) => {
      await onSubmit(values);
    },
    onValidationError,
    onSubmitInvalid,
  });

  return form;
}
