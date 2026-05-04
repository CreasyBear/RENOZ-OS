import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockListJobAssignments = vi.fn();
const mockGetJobAssignment = vi.fn();
const mockGetProjects = vi.fn();
const mockGetProjectsCursor = vi.fn();
const mockGetProject = vi.fn();

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: vi.fn() };
  },
}));

vi.mock('@tanstack/react-start', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-start')>('@tanstack/react-start');
  return { ...actual, useServerFn: (fn: unknown) => fn };
});

vi.mock('@/hooks/auth', () => ({
  useCurrentOrg: () => ({ currentOrg: { id: 'org-1' } }),
}));

vi.mock('@/server/functions/jobs/job-assignments', () => ({
  listJobAssignments: (...args: unknown[]) => mockListJobAssignments(...args),
  getJobAssignment: (...args: unknown[]) => mockGetJobAssignment(...args),
  createJobAssignment: vi.fn(),
  updateJobAssignment: vi.fn(),
  deleteJobAssignment: vi.fn(),
}));

vi.mock('@/server/functions/projects', () => ({
  getProjects: (...args: unknown[]) => mockGetProjects(...args),
  getProjectsCursor: (...args: unknown[]) => mockGetProjectsCursor(...args),
  getProject: (...args: unknown[]) => mockGetProject(...args),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
  addProjectMember: vi.fn(),
  removeProjectMember: vi.fn(),
  completeProject: vi.fn(),
}));

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'Wave6CWrapper';
  return Wrapper;
}

describe('wave 6c jobs/projects headline normalization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListJobAssignments.mockResolvedValue({ jobs: [], total: 0 });
    mockGetJobAssignment.mockResolvedValue({
      id: 'job-1',
      title: 'Install solar array',
      status: 'scheduled',
    });
    mockGetProjects.mockResolvedValue({
      items: [],
      pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
    });
    mockGetProjectsCursor.mockResolvedValue({
      items: [],
      nextCursor: null,
      hasMore: false,
    });
    mockGetProject.mockResolvedValue({
      id: 'project-1',
      title: 'Warehouse fitout',
      status: 'active',
    });
  });

  it('treats jobs/projects lists and cursor reads as healthy shaped empty success', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useJobs } = await import('@/hooks/jobs/use-jobs');
    const { useProjects, useProjectsCursor } = await import('@/hooks/jobs/use-projects');

    const jobs = renderHook(() => useJobs(), { wrapper: createWrapper(queryClient) });
    const projects = renderHook(() => useProjects(), { wrapper: createWrapper(queryClient) });
    const cursor = renderHook(() => useProjectsCursor(), { wrapper: createWrapper(queryClient) });

    await waitFor(() => expect(jobs.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(projects.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(cursor.result.current.isSuccess).toBe(true));

    expect(jobs.result.current.data).toEqual({ jobs: [], total: 0 });
    expect(projects.result.current.data?.items).toEqual([]);
    expect(cursor.result.current.data?.items).toEqual([]);
  });

  it('preserves detail not-found semantics for job and project reads', async () => {
    mockGetJobAssignment.mockRejectedValueOnce({
      message: 'Job not found',
      code: 'NOT_FOUND',
      statusCode: 404,
    });
    mockGetProject.mockRejectedValueOnce({
      message: 'Project not found',
      code: 'NOT_FOUND',
      statusCode: 404,
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useJob } = await import('@/hooks/jobs/use-jobs');
    const { useProject } = await import('@/hooks/jobs/use-projects');

    const job = renderHook(() => useJob('missing-job'), {
      wrapper: createWrapper(queryClient),
    });
    const project = renderHook(() => useProject({ projectId: 'missing-project' }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(job.result.current.error).toBeTruthy());
    await waitFor(() => expect(project.result.current.error).toBeTruthy());

    expect(job.result.current.error).toMatchObject({
      failureKind: 'not-found',
      contractType: 'detail-not-found',
      message: 'The requested job could not be found.',
    });
    expect(project.result.current.error).toMatchObject({
      failureKind: 'not-found',
      contractType: 'detail-not-found',
      message: 'The requested project could not be found.',
    });
  });

  it('shows degraded copy in the projects headline container when stale rows remain visible', async () => {
    vi.resetModules();

    vi.doMock('@/hooks/jobs', () => ({
      useProjects: () => ({
        data: {
          items: [
            {
              id: 'project-1',
              projectNumber: 'P-001',
              title: 'Warehouse fitout',
              description: null,
              projectType: 'installation',
              status: 'active',
              priority: 'high',
              customerId: 'customer-1',
              targetCompletionDate: null,
              progressPercent: 50,
              createdAt: new Date('2026-04-21T00:00:00.000Z'),
              updatedAt: new Date('2026-04-21T00:00:00.000Z'),
              customer: null,
            },
          ],
          pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
        },
        isLoading: false,
        error: new Error('Projects are temporarily unavailable. Please refresh and try again.'),
      }),
      useDeleteProject: () => ({ mutateAsync: vi.fn() }),
    }));
    vi.doMock('@tanstack/react-router', () => ({
      useNavigate: () => vi.fn(),
    }));
    vi.doMock('@/components/shared/data-table', () => ({
      BulkActionsBar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
      useTableSelection: () => ({
        selectedIds: new Set<string>(),
        selectedItems: [],
        isAllSelected: false,
        isPartiallySelected: false,
        lastClickedIndex: null,
        setLastClickedIndex: vi.fn(),
        handleSelect: vi.fn(),
        handleSelectAll: vi.fn(),
        handleShiftClickRange: vi.fn(),
        clearSelection: vi.fn(),
        isSelected: vi.fn(() => false),
      }),
    }));
    vi.doMock('@/hooks', () => ({
      toastSuccess: vi.fn(),
      toastError: vi.fn(),
      useConfirmation: () => ({ confirm: vi.fn().mockResolvedValue({ confirmed: false }) }),
    }));
    vi.doMock('@/hooks/_shared/use-confirmation', () => ({
      confirmations: { delete: () => ({ title: 'delete' }) },
    }));
    vi.doMock('@/components/domain/jobs/projects/projects-list-presenter', () => ({
      ProjectsListPresenter: () => <div>projects presenter</div>,
    }));

    const { ProjectsListContainer } = await import(
      '@/components/domain/jobs/projects/projects-list-container'
    );

    render(<ProjectsListContainer />);

    expect(screen.getByText('Showing cached projects')).toBeInTheDocument();
    expect(
      screen.getByText('Projects are temporarily unavailable. Please refresh and try again.')
    ).toBeInTheDocument();
    expect(screen.getByText('projects presenter')).toBeInTheDocument();
  });
});
