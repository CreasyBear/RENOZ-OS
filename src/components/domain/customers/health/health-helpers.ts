/**
 * Health Dashboard Helper Functions
 *
 * Pure utility functions for health score calculations.
 * Note: formatDate() and calculateDaysSince() have been moved to centralized utilities:
 * - formatDate: @/lib/formatters
 * - calculateDaysSince: @/lib/customer-utils
 * 
 * This file is kept for backward compatibility but will be removed in a future refactor.
 * Please use the centralized utilities instead.
 */

// Re-export from centralized utilities for backward compatibility
export { calculateDaysSince } from '@/lib/customer-utils'
