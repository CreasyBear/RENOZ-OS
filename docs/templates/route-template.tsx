/**
 * Route Template
 *
 * Copy this template when creating a new authenticated route.
 * Replace placeholders:
 * - DOMAIN_NAME → your domain (e.g., "customers", "orders")
 * - DomainPage → your component name (e.g., "CustomersPage")
 * - DomainSkeleton → appropriate skeleton component
 *
 * See docs/ui-patterns.md for variant selection and patterns.
 */
import { createFileRoute } from '@tanstack/react-router';
import { RouteErrorFallback, PageLayout } from '@/components/layout';
import { AdminTableSkeleton } from '@/components/skeletons/admin';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute('/_authenticated/DOMAIN_NAME/')({
  component: DomainPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/DOMAIN_NAME" />
  ),
  pendingComponent: () => <AdminTableSkeleton />,
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function DomainPage() {
  const navigate = Route.useNavigate();

  // TODO: Replace with your data hook
  // const { data, isLoading } = useDomainData();

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Domain Name"
        description="Brief description of this page"
        actions={
          <Button onClick={() => navigate({ to: '/DOMAIN_NAME/create' })}>
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        }
      />
      <PageLayout.Content>
        {/* TODO: Add your main content here */}
        <div className="text-muted-foreground text-center py-12">
          Replace with DataTable or other content
        </div>
      </PageLayout.Content>
    </PageLayout>
  );
}

// ============================================================================
// DETAIL PAGE TEMPLATE (with context panel)
// ============================================================================

/*
function DomainDetailPage() {
  const { id } = Route.useParams();

  // TODO: Replace with your data hook
  // const { data, isLoading } = useDomainItem(id);

  return (
    <PageLayout variant="with-panel">
      <PageLayout.Header
        title="Item Details"
        description="View and edit item information"
      />
      <PageLayout.Content>
        <div>Main content area</div>
      </PageLayout.Content>
      <PageLayout.Sidebar>
        <div>Context panel (activity, related items)</div>
      </PageLayout.Sidebar>
    </PageLayout>
  );
}
*/
