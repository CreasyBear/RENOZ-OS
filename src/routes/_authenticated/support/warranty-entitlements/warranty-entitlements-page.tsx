/**
 * Warranty Entitlements Page
 *
 * Displays the entitlement activation queue with URL-backed filters.
 *
 * @source entitlement queue from WarrantyEntitlementsListContainer
 *
 * @see src/routes/_authenticated/support/warranty-entitlements/index.tsx - Route definition
 */
import { useNavigate } from '@tanstack/react-router';
import { PackageCheck } from 'lucide-react';
import { PageLayout } from '@/components/layout';
import { WarrantyEntitlementsListContainer } from '@/components/domain/warranty';
import type { SearchParams } from './index';

interface WarrantyEntitlementsPageProps {
  search: SearchParams;
}

export default function WarrantyEntitlementsPage({
  search,
}: WarrantyEntitlementsPageProps) {
  const navigate = useNavigate();

  const updateSearch = (updates: Partial<SearchParams>) => {
    navigate({
      to: '/support/warranty-entitlements',
      search: {
        ...search,
        ...updates,
      },
    });
  };

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title={
          <div className="flex items-center gap-2">
            <PackageCheck className="size-6" />
            Warranty Entitlements
          </div>
        }
        description="Delivered coverage records waiting to become owned warranties."
      />
      <PageLayout.Content>
        <WarrantyEntitlementsListContainer
          search={search}
          onSearchChange={updateSearch}
        />
      </PageLayout.Content>
    </PageLayout>
  );
}
