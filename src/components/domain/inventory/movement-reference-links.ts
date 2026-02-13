/**
 * Movement reference link utilities
 *
 * Provides type-safe route paths for inventory movement references (orders, purchase orders).
 * Per TypeScript Debt Remediation Plan: avoid `as any` for Link `to` prop.
 */

export type MovementReferenceLink =
  | { to: '/orders/$orderId'; params: { orderId: string } }
  | { to: '/purchase-orders/$poId'; params: { poId: string } };

/**
 * Return typed link config for a movement reference, or null if not linkable.
 */
export function getMovementReferenceLink(
  referenceType: string | null | undefined,
  referenceId: string | null | undefined
): MovementReferenceLink | null {
  if (!referenceType || !referenceId) return null;

  switch (referenceType) {
    case 'order':
      return { to: '/orders/$orderId', params: { orderId: referenceId } };
    case 'purchase_order':
      return { to: '/purchase-orders/$poId', params: { poId: referenceId } };
    default:
      return null;
  }
}
