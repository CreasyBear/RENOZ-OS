/**
 * useDetailBreadcrumb Hook
 *
 * Consolidates breadcrumb override logic for detail views.
 * Sets a custom label for the current path segment in breadcrumbs.
 *
 * @see docs/design-system/BREADCRUMB-OVERRIDE-PATTERN.md
 */

import { useEffect } from 'react';
import { useSetBreadcrumbOverride } from './breadcrumb-context';

/**
 * Set breadcrumb override for detail views. Clears on unmount.
 *
 * @param segmentPath - Full path to current segment (e.g. `/orders/${orderId}`)
 * @param label - Human-readable label (e.g. order number, customer name)
 * @param enabled - Only set override when true (e.g. when entity data is loaded)
 */
export function useDetailBreadcrumb(
  segmentPath: string,
  label: string | undefined,
  enabled: boolean
): void {
  const setBreadcrumbOverride = useSetBreadcrumbOverride();

  useEffect(() => {
    if (enabled && label) {
      setBreadcrumbOverride?.({
        segmentPath,
        label,
      });
    }
    return () => setBreadcrumbOverride?.(null);
  }, [segmentPath, label, enabled, setBreadcrumbOverride]);
}
