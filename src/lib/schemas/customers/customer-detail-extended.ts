/**
 * Customer Detail Extended Schemas & Types
 *
 * Types for customer detail view extended data:
 * - Alerts (credit hold, overdue orders, expiring warranties)
 * - Active items (quotes, orders, projects, claims in progress)
 * - Order summary (totals, outstanding balance, recent orders)
 * - CustomerData (full customer entity for detail view)
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 * @see STANDARDS.md - Types must be in schemas, not components
 */

import { z } from 'zod';
import type { JsonValue } from '../_shared/patterns';
import type { Customer } from './customers';

// ============================================================================
// PARAMETER SCHEMAS
// ============================================================================

export const customerDetailParamsSchema = z.object({
  customerId: z.string().uuid(),
});

export type CustomerDetailParams = z.infer<typeof customerDetailParamsSchema>;

// ============================================================================
// ALERT TYPES
// ============================================================================

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface CustomerAlert {
  id: string;
  type: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  action?: {
    label: string;
    href: string;
  };
  data?: Record<string, JsonValue>;
}

export interface CustomerAlertsResponse {
  alerts: CustomerAlert[];
  hasAlerts: boolean;
  criticalCount: number;
  warningCount: number;
}

// ============================================================================
// ACTIVE ITEM TYPES
// ============================================================================

export interface ActiveQuote {
  id: string;
  title: string;
  stage: string;
  value: number;
  probability: number;
  expectedCloseDate: string | null;
  daysInStage: number;
}

export interface ActiveOrder {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: number;
  orderDate: string | null;
}

export interface ActiveProject {
  id: string;
  projectNumber: string;
  title: string;
  status: string;
  progressPercent: number;
  targetCompletionDate: string | null;
}

export interface ActiveClaim {
  id: string;
  claimNumber: string;
  status: string;
  claimType: string;
  submittedAt: string;
}

export interface CustomerActiveItems {
  quotes: ActiveQuote[];
  orders: ActiveOrder[];
  projects: ActiveProject[];
  claims: ActiveClaim[];
  counts: {
    quotes: number;
    orders: number;
    projects: number;
    claims: number;
  };
}

// ============================================================================
// ORDER SUMMARY TYPES
// ============================================================================

export interface CustomerOrderSummary {
  totalOrders: number;
  totalValue: number;
  outstandingBalance: number;
  averageOrderValue: number;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    total: number;
    orderDate: string | null;
  }>;
  ordersByStatus: Array<{
    status: string;
    count: number;
    totalValue: number;
  }>;
}

// ============================================================================
// CUSTOMER DETAIL VIEW TYPES
// ============================================================================

/**
 * Contact entity for customer detail view
 */
export interface CustomerDetailContact {
  id: string;
  firstName: string;
  lastName: string;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  isPrimary: boolean;
  decisionMaker: boolean;
  influencer?: boolean;
  department?: string | null;
}

/**
 * Address entity for customer detail view
 */
export interface CustomerDetailAddress {
  id: string;
  type: string;
  isPrimary: boolean;
  street1: string;
  street2?: string | null;
  city: string;
  state?: string | null;
  postcode: string;
  country: string;
}

/**
 * Tag assignment for customer detail view
 */
export interface CustomerDetailTagAssignment {
  tag: {
    id: string;
    name: string;
    color: string;
  };
}

/**
 * Priority settings for customer detail view
 */
export interface CustomerDetailPriority {
  id: string;
  priorityLevel: string;
  serviceLevel: string;
  contractValue?: string | number | null;
  accountManager?: string | null;
  contractStartDate?: string | Date | null;
  contractEndDate?: string | Date | null;
  specialTerms?: string | null;
}

/**
 * Order summary for customer detail view (inline variant)
 */
export interface CustomerDetailOrderSummary {
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    total: number | null;
    orderDate: Date | string | null;
  }>;
  ordersByStatus: Array<{
    status: string;
    count: number;
    totalValue: number;
  }>;
}

/**
 * Full customer entity for detail view presenter
 *
 * This type represents the customer data shape expected by CustomerDetailView.
 * It includes all fields from the customer table plus related entities.
 */
export interface CustomerDetailData {
  id: string;
  name: string;
  customerCode: string;
  legalName?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  status: string;
  type: string;
  size?: string | null;
  industry?: string | null;
  taxId?: string | null;
  registrationNumber?: string | null;
  healthScore?: number | null;
  lifetimeValue?: string | number | null;
  totalOrders: number;
  totalOrderValue?: string | number | null;
  averageOrderValue?: string | number | null;
  firstOrderDate?: string | Date | null;
  lastOrderDate?: string | Date | null;
  creditLimit?: string | number | null;
  creditHold: boolean;
  creditHoldReason?: string | null;
  tags: string[] | null;
  contacts?: CustomerDetailContact[];
  addresses?: CustomerDetailAddress[];
  tagAssignments?: CustomerDetailTagAssignment[];
  priority?: CustomerDetailPriority | null;
  orderSummary?: CustomerDetailOrderSummary;
  createdAt: string | Date;
  updatedAt: string | Date;
  createdBy?: string | null;
}

/**
 * Customer with contacts and addresses relations.
 * Matches the shape returned by getCustomerById.
 */
export type CustomerWithRelations = Customer & {
  contacts: CustomerDetailContact[];
  addresses: CustomerDetailAddress[];
};
