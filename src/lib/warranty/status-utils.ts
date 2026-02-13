/**
 * Warranty Status Utilities
 *
 * Utilities for mapping warranty statuses to semantic colors and EntityHeader configs.
 * Bridges the gap between table StatusCell configs (BadgeVariant) and EntityHeader (SemanticColor).
 */

import type { WarrantyStatus } from '@/lib/schemas/warranty';
import type { SemanticColor } from '@/lib/status';
import { WARRANTY_STATUS_CONFIG } from '@/components/domain/warranty/tables/warranty-status-config';

/**
 * Map warranty status BadgeVariant to SemanticColor for EntityHeader
 * 
 * This bridges the type mismatch between:
 * - WARRANTY_STATUS_CONFIG (uses BadgeVariant: "default" | "outline" | "destructive" | "secondary")
 * - EntityHeader (expects SemanticColor: "success" | "warning" | "error" | "neutral" | etc.)
 */
export function getWarrantyStatusSemanticColor(status: WarrantyStatus): SemanticColor {
  const config = WARRANTY_STATUS_CONFIG[status];
  
  // Map BadgeVariant to SemanticColor
  switch (config.variant) {
    case 'default':
      // Active warranties are successful/healthy
      return status === 'active' ? 'success' : 'neutral';
    case 'outline':
      // Expiring soon needs attention
      return 'warning';
    case 'destructive':
      // Expired/voided are errors
      return 'error';
    case 'secondary':
      // Transferred is neutral/informational
      return 'neutral';
    default:
      return 'neutral';
  }
}

/**
 * Get warranty status config for EntityHeader
 * Uses semantic color mapping instead of BadgeVariant
 */
export function getWarrantyStatusConfigForEntityHeader(status: WarrantyStatus): {
  value: string;
  variant: SemanticColor;
} {
  return {
    value: status,
    variant: getWarrantyStatusSemanticColor(status),
  };
}
