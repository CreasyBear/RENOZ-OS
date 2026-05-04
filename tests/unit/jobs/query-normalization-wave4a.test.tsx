import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.RESEND_API_KEY = 're_test_key';

const mockListFiles = vi.fn();
const mockGetFile = vi.fn();
const mockGetProjectFilesStats = vi.fn();
const mockListJobDocuments = vi.fn();
const mockListNotes = vi.fn();
const mockGetNote = vi.fn();
const mockGetProjectNotesStats = vi.fn();
const mockGetProjectAlerts = vi.fn();
const mockGetSiteVisit = vi.fn();
const mockGetSiteVisits = vi.fn();
const mockGetPastDueSiteVisits = vi.fn();

const mockUseFiles = vi.fn();
const mockUseDeleteProjectFile = vi.fn();
const mockUseNotes = vi.fn();
const mockUseDeleteNote = vi.fn();
const mockUseSchedule = vi.fn();
const mockUseRescheduleSiteVisit = vi.fn();
const mockUsePastDueSiteVisits = vi.fn();
const mockUseProject = vi.fn();

vi.mock('@tanstack/react-start', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-start')>();
  const createServerFn = () => {
    const builder = {
      validator: undefined as unknown,
      middleware: () => builder,
      inputValidator: () => builder,
      handler: (fn: unknown) => fn,
    };
    return builder;
  };

  return {
    ...actual,
    createServerFn,
    useServerFn: <T,>(fn: T) => fn,
  };
});

vi.mock('@/server/functions/files', () => ({
  listFiles: (...args: unknown[]) => mockListFiles(...args),
  getFile: (...args: unknown[]) => mockGetFile(...args),
  createFile: vi.fn(),
  updateFile: vi.fn(),
  deleteFile: vi.fn(),
  getProjectFilesStats: (...args: unknown[]) => mockGetProjectFilesStats(...args),
}));

vi.mock('@/server/functions/notes', () => ({
  listNotes: (...args: unknown[]) => mockListNotes(...args),
  getNote: (...args: unknown[]) => mockGetNote(...args),
  createNote: vi.fn(),
  updateNote: vi.fn(),
  deleteNote: vi.fn(),
  getProjectNotesStats: (...args: unknown[]) => mockGetProjectNotesStats(...args),
}));

vi.mock('@/server/functions/jobs/project-alerts', () => ({
  getProjectAlerts: (...args: unknown[]) => mockGetProjectAlerts(...args),
}));

vi.mock('@/server/functions/jobs/job-documents', () => ({
  listJobDocuments: (...args: unknown[]) => mockListJobDocuments(...args),
  uploadJobDocument: vi.fn(),
  deleteJobDocument: vi.fn(),
}));

vi.mock('@/server/functions/site-visits', () => ({
  getSiteVisits: (...args: unknown[]) => mockGetSiteVisits(...args),
  getSiteVisit: (...args: unknown[]) => mockGetSiteVisit(...args),
  createSiteVisit: vi.fn(),
  updateSiteVisit: vi.fn(),
  deleteSiteVisit: vi.fn(),
  checkIn: vi.fn(),
  checkOut: vi.fn(),
  recordCustomerSignOff: vi.fn(),
  cancelSiteVisit: vi.fn(),
  rescheduleSiteVisit: vi.fn(),
  getPastDueSiteVisits: (...args: unknown[]) => mockGetPastDueSiteVisits(...args),
}));

vi.mock('@/hooks/jobs', () => ({
  useFiles: (...args: unknown[]) => mockUseFiles(...args),
  useDeleteProjectFile: (...args: unknown[]) => mockUseDeleteProjectFile(...args),
  useNotes: (...args: unknown[]) => mockUseNotes(...args),
  useDeleteNote: (...args: unknown[]) => mockUseDeleteNote(...args),
  useSchedule: (...args: unknown[]) => mockUseSchedule(...args),
  useRescheduleSiteVisit: (...args: unknown[]) => mockUseRescheduleSiteVisit(...args),
  usePastDueSiteVisits: (...args: unknown[]) => mockUsePastDueSiteVisits(...args),
  useProject: (...args: unknown[]) => mockUseProject(...args),
}));

