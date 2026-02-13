/**
 * My Tasks Index Route
 *
 * Route definition for task management with lazy-loaded component.
 * Two views: Schedule (daily site visits) and Kanban (cross-project tasks).
 *
 * @performance Code-split for reduced initial bundle size
 * @see src/routes/_authenticated/my-tasks/my-tasks-page.tsx - Page component
 * @see docs/design-system/PROJECTS-DOMAIN-PHILOSOPHY.md Part 8.2
 */

import { createFileRoute, redirect } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import { z } from 'zod'
import { RouteErrorFallback, PageLayout } from '@/components/layout'
import { Skeleton } from '@/components/ui/skeleton'
import { PERMISSIONS, hasPermission, type Role } from '@/lib/auth/permissions'

const searchSchema = z.object({
  view: z.enum(['schedule', 'kanban']).optional().default('schedule'),
  projectId: z.string().uuid().optional(),
})

const MyTasksPage = lazy(() => import('./my-tasks-page'))

export const Route = createFileRoute('/_authenticated/my-tasks/')({
  validateSearch: searchSchema,
  beforeLoad: async ({ context }) => {
    // Reuse parent _authenticated context to avoid extra auth/db calls.
    const role = 'appUser' in context ? context.appUser?.role : undefined
    if (!role) {
      throw redirect({ to: '/login', search: { redirect: undefined } })
    }
    if (!hasPermission(role as Role, PERMISSIONS.job.read)) {
      throw redirect({ to: '/dashboard', search: { tab: 'overview' } })
    }
  },
  component: MyTasksRouteComponent,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/" />
  ),
})

function MyTasksRouteComponent() {
  const { view, projectId } = Route.useSearch()

  return (
    <Suspense fallback={
      <PageLayout variant="full-width">
        <PageLayout.Header title="My Tasks" />
        <PageLayout.Content>
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-64 w-full" />
          </div>
        </PageLayout.Content>
      </PageLayout>
    }>
      <MyTasksPage initialView={view} projectId={projectId} />
    </Suspense>
  )
}
