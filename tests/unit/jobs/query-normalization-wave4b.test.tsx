import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.RESEND_API_KEY = 're_test_key';

const mockListWorkstreams = vi.fn();
const mockGetWorkstream = vi.fn();
const mockGetProjectBom = vi.fn();

const mockUseProjectBom = vi.fn();
const mockUseCreateProjectBom = vi.fn();
const mockUseAddBomItem = vi.fn();
const mockUseUpdateBomItem = vi.fn();
const mockUseRemoveBomItem = vi.fn();
const mockUseRemoveBomItems = vi.fn();
const mockUseUpdateBomItemsStatus = vi.fn();
const mockUseImportBomFromCsv = vi.fn();
const mockUseImportBomFromOrder = vi.fn();

vi.mock('@tanstack/react-start', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-start')>();
  const createServerFn = () => {
    const builder = {
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

vi.mock('@/server/functions/workstreams', () => ({
  listWorkstreams: (...args: unknown[]) => mockListWorkstreams(...args),
  getWorkstream: (...args: unknown[]) => mockGetWorkstream(...args),
  createWorkstream: vi.fn(),
  updateWorkstream: vi.fn(),
  deleteWorkstream: vi.fn(),
  reorderWorkstreams: vi.fn(),
}));

vi.mock('@/server/functions/project-bom', () => ({
  getProjectBom: (...args: unknown[]) => mockGetProjectBom(...args),
  createProjectBom: vi.fn(),
  addBomItem: vi.fn(),
  updateBomItem: vi.fn(),
  removeBomItem: vi.fn(),
  removeBomItems: vi.fn(),
  updateBomItemsStatus: vi.fn(),
  importBomFromCsv: vi.fn(),
  importBomFromOrder: vi.fn(),
}));

vi.mock('@/hooks/jobs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/jobs')>();
  return {
    ...actual,
    useProjectBom: (...args: unknown[]) => mockUseProjectBom(...args),
    useCreateProjectBom: (...args: unknown[]) => mockUseCreateProjectBom(...args),
    useAddBomItem: (...args: unknown[]) => mockUseAddBomItem(...args),
    useUpdateBomItem: (...args: unknown[]) => mockUseUpdateBomItem(...args),
    useRemoveBomItem: (...args: unknown[]) => mockUseRemoveBomItem(...args),
    useRemoveBomItems: (...args: unknown[]) => mockUseRemoveBomItems(...args),
    useUpdateBomItemsStatus: (...args: unknown[]) => mockUseUpdateBomItemsStatus(...args),
    useImportBomFromCsv: (...args: unknown[]) => mockUseImportBomFromCsv(...args),
    useImportBomFromOrder: (...args: unknown[]) => mockUseImportBomFromOrder(...args),
  };
});

vi.mock('@/hooks/use-org-format', () => ({
  useOrgFormat: () => ({
    formatCurrency: (value: number) => `$${value.toFixed(2)}`,
  }),
}));

vi.mock('@/hooks', () => ({
  useConfirmation: () => ({
    confirm: vi.fn().mockResolvedValue({ confirmed: true }),
  }),
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock('@/hooks/_shared', () => ({
  useDebounce: (value: string) => value,
}));

vi.mock('@/hooks/products', () => ({
  useProductSearch: () => ({
    data: { products: [] },
    isFetching: false,
  }),
}));

vi.mock('@/components/domain/jobs/projects/bom-tab-skeleton', () => ({
  BomTabSkeleton: () => <div>bom-skeleton</div>,
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props}>{children}</a>
  ),
}));

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'JobsQueryNormalizationWave4BWrapper';
  return Wrapper;
}

describe('jobs query normalization wave 4b', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockListWorkstreams.mockResolvedValue({
      success: true,
      data: [],
      pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
    });
    mockGetWorkstream.mockResolvedValue({
      success: true,
      data: { id: 'workstream-1', name: 'Install' },
    });
    mockGetProjectBom.mockResolvedValue({
      success: true,
      data: {
        bom: null,
        items: [],
      },
    });

    const idleMutation = { mutateAsync: vi.fn(), isPending: false };
    mockUseProjectBom.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Project materials are temporarily unavailable. Please refresh and try again.'),
      refetch: vi.fn(),
    });
    mockUseCreateProjectBom.mockReturnValue(idleMutation);
    mockUseAddBomItem.mockReturnValue(idleMutation);
    mockUseUpdateBomItem.mockReturnValue(idleMutation);
    mockUseRemoveBomItem.mockReturnValue(idleMutation);
    mockUseRemoveBomItems.mockReturnValue(idleMutation);
    mockUseUpdateBomItemsStatus.mockReturnValue(idleMutation);
    mockUseImportBomFromCsv.mockReturnValue(idleMutation);
    mockUseImportBomFromOrder.mockReturnValue(idleMutation);
  });

  it('treats workstream list as always-shaped empty success', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useWorkstreams } = await import('@/hooks/jobs/use-workstreams');

    const { result } = renderHook(() => useWorkstreams('project-1'), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({
      data: [],
      pagination: { totalItems: 0 },
    });
  });

  it('preserves workstream not-found semantics', async () => {
    mockGetWorkstream.mockRejectedValueOnce({
      message: 'Workstream not found',
      statusCode: 404,
      code: 'NOT_FOUND',
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useWorkstream } = await import('@/hooks/jobs/use-workstreams');

    const { result } = renderHook(() => useWorkstream('missing-workstream'), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error).toMatchObject({
      failureKind: 'not-found',
      contractType: 'detail-not-found',
      message: 'The requested workstream could not be found.',
    });
  });

  it('treats project BOM as always-shaped even when there is no bom yet', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useProjectBom } = await import('@/hooks/jobs/use-project-bom');

    const { result } = renderHook(() => useProjectBom({ projectId: 'project-1' }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({
      data: {
        bom: null,
        items: [],
      },
    });
  });

  it('shows an unavailable state for workstreams instead of fake empty copy', async () => {
    const { ProjectWorkstreamsView } = await import('@/components/jobs/presentation/workstreams/ProjectWorkstreamsView');

    render(
      <ProjectWorkstreamsView
        workstreams={[]}
        error={new Error('Project workstreams are temporarily unavailable. Please refresh and try again.')}
        hasData={false}
        onRetry={vi.fn()}
      />
    );

    expect(screen.getByText('Workstreams unavailable')).toBeInTheDocument();
    expect(screen.queryByText('No workstreams yet')).not.toBeInTheDocument();
  });

  it('shows an unavailable state for bom instead of fake no-bom copy', async () => {
    const { ProjectBomTab } = await import('@/components/domain/jobs/projects/project-bom-tab');

    render(<ProjectBomTab projectId="project-1" orderId={null} />);

    expect(screen.getByText('Materials unavailable')).toBeInTheDocument();
    expect(screen.queryByText('No BOM yet')).not.toBeInTheDocument();
  });
});
