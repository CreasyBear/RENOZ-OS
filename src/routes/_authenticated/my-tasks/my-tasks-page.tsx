/**
 * My Tasks Page Component
 *
 * Two views for task management:
 * - **Schedule View** (default): Daily site visits with check-in/out
 * - **Kanban View**: Cross-project tasks by status
 *
 * @source visits from useSiteVisitsByInstaller hook
 * @source checkIn from useCheckIn hook
 * @source checkOut from useCheckOut hook
 * @source user from useAuth hook
 * @source schemas from @/lib/schemas/jobs
 * @source server from @/server/functions/jobs/site-visits.ts
 *
 * @see src/routes/_authenticated/my-tasks/index.tsx - Route definition
 * @see docs/design-system/PROJECTS-DOMAIN-PHILOSOPHY.md Part 8.2
 */

import { useNavigate } from '@tanstack/react-router';
import { useCallback, memo, useRef, useEffect } from 'react';
import { Calendar, Kanban } from 'lucide-react';
import { PageLayout } from '@/components/layout';
import { TechnicianDashboard } from '@/components/domain/jobs';
import { MyTasksKanban } from '@/components/domain/jobs/my-tasks';
import { KanbanErrorBoundary } from '@/components/shared/kanban';
import { useSiteVisitsByInstaller, useCheckIn, useCheckOut } from '@/hooks/jobs';
import { useAuth } from '@/lib/auth/hooks';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { normalizeError, getUserFriendlyMessage, isRetryableError } from '@/lib/error-handling';
import { logger } from '@/lib/logger';
import type { SiteVisit } from '@/lib/schemas/jobs';

// View mode type - inferred from search schema
type ViewMode = 'schedule' | 'kanban';

// Extended visit type with project info - using SiteVisit directly
type TechnicianVisit = SiteVisit & {
  projectTitle: string;
  projectNumber: string;
};

// View descriptions - extracted to constants per audit recommendations
const VIEW_DESCRIPTIONS: Record<ViewMode, string> = {
  schedule: 'Your daily work schedule and site visits',
  kanban: 'All your assigned tasks across projects',
} as const;

interface MyTasksPageProps {
  initialView: ViewMode;
  projectId?: string;
}

// View Toggle Component
interface ViewToggleProps {
  value: ViewMode;
  onChange: (view: ViewMode) => void;
}

const ViewToggle = memo(function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg border bg-muted p-1">
      <Button
        variant={value === 'schedule' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => onChange('schedule')}
        className={cn(
          'gap-2',
          value === 'schedule' && 'bg-background shadow-sm'
        )}
      >
        <Calendar className="h-4 w-4" />
        Schedule
      </Button>
      <Button
        variant={value === 'kanban' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => onChange('kanban')}
        className={cn(
          'gap-2',
          value === 'kanban' && 'bg-background shadow-sm'
        )}
      >
        <Kanban className="h-4 w-4" />
        Kanban
      </Button>
    </div>
  );
});

export default function MyTasksPage({ initialView, projectId }: MyTasksPageProps) {
  const navigate = useNavigate();
  const { user, isLoading: isAuthLoading } = useAuth();

  // View mode from props (synced with URL search params)
  const viewMode = initialView;

  // Handle view change - update URL
  const handleViewChange = useCallback(
    (newView: ViewMode) => {
      navigate({
        to: '/my-tasks',
        search: { view: newView, projectId },
        replace: true,
      });
    },
    [navigate, projectId]
  );

  // Data fetching for schedule view
  const { data, isLoading: isDataLoading } = useSiteVisitsByInstaller(
    user?.id || '',
    !!user?.id && viewMode === 'schedule'
  );
  const isLoading = isAuthLoading || isDataLoading;
  const visits = (data as { items: TechnicianVisit[] } | undefined)?.items ?? [];

  // Mutations for schedule view
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();

  // Handlers for schedule view
  const handleVisitClick = useCallback(
    (projectIdParam: string, visitId: string) => {
      navigate({
        to: '/projects/$projectId/visits/$visitId',
        params: { projectId: projectIdParam, visitId },
      });
    },
    [navigate]
  );

  const handleCheckIn = useCallback(
    async (visitId: string, retries = 3) => {
      try {
        await checkIn.mutateAsync({ siteVisitId: visitId });
        toast.success('Checked in successfully');
      } catch (error) {
        const normalizedError = normalizeError(error, {
          component: 'MyTasksPage',
          action: 'check in',
          metadata: { visitId, userId: user?.id },
        });
        logger.error('Failed to check in', normalizedError, {
          domain: 'jobs',
          visitId,
          userId: user?.id,
        });

        // Retry logic with exponential backoff (use ref to avoid "accessed before declared")
        if (retries > 0 && isRetryableError(normalizedError)) {
          const delayMs = Math.pow(2, 4 - retries) * 1000; // 1s, 2s, 4s
          setTimeout(() => {
            handleCheckInRef.current?.(visitId, retries - 1);
          }, delayMs);
          return;
        }

        const userMessage = getUserFriendlyMessage(normalizedError);
        toast.error(userMessage, {
          action: {
            label: 'Retry',
            onClick: () => handleCheckInRef.current?.(visitId, 3),
          },
        });
      }
    },
    [checkIn, user?.id]
  );

  const handleCheckInRef = useRef(handleCheckIn);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- ref.current for recursive retry callback
    handleCheckInRef.current = handleCheckIn;
  }, [handleCheckIn]);

  const handleCheckOut = useCallback(
    async (visitId: string, retries = 3) => {
      try {
        await checkOut.mutateAsync({ siteVisitId: visitId });
        toast.success('Checked out successfully');
      } catch (error) {
        const normalizedError = normalizeError(error, {
          component: 'MyTasksPage',
          action: 'check out',
          metadata: { visitId, userId: user?.id },
        });
        logger.error('Failed to check out', normalizedError, {
          domain: 'jobs',
          visitId,
          userId: user?.id,
        });

        // Retry logic with exponential backoff (use ref to avoid "accessed before declared")
        if (retries > 0 && isRetryableError(normalizedError)) {
          const delayMs = Math.pow(2, 4 - retries) * 1000; // 1s, 2s, 4s
          setTimeout(() => {
            handleCheckOutRef.current?.(visitId, retries - 1);
          }, delayMs);
          return;
        }

        const userMessage = getUserFriendlyMessage(normalizedError);
        toast.error(userMessage, {
          action: {
            label: 'Retry',
            onClick: () => handleCheckOutRef.current?.(visitId, 3),
          },
        });
      }
    },
    [checkOut, user?.id]
  );

  const handleCheckOutRef = useRef(handleCheckOut);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- ref.current for recursive retry callback
    handleCheckOutRef.current = handleCheckOut;
  }, [handleCheckOut]);

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="My Tasks"
        description={VIEW_DESCRIPTIONS[viewMode]}
        actions={<ViewToggle value={viewMode} onChange={handleViewChange} />}
      />

      <PageLayout.Content>
        {viewMode === 'schedule' ? (
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
        ) : (
          <KanbanErrorBoundary
            title="Failed to load tasks"
            description="We encountered an error loading your tasks. Please try again."
          >
            <MyTasksKanban projectId={projectId} />
          </KanbanErrorBoundary>
        )}
      </PageLayout.Content>
    </PageLayout>
  );
}
