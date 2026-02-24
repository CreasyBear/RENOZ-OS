/**
 * Edit Supplier Route
 *
 * Thin route container that delegates to SupplierEditContainer.
 * Following container/presenter pattern from STANDARDS.md.
 *
 * @see STANDARDS.md - Container/Presenter Pattern
 */

import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { SupplierEditContainer } from '@/components/domain/suppliers';

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute('/_authenticated/suppliers/$supplierId_/edit')({
  component: EditSupplierPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/suppliers" />
  ),
});

// ============================================================================
// ROUTE COMPONENT (Thin Container)
// ============================================================================

function EditSupplierPage() {
  const navigate = useNavigate();
  const { supplierId } = Route.useParams();

  const handleBack = () => {
    navigate({ to: '/suppliers/$supplierId', params: { supplierId } });
  };

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Edit Supplier"
        description="Update supplier information"
        actions={
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        }
      />

      <PageLayout.Content>
        <SupplierEditContainer supplierId={supplierId} />
      </PageLayout.Content>
    </PageLayout>
  );
}
