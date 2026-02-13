/**
 * PriceHistory Component
 *
 * Container component that fetches data and passes to presenter.
 * Implements Container/Presenter pattern per STANDARDS.md.
 *
 * @see STANDARDS.md - Container/Presenter pattern
 */

import { PriceHistoryContainer } from "./price-history-container";

interface PriceHistoryProps {
  productId: string;
}

export function PriceHistory({ productId }: PriceHistoryProps) {
  return <PriceHistoryContainer productId={productId} />;
}

// Legacy export - keep for backward compatibility
export { PriceHistoryContainer };