vi.mock('@/hooks/users', () => ({
  useUserLookup: () => ({
    getUser: () => ({ name: 'Alex Installer' }),
  }),
  useUsers: () => ({
    data: { items: [] },
  }),
}));

vi.mock('@/hooks/_shared/use-confirmation', () => ({
  useConfirmation: () => ({
    confirm: vi.fn().mockResolvedValue({ confirmed: true }),
  }),
  confirmations: {
    delete: () => ({ title: 'Delete?' }),
  },
}));

vi.mock('@/lib/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/components/domain/jobs/projects/file-dialogs', () => ({
  FileUploadDialog: () => <div>file-upload-dialog</div>,
}));

vi.mock('@/components/domain/jobs/projects/note-dialogs', () => ({
  NoteCreateDialog: () => <div>note-create-dialog</div>,
  NoteEditDialog: () => <div>note-edit-dialog</div>,
}));

vi.mock('@/components/domain/jobs/schedule/schedule-dashboard', () => ({
  ScheduleDashboard: ({ visits }: { visits: Array<{ id: string }> }) => (
    <div>schedule-dashboard:{visits.length}</div>
  ),
}));

vi.mock('@/components/domain/jobs/schedule/schedule-visit-create-dialog', () => ({
  ScheduleVisitCreateDialog: () => <div>schedule-visit-create-dialog</div>,
}));

vi.mock('@/components/domain/jobs/schedule/visit-preview-sheet', () => ({
  VisitPreviewSheet: () => <div>visit-preview-sheet</div>,
}));

vi.mock('@/components/domain/jobs/schedule/past-due-sidebar', () => ({
  PastDueSidebar: () => <div>past-due-sidebar</div>,
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props}>{children}</a>
  ),
  useNavigate: () => vi.fn(),
  useSearch: () => ({
    view: 'calendar',
  }),
}));

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'JobsQueryNormalizationWave4AWrapper';
  return Wrapper;
}

const Layout = Object.assign(
  ({ children }: { children: ReactNode; variant?: string }) => <div>{children}</div>,
  {
    Header: ({ title, description }: { title: ReactNode; description?: ReactNode }) => (
      <div>
        <div>{title}</div>
        {description ? <div>{description}</div> : null}
      </div>
    ),
    Content: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    LeftSidebar: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  }
);

