/**
 * Product Images Hooks
 *
 * TanStack Query hooks for product image management:
 * - List images for a product
 * - Get image statistics
 * - Add, update, delete images
 * - Set primary image
 * - Reorder images
 * - Bulk operations
 *
 * @see src/server/functions/products/product-images.ts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { toast } from '../_shared/use-toast';
import {
  listProductImages,
  getImageStats,
  getPrimaryImage,
  addProductImage,
  updateProductImage,
  deleteProductImage,
  setPrimaryImage,
  reorderProductImages,
  bulkDeleteImages,
  bulkUpdateAltText,
} from '@/server/functions/products/product-images';

// ============================================================================
// TYPES
// ============================================================================

export interface UseProductImagesOptions {
  productId: string;
  enabled?: boolean;
}

export interface AddProductImageInput {
  productId: string;
  imageUrl: string;
  altText?: string;
  caption?: string;
  fileSize?: number;
  dimensions?: { width: number; height: number };
  mimeType?: string;
  setAsPrimary?: boolean;
}

export interface UpdateProductImageInput {
  id: string;
  altText?: string;
  caption?: string;
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Fetch all images for a product.
 */
export function useProductImages({ productId, enabled = true }: UseProductImagesOptions) {
  return useQuery({
    queryKey: queryKeys.products.images.list(productId),
    queryFn: async () => {
      const result = await listProductImages({
        data: { productId } 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled: enabled && !!productId,
    staleTime: 60 * 1000,
  });
}

/**
 * Fetch image statistics for a product.
 */
export function useProductImageStats({ productId, enabled = true }: UseProductImagesOptions) {
  return useQuery({
    queryKey: queryKeys.products.images.stats(productId),
    queryFn: async () => {
      const result = await getImageStats({
        data: { productId } 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled: enabled && !!productId,
    staleTime: 60 * 1000,
  });
}

/**
 * Fetch the primary image for a product.
 */
export function useProductPrimaryImage({ productId, enabled = true }: UseProductImagesOptions) {
  return useQuery({
    queryKey: queryKeys.products.images.primary(productId),
    queryFn: async () => {
      const result = await getPrimaryImage({
        data: { productId } 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled: enabled && !!productId,
    staleTime: 60 * 1000,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Add a new image to a product.
 */
export function useAddProductImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AddProductImageInput) => addProductImage({ data: input }),
    onSuccess: (_, variables) => {
      toast.success('Image added');
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.images.list(variables.productId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.images.stats(variables.productId),
      });
      if (variables.setAsPrimary) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.products.images.primary(variables.productId),
        });
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add image');
    },
  });
}

/**
 * Update image metadata.
 */
export function useUpdateProductImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateProductImageInput) => updateProductImage({ data: input }),
    onSuccess: () => {
      toast.success('Image updated');
      // Invalidate all image lists since we don't have productId in the response
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.images.all,
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update image');
    },
  });
}

/**
 * Delete a product image.
 */
export function useDeleteProductImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (imageId: string) => deleteProductImage({ data: { id: imageId } }),
    onSuccess: () => {
      toast.success('Image deleted');
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.images.all,
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete image');
    },
  });
}

/**
 * Set an image as the primary image for a product.
 */
export function useSetPrimaryImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (imageId: string) => setPrimaryImage({ data: { id: imageId } }),
    onSuccess: () => {
      toast.success('Primary image updated');
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.images.all,
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to set primary image');
    },
  });
}

/**
 * Reorder images for a product.
 */
export function useReorderProductImages() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, imageIds }: { productId: string; imageIds: string[] }) =>
      reorderProductImages({ data: { productId, imageIds } }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.images.list(variables.productId),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reorder images');
    },
  });
}

/**
 * Delete multiple images at once.
 */
export function useBulkDeleteImages() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (imageIds: string[]) => bulkDeleteImages({ data: { imageIds } }),
    onSuccess: (result) => {
      toast.success(`Deleted ${result.deleted} image${result.deleted !== 1 ? 's' : ''}`);
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.images.all,
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete images');
    },
  });
}

/**
 * Update alt text for multiple images.
 */
export function useBulkUpdateAltText() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Array<{ id: string; altText: string }>) =>
      bulkUpdateAltText({ data: { updates } }),
    onSuccess: (result) => {
      toast.success(`Updated ${result.updated} image${result.updated !== 1 ? 's' : ''}`);
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.images.all,
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update alt text');
    },
  });
}
