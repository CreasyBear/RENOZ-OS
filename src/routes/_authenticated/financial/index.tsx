/**
 * Financial Index Route (Landing Page)
 *
 * Landing page for Financial domain following DOMAIN-LANDING-STANDARDS.md.
 * Implements 4-zone layout: Header, Command Bar, Triage, Navigation Grid.
 *
 * @performance Code-split for reduced initial bundle size
 * @see src/routes/_authenticated/financial/financial-landing-page.tsx - Page component
 * @see docs/design-system/DOMAIN-LANDING-STANDARDS.md
 */

import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { RouteErrorFallback, PageLayout } from '@/components/layout';
import { Skeleton } from '@/components/ui/skeleton';

const FinancialLandingPage = lazy(() => import('./financial-landing-page'));

export const Route = createFileRoute('/_authenticated/financial/')({
  component: () => (
    <Suspense
      fallback={
        <PageLayout variant="full-width">
          <PageLayout.Header
            title="Financial"
            description="Accounts receivable, revenue recognition, and payment management"
          />
          <PageLayout.Content>
            <div className="space-y-8">
              <div className="space-y-4">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-24 w-full" />
              </div>
              <div className="space-y-4">
                <Skeleton className="h-6 w-48" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} className="h-32 w-full" />
                  ))}
                </div>
              </div>
            </div>
          </PageLayout.Content>
        </PageLayout>
      }
    >
      <FinancialLandingPage />
    </Suspense>
  ),
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Financial"
        description="Accounts receivable, revenue recognition, and payment management"
      />
      <PageLayout.Content>
        <div className="space-y-8">
          <div className="space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-24 w-full" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-6 w-48" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          </div>
        </div>
      </PageLayout.Content>
    </PageLayout>
  ),
});
