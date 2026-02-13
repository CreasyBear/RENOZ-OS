/**
 * Purchase Order Detail Schema
 *
 * Canonical type definitions for purchase order detail view data.
 * Single source of truth - aligns with getPurchaseOrder server return shape.
 *
 * @see src/server/functions/suppliers/purchase-orders.ts getPurchaseOrder
 * @see docs/design-system/SCHEMA-TRACE.md
 */

import type { ReactNode } from 'react';
import type { PurchaseOrderStatus } from '.';
import type { UnifiedActivity } from '../unified-activity';

// ============================================================================
// ADDRESS
// ============================================================================

export interface POAddress {
  street1?: string;
  street2?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
}

// ============================================================================
// LINE ITEM
// ============================================================================

/**
 * Purchase order line item — aligns with getPurchaseOrder items shape
 */
export interface PurchaseOrderItem {
  id: string;
  lineNumber: number;
  productId: string | null;
  productName: string;
  productSku: string | null;
  description: string | null;
  quantity: number;
  unitOfMeasure: string | null;
  unitPrice: number | null;
  discountPercent: number | null;
  taxRate: number | null;
  lineTotal: number | null;
  quantityReceived: number;
  quantityRejected: number;
  quantityPending: number;
  expectedDeliveryDate: string | null;
  actualDeliveryDate: string | null;
  notes: string | null;
}

// ============================================================================
// PURCHASE ORDER WITH DETAILS
// ============================================================================

/**
 * Purchase order with supplier info and line items — aligns with getPurchaseOrder return shape
 */
export interface PurchaseOrderWithDetails {
  id: string;
  poNumber: string;
  supplierId: string;
  status: PurchaseOrderStatus;
  orderDate: string | null;
  requiredDate: string | null;
  expectedDeliveryDate: string | null;
  actualDeliveryDate: string | null;
  shipToAddress: POAddress | null;
  billToAddress: POAddress | null;
  subtotal: number | null;
  taxAmount: number | null;
  shippingAmount: number | null;
  discountAmount: number | null;
  totalAmount: number | null;
  currency: string;
  paymentTerms: string | null;
  supplierReference: string | null;
  internalReference: string | null;
  notes: string | null;
  internalNotes: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  approvalNotes: string | null;
  orderedAt: string | null;
  orderedBy: string | null;
  closedAt: string | null;
  closedBy: string | null;
  closedReason: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  supplierName: string | null;
  supplierEmail: string | null;
  supplierPhone: string | null;
  items: PurchaseOrderItem[];
}

// ============================================================================
// DETAIL VIEW PROPS
// ============================================================================

/** Minimal action for EntityHeader (matches EntityHeaderAction) */
export interface PODetailHeaderAction {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  destructive?: boolean;
  disabled?: boolean;
}

export interface PODetailHeaderConfig {
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
    disabled?: boolean;
  };
  secondaryActions?: PODetailHeaderAction[];
  onEdit?: () => void;
  onDelete?: () => void;
}

/** Alert for PO detail Zone 3 */
export interface POAlert {
  id: string;
  type: 'required_date_overdue' | 'required_date_urgent';
  severity: 'critical' | 'warning';
  title: string;
  description: string;
}

export interface PODetailViewProps {
  po: PurchaseOrderWithDetails;
  activeTab: string;
  onTabChange: (tab: string) => void;
  showMetaPanel: boolean;
  onToggleMetaPanel: () => void;
  /** EntityHeader config - when provided, POHeader is replaced with EntityHeader */
  headerConfig?: PODetailHeaderConfig;
  activities?: UnifiedActivity[];
  activitiesLoading?: boolean;
  activitiesError?: Error | null;
  /** Handler to open activity logging dialog */
  onLogActivity?: () => void;
  /** Zone 3 alerts (overdue, urgent required date) */
  alerts?: POAlert[];
  onDismissAlert?: (alertId: string) => void;
  className?: string;
}
