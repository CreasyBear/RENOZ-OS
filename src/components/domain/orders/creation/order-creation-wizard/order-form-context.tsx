/**
 * Order Form Context
 *
 * React Hook Form context provider for order creation forms.
 * Follows midday invoice patterns with Zod validation and form state management.
 *
 * Features:
 * - FormProvider wrapper with React Hook Form context
 * - Zod schema integration with useZodForm
 * - Real-time calculation integration
 * - Template-based form customization
 * - Error handling and validation state
 *
 * @see renoz-v3/_reference/.midday-reference/apps/dashboard/src/components/invoice/form-context.tsx
 */

'use client';

import { createContext, useContext, useMemo, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import type { UseFormReturn, DefaultValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormProvider } from 'react-hook-form';
import {
  orderFormSchema,
  type OrderFormData,
  type OrderFormTemplate,
  orderFormTemplateSchema,
} from '@/schemas/order-form-schemas';
import { calculateTotal, type OrderCalculationInput } from '@/lib/order-calculations';

// Input type for form defaultValues (before Zod transformation)
type OrderFormInput = z.input<typeof orderFormSchema>;

// ============================================================================
// TYPES
// ============================================================================

/** Extended form data with calculation results */
export interface OrderFormContextValue {
  /** The underlying React Hook Form instance - use specific methods (getValues, etc.) when possible */
  form: UseFormReturn<OrderFormData>;

  /** Get current form values - preferred over form.getValues() for type safety */
  getValues: () => OrderFormData;

  /** Current form data */
  formData: OrderFormData;

  /** Real-time calculation results */
  calculations: {
    subtotal: number;
    gstAmount: number;
    discountAmount: number;
    shippingAmount: number;
    total: number;
  };

  /** Form state helpers */
  isDirty: boolean;
  isValid: boolean;
  hasLineItems: boolean;

  /** Template helpers */
  template: OrderFormTemplate;
  updateTemplate: (updates: Partial<OrderFormTemplate>) => void;

  /** Line item helpers */
  addLineItem: (lineItem?: Partial<OrderFormData['lineItems'][0]>) => void;
  removeLineItem: (index: number) => void;
  duplicateLineItem: (index: number) => void;

  /** Calculation helpers */
  recalculateTotals: () => void;

  /** Reset helpers */
  resetForm: () => void;
  resetToDraft: () => void;
}

/** Props for OrderFormProvider */
export interface OrderFormProviderProps {
  children: ReactNode;
  defaultValues?: DefaultValues<OrderFormInput>;
  template?: Partial<OrderFormTemplate>;
  onCalculationChange?: (calculations: OrderFormContextValue['calculations']) => void;
}

// ============================================================================
// CUSTOM HOOK FOR ZOD FORM
// ============================================================================

// Note: useZodForm removed - using useForm directly with explicit types for better type safety

// ============================================================================
// CONTEXT
// ============================================================================

const OrderFormContext = createContext<OrderFormContextValue | null>(null);

/** Hook to access order form context */
export function useOrderForm(): OrderFormContextValue {
  const context = useContext(OrderFormContext);
  if (!context) {
    throw new Error('useOrderForm must be used within an OrderFormProvider');
  }
  return context;
}

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

export function OrderFormProvider({
  children,
  defaultValues,
  template: initialTemplate = {},
  onCalculationChange,
}: OrderFormProviderProps) {
  // Initialize form with Zod validation
  // Note: We use type assertion since validation happens at submit time
  // and customerId is set via CustomerSelector outside the form
  const form = useForm<OrderFormData>({
    // @ts-expect-error - zodResolver types don't perfectly align with Zod 4
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      // Default order values - customerId set externally via CustomerSelector
      customerId: '' as string, // Placeholder until customer selected
      status: 'draft',
      orderDate: new Date(),
      shippingAmount: 0,
      lineItems: [],
      template: {
        includeGst: true,
        includeDiscounts: true,
        includeShipping: true,
        autoGenerateOrderNumber: true,
        ...initialTemplate,
      },
      ...defaultValues,
    } as OrderFormData,
    mode: 'onChange',
  });

  // Watch form data for calculations
  // Note: watch() returns partial data during edits, type assertion is safe here
  const formData = form.watch() as OrderFormData;

  // Template management
  const template = useMemo(() => {
    const templateData = formData.template || {};
    return orderFormTemplateSchema.parse({
      includeGst: true,
      includeDiscounts: true,
      includeShipping: true,
      autoGenerateOrderNumber: true,
      ...initialTemplate,
      ...templateData,
    });
  }, [formData.template, initialTemplate]);

  // Real-time calculations
  const calculations = useMemo(() => {
    const lineItems = formData.lineItems || [];

    // Convert form data to calculation input
    const calculationInput: OrderCalculationInput = {
      lineItems: lineItems.map((item) => ({
        price: item.unitPrice,
        quantity: item.quantity,
        discountPercent: item.discountPercent,
        discountAmount: item.discountAmount,
      })),
      gstRate: template.includeGst ? 0.1 : 0,
      discountPercent: formData.discountPercent,
      discountAmount: formData.discountAmount,
      shippingAmount: template.includeShipping ? formData.shippingAmount : 0,
      includeGST: template.includeGst,
    };

    const result = calculateTotal(calculationInput);

    // Notify parent of calculation changes
    if (onCalculationChange) {
      onCalculationChange(result);
    }

    return result;
  }, [
    formData.lineItems,
    formData.discountPercent,
    formData.discountAmount,
    formData.shippingAmount,
    template.includeGst,
    template.includeShipping,
    onCalculationChange,
  ]);

  // Form state helpers
  const isDirty = form.formState.isDirty;
  const isValid = form.formState.isValid;
  const hasLineItems = (formData.lineItems || []).length > 0;

  // Template update helper
  const updateTemplate = useCallback(
    (updates: Partial<OrderFormTemplate>) => {
      const currentTemplate = form.getValues('template') || {};
      // Parse the merged template to ensure all defaults are applied
      const newTemplate = orderFormTemplateSchema.parse({ ...currentTemplate, ...updates });
      form.setValue('template', newTemplate, { shouldValidate: true });
    },
    [form]
  );

  // Line item management helpers
  const addLineItem = useCallback(
    (lineItem?: Partial<OrderFormData['lineItems'][0]>) => {
      const currentItems = form.getValues('lineItems') || [];
      const newItem = {
        description: '',
        quantity: 1,
        unitPrice: 0,
        taxType: 'gst' as const,
        isNew: true,
        tempId: `temp-${Date.now()}-${Math.random()}`,
        ...lineItem,
      };

      form.setValue('lineItems', [...currentItems, newItem], {
        shouldValidate: true,
        shouldDirty: true,
      });
    },
    [form]
  );

  const removeLineItem = useCallback(
    (index: number) => {
      const currentItems = form.getValues('lineItems') || [];
      if (currentItems.length > 1) {
        // Keep at least one item
        const newItems = currentItems.filter((_, i) => i !== index);
        form.setValue('lineItems', newItems, {
          shouldValidate: true,
          shouldDirty: true,
        });
      }
    },
    [form]
  );

  const duplicateLineItem = useCallback(
    (index: number) => {
      const currentItems = form.getValues('lineItems') || [];
      const itemToDuplicate = currentItems[index];

      if (itemToDuplicate) {
        const duplicatedItem = {
          ...itemToDuplicate,
          isNew: true,
          tempId: `temp-${Date.now()}-${Math.random()}`,
          description: `${itemToDuplicate.description} (Copy)`,
        };

        const newItems = [...currentItems];
        newItems.splice(index + 1, 0, duplicatedItem);

        form.setValue('lineItems', newItems, {
          shouldValidate: true,
          shouldDirty: true,
        });
      }
    },
    [form]
  );

  // Calculation trigger
  const recalculateTotals = useCallback(() => {
    // Trigger form re-validation to update calculations
    form.trigger();
  }, [form]);

  // Reset helpers
  const resetForm = useCallback(() => {
    form.reset();
  }, [form]);

  const resetToDraft = useCallback(() => {
    form.setValue('status', 'draft');
  }, [form]);

  // Context value
  // Cast form via unknown due to react-hook-form generic variance issues with handleSubmit callback types
  const contextValue: OrderFormContextValue = {
    form: form as unknown as UseFormReturn<OrderFormData>,
    getValues: () => form.getValues() as OrderFormData,
    formData,
    calculations,
    isDirty,
    isValid,
    hasLineItems,
    template,
    updateTemplate,
    addLineItem,
    removeLineItem,
    duplicateLineItem,
    recalculateTotals,
    resetForm,
    resetToDraft,
  };

  return (
    <OrderFormContext.Provider value={contextValue}>
      <FormProvider {...form}>{children}</FormProvider>
    </OrderFormContext.Provider>
  );
}

// ============================================================================
// HOOK EXPORTS
// ============================================================================

/** Hook for accessing form calculations */
export function useOrderFormCalculations() {
  const { calculations, recalculateTotals } = useOrderForm();
  return { calculations, recalculateTotals };
}

/** Hook for accessing line item operations */
export function useOrderFormLineItems() {
  const { addLineItem, removeLineItem, duplicateLineItem } = useOrderForm();
  return { addLineItem, removeLineItem, duplicateLineItem };
}

/** Hook for accessing template operations */
export function useOrderFormTemplate() {
  const { template, updateTemplate } = useOrderForm();
  return { template, updateTemplate };
}

/** Hook for accessing form state */
export function useOrderFormState() {
  const { isDirty, isValid, hasLineItems, resetForm, resetToDraft } = useOrderForm();
  return { isDirty, isValid, hasLineItems, resetForm, resetToDraft };
}
