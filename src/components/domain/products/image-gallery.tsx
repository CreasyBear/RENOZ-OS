/**
 * ImageGallery Component
 *
 * Displays product images in a grid with drag-and-drop reordering,
 * primary selection, and lightbox viewing.
 */
import { useState, useCallback, useEffect } from "react";
import {
  GripVertical,
  Star,
  Trash2,
  Pencil,
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  setPrimaryImage,
  deleteProductImage,
  reorderProductImages,
} from "@/lib/server/functions/product-images";

export interface GalleryImage {
  id: string;
  imageUrl: string;
  altText: string | null;
  caption: string | null;
  isPrimary: boolean;
  sortOrder: number;
  fileSize: number | null;
  dimensions: { width: number; height: number } | null;
}

interface ImageGalleryProps {
  productId: string;
  images: GalleryImage[];
  onImagesChange?: () => void;
  onEditImage?: (image: GalleryImage) => void;
}

export function ImageGallery({
  productId,
  images,
  onImagesChange,
  onEditImage,
}: ImageGalleryProps) {
  const [deletingImage, setDeletingImage] = useState<GalleryImage | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Sort images by sortOrder, primary first
  const sortedImages = [...images].sort((a, b) => {
    if (a.isPrimary) return -1;
    if (b.isPrimary) return 1;
    return a.sortOrder - b.sortOrder;
  });

  // Handle setting primary image
  const handleSetPrimary = async (imageId: string) => {
    try {
      await setPrimaryImage({ data: { id: imageId } });
      onImagesChange?.();
    } catch (error) {
      console.error("Failed to set primary image:", error);
    }
  };

  // Handle deleting image
  const handleDelete = async () => {
    if (!deletingImage) return;

    setIsDeleting(true);
    try {
      await deleteProductImage({ data: { id: deletingImage.id } });
      setDeletingImage(null);
      onImagesChange?.();
    } catch (error) {
      console.error("Failed to delete image:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnd = async () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      // Reorder the array
      const newOrder = [...sortedImages];
      const [removed] = newOrder.splice(draggedIndex, 1);
      newOrder.splice(dragOverIndex, 0, removed);

      // Save the new order
      try {
        await reorderProductImages({
          data: {
            productId,
            imageIds: newOrder.map((img) => img.id),
          },
        });
        onImagesChange?.();
      } catch (error) {
        console.error("Failed to reorder images:", error);
      }
    }

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Lightbox navigation
  const openLightbox = (index: number) => {
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
  };

  const navigateLightbox = useCallback(
    (direction: "prev" | "next") => {
      if (lightboxIndex === null) return;

      if (direction === "prev") {
        setLightboxIndex(lightboxIndex > 0 ? lightboxIndex - 1 : sortedImages.length - 1);
      } else {
        setLightboxIndex(lightboxIndex < sortedImages.length - 1 ? lightboxIndex + 1 : 0);
      }
    },
    [lightboxIndex, sortedImages.length]
  );

  // Keyboard navigation for lightbox
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;

      if (e.key === "Escape") {
        closeLightbox();
      } else if (e.key === "ArrowLeft") {
        navigateLightbox("prev");
      } else if (e.key === "ArrowRight") {
        navigateLightbox("next");
      }
    },
    [lightboxIndex, navigateLightbox]
  );

  // Add keyboard listener when lightbox is open
  useEffect(() => {
    if (lightboxIndex !== null) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [lightboxIndex, handleKeyDown]);

  if (sortedImages.length === 0) {
    return null;
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sortedImages.map((image, index) => (
          <div
            key={image.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={cn(
              "group relative border rounded-lg overflow-hidden transition-all",
              draggedIndex === index && "opacity-50",
              dragOverIndex === index && "ring-2 ring-primary"
            )}
          >
            {/* Drag handle */}
            <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 cursor-grab active:cursor-grabbing"
              >
                <GripVertical className="h-4 w-4" />
              </Button>
            </div>

            {/* Primary badge */}
            {image.isPrimary && (
              <div className="absolute top-2 right-2 z-10">
                <Badge variant="default" className="gap-1">
                  <Star className="h-3 w-3 fill-current" />
                  Primary
                </Badge>
              </div>
            )}

            {/* Image */}
            <div
              className="cursor-pointer"
              onClick={() => openLightbox(index)}
            >
              <img
                src={image.imageUrl}
                alt={image.altText ?? "Product image"}
                className="w-full h-48 object-cover"
              />
            </div>

            {/* Expand button */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              {!image.isPrimary && (
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => openLightbox(index)}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Actions overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex justify-between items-center">
                <div className="flex gap-1">
                  {!image.isPrimary && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleSetPrimary(image.id)}
                    >
                      <Star className="mr-1 h-3 w-3" />
                      Primary
                    </Button>
                  )}
                  {onEditImage && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onEditImage(image)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeletingImage(image)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Alt text / caption */}
            {(image.altText || image.caption) && (
              <div className="p-2 bg-muted/50">
                <p className="text-xs text-muted-foreground truncate">
                  {image.altText || image.caption}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      <Dialog open={lightboxIndex !== null} onOpenChange={(open) => !open && closeLightbox()}>
        <DialogContent
          className="max-w-[95vw] max-h-[95vh] p-0 border-none bg-black/90"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {lightboxIndex !== null && sortedImages[lightboxIndex] && (
            <div className="relative flex items-center justify-center min-h-[90vh]">
              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 text-white hover:bg-white/20 z-10"
                onClick={closeLightbox}
                aria-label="Close lightbox"
              >
                <X className="h-6 w-6" />
              </Button>

              {/* Previous button */}
              {sortedImages.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateLightbox("prev");
                  }}
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
              )}

              {/* Image */}
              <div className="max-w-[90vw] max-h-[90vh] flex flex-col items-center justify-center">
                <img
                  src={sortedImages[lightboxIndex].imageUrl}
                  alt={sortedImages[lightboxIndex].altText ?? "Product image"}
                  className="max-w-full max-h-[80vh] object-contain"
                />
                {/* Caption */}
                {(sortedImages[lightboxIndex].altText ||
                  sortedImages[lightboxIndex].caption) && (
                  <div className="text-center mt-4 text-white">
                    <p className="text-lg">
                      {sortedImages[lightboxIndex].altText ||
                        sortedImages[lightboxIndex].caption}
                    </p>
                  </div>
                )}
                {/* Image counter */}
                <div className="text-center mt-2 text-white/70 text-sm">
                  {lightboxIndex + 1} / {sortedImages.length}
                </div>
              </div>

              {/* Next button */}
              {sortedImages.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateLightbox("next");
                  }}
                  aria-label="Next image"
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingImage} onOpenChange={() => setDeletingImage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Image</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this image? This action cannot be undone.
              {deletingImage?.isPrimary && (
                <span className="block mt-2 font-medium text-amber-600">
                  This is the primary image. Another image will become the new primary.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
