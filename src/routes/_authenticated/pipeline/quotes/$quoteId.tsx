/**
 * Quote Detail Route
 *
 * Standalone quote view page with line items, totals, and actions.
 * Uses QuoteDetailContainer following the gold standard container/presenter pattern.
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 * @see src/components/domain/pipeline/quotes/containers/quote-detail-container.tsx
 */
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { QuoteDetailContainer } from '@/components/domain/pipeline/quotes';
import { cn } from '@/lib/utils';

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute('/_authenticated/pipeline/quotes/$quoteId')({
  component: QuoteDetailPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/pipeline" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header title="Loading Quote..." />
      <PageLayout.Content>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-6 w-20" />
          </div>
          <Skeleton className="h-6 w-96" />
          <Skeleton className="h-[500px] w-full" />
        </div>
      </PageLayout.Content>
    </PageLayout>
  ),
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function QuoteDetailPage() {
  const navigate = useNavigate();
  const { quoteId } = Route.useParams();

  const handleBack = () => {
    navigate({ to: '/pipeline' });
  };

  const handleEdit = () => {
    // Navigate to opportunity for editing (quotes are edited through opportunity)
    // The container will handle this based on the opportunity context
    navigate({ to: '/pipeline' });
  };

  return (
    <QuoteDetailContainer
      quoteVersionId={quoteId}
      onBack={handleBack}
      onEdit={handleEdit}
    >
      {({ headerTitle, headerActions, content }) => (
        <PageLayout variant="full-width">
          <PageLayout.Header
            title={headerTitle}
            actions={
              <div className="flex items-center gap-2">
                <Link
                  to="/pipeline"
                  className={cn(buttonVariants({ variant: 'outline' }))}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Pipeline
                </Link>
                {headerActions}
              </div>
            }
          />
          <PageLayout.Content className="p-0">
            {content}
          </PageLayout.Content>
        </PageLayout>
      )}
    </QuoteDetailContainer>
  );
}
