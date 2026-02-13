/**
 * Procurement Types
 *
 * Shared type definitions for procurement dashboard data.
 * These types are used by both server functions and UI components.
 *
 * @see docs/pre_deployment_audit/2026-02-09-procurement.md
 */

// ============================================================================
// METRICS TYPES
// ============================================================================

export interface SpendMetrics {
  totalSpend: number;
  monthlySpend: number;
  budgetTotal: number;
  budgetUsed: number;
  trendPercent: number;
  trendDirection: 'up' | 'down';
}

export interface OrderMetrics {
  totalOrders: number;
  pendingApproval: number;
  awaitingDelivery: number;
  completedThisMonth: number;
}

export interface SupplierMetrics {
  totalSuppliers: number;
  activeSuppliers: number;
  avgRating: number;
  topPerformers: Array<{
    id: string;
    name: string;
    rating: number;
  }>;
}

export interface ApprovalItem {
  id: string;
  poNumber: string;
  supplierName: string;
  amount: number;
  currency: string;
  submittedAt: string;
  priority: 'normal' | 'high' | 'urgent';
}

// ============================================================================
// ALERT TYPES
// ============================================================================

export type AlertSeverity = 'info' | 'warning' | 'error';

export type AlertType =
  | 'low_stock'
  | 'approval_overdue'
  | 'delivery_delayed'
  | 'supplier_issue'
  | 'price_expiring'
  | 'budget_warning';

export interface ProcurementAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  createdAt: string;
  linkTo?: string;
  linkParams?: Record<string, string>;
  linkLabel?: string;
  dismissible?: boolean;
}

export interface ProcurementMetrics {
  totalOrders: number;
  activeOrders: number;
  completedOrders: number;
  totalSpend: number;
  monthlySpend: number;
  budgetRemaining: number;
  budgetUsed: number;
  avgOrderValue: number;
  onTimeDelivery: number;
  supplierCount: number;
  activeApprovals: number;
  pendingReceipts: number;
  qualityScore: number;
  alerts: ProcurementAlert[];
}

export interface ProcurementStatsProps {
  metrics: ProcurementMetrics;
  formatCurrency: (amount: number) => string;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard for AlertType
 */
export function isValidAlertType(value: unknown): value is AlertType {
  return (
    typeof value === 'string' &&
    [
      'low_stock',
      'approval_overdue',
      'delivery_delayed',
      'supplier_issue',
      'price_expiring',
      'budget_warning',
    ].includes(value as AlertType)
  );
}

/**
 * Type guard for AlertSeverity
 */
export function isValidAlertSeverity(value: unknown): value is AlertSeverity {
  return typeof value === 'string' && ['info', 'warning', 'error'].includes(value as AlertSeverity);
}

// ============================================================================
// RECEIVING TYPES
// ============================================================================

/**
 * Receiving dashboard metrics
 */
export interface ReceivingMetrics {
  totalOrders: number;
  totalValue: number;
  supplierCount: number;
  oldestOrderDate: string | null;
}

/**
 * Bulk receipt data structure
 */
export interface BulkReceiptData {
  purchaseOrderIds: string[];
  serialNumbers?: Map<string, Map<string, string[]>>; // poId -> poItemId -> serialNumbers[]
}

/**
 * PO details with serialization information
 */
export interface PODetailsWithSerials {
  poId: string;
  poNumber: string;
  items: Array<{
    id: string;
    productId: string | null;
    productName: string;
    productSku: string | null;
    quantityPending: number;
    requiresSerialNumbers: boolean;
  }>;
  hasSerializedItems: boolean;
  totalSerializedQuantity: number;
}
