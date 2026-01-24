/**
 * Order Form Schemas
 *
 * Zod validation schemas for order creation forms.
 * Follows midday invoice patterns with React Hook Form integration.
 *
 * Features:
 * - Nested order and line item validation
 * - Conditional validation rules
 * - Template-based form customization
 * - React Hook Form compatibility
 *
 * @see renoz-v3/_reference/.midday-reference/apps/dashboard/src/components/invoice/form-context.tsx
 */

import { z } from 'zod';
import { currencySchema, quantitySchema, percentageSchema } from '../lib/schemas/_shared/patterns';

// ============================================================================
// ORDER FORM LINE ITEM SCHEMA
// ============================================================================

/**
 * Schema for individual line items in order forms.
 * Supports product selection, quantity, pricing, and discounts.
 */
export const orderFormLineItemSchema = z
  .object({
    // Core product information
    productId: z.string().uuid().optional(),
    sku: z.string().max(50).optional(),
    description: z.string().min(1, 'Description is required').max(500),

    // Quantity and pricing
    quantity: quantitySchema.min(0.01, 'Quantity must be greater than 0'),
    unitPrice: currencySchema.min(0, 'Unit price cannot be negative'),

    // Discount options (percentage or fixed amount)
    discountPercent: percentageSchema.optional(),
    discountAmount: currencySchema.min(0, 'Discount cannot be negative').optional(),

    // Tax information
    taxType: z.enum(['gst', 'export', 'exempt']).default('gst'),

    // Additional metadata
    notes: z.string().max(500).optional(),

    // UI state (not persisted)
    isNew: z.boolean().optional(),
    tempId: z.string().optional(),
  })
  .refine(
    (data) => {
      // Ensure at least one discount method is provided, but not both
      const hasPercentDiscount = data.discountPercent !== undefined && data.discountPercent > 0;
      const hasFixedDiscount = data.discountAmount !== undefined && data.discountAmount > 0;

      // It's okay to have neither, but not both
      return !(hasPercentDiscount && hasFixedDiscount);
    },
    {
      message: 'Cannot specify both percentage and fixed discount for the same line item',
      path: ['discountPercent'],
    }
  )
  .refine(
    (data) => {
      // Discount cannot exceed the line item total
      const lineTotal = (data.quantity || 0) * (data.unitPrice || 0);
      const discountAmount = data.discountAmount || 0;
      const discountPercent = data.discountPercent || 0;
      const totalDiscount = discountAmount + (lineTotal * discountPercent) / 100;

      return totalDiscount <= lineTotal;
    },
    {
      message: 'Total discount cannot exceed line item total',
      path: ['discountAmount'],
    }
  );

// ============================================================================
// ORDER FORM TEMPLATE SCHEMA
// ============================================================================

/**
 * Schema for order form templates.
 * Allows customization of form labels and behavior.
 */
export const orderFormTemplateSchema = z.object({
  // Header labels
  titleLabel: z.string().default('Create Order'),
  customerLabel: z.string().default('Customer'),
  orderNumberLabel: z.string().default('Order Number'),
  dateLabel: z.string().default('Order Date'),
  dueDateLabel: z.string().default('Due Date'),

  // Line items labels
  descriptionLabel: z.string().default('Description'),
  quantityLabel: z.string().default('Qty'),
  priceLabel: z.string().default('Price'),
  totalLabel: z.string().default('Total'),

  // Summary labels
  subtotalLabel: z.string().default('Subtotal'),
  discountLabel: z.string().default('Discount'),
  gstLabel: z.string().default('GST (10%)'),
  shippingLabel: z.string().default('Shipping'),
  totalSummaryLabel: z.string().default('Total'),

  // Form behavior
  includeGst: z.boolean().default(true),
  includeDiscounts: z.boolean().default(true),
  includeShipping: z.boolean().default(true),
  autoGenerateOrderNumber: z.boolean().default(true),

  // Validation settings
  requireDueDate: z.boolean().default(false),
  minimumOrderValue: currencySchema.optional(),
  maximumDiscountPercent: percentageSchema.default(100),
});

// ============================================================================
// ORDER FORM SCHEMA
// ============================================================================

/**
 * Main schema for order creation forms.
 * Includes customer, dates, line items, and all order details.
 */
