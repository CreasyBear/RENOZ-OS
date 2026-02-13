/**
 * ProductAttributesTab Component
 *
 * Container component that fetches data and passes to presenter.
 * Implements Container/Presenter pattern per STANDARDS.md.
 *
 * @see STANDARDS.md - Container/Presenter pattern
 */

import { ProductAttributesTabContainer } from "./attributes-tab-container";

interface ProductAttributesTabProps {
  productId: string;
  onAttributesChange?: () => void;
}

export function ProductAttributesTab({
  productId,
  onAttributesChange,
}: ProductAttributesTabProps) {
  return (
    <ProductAttributesTabContainer
      productId={productId}
      onAttributesChange={onAttributesChange}
    />
  );
}

// Legacy export - keep for backward compatibility
export { ProductAttributesTabContainer };
