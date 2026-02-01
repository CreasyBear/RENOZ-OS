/**
 * Status Badge Types
 *
 * Shared types for status badge components and domain configs.
 *
 * @see docs/design-system/STATUS-BADGE-STANDARDS.md
 */

import type { LucideIcon } from 'lucide-react';
import type { SemanticColor } from './colors';

/**
 * Configuration for a single status value.
 * Used by StatusBadge and domain config files.
 */
export interface StatusConfigItem {
  /** Display label (e.g., "In Progress") */
  label: string;
  /** Semantic color variant */
  variant: SemanticColor;
  /** Optional icon component */
  icon?: LucideIcon;
}

/**
 * Status configuration map for a domain.
 * Maps status values to their display configuration.
 *
 * @example
 * ```typescript
 * const ORDER_STATUS_CONFIG: StatusConfig<OrderStatus> = {
 *   draft: { label: 'Draft', variant: 'neutral', icon: FileEdit },
 *   confirmed: { label: 'Confirmed', variant: 'info', icon: CheckCircle },
 *   // ...
 * };
 * ```
 */
export type StatusConfig<T extends string = string> = Record<T, StatusConfigItem>;

/**
 * Type configuration for secondary badges (e.g., customer type, supplier type).
 * Does not include variant since types are typically neutral.
 */
export interface TypeConfigItem {
  /** Display label */
  label: string;
  /** Icon component */
  icon: LucideIcon;
}

/**
 * Type configuration map for a domain.
 */
export type TypeConfig<T extends string = string> = Record<T, TypeConfigItem>;
