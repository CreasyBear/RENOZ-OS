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

import { useCustomer } from '@/hooks/customers';
import { useProducts } from '@/hooks/products';
import { useCreateQuoteVersion } from '@/hooks/pipeline';
import { customerSchema } from '@/lib/schemas/customers';
import type { Customer } from '@/lib/schemas/customers';
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

  const { data: customerData } = useCustomer({
    id: customerId ?? '',
    enabled: !!customerId,
  });

  const {
    data: productsData,
    isLoading: productsLoading,
  } = useProducts({ status: 'active', pageSize: 100 });

  // ===========================================================================
  // MUTATIONS (Container responsibility via centralized hooks)
  // ===========================================================================

  const createMutation = useCreateQuoteVersion();

  // Resolve selectedCustomer for entity linking prefill
  const selectedCustomer: Customer | null =
    customerId && customerData && customerSchema.safeParse(customerData).success
      ? (customerSchema.parse(customerData) as Customer)
      : null;

  const products = productsData?.products ?? [];

  return (
    <QuickQuoteFormPresenter
      opportunityId={opportunityId}
      customerId={customerId}
      initialSelectedCustomer={selectedCustomer}
      products={products}
      isLoading={productsLoading}
      createMutation={createMutation}
      onSuccess={onSuccess}
      onCancel={onCancel}
      className={className}
    />
  );
}

export default QuickQuoteFormContainer;
