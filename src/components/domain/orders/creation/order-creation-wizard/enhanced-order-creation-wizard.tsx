/**
 * Enhanced Order Creation Wizard
 *
 * @deprecated Not used by /orders/create route. Canonical: OrderCreationWizard (order-creation-wizard.tsx).
 * This was an alternative implementation; the create route uses the step-based wizard.
 * Safe to remove in future cleanup. See PREMORTEM_ORDERS_CREATION.md.
 *
 * Enterprise-grade order creation using the new form architecture.
 * Replaces the multi-step wizard with a comprehensive form system.
 *
 * Features:
 * - Real-time GST calculations
 * - Dynamic line item management
 * - Business rule validation
 * - Template-based customization
 * - Form persistence and recovery
 *
 * @see src/components/domain/orders/order-creation-wizard/order-form-context.tsx
 */

'use client';

import React, { useCallback, lazy, Suspense } from 'react';
import { ArrowLeft, Save, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/lib/toast';

// Form components
import { OrderFormProvider, useOrderForm } from './order-form-context';
import { OrderLineItems } from './order-line-items';
import { CustomerSelector } from '../customer-selector';
import type { CustomerSummary, SelectedCustomer } from '../customer-selector';
// Lazy load summary component for bundle optimization
const OrderSummary = lazy(() =>
  import('./order-summary').then((mod) => ({ default: mod.OrderSummary }))
);

// Types
import type { OrderCreationWizardProps, OrderCreatePayload } from './types';

const DRAFT_STORAGE_KEY = 'orderCreationDraft:v1';

type DraftPayload = {
  formData: Record<string, unknown>;
  selectedCustomer: SelectedCustomer | null;
  savedAt: string;
};

// ============================================================================
// ORDER CREATION FORM COMPONENT
// ============================================================================

/**
 * Main order creation form component that uses the form context
 */
function OrderCreationForm({
  onComplete,
  onCancel,
  onCreateOrder,
  isSubmitting,
  customers,
  isLoadingCustomers,
  customerError,
  customerSearch,
  onCustomerSearchChange,
  initialCustomer,
}: {
  onComplete: (orderId: string, orderNumber: string) => void;
  onCancel: () => void;
  onCreateOrder: (payload: OrderCreatePayload) => Promise<{ id: string; orderNumber: string }>;
  isSubmitting?: boolean;
  customers: CustomerSummary[];
  isLoadingCustomers?: boolean;
  customerError?: unknown;
  customerSearch: string;
  onCustomerSearchChange: (value: string) => void;
  initialCustomer?: SelectedCustomer | null;
}) {
  const { getValues, formData, calculations, isValid, hasLineItems, resetForm } = useOrderForm();
  const [selectedCustomer, setSelectedCustomer] = React.useState<SelectedCustomer | null>(
    initialCustomer ?? null
  );

  React.useEffect(() => {
    if (initialCustomer && !selectedCustomer) {
      setSelectedCustomer(initialCustomer);
    }
  }, [initialCustomer, selectedCustomer]);

  // Handlers
  const handleSubmit = useCallback(async () => {
    if (!isValid) {
      toast.error('Please fix form errors before submitting');
      return;
    }
    if (!selectedCustomer) {
      toast.error('Customer is required');
      return;
    }
    if (!hasLineItems) {
      toast.error('At least one line item is required');
      return;
    }

    try {
      const currentFormData = getValues();
      const payload: OrderCreatePayload = {
        customerId: selectedCustomer.id,
        status: currentFormData.status || 'draft',
        paymentStatus: 'pending',
        orderDate: currentFormData.orderDate,
        dueDate: currentFormData.dueDate || undefined,
        discountPercent: currentFormData.discountPercent || undefined,
        discountAmount: currentFormData.discountAmount || undefined,
        shippingAmount: currentFormData.shippingAmount || 0,
        internalNotes: currentFormData.internalNotes || undefined,
        customerNotes: currentFormData.customerNotes || undefined,
        lineItems: currentFormData.lineItems.map((item, index) => ({
          lineNumber: String(index + 1).padStart(2, '0'),
          sku: item.sku || undefined,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountPercent: item.discountPercent || undefined,
          discountAmount: item.discountAmount || undefined,
          taxType: item.taxType === 'exempt' ? 'gst_free' : item.taxType,
          notes: item.notes || undefined,
        })),
      };

      const result = await onCreateOrder(payload);
      toast.success(`Order ${result.orderNumber} created successfully`);
      resetForm();
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      }
      onComplete(result.id, result.orderNumber);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to create order. Please try again.'
      );
    }
  }, [getValues, hasLineItems, isValid, onComplete, onCreateOrder, resetForm, selectedCustomer]);

  const handleSaveDraft = useCallback(() => {
    if (typeof window === 'undefined') return;

    const currentFormData = getValues();
    const draftPayload: DraftPayload = {
      formData: currentFormData as Record<string, unknown>,
      selectedCustomer,
      savedAt: new Date().toISOString(),
    };

    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftPayload));
    toast.success('Draft saved locally');
  }, [getValues, selectedCustomer]);

  // Calculate form health - memoized for performance
  const formHealth = React.useMemo(() => {
    const issues: string[] = [];

    if (!selectedCustomer) issues.push('No customer selected');
    if (!hasLineItems) issues.push('No line items added');
    if (calculations.total <= 0) issues.push('Order total is invalid');

    return {
      isReady: issues.length === 0 && isValid,
      issues,
    };
  }, [selectedCustomer, hasLineItems, calculations.total, isValid]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" onClick={onCancel} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Orders
          </Button>
          <h1 className="text-2xl font-bold">Create New Order</h1>
          <p className="text-muted-foreground">
            Add products, configure pricing, and create customer orders with real-time GST
            calculations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={formHealth.isReady ? 'default' : 'secondary'}>
            {formHealth.isReady ? 'Ready to Submit' : 'Needs Attention'}
          </Badge>
        </div>
      </div>

      <Separator />

      {/* Customer Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Customer & Order Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Customer Selection */}
            <CustomerSelector
              selectedCustomerId={selectedCustomer?.id || null}
              onSelect={setSelectedCustomer}
              search={customerSearch}
              onSearchChange={onCustomerSearchChange}
              customers={customers}
              isLoading={isLoadingCustomers}
              error={customerError}
            />

            {/* Order metadata */}
            <div className="grid grid-cols-1 gap-4 border-t pt-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="font-medium">Order Date:</span>{' '}
                  {formData.orderDate?.toLocaleDateString() || 'Not set'}
                </div>
                {formData.dueDate && (
                  <div className="text-sm">
                    <span className="font-medium">Due Date:</span>{' '}
                    {formData.dueDate.toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <OrderLineItems />

      {/* Order Summary */}
      <Suspense fallback={<div className="bg-muted/20 h-32 animate-pulse rounded-lg" />}>
        <OrderSummary showValidation={true} />
      </Suspense>

      {/* Form Validation Issues */}
      {formHealth.issues.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive text-sm">
              Please address the following issues:
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-destructive list-inside list-disc space-y-1 text-sm">
              {formHealth.issues.map((issue, index) => (
                <li key={index}>{issue}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between border-t pt-6">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleSaveDraft}>
            <Save className="mr-2 h-4 w-4" />
            Save Draft
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!formHealth.isReady || isSubmitting}>
            {isSubmitting ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Creating Order...
              </>
            ) : (
              <>
                <Calculator className="mr-2 h-4 w-4" />
                Create Order
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN WIZARD COMPONENT
// ============================================================================

/**
 * Enhanced Order Creation Wizard using the new form architecture.
 * This replaces the old multi-step wizard with a comprehensive form system.
 */
export function EnhancedOrderCreationWizard({
  onComplete,
  onCancel,
  onCreateOrder,
  isSubmitting = false,
  customerSearch,
  onCustomerSearchChange,
  customers,
  isLoadingCustomers = false,
  customerError,
  className,
}: OrderCreationWizardProps) {
  const [draftDefaults, setDraftDefaults] = React.useState<Record<string, unknown> | undefined>();
  const [draftCustomer, setDraftCustomer] = React.useState<SelectedCustomer | null>(null);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const rawDraft = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!rawDraft) return;

    try {
      const parsedDraft = JSON.parse(rawDraft) as DraftPayload;
      setDraftDefaults(parsedDraft.formData);
      setDraftCustomer(parsedDraft.selectedCustomer ?? null);
      toast.success('Draft restored');
    } catch {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    }
  }, []);

  const handleComplete = useCallback(
    (orderId: string, orderNumber: string) => {
      // Navigate to the created order
      onComplete(orderId, orderNumber);
    },
    [onComplete]
  );

  return (
    <div className={className}>
      <OrderFormProvider defaultValues={draftDefaults}>
        <OrderCreationForm
          onComplete={handleComplete}
          onCancel={onCancel}
          onCreateOrder={onCreateOrder}
          isSubmitting={isSubmitting}
          customers={customers}
          isLoadingCustomers={isLoadingCustomers}
          customerError={customerError}
          customerSearch={customerSearch}
          onCustomerSearchChange={onCustomerSearchChange}
          initialCustomer={draftCustomer}
        />
      </OrderFormProvider>
    </div>
  );
}

// Export default
export default EnhancedOrderCreationWizard;

// Re-export types for consumers
export type { OrderCreationWizardProps } from './types';
