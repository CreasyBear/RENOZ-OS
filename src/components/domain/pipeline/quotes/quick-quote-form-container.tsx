/**
 * QuickQuoteForm Container
 *
 * Container responsibilities:
 * - Fetches customers via useCustomers hook
 * - Fetches products via useProducts hook
 * - Provides createQuoteVersion mutation
 * - Passes data to presenter
 *
 * @see ./quick-quote-form.tsx (presenter)
 * @see src/hooks/customers/use-customers.ts (hooks)
 * @see src/hooks/products/use-products.ts (hooks)
 * @see src/hooks/pipeline/use-quote-mutations.ts (mutations)
 */

import { useCustomers } from '@/hooks/customers';
import { useProducts } from '@/hooks/products';
import { useCreateQuoteVersion } from '@/hooks/pipeline';
import { QuickQuoteFormPresenter } from './quick-quote-form';
import type { QuickQuoteFormContainerProps } from './quick-quote-form';

export function QuickQuoteFormContainer({
  opportunityId,
  customerId,
  onSuccess,
  onCancel,
  className,
}: QuickQuoteFormContainerProps) {
  // ===========================================================================
  // DATA FETCHING (Container responsibility via centralized hooks)
  // ===========================================================================

  const {
    data: customersData,
    isLoading: customersLoading,
  } = useCustomers({ pageSize: 100 });

  const {
    data: productsData,
    isLoading: productsLoading,
  } = useProducts({ status: 'active', pageSize: 100 });

  // ===========================================================================
  // MUTATIONS (Container responsibility via centralized hooks)
  // ===========================================================================

  const createMutation = useCreateQuoteVersion();

  // Combined loading state
  const isLoading = customersLoading || productsLoading;

  // Extract data
  const customers = customersData?.items ?? [];
  const products = productsData?.products ?? [];

  return (
    <QuickQuoteFormPresenter
      opportunityId={opportunityId}
      customerId={customerId}
      customers={customers}
      products={products}
      isLoading={isLoading}
      createMutation={createMutation}
      onSuccess={onSuccess}
      onCancel={onCancel}
      className={className}
    />
  );
}

export default QuickQuoteFormContainer;
