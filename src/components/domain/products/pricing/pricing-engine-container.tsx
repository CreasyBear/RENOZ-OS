/**
 * PricingEngine Container
 *
 * Handles data fetching and business logic for pricing engine.
 * Implements Container/Presenter pattern per STANDARDS.md.
 *
 * @source customers from useCustomers hook
 * @source priceResult from useResolvePrice hook
 *
 * @see STANDARDS.md - Container/Presenter pattern
 */

import { useState, useCallback, useMemo } from "react";
import { useResolvePrice } from "@/hooks/products";
import { useCustomers } from "@/hooks/customers";
import { PricingEngineView } from "./pricing-engine-view";

// ============================================================================
// TYPES
// ============================================================================

export interface PricingEngineContainerProps {
  productId: string;
  sku: string;
  name: string;
  basePrice: number;
  costPrice: number | null;
  onPriceUpdate?: (newPrice: number) => void;
}

// ============================================================================
// CONTAINER
// ============================================================================

export function PricingEngineContainer({
  productId,
  sku,
  name,
  basePrice,
  costPrice,
  onPriceUpdate,
}: PricingEngineContainerProps) {
  const [calcParams, setCalcParams] = useState<{ quantity: number; customerId?: string } | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");

  // Fetch customers for combobox
  const { data: customersData } = useCustomers({
    search: customerSearch || undefined,
    status: "active",
    pageSize: 20,
  });

  // Use price resolution hook (only enabled when params are set)
  const { data: priceResult, isLoading: isCalculating } = useResolvePrice({
    productId,
    quantity: calcParams?.quantity ?? 1,
    customerId: calcParams?.customerId,
    enabled: !!calcParams,
  });

  // Map customers to combobox options (memoized to prevent unnecessary re-renders)
  const customerOptions = useMemo(
    () =>
      (customersData?.items ?? []).map((c) => ({
        value: c.id,
        label: `${c.name}${c.email ? ` (${c.email})` : ""}`,
      })),
    [customersData?.items]
  );

  // Handle customer search change
  const handleCustomerSearchChange = useCallback((search: string) => {
    setCustomerSearch(search);
  }, []);

  // Handle calculate price
  const handleCalculate = useCallback((quantity: number, customerId?: string) => {
    setCalcParams({
      quantity,
      customerId,
    });
  }, []);

  // Transform price result for presenter
  const calcResult = priceResult
    ? {
        finalPrice: priceResult.finalPrice,
        discount: priceResult.discount,
        discountPercent: priceResult.discountPercent,
        source: priceResult.source,
      }
    : null;

  return (
    <PricingEngineView
      productId={productId}
      sku={sku}
      name={name}
      basePrice={basePrice}
      costPrice={costPrice}
      onPriceUpdate={onPriceUpdate}
      customerOptions={customerOptions}
      onCustomerSearchChange={handleCustomerSearchChange}
      onCalculate={handleCalculate}
      calcResult={calcResult}
      isCalculating={isCalculating}
    />
  );
}
