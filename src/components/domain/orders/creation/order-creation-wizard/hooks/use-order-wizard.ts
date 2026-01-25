/**
 * useOrderWizard Hook
 *
 * Manages state and logic for the order creation wizard.
 */

import { useState, useCallback, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addDays } from 'date-fns';
import { toast } from '@/lib/toast';
import { queryKeys } from '@/lib/query-keys';
import { createOrder } from '@/server/functions/orders/orders';
import type { WizardState } from '../types';
import { User, Package, DollarSign, Truck, FileCheck } from 'lucide-react';
import type { Step } from '../types';

export const STEPS: Step[] = [
  { id: 1, name: 'Customer', description: 'Select a customer', icon: User },
  { id: 2, name: 'Products', description: 'Add products', icon: Package },
  { id: 3, name: 'Pricing', description: 'Configure pricing', icon: DollarSign },
  { id: 4, name: 'Shipping', description: 'Shipping details', icon: Truck },
  { id: 5, name: 'Review', description: 'Review and confirm', icon: FileCheck },
];

const initialState: WizardState = {
  customer: null,
  lineItems: [],
  discountPercent: 0,
  discountAmount: 0,
  shippingAmount: 0,
  useBillingAsShipping: true,
  shippingAddress: {
    street1: '',
    city: '',
    state: '',
    postcode: '',
    country: 'AU',
  },
  dueDate: addDays(new Date(), 14), // Default 14 day payment terms
  internalNotes: '',
  customerNotes: '',
};

interface UseOrderWizardOptions {
  onComplete: (orderId: string, orderNumber: string) => void;
}

export function useOrderWizard({ onComplete }: UseOrderWizardOptions) {
  const [currentStep, setCurrentStep] = useState(1);
  const [state, setState] = useState<WizardState>(initialState);
  const queryClient = useQueryClient();

  // Create order mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!state.customer) throw new Error('Customer is required');
      if (state.lineItems.length === 0) throw new Error('At least one item is required');

      return createOrder({
        data: {
          customerId: state.customer.id,
          status: 'draft',
          paymentStatus: 'pending',
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
                street1: state.customer.billingAddress.street1 || '',
                city: state.customer.billingAddress.city || '',
                state: state.customer.billingAddress.state || '',
                postalCode: state.customer.billingAddress.postcode || '',
                country: state.customer.billingAddress.country || 'AU',
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
        },
      });
    },
    onSuccess: (result) => {
      toast.success(`Order ${result.orderNumber} created`);
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
      onComplete(result.id, result.orderNumber);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create order');
    },
  });

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

  const handleSubmit = useCallback(() => {
    createMutation.mutate();
  }, [createMutation]);

  return {
    // State
    currentStep,
    state,
    setState,
    // Computed
    canProceed,
    isPending: createMutation.isPending,
    // Actions
    goNext,
    goBack,
    handleSubmit,
  };
}
