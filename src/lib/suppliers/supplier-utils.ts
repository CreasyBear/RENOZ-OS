/**
 * Supplier Utilities
 *
 * Helper functions for supplier performance calculations,
 * rating formatting, and status management.
 *
 * @see SUPP-INTEGRATION-API story
 */

// ============================================================================
// TYPES
// ============================================================================

export type SupplierStatus = 'active' | 'inactive' | 'suspended' | 'blacklisted';
export type SupplierType =
  | 'manufacturer'
  | 'distributor'
  | 'retailer'
  | 'service'
  | 'raw_materials';
export type PaymentTerms = 'net_15' | 'net_30' | 'net_45' | 'net_60' | 'cod' | 'prepaid';

export interface SupplierRatings {
  qualityRating: number;
  deliveryRating: number;
  communicationRating: number;
}

export interface PerformanceMetrics {
  onTimeDeliveryRate: number;
  rejectionRate: number;
  avgLeadTime: number;
  totalOrders: number;
  totalSpend: number;
}

// ============================================================================
// RATING CALCULATIONS
// ============================================================================

/**
 * Calculate overall supplier rating from component ratings
 */
export function calculateOverallRating(ratings: SupplierRatings): number {
  const { qualityRating, deliveryRating, communicationRating } = ratings;
  const avg = (qualityRating + deliveryRating + communicationRating) / 3;
  return Math.round(avg * 10) / 10; // Round to 1 decimal
}

/**
 * Get rating tier from numeric rating
 */
export function getRatingTier(rating: number): 'excellent' | 'good' | 'average' | 'poor' {
  if (rating >= 4.5) return 'excellent';
  if (rating >= 3.5) return 'good';
  if (rating >= 2.5) return 'average';
  return 'poor';
}

/**
 * Get rating color class
 */
export function getRatingColor(rating: number): string {
  if (rating >= 4.5) return 'text-green-600';
  if (rating >= 3.5) return 'text-yellow-600';
  if (rating >= 2.5) return 'text-orange-600';
  return 'text-red-600';
}

/**
 * Get rating badge variant
 */
export function getRatingBadgeVariant(rating: number): 'default' | 'secondary' | 'destructive' {
  if (rating >= 3.5) return 'default';
  if (rating >= 2.5) return 'secondary';
  return 'destructive';
}

// ============================================================================
// STATUS UTILITIES
// ============================================================================

/**
 * Get status display configuration
 */
export function getStatusConfig(status: SupplierStatus): {
  label: string;
  color: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
} {
  switch (status) {
    case 'active':
      return { label: 'Active', color: 'text-green-600', variant: 'default' };
    case 'inactive':
      return { label: 'Inactive', color: 'text-gray-600', variant: 'secondary' };
    case 'suspended':
      return { label: 'Suspended', color: 'text-yellow-600', variant: 'outline' };
    case 'blacklisted':
      return { label: 'Blacklisted', color: 'text-red-600', variant: 'destructive' };
  }
}

/**
 * Check if supplier can place orders
 */
export function canPlaceOrders(status: SupplierStatus): boolean {
  return status === 'active';
}

/**
 * Get supplier type label
 */
export function getTypeLabel(type: SupplierType): string {
  const labels: Record<SupplierType, string> = {
    manufacturer: 'Manufacturer',
    distributor: 'Distributor',
    retailer: 'Retailer',
    service: 'Service Provider',
    raw_materials: 'Raw Materials',
  };
  return labels[type];
}

// ============================================================================
// PAYMENT TERMS UTILITIES
// ============================================================================

/**
 * Get payment terms label
 */
export function getPaymentTermsLabel(terms: PaymentTerms): string {
  const labels: Record<PaymentTerms, string> = {
    net_15: 'Net 15 Days',
    net_30: 'Net 30 Days',
    net_45: 'Net 45 Days',
    net_60: 'Net 60 Days',
    cod: 'Cash on Delivery',
    prepaid: 'Prepaid',
  };
  return labels[terms];
}

