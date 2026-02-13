/**
 * ProductAttributesTab Container
 *
 * Handles data fetching for attributes tab.
 * Implements Container/Presenter pattern per STANDARDS.md.
 *
 * @source attributes from useProductAttributeValues hook
 * @source validation from useProductRequiredAttributes hook
 *
 * @see STANDARDS.md - Container/Presenter pattern
 */

import { useState, useCallback } from "react";
import {
  useProductAttributeValues,
  useProductRequiredAttributes,
  useDeleteProductAttribute,
} from "@/hooks/products";
import { toastError } from "@/hooks";
import { ProductAttributesTabView } from "./attributes-tab-view";
import type { AttributeDefinition } from "../attributes/attribute-value-editor";

// ============================================================================
// TYPES
// ============================================================================

export interface ProductAttributesTabContainerProps {
  productId: string;
  onAttributesChange?: () => void;
}

// ============================================================================
// CONTAINER
// ============================================================================

export function ProductAttributesTabContainer({
  productId,
  onAttributesChange,
}: ProductAttributesTabContainerProps) {
  const [editingAttribute, setEditingAttribute] = useState<AttributeDefinition | null>(null);
  const [deletingAttribute, setDeletingAttribute] = useState<AttributeDefinition | null>(null);

  // Fetch attribute data
  const { data: attributes = [], isLoading } = useProductAttributeValues(productId);
  const { data: validation } = useProductRequiredAttributes(productId);
  const deleteAttributeMutation = useDeleteProductAttribute();

  // Handle attribute saved
  const handleSaved = useCallback(() => {
    onAttributesChange?.();
  }, [onAttributesChange]);

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!deletingAttribute) return;

    try {
      await deleteAttributeMutation.mutateAsync({
        productId,
        attributeId: deletingAttribute.attributeId,
      });
      setDeletingAttribute(null);
      onAttributesChange?.();
    } catch (error) {
      toastError(
        error instanceof Error ? error.message : "Failed to delete attribute"
      );
    }
  }, [deletingAttribute, productId, deleteAttributeMutation, onAttributesChange]);

  return (
    <ProductAttributesTabView
      productId={productId}
      attributes={attributes as AttributeDefinition[]}
      validation={validation}
      isLoading={isLoading}
      isDeleting={deleteAttributeMutation.isPending}
      editingAttribute={editingAttribute}
      deletingAttribute={deletingAttribute}
      onEditingAttributeChange={setEditingAttribute}
      onDeletingAttributeChange={setDeletingAttribute}
      onSaved={handleSaved}
      onDelete={handleDelete}
    />
  );
}
