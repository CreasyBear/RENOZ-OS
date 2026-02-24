/**
 * Order Creation Form Schema
 *
 * Form-specific schema for the order creation wizard.
 * Extends createOrderSchema concepts but adds form-only fields (currentStep for draft).
 * Exclude currentStep when building submit payload.
 *
 * @see order-creation-wizard.tsx
 * @see createOrderSchema in orders.ts
 */

import { z } from 'zod';
import {
  currencySchema,
  percentageSchema,
  quantitySchema,
} from '../_shared/patterns';
import { taxTypeSchema } from '../products/products';

// ============================================================================
// SHIPPING ADDRESS (form uses postcode to match wizard/CustomerSelector)
// ============================================================================

/** Partial address for form - all fields optional for manual entry */
export const orderCreationShippingAddressSchema = z.object({
  street1: z.string().max(255).default(''),
  street2: z.string().max(255).optional().or(z.literal('')),
  city: z.string().max(100).default(''),
  state: z.string().max(100).default(''),
  postcode: z.string().max(20).default(''),
  country: z.string().max(2).default('AU'),
});

export type OrderCreationShippingAddress = z.infer<
  typeof orderCreationShippingAddressSchema
>;

// ============================================================================
// LINE ITEM (form shape - matches OrderLineItemDraft from ProductSelector)
// ============================================================================

/** Form line item - ProductSelector uses sku as string (empty when missing) */
export const orderCreationLineItemSchema = z.object({
  productId: z.string().uuid(),
  lineNumber: z.string().max(10),
  sku: z.string().max(50).default(''),
  description: z.string().min(1, 'Description is required').max(500),
  quantity: quantitySchema.refine((n) => n > 0, 'Quantity must be greater than 0'),
  unitPrice: currencySchema,
  discountPercent: percentageSchema.optional(),
  discountAmount: currencySchema.optional(),
  taxType: taxTypeSchema.default('gst'),
  notes: z.string().max(500).optional().or(z.literal('')),
});

export type OrderCreationLineItem = z.infer<typeof orderCreationLineItemSchema>;

// ============================================================================
// ORDER CREATION FORM
// ============================================================================

export const orderCreationFormSchema = z
  .object({
    // Step 1: Customer (empty string = no selection)
    customerId: z.string().uuid().or(z.literal('')),

    // Step 2: Products
    lineItems: z.array(orderCreationLineItemSchema).min(1, 'Add at least one product to continue.').default([]),

    // Step 3: Pricing
    discountPercent: percentageSchema.default(0),
    discountAmount: currencySchema.default(0),

    // Step 4: Shipping
    shippingAmount: currencySchema.default(0),
    useBillingAsShipping: z.boolean().default(true),
    shippingAddress: orderCreationShippingAddressSchema,
    dueDate: z.coerce.date().nullable().default(null),

    // Step 5: Notes
    internalNotes: z.string().max(2000).default(''),
    customerNotes: z.string().max(2000).default(''),

    /** For draft persistence - excluded from submit payload */
    currentStep: z.number().int().min(0).max(4).default(0),
  })
  .refine((data) => !!data.customerId, {
    message: 'Select a customer to continue.',
    path: ['customerId'],
  })
  .refine(
    (data) => {
      const hasPercent = (data.discountPercent ?? 0) > 0;
      const hasAmount = (data.discountAmount ?? 0) > 0;
      return !(hasPercent && hasAmount);
    },
    { message: 'Cannot specify both percentage and fixed discount', path: ['discountAmount'] }
  )
  .refine(
    (data) => {
      const subtotal = data.lineItems.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0
      );
      const discountFromPercent = Math.round(
        subtotal * ((data.discountPercent ?? 0) / 100)
      );
      const totalDiscount = discountFromPercent + (data.discountAmount ?? 0);
      return totalDiscount <= subtotal;
    },
    { message: 'Total discount cannot exceed order subtotal', path: ['discountAmount'] }
  );

export type OrderCreationFormValues = z.infer<typeof orderCreationFormSchema>;

// ============================================================================
// ORDER SUBMIT DATA (wire type for createOrder API)
// ============================================================================

/**
 * Order data to submit to createOrder.
 * Built from OrderCreationFormValues by buildOrderSubmitData.
 * Uses postalCode (API) not postcode (form).
 *
 * @see buildOrderSubmitData in use-order-creation-form.ts
 * @see createOrderSchema in orders.ts
 */
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
    taxType: 'gst' | 'gst_free' | 'input_taxed' | 'export';
    notes?: string;
  }>;
}
