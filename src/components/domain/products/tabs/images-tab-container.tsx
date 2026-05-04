/**
 * ProductImagesTab Container
 *
 * Handles data fetching for images tab.
 * Implements Container/Presenter pattern per STANDARDS.md.
 *
 * @source images from useProductImages hook
 * @source stats from useProductImageStats hook
 *
 * @see STANDARDS.md - Container/Presenter pattern
 */

import { useState, useCallback } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useProductImages, useProductImageStats } from "@/hooks/products";
import { ProductImagesTabView } from "./images-tab-view";
import type { GalleryImage } from "@/lib/schemas/products";
import type { EditableImage } from "../images/image-editor";

// ============================================================================
// TYPES
// ============================================================================

export interface ProductImagesTabContainerProps {
  productId: string;
  images?: GalleryImage[];
  onImagesChange?: () => void;
}

// ============================================================================
// CONTAINER
// ============================================================================

export function ProductImagesTabContainer({
  productId,
  images: initialImages,
  onImagesChange,
}: ProductImagesTabContainerProps) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<EditableImage | null>(null);

  // Fetch image data
  const {
    data: fetchedImages,
    error: imagesError,
    refetch: refetchImages,
  } = useProductImages({ productId });

  const { data: stats, error: statsError } = useProductImageStats({ productId });

  // Use fetched images or fall back to initial images; normalize fileSize for GalleryImage
  const rawImages = fetchedImages ?? initialImages ?? [];
  const images = rawImages.map((img) => ({ ...img, fileSize: img.fileSize ?? null }));
  const imagesUnavailableMessage =
    imagesError instanceof Error && images.length === 0
      ? "Product images are temporarily unavailable. Please refresh and try again."
      : null;
  const imagesWarningMessage =
    imagesError instanceof Error && images.length > 0
      ? "Showing the most recent product images while refresh is unavailable."
      : null;
  const statsWarningMessage =
    statsError instanceof Error
      ? "Image statistics are temporarily unavailable right now."
      : null;

  // Refresh handler that refetches and notifies parent
  const handleRefresh = useCallback(async () => {
    await refetchImages();
    onImagesChange?.();
  }, [refetchImages, onImagesChange]);

  return (
    <div className="space-y-4">
      {statsWarningMessage ? (
        <Alert>
          <AlertTitle>Image statistics unavailable</AlertTitle>
          <AlertDescription>{statsWarningMessage}</AlertDescription>
        </Alert>
      ) : null}
      <ProductImagesTabView
        productId={productId}
        images={images}
        stats={stats}
        isUploadOpen={isUploadOpen}
        editingImage={editingImage}
        onUploadOpenChange={setIsUploadOpen}
        onEditingImageChange={setEditingImage}
        onRefresh={handleRefresh}
        imagesUnavailableMessage={imagesUnavailableMessage}
        imagesWarningMessage={imagesWarningMessage}
      />
    </div>
  );
}
