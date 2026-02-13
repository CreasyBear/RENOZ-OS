/**
 * Inventory Browser Page Component
 *
 * Main inventory list page with URL-synced filters and multiple view modes.
 *
 * @source inventory from useInventory hook
 * @source products from useProducts hook
 * @source locations from useLocations hook
 *
 * @see src/routes/_authenticated/inventory/browser.tsx - Route definition
 */

import { useMemo, useCallback, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { PageLayout } from "@/components/layout";
import { InventoryBrowser } from "@/components/domain/inventory";
import { useTransformedFilterUrlState } from "@/hooks/filters/use-filter-url-state";
import {
  DEFAULT_INVENTORY_FILTERS,
  type InventoryFiltersState,
} from "@/components/domain/inventory/inventory-filter-config";
import { useInventory } from "@/hooks/inventory";
import { useLocations } from "@/hooks/inventory/use-locations";
import { useProducts } from "@/hooks/products";
import type { InventoryItem } from "@/components/domain/inventory/view-modes";
import { INVENTORY_STATUS_VALUES, QUALITY_STATUS_VALUES, type SearchParams } from "./browser";

// ============================================================================
// URL FILTER TRANSFORMERS
// ============================================================================

function parseCommaList<T extends string>(val: string | undefined, allowed: readonly T[]): T[] {
  if (!val?.trim()) return [];
  const set = new Set(allowed);
  return val.split(",").map((s) => s.trim()).filter((s): s is T => set.has(s as T));
}

/** Transform URL search params to InventoryFiltersState. Uses schema constants for validation. */
const fromUrlParams = (search: SearchParams): InventoryFiltersState => ({
  search: search.search ?? "",
  productId: search.productId ?? null,
  locationId: search.locationId ?? null,
  status: parseCommaList(search.status, INVENTORY_STATUS_VALUES) as InventoryFiltersState["status"],
  qualityStatus: parseCommaList(search.qualityStatus, QUALITY_STATUS_VALUES) as InventoryFiltersState["qualityStatus"],
  ageRange: (search.ageRange as InventoryFiltersState["ageRange"]) ?? null,
  quantityRange:
    search.lowStock
      ? { min: 0, max: 10 }
      : search.minQuantity != null || search.maxQuantity != null
        ? { min: search.minQuantity ?? null, max: search.maxQuantity ?? null }
        : null,
  valueRange:
    search.minValue != null || search.maxValue != null
      ? { min: search.minValue ?? null, max: search.maxValue ?? null }
      : null,
});

/** Transform InventoryFiltersState to URL search params */
const toUrlParams = (filters: InventoryFiltersState): Record<string, unknown> => ({
  search: filters.search || undefined,
  productId: filters.productId || undefined,
  locationId: filters.locationId || undefined,
  status: filters.status.length > 0 ? filters.status.join(",") : undefined,
  qualityStatus: filters.qualityStatus.length > 0 ? filters.qualityStatus.join(",") : undefined,
  ageRange: filters.ageRange ?? undefined,
  minQuantity:
    filters.quantityRange?.min === 0 && filters.quantityRange?.max === 10
      ? undefined
      : filters.quantityRange?.min ?? undefined,
  maxQuantity:
    filters.quantityRange?.min === 0 && filters.quantityRange?.max === 10
      ? undefined
      : filters.quantityRange?.max ?? undefined,
  minValue: filters.valueRange?.min ?? undefined,
  maxValue: filters.valueRange?.max ?? undefined,
  lowStock:
    filters.quantityRange?.min === 0 && filters.quantityRange?.max === 10 ? true : undefined,
});

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

interface InventoryBrowserPageProps {
  search: SearchParams;
}

export default function InventoryBrowserPage({ search }: InventoryBrowserPageProps) {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<"list" | "grid" | "map">("list");

  // URL-synced filter state with transformations
  const { filters, setFilters } = useTransformedFilterUrlState({
    currentSearch: search,
    navigate,
    defaults: DEFAULT_INVENTORY_FILTERS,
    fromUrlParams,
    toUrlParams,
    resetPageOnChange: [
      "search",
      "status",
      "qualityStatus",
      "ageRange",
      "quantityRange",
      "valueRange",
      "productId",
      "locationId",
    ],
  });

  // Fetch products and locations for filter options
  const { data: productsData } = useProducts({ enabled: true });
  const { locations } = useLocations({ autoFetch: true });

  // Fetch inventory list with current filters
  const isLowStockPreset =
    filters.quantityRange?.min === 0 && filters.quantityRange?.max === 10;
  const { data: inventoryData, isLoading, refetch } = useInventory({
    search: filters.search,
    productId: filters.productId ?? undefined,
    locationId: filters.locationId ?? undefined,
    status: filters.status.length > 0 ? filters.status : undefined,
    qualityStatus: filters.qualityStatus.length > 0 ? filters.qualityStatus : undefined,
    ageRange: filters.ageRange ?? undefined,
    lowStock: isLowStockPreset ? true : undefined,
    minQuantity: !isLowStockPreset ? filters.quantityRange?.min ?? undefined : undefined,
    maxQuantity: !isLowStockPreset ? filters.quantityRange?.max ?? undefined : undefined,
    minValue: filters.valueRange?.min ?? undefined,
    maxValue: filters.valueRange?.max ?? undefined,
    page: search.page,
    pageSize: search.pageSize,
    sortBy: search.sortBy,
    sortOrder: search.sortOrder,
  });

  // Transform inventory data to InventoryItem format
  const inventoryItems: InventoryItem[] = useMemo(() => {
    if (!inventoryData?.items) return [];

    return inventoryData.items.map((item: (typeof inventoryData.items)[number]) => ({
      id: item.id,
      productId: item.productId,
      productName: item.product?.name ?? "Unknown",
      productSku: item.product?.sku ?? "",
      locationId: item.locationId,
      locationName: item.location?.name ?? "Unknown",
      locationCode: item.location?.locationCode ?? "",
      quantityOnHand: item.quantityOnHand,
      quantityAllocated: item.quantityAllocated,
      quantityAvailable: item.quantityAvailable,
      unitCost: item.unitCost ?? 0,
      totalValue: item.totalValue ?? 0,
      status: item.status as InventoryItem["status"],
      serialNumber: item.serialNumber ?? undefined,
      lotNumber: item.lotNumber ?? undefined,
      expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
      receivedAt: item.createdAt,
    }));
  }, [inventoryData]);

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters: InventoryFiltersState) => {
    setFilters(newFilters);
  }, [setFilters]);

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    navigate({
      to: ".",
      search: (prev) => ({ ...prev, page }),
    });
  }, [navigate]);

  // Handle item click
  const handleItemClick = useCallback((item: InventoryItem) => {
    navigate({
      to: "/inventory/$itemId",
      params: { itemId: item.id },
    });
  }, [navigate]);

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Inventory Browser"
        description={`${inventoryData?.total ?? 0} items in inventory`}
      />

      <PageLayout.Content>
        <InventoryBrowser
          items={inventoryItems}
          isLoading={isLoading}
          products={productsData?.products.map((p) => ({ id: p.id, name: p.name, sku: p.sku }))}
          locations={locations.map((l) => ({
            id: l.id,
            name: l.name,
            code: l.code,
          }))}
          page={search.page}
          pageSize={search.pageSize}
          totalCount={inventoryData?.total ?? 0}
          onPageChange={handlePageChange}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onItemClick={handleItemClick}
          onRefresh={() => refetch()}
        />
      </PageLayout.Content>
    </PageLayout>
  );
}
