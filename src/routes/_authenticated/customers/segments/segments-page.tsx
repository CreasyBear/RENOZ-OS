/**
 * Customer Segments Page Component
 *
 * Manages customer segments with list view and analytics.
 * Uses container/presenter pattern per STANDARDS.md.
 *
 * @see STANDARDS.md - Container/Presenter pattern
 * @see src/components/domain/customers/containers/segments-container.tsx
 */
import { Link, useSearch } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { PageLayout } from '@/components/layout';
import { buttonVariants } from '@/components/ui/button';
import { SegmentsContainer } from '@/components/domain/customers/containers';

export default function SegmentsPage() {
  const search = useSearch({ from: '/_authenticated/customers/segments/' });

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Customer Segments"
        description="Create and manage customer segments for targeted actions"
        actions={
          <Link
            to="/customers"
            className={buttonVariants({ variant: 'outline' })}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        }
      />
      <PageLayout.Content>
        <SegmentsContainer initialTab={search.tab} />
      </PageLayout.Content>
    </PageLayout>
  );
}
