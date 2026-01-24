/**
 * Purchase Order Creation Route
 *
 * Placeholder for PO creation - to be implemented in later story.
 */

import { createFileRoute } from '@tanstack/react-router';
import { ArrowLeft, Construction } from 'lucide-react';
import { PageLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute('/_authenticated/purchase-orders/create')({
  component: PurchaseOrderCreatePage,
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function PurchaseOrderCreatePage() {
  const navigate = Route.useNavigate();

  return (
    <PageLayout>
      <PageLayout.Header
        title="Create Purchase Order"
        description="Create a new purchase order for a supplier"
        actions={
          <Button variant="outline" onClick={() => navigate({ to: '/purchase-orders' })}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        }
      />
      <PageLayout.Content>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Construction className="text-muted-foreground mb-4 h-12 w-12" />
            <h3 className="mb-2 text-lg font-semibold">Coming Soon</h3>
            <p className="text-muted-foreground text-sm">
              The purchase order creation wizard will be implemented in a future story.
            </p>
          </CardContent>
        </Card>
      </PageLayout.Content>
    </PageLayout>
  );
}
