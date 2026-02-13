/**
 * ProductImagesTab Component
 *
 * Container component that fetches data and passes to presenter.
 * Implements Container/Presenter pattern per STANDARDS.md.
 *
 * @see STANDARDS.md - Container/Presenter pattern
 */

import { ProductImagesTabContainer } from "./images-tab-container";
import type { GalleryImage } from "@/lib/schemas/products";

interface ProductImagesTabProps {
  productId: string;
  images?: GalleryImage[];
  onImagesChange?: () => void;
}

export function ProductImagesTab({
  productId,
  images,
  onImagesChange,
}: ProductImagesTabProps) {
  return (
    <ProductImagesTabContainer
      productId={productId}
      images={images}
      onImagesChange={onImagesChange}
    />
  );
}

// Legacy export - keep for backward compatibility
export { ProductImagesTabContainer };
