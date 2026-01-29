/**
 * Create Supplier Route
 *
 * Thin route container that delegates to SupplierCreateContainer.
 * Following container/presenter pattern from STANDARDS.md.
 *
 * @see STANDARDS.md - Container/Presenter Pattern
 */

import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { SupplierCreateContainer } from '@/components/domain/suppliers';

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute('/_authenticated/suppliers/create')({
  component: CreateSupplierPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/suppliers" />
  ),
});

// ============================================================================
// ROUTE COMPONENT (Thin Container)
// ============================================================================

function CreateSupplierPage() {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate({ to: '/suppliers' });
  };

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Create Supplier"
        description="Add a new supplier to your directory"
        actions={
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        }
      />

      <PageLayout.Content>
        <SupplierCreateContainer />
      </PageLayout.Content>
    </PageLayout>
  );
}
