/**
 * Zod Form Hook - Gold Standard from Midday
 *
 * Provides a standardized way to create forms with Zod validation.
 * Eliminates boilerplate and ensures consistent validation patterns.
 */

import { zodResolver } from '@hookform/resolvers/zod';
import { type UseFormProps, useForm } from 'react-hook-form';
import { z } from 'zod';

/**
 * Enhanced useForm hook with Zod resolver
 * Based on Midday's gold standard pattern
 */
export const useZodForm = <T extends z.ZodType<any, any>>(
  schema: T,
  options?: Omit<UseFormProps<z.infer<T>>, 'resolver'>
) => {
  return useForm<z.infer<T>>({
    resolver: zodResolver(schema),
    mode: 'onChange', // Validate on change for better UX
    ...options,
  });
};

// ============================================================================
// COMMON VALIDATION SCHEMAS
// ============================================================================

// Basic field validations
export const fieldSchemas = {
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain uppercase, lowercase, and number'
    ),

  phone: z
    .string()
    .min(1, 'Phone number is required')
    .regex(/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number'),

  currency: z
    .number()
    .min(0, 'Amount must be positive')
    .max(999999.99, 'Amount cannot exceed $999,999.99'),

  quantity: z
    .number()
    .int('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1')
    .max(999999, 'Quantity cannot exceed 999,999'),

  percentage: z
    .number()
    .min(0, 'Percentage cannot be negative')
    .max(100, 'Percentage cannot exceed 100'),

  name: z.string().min(1, 'Name is required').max(100, 'Name cannot exceed 100 characters').trim(),

  description: z.string().max(1000, 'Description cannot exceed 1000 characters').optional(),

  notes: z.string().max(5000, 'Notes cannot exceed 5000 characters').optional(),

  url: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
} as const;

// Common form patterns
export const formSchemas = {
  // Supplier forms
  supplier: z.object({
    name: fieldSchemas.name,
    code: z
      .string()
      .min(1, 'Supplier code is required')
      .max(20, 'Code cannot exceed 20 characters'),
    email: fieldSchemas.email.optional(),
    phone: fieldSchemas.phone.optional(),
    address: z.string().max(500, 'Address cannot exceed 500 characters').optional(),
    website: fieldSchemas.url,
    status: z.enum(['active', 'inactive']).default('active'),
    type: z.enum(['manufacturer', 'distributor', 'retailer', 'service']).optional(),
    paymentTerms: z.string().max(100, 'Payment terms cannot exceed 100 characters').optional(),
  }),

  // Price list forms
  priceList: z.object({
    supplierId: z.string().min(1, 'Supplier is required'),
    productName: z
      .string()
      .min(1, 'Product name is required')
      .max(200, 'Product name cannot exceed 200 characters'),
    productSku: z.string().max(50, 'SKU cannot exceed 50 characters').optional(),
    basePrice: fieldSchemas.currency,
    currency: z.string().default('AUD'),
    discountType: z.enum(['percentage', 'fixed', 'volume']).default('percentage'),
    discountValue: z.number().min(0).default(0),
    minOrderQty: z.number().int().min(1).optional(),
    maxOrderQty: z.number().int().min(1).optional(),
    effectiveDate: z.string().optional(),
    expiryDate: z.string().optional(),
    status: z.enum(['active', 'inactive']).default('active'),
  }),

  // Price agreement forms
  priceAgreement: z.object({
    supplierId: z.string().min(1, 'Supplier is required'),
    title: z.string().min(1, 'Title is required').max(200, 'Title cannot exceed 200 characters'),
    description: z.string().max(1000, 'Description cannot exceed 1000 characters').optional(),
    effectiveDate: z.string().min(1, 'Effective date is required'),
    expiryDate: z.string().optional(),
    totalItems: z.number().int().min(0).default(0),
    status: z.enum(['draft', 'active']).default('draft'),
  }),

  // Order forms
  order: z.object({
    customerId: z.string().min(1, 'Customer is required'),
    orderNumber: z
      .string()
      .min(1, 'Order number is required')
      .max(50, 'Order number cannot exceed 50 characters'),
    orderDate: z.string().min(1, 'Order date is required'),
    dueDate: z.string().optional(),
    status: z
      .enum(['draft', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'])
      .default('draft'),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
    notes: fieldSchemas.notes,
  }),

  // User forms
  user: z.object({
    email: fieldSchemas.email,
    firstName: fieldSchemas.name,
    lastName: fieldSchemas.name,
    role: z.enum(['admin', 'manager', 'user']).default('user'),
    status: z.enum(['active', 'inactive']).default('active'),
    phone: fieldSchemas.phone.optional(),
  }),
} as const;

// ============================================================================
// FORM HOOKS WITH PRESET SCHEMAS
// ============================================================================

/**
 * Supplier form hook
 */
export function useSupplierForm(
  options?: Omit<UseFormProps<z.infer<typeof formSchemas.supplier>>, 'resolver'>
) {
  return useZodForm(formSchemas.supplier, options);
}

/**
 * Price list form hook
 */
export function usePriceListForm(
  options?: Omit<UseFormProps<z.infer<typeof formSchemas.priceList>>, 'resolver'>
) {
  return useZodForm(formSchemas.priceList, options);
}

/**
 * Price agreement form hook
 */
export function usePriceAgreementForm(
  options?: Omit<UseFormProps<z.infer<typeof formSchemas.priceAgreement>>, 'resolver'>
) {
  return useZodForm(formSchemas.priceAgreement, options);
}

/**
 * Order form hook
 */
export function useOrderForm(
  options?: Omit<UseFormProps<z.infer<typeof formSchemas.order>>, 'resolver'>
) {
  return useZodForm(formSchemas.order, options);
}

/**
 * User form hook
 */
export function useUserForm(
  options?: Omit<UseFormProps<z.infer<typeof formSchemas.user>>, 'resolver'>
) {
  return useZodForm(formSchemas.user, options);
}

// ============================================================================
// CUSTOM FORM HOOKS FOR COMPLEX SCENARIOS
// ============================================================================

/**
 * Bulk operations form hook
 */
export function useBulkOperationForm<T extends Record<string, any>>(
  schema: z.ZodType<T>,
  options?: Omit<UseFormProps<T>, 'resolver'>
) {
  return useZodForm(schema, {
    mode: 'onSubmit', // Only validate on submit for bulk operations
    ...options,
  });
}

/**
 * Search/filter form hook with debouncing
 */
export function useFilterForm<T extends Record<string, any>>(
  schema: z.ZodType<T>,
  options?: Omit<UseFormProps<T>, 'resolver'>
) {
  return useZodForm(schema, {
    mode: 'onChange',
    defaultValues: {} as T,
    ...options,
  });
}
