/**
 * Feature Flags
 *
 * Centralized feature flag management for gradual rollout and A/B testing.
 * Allows safe deployment of new features and rollback if needed.
 */

import { logger } from '@/lib/logger';

// Feature flag configuration
export const FEATURE_FLAGS = {
  // Supplier domain features
  SUPPLIERS_REAL_API: import.meta.env.NEXT_PUBLIC_SUPPLIERS_REAL_API === 'true',
  SUPPLIERS_PRICING_REAL_API: import.meta.env.NEXT_PUBLIC_SUPPLIERS_PRICING_REAL_API === 'true',
  SUPPLIERS_RECEIPTS_REAL_API: import.meta.env.NEXT_PUBLIC_SUPPLIERS_RECEIPTS_REAL_API === 'true',
  SUPPLIERS_APPROVALS_REAL_API: import.meta.env.NEXT_PUBLIC_SUPPLIERS_APPROVALS_REAL_API === 'true',

  // Procurement domain features
  PROCUREMENT_REAL_API: import.meta.env.NEXT_PUBLIC_PROCUREMENT_REAL_API === 'true',
  PROCUREMENT_DASHBOARD_REAL_API: import.meta.env.NEXT_PUBLIC_PROCUREMENT_DASHBOARD_REAL_API === 'true',

  // General features
  ERROR_BOUNDARIES: import.meta.env.NEXT_PUBLIC_ERROR_BOUNDARIES !== 'false', // Default true
  DYNAMIC_IMPORTS: import.meta.env.NEXT_PUBLIC_DYNAMIC_IMPORTS !== 'false', // Default true
  DEBUG_MODE: import.meta.env.DEV,
} as const;

// Helper functions
export function isFeatureEnabled(flag: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[flag];
}

export function getFeatureFlag<T>(flag: keyof typeof FEATURE_FLAGS, defaultValue: T): T | boolean {
  return FEATURE_FLAGS[flag] ?? defaultValue;
}

// Environment-based feature detection
export const environment = {
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  isTest: import.meta.env.MODE === 'test',
};

// Debug logging for feature flags
if (FEATURE_FLAGS.DEBUG_MODE) {
  logger.debug('Feature Flags', { flags: FEATURE_FLAGS });
}