/**
 * Get payment terms days
 */
export function getPaymentDays(terms: PaymentTerms): number | null {
  switch (terms) {
    case 'net_15':
      return 15;
    case 'net_30':
      return 30;
    case 'net_45':
      return 45;
    case 'net_60':
      return 60;
    case 'cod':
    case 'prepaid':
      return 0;
  }
}

// ============================================================================
// PERFORMANCE UTILITIES
// ============================================================================

/**
 * Calculate performance score (0-100)
 */
export function calculatePerformanceScore(metrics: PerformanceMetrics): number {
  // Weight factors
  const weights = {
    onTimeDelivery: 0.35,
    rejection: 0.25,
    leadTime: 0.2,
    orderVolume: 0.2,
  };

  // Normalize metrics to 0-100 scale
  const onTimeScore = metrics.onTimeDeliveryRate;
  const rejectionScore = Math.max(0, 100 - metrics.rejectionRate * 10);
  const leadTimeScore = Math.max(0, 100 - (metrics.avgLeadTime - 3) * 5);
  const volumeScore = Math.min(100, metrics.totalOrders * 2);

  return Math.round(
    onTimeScore * weights.onTimeDelivery +
      rejectionScore * weights.rejection +
      leadTimeScore * weights.leadTime +
      volumeScore * weights.orderVolume
  );
}

/**
 * Get performance tier
 */
export function getPerformanceTier(
  score: number
): 'preferred' | 'approved' | 'probationary' | 'at_risk' {
  if (score >= 85) return 'preferred';
  if (score >= 70) return 'approved';
  if (score >= 50) return 'probationary';
  return 'at_risk';
}

/**
 * Get on-time delivery status
 */
export function getDeliveryStatus(rate: number): {
  status: 'good' | 'warning' | 'critical';
  label: string;
} {
  if (rate >= 95) return { status: 'good', label: 'Excellent' };
  if (rate >= 85) return { status: 'warning', label: 'Needs Improvement' };
  return { status: 'critical', label: 'Critical' };
}

// ============================================================================
// SUPPLIER CODE GENERATION
// ============================================================================

/**
 * Generate supplier code from name
 */
export function generateSupplierCode(name: string, sequence: number): string {
  // Take first 3 chars of name (uppercase, alphanumeric only)
  const prefix = name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 3)
    .padEnd(3, 'X');

  // Add sequence number with padding
  const suffix = String(sequence).padStart(4, '0');

  return `SUP-${prefix}-${suffix}`;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate supplier for ordering
 */
export function validateSupplierForOrdering(supplier: {
  status: SupplierStatus;
  overallRating?: number;
  minimumOrderValue?: number;
  maximumOrderValue?: number;
}): { valid: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (!canPlaceOrders(supplier.status)) {
    reasons.push(`Supplier is ${supplier.status} - cannot place orders`);
  }

  if (supplier.overallRating !== undefined && supplier.overallRating < 2.0) {
    reasons.push('Supplier rating is too low (< 2.0)');
  }

  return {
    valid: reasons.length === 0,
    reasons,
  };
}

/**
 * Validate order value against supplier limits
 */
export function validateOrderValue(
  value: number,
  supplier: { minimumOrderValue?: number; maximumOrderValue?: number }
): { valid: boolean; reason?: string } {
  if (supplier.minimumOrderValue && value < supplier.minimumOrderValue) {
    return {
      valid: false,
      reason: `Order value ($${value}) is below minimum ($${supplier.minimumOrderValue})`,
    };
  }

  if (supplier.maximumOrderValue && value > supplier.maximumOrderValue) {
    return {
      valid: false,
      reason: `Order value ($${value}) exceeds maximum ($${supplier.maximumOrderValue})`,
    };
  }

  return { valid: true };
}
