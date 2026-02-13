/**
 * Alert Dismissal Persistence Hook
 *
 * Tracks dismissed alerts in localStorage with 24-hour TTL.
 * Dismissed alerts reappear the next day to catch evolving issues.
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md - Alert Dismissal Persistence
 */

import { useState, useCallback } from 'react';

// ============================================================================
// CONSTANTS
// ============================================================================

const ALERT_STORAGE_KEY = 'renoz:dismissed-alerts';
const DISMISSAL_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ============================================================================
// TYPES
// ============================================================================

interface DismissedAlert {
  alertId: string;
  dismissedAt: number;
}

export interface UseAlertDismissalsReturn {
  /** Dismiss an alert by ID */
  dismiss: (alertId: string) => void;
  /** Check if an alert is currently dismissed */
  isAlertDismissed: (alertId: string) => boolean;
  /** Get all currently dismissed alert IDs */
  dismissedAlertIds: Set<string>;
  /** Clear all dismissals (useful for testing) */
  clearAll: () => void;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Read dismissed alerts from localStorage, filtering expired ones.
 * Uses Set for O(1) lookups.
 */
function getDismissedAlerts(): Set<string> {
  if (typeof window === 'undefined') return new Set();

  try {
    const stored = localStorage.getItem(ALERT_STORAGE_KEY);
    if (!stored) return new Set();

    const alerts: DismissedAlert[] = JSON.parse(stored);
    const now = Date.now();

    // Filter expired and return Set for O(1) lookups
    return new Set(
      alerts
        .filter((a) => now - a.dismissedAt < DISMISSAL_TTL_MS)
        .map((a) => a.alertId)
    );
  } catch {
    // localStorage might be unavailable or corrupted
    return new Set();
  }
}

/**
 * Persist a dismissed alert to localStorage.
 * Also cleans up expired entries.
 */
function persistDismissal(alertId: string): void {
  if (typeof window === 'undefined') return;

  try {
    const stored = localStorage.getItem(ALERT_STORAGE_KEY);
    const alerts: DismissedAlert[] = stored ? JSON.parse(stored) : [];
    const now = Date.now();

    // Clean expired + add new (avoid duplicates)
    const updated = alerts
      .filter(
        (a) => now - a.dismissedAt < DISMISSAL_TTL_MS && a.alertId !== alertId
      )
      .concat({ alertId, dismissedAt: now });

    localStorage.setItem(ALERT_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Fail silently - localStorage might be full or unavailable
  }
}

/**
 * Clear all dismissed alerts from localStorage.
 */
function clearDismissals(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(ALERT_STORAGE_KEY);
  } catch {
    // Fail silently
  }
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook for managing alert dismissals with localStorage persistence.
 *
 * @example
 * ```tsx
 * function CustomerAlerts({ alerts }: { alerts: CustomerAlert[] }) {
 *   const { dismiss, isAlertDismissed } = useAlertDismissals();
 *
 *   const visibleAlerts = alerts.filter(
 *     (alert) => !isAlertDismissed(generateAlertId('customer', customerId, alert.type))
 *   );
 *
 *   return (
 *     <div>
 *       {visibleAlerts.map((alert) => (
 *         <Alert
 *           key={alert.type}
 *           onDismiss={() => dismiss(generateAlertId('customer', customerId, alert.type))}
 *         />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useAlertDismissals(): UseAlertDismissalsReturn {
  // Initialize from localStorage (only on mount)
  const [dismissed, setDismissed] = useState<Set<string>>(() =>
    getDismissedAlerts()
  );

  const dismiss = useCallback((alertId: string) => {
    persistDismissal(alertId);
    setDismissed((prev) => new Set([...prev, alertId]));
  }, []);

  const isAlertDismissed = useCallback(
    (alertId: string) => {
      return dismissed.has(alertId);
    },
    [dismissed]
  );

  const clearAll = useCallback(() => {
    clearDismissals();
    setDismissed(new Set());
  }, []);

  return {
    dismiss,
    isAlertDismissed,
    dismissedAlertIds: dismissed,
    clearAll,
  };
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Generate a deterministic alert ID.
 *
 * Format: `{entityType}:{entityId}:{alertType}`
 *
 * @example
 * ```ts
 * generateAlertId('customer', 'abc123', 'credit_hold')
 * // => 'customer:abc123:credit_hold'
 *
 * generateAlertId('order', 'xyz789', 'payment_overdue')
 * // => 'order:xyz789:payment_overdue'
 * ```
 */
export function generateAlertId(
  entityType: string,
  entityId: string,
  alertType: string
): string {
  return `${entityType}:${entityId}:${alertType}`;
}

/**
 * Generate an alert ID that includes a value hash.
 * Use when the alert should reappear if the underlying data changes.
 *
 * @example
 * ```ts
 * // This alert will reappear if the overdue amount changes
 * generateAlertIdWithValue('order', 'xyz789', 'payment_overdue', order.balanceDue)
 * // => 'order:xyz789:payment_overdue:12450'
 * ```
 */
export function generateAlertIdWithValue(
  entityType: string,
  entityId: string,
  alertType: string,
  value: string | number
): string {
  return `${entityType}:${entityId}:${alertType}:${value}`;
}