export const orderFormSchema = z
  .object({
    // Basic order information
    orderNumber: z.string().max(50).optional(),
    status: z.enum(['draft', 'confirmed']).default('draft'),

    // Customer information
    customerId: z.string().uuid('Customer is required'),
    customerName: z.string().optional(), // For display purposes

    // Dates
    orderDate: z.coerce.date().default(() => new Date()),
    dueDate: z.coerce.date().optional(),

    // Financial information
    discountPercent: percentageSchema.optional(),
    discountAmount: currencySchema.min(0, 'Discount cannot be negative').optional(),
    shippingAmount: currencySchema.min(0, 'Shipping cannot be negative').default(0),

    // Notes and metadata
    internalNotes: z.string().max(2000).optional(),
    customerNotes: z.string().max(2000).optional(),

    // Line items (must have at least one)
    lineItems: z
      .array(orderFormLineItemSchema)
      .min(1, 'At least one line item is required')
      .max(100, 'Maximum 100 line items allowed'),

    // Template configuration
    template: orderFormTemplateSchema.optional(),

    // Form state (not persisted)
    isSubmitting: z.boolean().optional(),
    lastCalculatedTotal: currencySchema.optional(),
  })
  .refine(
    (data) => {
      // Ensure at least one discount method is provided, but not both
      const hasPercentDiscount = data.discountPercent !== undefined && data.discountPercent > 0;
      const hasFixedDiscount = data.discountAmount !== undefined && data.discountAmount > 0;

      return !(hasPercentDiscount && hasFixedDiscount);
    },
    {
      message: 'Cannot specify both percentage and fixed discount for the order',
      path: ['discountPercent'],
    }
  )
  .refine(
    (data) => {
      // If due date is required by template, ensure it's provided
      if (data.template?.requireDueDate && !data.dueDate) {
        return false;
      }
      return true;
    },
    {
      message: 'Due date is required',
      path: ['dueDate'],
    }
  )
  .refine(
    (data) => {
      // Check minimum order value if specified in template
      if (data.template?.minimumOrderValue) {
        const orderTotal = calculateOrderFormTotal(data);
        return orderTotal >= data.template.minimumOrderValue;
      }
      return true;
    },
    {
      message: 'Order total must meet minimum order value requirement',
      path: ['lineItems'],
    }
  );

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate total for order form data.
 * Used for validation and real-time calculations.
 */
function calculateOrderFormTotal(data: z.infer<typeof orderFormSchema>): number {
  let subtotal = 0;

  // Calculate line items subtotal
  data.lineItems.forEach((item) => {
    const lineTotal = (item.quantity || 0) * (item.unitPrice || 0);
    const discountPercent = item.discountPercent || 0;
    const discountAmount = item.discountAmount || 0;
    const totalDiscount = discountAmount + (lineTotal * discountPercent) / 100;
    subtotal += Math.max(0, lineTotal - totalDiscount);
  });

  // Apply order-level discounts
  const orderDiscountPercent = data.discountPercent || 0;
  const orderDiscountAmount = data.discountAmount || 0;
  const totalOrderDiscount = orderDiscountAmount + (subtotal * orderDiscountPercent) / 100;
  subtotal = Math.max(0, subtotal - totalOrderDiscount);

  // Add shipping
  const shipping = data.shippingAmount || 0;
  const taxableAmount = subtotal + shipping;

  // Add GST if enabled
  const gstRate = data.template?.includeGst ? 0.1 : 0;
  const gstAmount = taxableAmount * gstRate;

  return Math.round((taxableAmount + gstAmount) * 100) / 100;
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

/** Type for order form line items */
export type OrderFormLineItem = z.infer<typeof orderFormLineItemSchema>;

/** Type for order form templates */
export type OrderFormTemplate = z.infer<typeof orderFormTemplateSchema>;

/** Type for complete order form data */
export type OrderFormData = z.infer<typeof orderFormSchema>;

/** Type for order form validation errors */
export type OrderFormErrors = z.ZodError<OrderFormData>;

// ============================================================================
// FORM FIELD CONFIGURATIONS
// ============================================================================

/**
 * Field configurations for form rendering.
 * Used by form components to determine field types and validation.
 */
export const orderFormFieldConfigs = {
  customerId: {
    type: 'select' as const,
    required: true,
    labelKey: 'customerLabel',
    placeholder: 'Select a customer',
  },
  orderNumber: {
    type: 'text' as const,
    required: false,
    labelKey: 'orderNumberLabel',
    placeholder: 'Auto-generated',
  },
  orderDate: {
    type: 'date' as const,
    required: true,
    labelKey: 'dateLabel',
  },
  dueDate: {
    type: 'date' as const,
    required: false,
    labelKey: 'dueDateLabel',
  },
  discountPercent: {
    type: 'percentage' as const,
    required: false,
    labelKey: 'discountLabel',
    placeholder: '0',
  },
  discountAmount: {
    type: 'currency' as const,
    required: false,
    labelKey: 'discountLabel',
    placeholder: '0.00',
  },
  shippingAmount: {
    type: 'currency' as const,
    required: false,
    labelKey: 'shippingLabel',
    placeholder: '0.00',
  },
  internalNotes: {
    type: 'textarea' as const,
    required: false,
    placeholder: 'Internal notes (not visible to customer)',
  },
  customerNotes: {
    type: 'textarea' as const,
    required: false,
    placeholder: 'Notes visible to customer',
  },
} as const;

/**
 * Line item field configurations.
 */
export const lineItemFieldConfigs = {
  description: {
    type: 'text' as const,
    required: true,
    labelKey: 'descriptionLabel',
    placeholder: 'Item description',
  },
  quantity: {
    type: 'number' as const,
    required: true,
    labelKey: 'quantityLabel',
    min: 0.01,
    step: 0.01,
  },
  unitPrice: {
    type: 'currency' as const,
    required: true,
    labelKey: 'priceLabel',
    min: 0,
    step: 0.01,
  },
  discountPercent: {
    type: 'percentage' as const,
    required: false,
    label: 'Discount %',
    min: 0,
    max: 100,
  },
  discountAmount: {
    type: 'currency' as const,
    required: false,
    label: 'Discount $',
    min: 0,
    step: 0.01,
  },
  notes: {
    type: 'text' as const,
    required: false,
    placeholder: 'Optional notes',
  },
} as const;
