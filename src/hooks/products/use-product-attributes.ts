/**
 * Product Attributes Hooks
 *
 * TanStack Query hooks for product attribute management.
 *
 * @see src/server/functions/products/product-attributes.ts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import {
  listAttributes,
  getAttribute,
  createAttribute,
  updateAttribute,
  deleteAttribute,
  getProductAttributeValues,
  setProductAttribute,
  setProductAttributes,
  deleteProductAttribute,
  checkRequiredAttributes,
  getFilterableAttributes,
} from '@/server/functions/products/product-attributes';

// ============================================================================
// TYPES
// ============================================================================

export interface AttributeDefinition {
  attributeId: string;
  attributeName: string;
  attributeType: string;
  description?: string;
  options?: {
    choices?: Array<{ value: string; label: string; sortOrder?: number }>;
    min?: number;
    max?: number;
    step?: number;
    placeholder?: string;
  };
  isRequired: boolean;
  isFilterable: boolean;
  isSearchable: boolean;
  value: unknown;
}

export interface AttributeValidation {
  complete: boolean;
  missing: Array<{ attributeId: string; attributeName: string }>;
}

export interface ListAttributesOptions {
  activeOnly?: boolean;
  categoryId?: string;
}

// ============================================================================
// ATTRIBUTE DEFINITION HOOKS
// ============================================================================

/**
 * List all attribute definitions.
 */
export function useProductAttributeDefinitions(options?: ListAttributesOptions) {
  const listAttributesFn = useServerFn(listAttributes);

  return useQuery({
    queryKey: queryKeys.products.attributes.definitions(options),
    queryFn: async () => {
      return await listAttributesFn({ data: options });
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Get a single attribute definition by ID.
 */
export function useProductAttributeDefinition(id: string, enabled = true) {
  const getAttributeFn = useServerFn(getAttribute);

  return useQuery({
    queryKey: queryKeys.products.attributes.definition(id),
    queryFn: async () => {
      return await getAttributeFn({ data: { id } });
    },
    enabled: enabled && !!id,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Create a new attribute definition.
 */
export function useCreateAttributeDefinition() {
  const queryClient = useQueryClient();
  const createAttributeFn = useServerFn(createAttribute);

  return useMutation({
    mutationFn: async (input: Parameters<typeof createAttribute>[0]['data']) => {
      return await createAttributeFn({ data: input });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.attributes.all,
      });
    },
  });
}

/**
 * Update an attribute definition.
 */
export function useUpdateAttributeDefinition() {
  const queryClient = useQueryClient();
  const updateAttributeFn = useServerFn(updateAttribute);

  return useMutation({
    mutationFn: async (input: Parameters<typeof updateAttribute>[0]['data']) => {
      return await updateAttributeFn({ data: input });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.attributes.definition(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.attributes.definitions(),
      });
    },
  });
}

/**
 * Delete an attribute definition.
 */
export function useDeleteAttributeDefinition() {
  const queryClient = useQueryClient();
  const deleteAttributeFn = useServerFn(deleteAttribute);

  return useMutation({
    mutationFn: async (id: string) => {
      return await deleteAttributeFn({ data: { id } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.attributes.all,
      });
    },
  });
}

// ============================================================================
// PRODUCT ATTRIBUTE VALUE HOOKS
// ============================================================================

/**
 * Get attribute values for a specific product.
 */
export function useProductAttributeValues(productId: string, enabled = true) {
  const getValuesFn = useServerFn(getProductAttributeValues);

  return useQuery({
    queryKey: queryKeys.products.attributes.values(productId),
    queryFn: async () => {
      return await getValuesFn({ data: { productId } });
    },
    enabled: enabled && !!productId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Check required attributes for a product.
 */
export function useProductRequiredAttributes(productId: string, enabled = true) {
  const checkFn = useServerFn(checkRequiredAttributes);

  return useQuery<AttributeValidation>({
    queryKey: queryKeys.products.attributes.validation(productId),
    queryFn: async () => {
      return await checkFn({ data: { productId } });
    },
    enabled: enabled && !!productId,
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Set a single product attribute value.
 */
export function useSetProductAttribute() {
  const queryClient = useQueryClient();
  const setAttributeFn = useServerFn(setProductAttribute);

  return useMutation({
    mutationFn: async (input: { productId: string; attributeId: string; value: string | number | boolean | string[] | null }) => {
      return await setAttributeFn({ data: input });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.attributes.values(variables.productId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.attributes.validation(variables.productId),
      });
    },
  });
}

/**
 * Set multiple product attribute values at once.
 */
export function useSetProductAttributes() {
  const queryClient = useQueryClient();
  const setAttributesFn = useServerFn(setProductAttributes);

  return useMutation({
    mutationFn: async (input: {
      productId: string;
      values: Array<{ attributeId: string; value: string | number | boolean | string[] | null }>;
    }) => {
      return await setAttributesFn({ data: input });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.attributes.values(variables.productId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.attributes.validation(variables.productId),
      });
    },
  });
}

/**
 * Delete a product attribute value.
 */
export function useDeleteProductAttribute() {
  const queryClient = useQueryClient();
  const deleteValueFn = useServerFn(deleteProductAttribute);

  return useMutation({
    mutationFn: async (input: { productId: string; attributeId: string }) => {
      return await deleteValueFn({ data: input });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.attributes.values(variables.productId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.attributes.validation(variables.productId),
      });
    },
  });
}

// ============================================================================
// FILTER HOOKS
// ============================================================================

/**
 * Get filterable attributes for search/filter interfaces.
 */
export function useFilterableAttributes(categoryId?: string) {
  const getFilterableFn = useServerFn(getFilterableAttributes);

  return useQuery({
    queryKey: queryKeys.products.attributes.filterable(categoryId),
    queryFn: async () => {
      return await getFilterableFn({ data: categoryId ? { categoryId } : {} });
    },
    staleTime: 1000 * 60 * 10, // 10 minutes - rarely changes
  });
}
