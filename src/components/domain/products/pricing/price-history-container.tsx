/**
 * PriceHistory Container
 *
 * Handles data fetching for price history.
 * Implements Container/Presenter pattern per STANDARDS.md.
 *
 * @source history from usePriceHistory hook
 *
 * @see STANDARDS.md - Container/Presenter pattern
 */

import { useState } from "react";
import { usePriceHistory } from "@/hooks/products";
import { PriceHistoryView } from "./price-history-view";

// ============================================================================
// TYPES
// ============================================================================

export interface PriceHistoryContainerProps {
  productId: string;
}

// ============================================================================
// CONTAINER
// ============================================================================

export function PriceHistoryContainer({ productId }: PriceHistoryContainerProps) {
  const [page, setPage] = useState(0);
  const pageSize = 10;

  // Fetch price history data
  const { data, isLoading } = usePriceHistory({
    productId,
    limit: pageSize,
    offset: page * pageSize,
  });

  const history = data?.history ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <PriceHistoryView
      history={history}
      isLoading={isLoading}
      page={page}
      totalPages={totalPages}
      total={total}
      pageSize={pageSize}
      onPageChange={setPage}
    />
  );
}
