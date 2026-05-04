import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockListJobTasks = vi.fn();
const mockGetTask = vi.fn();
const mockGetProjectTasks = vi.fn();
const mockGetActivityFeed = vi.fn();

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: vi.fn() };
  },
}));

vi.mock('@tanstack/react-start', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-start')>('@tanstack/react-start');
  return { ...actual, useServerFn: (fn: unknown) => fn };
});

vi.mock('@/server/functions/jobs/job-tasks', () => ({
  listJobTasks: (...args: unknown[]) => mockListJobTasks(...args),
  getTask: (...args: unknown[]) => mockGetTask(...args),
  getProjectTasks: (...args: unknown[]) => mockGetProjectTasks(...args),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  reorderTasks: vi.fn(),
}));

vi.mock('@/server/functions/jobs/job-tasks-kanban', () => ({
  listJobTasksForKanban: vi.fn().mockResolvedValue({ tasks: [], total: 0 }),
  getMyTasksForKanban: vi.fn().mockResolvedValue({ tasks: [], total: 0 }),
}));

vi.mock('@/server/functions/activities/activities', () => ({
  getActivityFeed: (...args: unknown[]) => mockGetActivityFeed(...args),
  getEntityActivities: vi.fn().mockResolvedValue({ items: [], hasNextPage: false, nextCursor: null }),
  getUserActivities: vi.fn().mockResolvedValue({ items: [], hasNextPage: false, nextCursor: null }),
  getActivityStats: vi.fn().mockResolvedValue([]),
  getActivityLeaderboard: vi.fn().mockResolvedValue([]),
  getActivity: vi.fn(),
  logEntityActivity: vi.fn(),
  requestActivityExport: vi.fn(),
}));

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'Wave6DWrapper';
  return Wrapper;
}

describe('wave 6d tasks/activity normalization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListJobTasks.mockResolvedValue({ tasks: [] });
    mockGetTask.mockResolvedValue({ task: { id: 'task-1', title: 'Install inverter' } });
    mockGetProjectTasks.mockResolvedValue({ tasks: [] });
    mockGetActivityFeed.mockResolvedValue({ items: [], hasNextPage: false, nextCursor: null });
  });

  it('treats task and activity collections as healthy shaped empty success', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useJobTasks } = await import('@/hooks/jobs/use-job-tasks');
    const { useProjectTasks } = await import('@/hooks/jobs/use-project-tasks');
    const { useActivityFeed } = await import('@/hooks/activities/use-activities');

    const jobTasks = renderHook(() => useJobTasks({ jobId: 'job-1' }), {
      wrapper: createWrapper(queryClient),
    });
    const projectTasks = renderHook(() => useProjectTasks({ projectId: 'project-1' }), {
      wrapper: createWrapper(queryClient),
    });
    const activityFeed = renderHook(() => useActivityFeed(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(jobTasks.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(projectTasks.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(activityFeed.result.current.isSuccess).toBe(true));

    expect(jobTasks.result.current.data).toEqual([]);
    expect(projectTasks.result.current.data).toEqual([]);
    expect(activityFeed.result.current.data?.pages[0]?.items ?? []).toEqual([]);
  });

  it('preserves not-found semantics for task detail reads', async () => {
    mockGetTask.mockRejectedValueOnce({
      message: 'Task not found',
      code: 'NOT_FOUND',
      statusCode: 404,
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useJobTask } = await import('@/hooks/jobs/use-job-tasks');

    const task = renderHook(() => useJobTask({ taskId: 'missing-task' }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(task.result.current.error).toBeTruthy());
    expect(task.result.current.error).toMatchObject({
      failureKind: 'not-found',
      contractType: 'detail-not-found',
      message: 'The requested task could not be found.',
    });
  });

  it('shows degraded copy in the project tasks tab when stale tasks remain visible', async () => {
    vi.resetModules();

    vi.doMock('@/hooks/jobs', () => ({
      useProjectTasks: () => ({
        data: [
          {
            id: 'task-1',
            title: 'Install inverter',
            status: 'pending',
            priority: 'normal',
            siteVisitId: 'visit-1',
            assigneeId: null,
          },
        ],
        error: new Error('Project tasks are temporarily unavailable. Please refresh and try again.'),
        isLoading: false,
        refetch: vi.fn(),
      }),
      useDeleteProjectTask: () => ({ mutateAsync: vi.fn() }),
      useCreateTask: () => ({ mutateAsync: vi.fn() }),
      useUpdateProjectTaskStatus: () => ({ mutateAsync: vi.fn() }),
      useWorkstreams: () => ({ data: [] }),
      useJobTemplates: () => ({ data: { templates: [] } }),
      useReorderTasks: () => ({ mutateAsync: vi.fn() }),
      useSiteVisitsByProject: () => ({ data: { items: [] } }),
    }));
    vi.doMock('@/hooks/users', () => ({
      useUserLookup: () => ({ getUser: vi.fn(), currentUserId: 'user-1' }),
    }));
    vi.doMock('@/hooks', () => ({
      toastError: vi.fn(),
      toastSuccess: vi.fn(),
    }));
    vi.doMock('@tanstack/react-router', () => ({
      Link: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
      useNavigate: () => vi.fn(),
      useSearch: () => ({}),
    }));
    vi.doMock('@/components/domain/jobs/projects/project-tasks-board', () => ({
      ProjectTasksBoard: () => <div>task board</div>,
    }));
    vi.doMock('@/components/domain/jobs/projects/task-dialogs', () => ({
      TaskCreateDialog: () => null,
      TaskEditDialog: () => null,
    }));

    const { ProjectTasksTab } = await import('@/components/domain/jobs/projects/project-tasks-tab');

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <ProjectTasksTab projectId="project-1" onCompleteProjectClick={vi.fn()} />
      </QueryClientProvider>
    );

    expect(screen.getByText('Showing cached tasks')).toBeInTheDocument();
  });
});
