/**
 * Customers Page Component
 *
 * Main customer directory page with advanced search, filtering, and management.
 * Uses CustomersListContainer for all domain data fetching and management.
 *
 * @source filters from useTransformedFilterUrlState hook
 * @source tags from useCustomerTags hook (supporting data)
 *
 * @see src/routes/_authenticated/customers/index.tsx - Route definition
 * @see src/components/domain/customers/customers-list-container.tsx - Container component
 */
import { useNavigate } from '@tanstack/react-router';
import { useCallback } from 'react';
import { Plus } from 'lucide-react';
import { PageLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { useCustomerTags } from '@/hooks/customers';
import {
  CustomersListContainer,
  DEFAULT_CUSTOMER_FILTERS,
} from '@/components/domain/customers';
import {
  useTransformedFilterUrlState,
} from '@/hooks/filters/use-filter-url-state';
import { fromUrlParams, toUrlParams } from '@/lib/utils/customer-filters';
import type { SearchParams } from './index';

interface CustomersPageProps {
  search: SearchParams;
}

export default function CustomersPage({ search }: CustomersPageProps) {
  const navigate = useNavigate();

  // URL-synced filter state with transformations
  const { filters, setFilters } = useTransformedFilterUrlState({
    currentSearch: search,
    navigate,
    defaults: DEFAULT_CUSTOMER_FILTERS,
    fromUrlParams,
    toUrlParams,
    resetPageOnChange: ['search', 'status', 'type', 'size', 'healthScoreRange', 'tags'],
  });

  // Fetch available tags (supporting data for filters)
  const { data: tagsData } = useCustomerTags();

  // Transform tags for the filter component
  const availableTags = (tagsData || []).map((tag) => ({
    id: tag.id,
    name: tag.name,
    color: tag.color,
  }));

  const handleCreateCustomer = useCallback(() => {
    navigate({ to: '/customers/new' });
  }, [navigate]);

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Customers"
        description="Manage your customer relationships and track interactions"
        actions={
          <Button onClick={handleCreateCustomer}>
            <Plus className="mr-2 h-4 w-4" />
            Add Customer
          </Button>
        }
      />
      <PageLayout.Content>
        {/* Primary View (Customer List) */}
        <CustomersListContainer
          filters={filters}
          onFiltersChange={setFilters}
          availableTags={availableTags}
        />
      </PageLayout.Content>
    </PageLayout>
  );
}
