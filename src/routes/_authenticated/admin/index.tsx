/**
 * Admin Index Route
 *
 * Route definition for admin landing page with lazy-loaded component.
 *
 * Landing page for the Admin domain. Provides navigation to administrative features:
 * - User Management
 * - Groups
 * - Invitations
 * - Activities
 * - Audit Log
 *
 * @performance Code-split for reduced initial bundle size
 * @see src/routes/_authenticated/admin/admin-page.tsx - Page component
 */
import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { requireAdmin } from '@/lib/auth/route-guards';

const AdminPage = lazy(() => import('./admin-page'));

export const Route = createFileRoute('/_authenticated/admin/')({
  beforeLoad: requireAdmin,
  component: () => (
    <Suspense fallback={
      <PageLayout variant="full-width">
        <PageLayout.Header
          title="Admin"
          description="User management, groups, and system administration"
        />
        <PageLayout.Content>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </PageLayout.Content>
      </PageLayout>
    }>
      <AdminPage />
    </Suspense>
  ),
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/" />
  ),
});
