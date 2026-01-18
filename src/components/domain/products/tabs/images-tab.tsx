/**
 * ProductImagesTab Component
 *
 * Displays and manages product image gallery with drag-and-drop reordering,
 * upload, and metadata editing.
 */
import { useState, useCallback } from "react";
import { Plus, Image, BarChart3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { ImageGallery, type GalleryImage } from "../image-gallery";
import { ImageUploader } from "../image-uploader";
import { ImageEditor, type EditableImage } from "../image-editor";
import { listProductImages, getImageStats } from "@/lib/server/functions/product-images";

interface ProductImagesTabProps {
  productId: string;
  images: GalleryImage[];
  onImagesChange?: () => void;
}

export function ProductImagesTab({
  productId,
  images: initialImages,
  onImagesChange,
}: ProductImagesTabProps) {
  const [images, setImages] = useState<GalleryImage[]>(initialImages);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<EditableImage | null>(null);
  const [stats, setStats] = useState<{
    totalImages: number;
    totalSize: number;
    hasPrimary: boolean;
    missingAltText: number;
  } | null>(null);

  // Refresh images from server
  const refreshImages = useCallback(async () => {
    try {
      const [newImages, newStats] = await Promise.all([
        listProductImages({ data: { productId } }),
        getImageStats({ data: { productId } }),
      ]);
      setImages(newImages as GalleryImage[]);
      setStats(newStats);
      onImagesChange?.();
    } catch (error) {
      console.error("Failed to refresh images:", error);
    }
  }, [productId, onImagesChange]);

  // Format file size
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Upload section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Product Images
            </CardTitle>
            <CardDescription>
              Manage product photos and gallery images
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setIsUploadOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Image
          </Button>
        </CardHeader>
        <CardContent>
          {images.length === 0 ? (
            <EmptyState
              title="No images"
              message="Add product images to showcase your product"
              primaryAction={{
                label: "Upload Image",
                onClick: () => setIsUploadOpen(true),
              }}
            />
          ) : (
            <ImageGallery
              productId={productId}
              images={images}
              onImagesChange={refreshImages}
              onEditImage={(img) => setEditingImage(img)}
            />
          )}
        </CardContent>
      </Card>

      {/* Upload modal */}
      {isUploadOpen && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upload Images</CardTitle>
            <CardDescription>
              Add new images to the product gallery
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ImageUploader
              productId={productId}
              existingImageCount={images.length}
              onUploadComplete={async () => {
                await refreshImages();
                setIsUploadOpen(false);
              }}
              onClose={() => setIsUploadOpen(false)}
            />
          </CardContent>
        </Card>
      )}

      {/* Image stats */}
      {stats && images.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Image Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{stats.totalImages}</p>
                <p className="text-sm text-muted-foreground">Total Images</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{formatSize(stats.totalSize)}</p>
                <p className="text-sm text-muted-foreground">Total Size</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold">
                  {stats.hasPrimary ? "Yes" : "No"}
                </p>
                <p className="text-sm text-muted-foreground">Primary Set</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className={`text-2xl font-bold ${stats.missingAltText > 0 ? "text-amber-600" : "text-green-600"}`}>
                  {stats.missingAltText}
                </p>
                <p className="text-sm text-muted-foreground">Missing Alt Text</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Image guidelines */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Image Guidelines</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Recommended size: 1200x1200 pixels or larger</li>
            <li>• Supported formats: JPG, PNG, WebP, GIF</li>
            <li>• Maximum file size: 10MB per image</li>
            <li>• Maximum 20 images per product</li>
            <li>• Use a white or neutral background for best results</li>
            <li>• Add alt text for accessibility and SEO</li>
          </ul>
        </CardContent>
      </Card>

      {/* Image editor dialog */}
      <ImageEditor
        key={editingImage?.id ?? 'new'}
        image={editingImage}
        open={!!editingImage}
        onOpenChange={(open) => {
          if (!open) setEditingImage(null);
        }}
        onSaved={refreshImages}
      />
    </div>
  );
}
