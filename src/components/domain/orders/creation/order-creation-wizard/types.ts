/**
 * Shared types for OrderCreationWizard
 */

import type { User } from 'lucide-react';
import type { CustomerSummary, SelectedCustomer } from '../customer-selector';
import type { OrderLineItemDraft } from '../product-selector';

export interface OrderCreationWizardProps {
  onComplete: (orderId: string, orderNumber: string) => void;
  onCancel: () => void;
  onCreateOrder: (payload: OrderCreatePayload) => Promise<OrderCreateResult>;
  isSubmitting?: boolean;
  customerSearch: string;
  onCustomerSearchChange: (value: string) => void;
  customers: CustomerSummary[];
  isLoadingCustomers?: boolean;
  customerError?: unknown;
  className?: string;
}

export interface OrderCreatePayload {
  customerId: string;
  status?: 'draft' | 'confirmed' | 'picking' | 'picked' | 'shipped' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'partial' | 'paid' | 'refunded' | 'overdue';
  orderDate: Date | string;
  dueDate?: Date | string;
  discountPercent?: number;
  discountAmount?: number;
  shippingAmount: number;
  internalNotes?: string;
  customerNotes?: string;
  lineItems: Array<{
    lineNumber: string;
    sku?: string;
    description: string;
    quantity: number;
    unitPrice: number;
    discountPercent?: number;
    discountAmount?: number;
    taxType?: 'gst' | 'gst_free' | 'input_taxed' | 'export';
    notes?: string;
  }>;
}

export interface OrderCreateResult {
  id: string;
  orderNumber: string;
}

export interface WizardState {
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

export interface StepProps {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
}

export type Step = {
  id: number;
  name: string;
  description: string;
  icon: typeof User;
};

export const GST_RATE = 0.1; // 10% GST for Australia

export const formatPrice = (cents: number) =>
  new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(cents / 100);
