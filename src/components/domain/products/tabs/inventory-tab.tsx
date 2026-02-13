/**
 * ProductInventoryTab Component
 *
 * Container component that fetches data and passes to presenter.
 * Implements Container/Presenter pattern per STANDARDS.md.
 *
 * @see STANDARDS.md - Container/Presenter pattern
 */

import { ProductInventoryTabContainer } from "./inventory-tab-container";

interface ProductInventoryTabProps {
  productId: string;
  trackInventory: boolean;
  isSerialized: boolean;
}

export function ProductInventoryTab({
  productId,
  trackInventory,
  isSerialized,
}: ProductInventoryTabProps) {
  return (
    <ProductInventoryTabContainer
      productId={productId}
      trackInventory={trackInventory}
      isSerialized={isSerialized}
    />
  );
}

// Legacy export - keep for backward compatibility
export { ProductInventoryTabContainer };
