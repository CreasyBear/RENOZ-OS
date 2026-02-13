/**
 * ComponentSelector Container
 *
 * Handles data fetching for component selector.
 * Implements Container/Presenter pattern per STANDARDS.md.
 *
 * @source products from useProductSearch hook
 *
 * @see STANDARDS.md - Container/Presenter pattern
 */

import { useState, useMemo, useCallback } from "react";
import { useProductSearch } from "@/hooks/products";
import { ComponentSelectorView } from "./component-selector-view";

// ============================================================================
// TYPES
// ============================================================================

interface Product {
  id: string;
  sku: string;
  name: string;
  type: string;
  status: string;
  basePrice: number | null;
}

export interface SelectedComponent {
  product: Product;
  quantity: number;
  isOptional: boolean;
}

export interface ComponentSelectorContainerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (components: SelectedComponent[]) => void;
  excludeProductIds?: string[];
  bundleProductId?: string;
}

// ============================================================================
// CONTAINER
// ============================================================================

export function ComponentSelectorContainer({
  open,
  onOpenChange,
  onSelect,
  excludeProductIds = [],
  bundleProductId,
}: ComponentSelectorContainerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selected, setSelected] = useState<Map<string, SelectedComponent>>(new Map());

  // Fetch product search data
  const { data, isLoading } = useProductSearch(
    searchQuery,
    { limit: 20 },
    open && searchQuery.length >= 2
  );

  // Filter out excluded products
  const rawProducts = data?.products;
  const products = useMemo(() => {
    if (!rawProducts) return [];

    const allExcluded = [...excludeProductIds];
    if (bundleProductId) allExcluded.push(bundleProductId);

    return rawProducts.filter(
      (p) => !allExcluded.includes(p.id) && p.type !== "bundle" && p.status === "active"
    ) as Product[];
  }, [rawProducts, excludeProductIds, bundleProductId]);

  // Toggle product selection
  const toggleProduct = useCallback((product: Product) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(product.id)) {
        next.delete(product.id);
      } else {
        next.set(product.id, {
          product,
          quantity: 1,
          isOptional: false,
        });
      }
      return next;
    });
  }, []);

  // Update quantity
  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setSelected((prev) => {
      const next = new Map(prev);
      const component = next.get(productId);
      if (component) {
        next.set(productId, { ...component, quantity: Math.max(1, quantity) });
      }
      return next;
    });
  }, []);

  // Toggle optional flag
  const toggleOptional = useCallback((productId: string) => {
    setSelected((prev) => {
      const next = new Map(prev);
      const component = next.get(productId);
      if (component) {
        next.set(productId, { ...component, isOptional: !component.isOptional });
      }
      return next;
    });
  }, []);

  // Submit selection
  const handleSubmit = useCallback(() => {
    onSelect(Array.from(selected.values()));
    onOpenChange(false);
  }, [selected, onSelect, onOpenChange]);

  // Handle dialog open/close
  const handleOpenChange = useCallback((isOpen: boolean) => {
    onOpenChange(isOpen);
    if (isOpen) {
      setSelected(new Map());
      setSearchQuery("");
    }
  }, [onOpenChange]);

  return (
    <ComponentSelectorView
      open={open}
      searchQuery={searchQuery}
      products={products}
      selected={selected}
      isLoading={isLoading}
      onSearchQueryChange={setSearchQuery}
      onOpenChange={handleOpenChange}
      onToggleProduct={toggleProduct}
      onUpdateQuantity={updateQuantity}
      onToggleOptional={toggleOptional}
      onSubmit={handleSubmit}
    />
  );
}
