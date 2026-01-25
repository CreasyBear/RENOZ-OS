/**
 * ImageEditor Component
 *
 * Dialog for editing image metadata (alt text, caption).
 */
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Image, Info, Star, FileImage } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateProductImage } from "@/lib/server/functions/product-images";

// Form schema
const imageEditSchema = z.object({
  altText: z.string().max(255, "Alt text must be 255 characters or less").optional(),
  caption: z.string().max(1000, "Caption must be 1000 characters or less").optional(),
});

type ImageEditFormValues = z.infer<typeof imageEditSchema>;

export interface EditableImage {
  id: string;
  imageUrl: string;
  altText: string | null;
  caption: string | null;
  isPrimary: boolean;
  fileSize: number | null;
  dimensions: { width: number; height: number } | null;
}

interface ImageEditorProps {
  image: EditableImage | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

// Format file size
function formatFileSize(bytes: number | null): string {
  if (bytes === null) return "Unknown";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function ImageEditor({ image, open, onOpenChange, onSaved }: ImageEditorProps) {
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isDirty },
  } = useForm<ImageEditFormValues>({
    resolver: zodResolver(imageEditSchema) as never,
    defaultValues: {
      altText: "",
      caption: "",
    },
  });

  const altText = watch("altText");
  const caption = watch("caption");


  // Handle save
  const onSubmit = async (data: ImageEditFormValues) => {
    if (!image) return;

    setIsSaving(true);
    try {
      await updateProductImage({
        data: {
          id: image.id,
          altText: data.altText || undefined,
          caption: data.caption || undefined,
        },
      });
      onSaved?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to update image:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle close
  const handleClose = () => {
    if (!isSaving) {
      onOpenChange(false);
    }
  };

  if (!image) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Edit Image Details
          </DialogTitle>
          <DialogDescription>
            Update the alt text and caption for this image
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Image preview */}
          <div className="flex gap-6">
            <div className="relative w-48 h-48 flex-shrink-0 rounded-lg overflow-hidden border">
              <img
                src={image.imageUrl}
                alt={image.altText ?? "Product image"}
                className="w-full h-full object-cover"
              />
              {image.isPrimary && (
                <div className="absolute top-2 right-2">
                  <Badge variant="default" className="gap-1">
                    <Star className="h-3 w-3 fill-current" />
                    Primary
                  </Badge>
                </div>
              )}
            </div>

            {/* Image info */}
            <div className="flex-1 space-y-4">
              <div>
                <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                  <FileImage className="h-4 w-4" />
                  Image Information
                </h4>
                <dl className="text-sm space-y-1">
                  {image.dimensions && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Dimensions:</dt>
                      <dd>
                        {image.dimensions.width} × {image.dimensions.height} px
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">File Size:</dt>
                    <dd>{formatFileSize(image.fileSize)}</dd>
                  </div>
                </dl>
              </div>

              {/* Alt text tip */}
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <div className="flex gap-2">
                  <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-800">
                    <p className="font-medium">Alt text best practices:</p>
                    <ul className="mt-1 list-disc list-inside space-y-0.5">
                      <li>Describe the image content clearly</li>
                      <li>Keep it concise (under 125 characters)</li>
                      <li>Include relevant product details</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Alt text field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="altText">Alt Text</Label>
              <span className="text-xs text-muted-foreground">
                {altText?.length || 0}/255
              </span>
            </div>
            <Input
              id="altText"
              placeholder="Describe the image for accessibility..."
              {...register("altText")}
            />
            {errors.altText && (
              <p className="text-sm text-destructive">{errors.altText.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Alt text helps screen readers describe images to visually impaired users and
              improves SEO.
            </p>
          </div>

          {/* Caption field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="caption">Caption (Optional)</Label>
              <span className="text-xs text-muted-foreground">
                {caption?.length || 0}/1000
              </span>
            </div>
            <Textarea
              id="caption"
              placeholder="Add a caption to display below the image..."
              rows={3}
              {...register("caption")}
            />
            {errors.caption && (
              <p className="text-sm text-destructive">{errors.caption.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Captions are displayed below images in the gallery and product pages.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || !isDirty}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