describe('jobs query normalization wave 4a', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockListFiles.mockResolvedValue({
      success: true,
      data: [],
      pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
    });
    mockGetProjectFilesStats.mockResolvedValue({
      totalFiles: 0,
      totalBytes: 0,
      typeBreakdown: [],
    });
    mockGetFile.mockResolvedValue({
      success: true,
      data: { id: 'file-1', fileName: 'manual.pdf' },
    });
    mockListJobDocuments.mockResolvedValue({
      items: [],
      pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
    });

    mockListNotes.mockResolvedValue({
      success: true,
      data: [],
      pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
    });
    mockGetProjectNotesStats.mockResolvedValue({
      totalNotes: 0,
      byType: [],
    });
    mockGetNote.mockResolvedValue({
      success: true,
      data: { id: 'note-1', title: 'Kickoff' },
    });

    mockGetProjectAlerts.mockResolvedValue([]);
    mockGetSiteVisits.mockResolvedValue({
      items: [],
      pagination: { page: 1, pageSize: 100, totalItems: 0, totalPages: 0 },
    });
    mockGetPastDueSiteVisits.mockResolvedValue({
      items: [],
      pagination: { page: 1, pageSize: 0, totalItems: 0, totalPages: 0 },
    });
    mockGetSiteVisit.mockResolvedValue({
      id: 'visit-1',
      visitNumber: 'SV-001',
    });

    mockUseDeleteProjectFile.mockReturnValue({ mutateAsync: vi.fn() });
    mockUseDeleteNote.mockReturnValue({ mutateAsync: vi.fn() });
    mockUseSchedule.mockReturnValue({
      data: { items: [], pagination: { page: 1, pageSize: 0, totalItems: 0, totalPages: 0 } },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseRescheduleSiteVisit.mockReturnValue({ mutateAsync: vi.fn() });
    mockUsePastDueSiteVisits.mockReturnValue({
      data: { items: [] },
    });
    mockUseProject.mockReturnValue({
      isError: false,
      isLoading: false,
    });
  });

  it('treats project files as always-shaped and accepts empty success', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useFiles } = await import('@/hooks/jobs/use-files');

    const { result } = renderHook(() => useFiles('project-1'), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({
      data: [],
      pagination: { totalItems: 0 },
    });
  });

  it('preserves not-found semantics for file detail reads', async () => {
    mockGetFile.mockRejectedValueOnce({
      message: 'File not found',
      statusCode: 404,
      code: 'NOT_FOUND',
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useFile } = await import('@/hooks/jobs/use-files');

    const { result } = renderHook(() => useFile('missing-file'), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error).toMatchObject({
      failureKind: 'not-found',
      contractType: 'detail-not-found',
      message: 'The requested project file could not be found.',
    });
  });

  it('normalizes notes failures as always-shaped system errors', async () => {
    mockListNotes.mockRejectedValueOnce({
      message: 'upstream failed',
      statusCode: 503,
      code: 'INTERNAL_ERROR',
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useNotes } = await import('@/hooks/jobs/use-notes');

    const { result } = renderHook(() => useNotes('project-1'), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error).toMatchObject({
      failureKind: 'system',
      contractType: 'always-shaped',
      message: 'Project notes are temporarily unavailable. Please refresh and try again.',
    });
  });

  it('preserves job-document parent not-found semantics', async () => {
    mockListJobDocuments.mockRejectedValueOnce({
      message: 'Job assignment not found',
      statusCode: 404,
      code: 'NOT_FOUND',
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useJobDocuments } = await import('@/hooks/jobs/use-job-documents');

    const { result } = renderHook(() => useJobDocuments({ jobAssignmentId: 'missing-assignment' }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error).toMatchObject({
      failureKind: 'not-found',
      contractType: 'detail-not-found',
      message: 'The requested job assignment could not be found.',
    });
  });

  it('preserves project-alert not-found semantics', async () => {
    mockGetProjectAlerts.mockRejectedValueOnce({
      message: 'Project not found',
      statusCode: 404,
      code: 'NOT_FOUND',
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useProjectAlerts } = await import('@/hooks/jobs/use-project-alerts');

    const { result } = renderHook(() => useProjectAlerts('missing-project'), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error).toMatchObject({
      failureKind: 'not-found',
      contractType: 'detail-not-found',
      message: 'The requested project could not be found.',
    });
  });

  it('treats past-due site visits as always-shaped empty success', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { usePastDueSiteVisits } = await import('@/hooks/jobs/use-site-visits');

    const { result } = renderHook(() => usePastDueSiteVisits(true), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({
      items: [],
      pagination: { totalItems: 0 },
    });
  });

  it('preserves site-visit not-found semantics', async () => {
    mockGetSiteVisit.mockRejectedValueOnce({
      message: 'Site visit not found',
      statusCode: 404,
      code: 'NOT_FOUND',
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useSiteVisit } = await import('@/hooks/jobs/use-site-visits');

    const { result } = renderHook(() => useSiteVisit({ siteVisitId: 'missing-visit' }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error).toMatchObject({
      failureKind: 'not-found',
      contractType: 'detail-not-found',
      message: 'The requested site visit could not be found.',
    });
  });

  it('shows an unavailable state for files instead of a fake empty state', async () => {
    mockUseFiles.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Project files are temporarily unavailable. Please refresh and try again.'),
      refetch: vi.fn(),
    });

    const { ProjectFilesTab } = await import('@/components/domain/jobs/projects/project-files-tab');
    render(<ProjectFilesTab projectId="project-1" />);

    expect(screen.getByText('Files unavailable')).toBeInTheDocument();
    expect(screen.queryByText('No files yet')).not.toBeInTheDocument();
  });

  it('keeps cached files visible during refetch failures', async () => {
    mockUseFiles.mockReturnValue({
      data: {
        data: [
          {
            id: 'file-1',
            fileName: 'manual.pdf',
            mimeType: 'application/pdf',
            createdAt: new Date().toISOString(),
            fileSize: 1024,
            fileUrl: '/manual.pdf',
          },
        ],
      },
      isLoading: false,
      error: new Error('Project files are temporarily unavailable. Please refresh and try again.'),
      refetch: vi.fn(),
    });

    const { ProjectFilesTab } = await import('@/components/domain/jobs/projects/project-files-tab');
    render(<ProjectFilesTab projectId="project-1" />);

    expect(screen.getByText('Showing cached files')).toBeInTheDocument();
    expect(screen.getByText('manual.pdf')).toBeInTheDocument();
  });

  it('shows an unavailable state for notes instead of a fake empty state', async () => {
    mockUseNotes.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Project notes are temporarily unavailable. Please refresh and try again.'),
      refetch: vi.fn(),
    });

    const { ProjectNotesTab } = await import('@/components/domain/jobs/projects/project-notes-tab');
    render(<ProjectNotesTab projectId="project-1" />);

    expect(screen.getByText('Notes unavailable')).toBeInTheDocument();
    expect(screen.queryByText('No notes yet')).not.toBeInTheDocument();
  });

  it('keeps cached site visits visible when a visit read degrades', async () => {
    const { ProjectVisitsTab } = await import('@/components/domain/jobs/projects/project-detail-tabs');
    render(
      <ProjectVisitsTab
        project={{ id: 'project-1' } as never}
        visits={[
          {
            id: 'visit-1',
            visitNumber: 'SV-001',
            scheduledDate: '2026-04-20',
            status: 'scheduled',
            visitType: 'installation',
          },
        ] as never}
        error={new Error('Project site visits are temporarily unavailable. Please refresh and try again.')}
        hasData
        onRetry={vi.fn()}
        onScheduleVisit={vi.fn()}
      />
    );

    expect(screen.getByText('Showing cached site visits')).toBeInTheDocument();
    expect(screen.getByText('SV-001')).toBeInTheDocument();
  }, 20000);

  it('shows a blocking unavailable state for visits without data', async () => {
    const { ProjectVisitsTab } = await import('@/components/domain/jobs/projects/project-detail-tabs');
    render(
      <ProjectVisitsTab
        project={{ id: 'project-1' } as never}
        visits={[] as never}
        error={new Error('Project site visits are temporarily unavailable. Please refresh and try again.')}
        hasData={false}
        onRetry={vi.fn()}
        onScheduleVisit={vi.fn()}
      />
    );

    expect(screen.getByText('Site visits unavailable')).toBeInTheDocument();
    expect(screen.queryByText('No visits scheduled')).not.toBeInTheDocument();
  });

  it('shows an unavailable schedule warning when the schedule query has no data', async () => {
    mockUseSchedule.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Schedule data is temporarily unavailable. Please refresh and try again.'),
      refetch: vi.fn(),
    });

    const { ScheduleCalendarContainer } = await import('@/components/domain/jobs/schedule/schedule-calendar-container');
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <ScheduleCalendarContainer Layout={Layout} />
      </QueryClientProvider>
    );

    expect(screen.getByText('Schedule unavailable')).toBeInTheDocument();
    expect(screen.getByText('schedule-dashboard:0')).toBeInTheDocument();
  });
});
