/**
 * ImageEditor Component
 *
 * Dialog for editing image metadata (alt text, caption).
 */
import { useEffect, useCallback, useState } from "react";
import { Image, Info, Star, FileImage } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useUpdateProductImage } from "@/hooks/products";
import { useTanStackForm } from "@/hooks/_shared/use-tanstack-form";
import {
  FormDialog,
  TextField,
  TextareaField,
} from "@/components/shared/forms";
import {
  imageEditFormSchema,
  type ImageEditFormValues,
} from "@/lib/schemas/products";

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

export function ImageEditor({
  image,
  open,
  onOpenChange,
  onSaved,
}: ImageEditorProps) {
  const updateMutation = useUpdateProductImage();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useTanStackForm<ImageEditFormValues>({
    schema: imageEditFormSchema,
    defaultValues: {
      altText: image?.altText ?? "",
      caption: image?.caption ?? "",
    },
    onSubmit: async (values) => {
      if (!image) return;

      setSubmitError(null);
      try {
        await updateMutation.mutateAsync({
          id: image.id,
          altText: values.altText || undefined,
          caption: values.caption || undefined,
        });
        onSaved?.();
        onOpenChange(false);
      } catch (err) {
        setSubmitError(
          err instanceof Error ? err.message : "Failed to update image"
        );
      }
    },
  });

  const altText = form.useWatch("altText");
  const caption = form.useWatch("caption");

  useEffect(() => {
    if (image && open) {
      setSubmitError(null);
      form.reset({
        altText: image.altText ?? "",
        caption: image.caption ?? "",
      });
    }
  }, [image, open, form]);

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        if (updateMutation.isPending) return;
        setSubmitError(null);
        onOpenChange(false);
      } else {
        onOpenChange(newOpen);
      }
    },
    [updateMutation.isPending, onOpenChange]
  );

  const isDirty = form.isDirty();

  if (!image) return null;

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={
        <span className="flex items-center gap-2">
          <Image className="h-5 w-5" />
          Edit Image Details
        </span>
      }
      description="Update the alt text and caption for this image"
      form={form}
      submitLabel="Save Changes"
      submitError={submitError}
      submitDisabled={updateMutation.isPending || !isDirty}
      size="xl"
      className="max-w-2xl"
      resetOnClose={false}
    >
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
          <form.Field name="altText">
            {(field) => (
              <TextField
                field={field}
                label="Alt Text"
                placeholder="Describe the image for accessibility..."
                description={`${altText?.length ?? 0}/255 characters. Alt text helps screen readers describe images to visually impaired users and improves SEO.`}
              />
            )}
          </form.Field>

          {/* Caption field */}
          <form.Field name="caption">
            {(field) => (
              <TextareaField
                field={field}
                label="Caption (Optional)"
                placeholder="Add a caption to display below the image..."
                rows={3}
                description={`${caption?.length ?? 0}/1000 characters. Captions are displayed below images in the gallery and product pages.`}
              />
            )}
          </form.Field>
    </FormDialog>
  );
}
