/**
 * My Tasks Route
 *
 * Technician task execution view showing:
 * - Today's site visits
 * - Upcoming visits
 * - Task checklist for each visit
 * - Quick check-in/out actions
 *
 * SPRINT-03: Enhanced route using TechnicianDashboard
 *
 * @see STANDARDS.md for route patterns
 */

import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useCallback } from 'react';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { TechnicianDashboard } from '@/components/domain/jobs';
import { useSiteVisitsByInstaller, useCheckIn, useCheckOut } from '@/hooks/jobs';
import { useAuth } from '@/lib/auth/hooks';
import { toast } from '@/lib/toast';
import type { SiteVisit } from 'drizzle/schema';

// Extended visit type with project info
interface TechnicianVisit extends SiteVisit {
  projectTitle: string;
  projectNumber: string;
}

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute('/_authenticated/my-tasks/')({
  component: MyTasksPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/" />
  ),
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function MyTasksPage() {
  const navigate = useNavigate();
  const { user, isLoading: isAuthLoading } = useAuth();

  // Data fetching
  const { data, isLoading: isDataLoading } = useSiteVisitsByInstaller(
    user?.id || '',
    !!user?.id
  );
  const isLoading = isAuthLoading || isDataLoading;
  const visits = (data as { items: TechnicianVisit[] } | undefined)?.items ?? [];

  // Mutations
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();

  // Handlers
  const handleVisitClick = useCallback(
    (projectId: string, visitId: string) => {
      navigate({
        to: '/projects/$projectId/visits/$visitId',
        params: { projectId, visitId },
      });
    },
    [navigate]
  );

  const handleCheckIn = useCallback(
    async (visitId: string) => {
      try {
        await checkIn.mutateAsync({ siteVisitId: visitId });
        toast.success('Checked in successfully');
      } catch {
        toast.error('Failed to check in');
      }
    },
    [checkIn]
  );

  const handleCheckOut = useCallback(
    async (visitId: string) => {
      try {
        await checkOut.mutateAsync({ siteVisitId: visitId });
        toast.success('Checked out successfully');
      } catch {
        toast.error('Failed to check out');
      }
    },
    [checkOut]
  );

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="My Tasks"
        description="Your daily work schedule and assignments"
      />

      <PageLayout.Content>
        <TechnicianDashboard
          visits={visits}
          isLoading={isLoading}
          onVisitClick={handleVisitClick}
          onCheckIn={handleCheckIn}
          onCheckOut={handleCheckOut}
          checkingIn={checkIn.isPending}
          checkingOut={checkOut.isPending}
          installerName={user?.user_metadata?.name || user?.email || 'Technician'}
        />
      </PageLayout.Content>
    </PageLayout>
  );
}
