/**
 * ProductSearchInterface Component
 *
 * Container component that fetches data and passes to presenter.
 * Implements Container/Presenter pattern per STANDARDS.md.
 *
 * @see STANDARDS.md - Container/Presenter pattern
 */

import { ProductSearchInterfaceContainer } from "./search-interface-container";
import type { SearchFilters } from "./search-interface-container";

interface ProductSearchInterfaceProps {
  onSearch?: (query: string, filters: SearchFilters) => void;
  onProductSelect?: (productId: string) => void;
  initialQuery?: string;
  showFilters?: boolean;
  placeholder?: string;
}

export function ProductSearchInterface(props: ProductSearchInterfaceProps) {
  return <ProductSearchInterfaceContainer {...props} />;
}

// Legacy export - keep for backward compatibility
export { ProductSearchInterfaceContainer };
export type { SearchFilters };
