import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetCampaigns = vi.fn();
const mockGetCampaignById = vi.fn();
const mockGetCampaignRecipients = vi.fn();
const mockPreviewCampaignRecipients = vi.fn();
const mockGetEmailTemplates = vi.fn();
const mockGetEmailTemplate = vi.fn();
const mockGetTemplateVersionHistory = vi.fn();
const mockGetEmailSignatures = vi.fn();
const mockGetEmailSignature = vi.fn();
const mockRenderEmailPreview = vi.fn();
const mockGetEmailMetricsServer = vi.fn();

const mockUseTemplates = vi.fn();
const mockUseSignatures = vi.fn();
const mockUseCampaigns = vi.fn();
const mockUseCancelCampaign = vi.fn();
const mockUseDeleteCampaign = vi.fn();
const mockUseDuplicateCampaign = vi.fn();
const mockUseTestSendCampaign = vi.fn();
const mockUseResumeCampaign = vi.fn();
const mockUseDeleteSignature = vi.fn();
const mockUseSetDefaultSignature = vi.fn();
const mockUseTransformedFilterUrlState = vi.fn();

process.env.RESEND_API_KEY = 're_test_key';

vi.mock('@tanstack/react-start', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-start')>();
  const createServerFn = () => {
    const builder = {
      middleware: () => builder,
      inputValidator: () => builder,
      validator: () => builder,
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

vi.mock('@/server/functions/communications/email-campaigns', () => ({
  getCampaigns: (...args: unknown[]) => mockGetCampaigns(...args),
  getCampaignById: (...args: unknown[]) => mockGetCampaignById(...args),
  getCampaignRecipients: (...args: unknown[]) => mockGetCampaignRecipients(...args),
  previewCampaignRecipients: (...args: unknown[]) => mockPreviewCampaignRecipients(...args),
  createCampaign: vi.fn(),
  updateCampaign: vi.fn(),
  cancelCampaign: vi.fn(),
  deleteCampaign: vi.fn(),
  populateCampaignRecipients: vi.fn(),
  sendCampaign: vi.fn(),
  pauseCampaign: vi.fn(),
  resumeCampaign: vi.fn(),
  duplicateCampaign: vi.fn(),
  testSendCampaign: vi.fn(),
}));

vi.mock('@/server/functions/communications/email-templates', () => ({
  getEmailTemplates: (...args: unknown[]) => mockGetEmailTemplates(...args),
  getEmailTemplate: (...args: unknown[]) => mockGetEmailTemplate(...args),
  getTemplateVersionHistory: (...args: unknown[]) => mockGetTemplateVersionHistory(...args),
  createEmailTemplate: vi.fn(),
  updateEmailTemplate: vi.fn(),
  deleteEmailTemplate: vi.fn(),
  cloneEmailTemplate: vi.fn(),
  restoreTemplateVersion: vi.fn(),
}));

vi.mock('@/server/functions/communications/email-signatures', () => ({
  getEmailSignatures: (...args: unknown[]) => mockGetEmailSignatures(...args),
  getEmailSignature: (...args: unknown[]) => mockGetEmailSignature(...args),
  createEmailSignature: vi.fn(),
  updateEmailSignature: vi.fn(),
  deleteEmailSignature: vi.fn(),
  setDefaultSignature: vi.fn(),
}));

vi.mock('@/server/functions/communications/email-preview', () => ({
  renderEmailPreview: (...args: unknown[]) => mockRenderEmailPreview(...args),
  sendTestEmail: vi.fn(),
}));

vi.mock('@/server/functions/communications/email-analytics', () => ({
  getEmailMetrics: (...args: unknown[]) => mockGetEmailMetricsServer(...args),
}));

vi.mock('@/hooks/communications', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/communications')>();
  return {
    ...actual,
    useTemplates: (...args: unknown[]) => mockUseTemplates(...args),
    useSignatures: (...args: unknown[]) => mockUseSignatures(...args),
    useCampaigns: (...args: unknown[]) => mockUseCampaigns(...args),
    useCancelCampaign: (...args: unknown[]) => mockUseCancelCampaign(...args),
    useDeleteCampaign: (...args: unknown[]) => mockUseDeleteCampaign(...args),
    useDuplicateCampaign: (...args: unknown[]) => mockUseDuplicateCampaign(...args),
    useTestSendCampaign: (...args: unknown[]) => mockUseTestSendCampaign(...args),
    useResumeCampaign: (...args: unknown[]) => mockUseResumeCampaign(...args),
    useDeleteSignature: (...args: unknown[]) => mockUseDeleteSignature(...args),
    useSetDefaultSignature: (...args: unknown[]) => mockUseSetDefaultSignature(...args),
  };
});

vi.mock('@/hooks/filters/use-filter-url-state', () => ({
  useTransformedFilterUrlState: (...args: unknown[]) => mockUseTransformedFilterUrlState(...args),
  useFilterUrlState: () => ({
    filters: { search: '', category: 'all' },
    setFilters: vi.fn(),
  }),
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('@/routes/_authenticated/communications/campaigns/index', () => ({
  Route: {
    useSearch: () => ({ page: 1, pageSize: 25 }),
  },
  searchParamsSchema: {},
}));

vi.mock('@/components/domain/communications', () => ({
  CampaignsList: ({ campaigns }: { campaigns: Array<{ id: string }> }) => (
    <div>campaigns:{campaigns.length}</div>
  ),
  SignaturesList: ({ signatures }: { signatures: Array<{ id: string }> }) => (
    <div>signatures:{signatures.length}</div>
  ),
}));

vi.mock('@/components/domain/communications/templates-list', () => ({
  TemplatesList: ({ templates }: { templates: Array<{ id: string }> }) => (
    <div>templates:{templates.length}</div>
  ),
}));

vi.mock('@/components/shared', () => ({
  ErrorState: ({
    title,
    message,
  }: {
    title: string;
    message: string;
  }) => (
    <div>
      <div>{title}</div>
      <div>{message}</div>
    </div>
  ),
  MetricCard: ({ title, value }: { title: string; value: string }) => (
    <div>
      <div>{title}</div>
      <div>{value}</div>
    </div>
  ),
}));

vi.mock('@/hooks', () => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@/hooks/_shared/use-confirmation', () => ({
  useConfirmation: () => ({
    confirm: vi.fn().mockResolvedValue({ confirmed: true }),
  }),
  confirmations: {
    delete: vi.fn(),
  },
}));

vi.mock('@/routes/_authenticated/communications/emails/templates/use-templates-page', () => ({
  useTemplatesPage: () => ({
    versions: [],
    versionsLoading: false,
    handleDelete: vi.fn(),
    handleClone: vi.fn(),
    handleFetchVersions: vi.fn(),
    handleRestoreVersion: vi.fn(),
    isDeleting: false,
    isCloning: false,
    isRestoringVersion: false,
  }),
}));

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'CommunicationsWave4DWrapper';
  return Wrapper;
}

describe('communications query normalization wave 4d', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetCampaigns.mockResolvedValue({ items: [], total: 0 });
    mockGetCampaignById.mockResolvedValue(null);
    mockGetCampaignRecipients.mockResolvedValue({ items: [], total: 0 });
    mockPreviewCampaignRecipients.mockResolvedValue({ total: 0, sample: [] });
    mockGetEmailTemplates.mockResolvedValue([]);
    mockGetEmailTemplate.mockResolvedValue(null);
    mockGetTemplateVersionHistory.mockResolvedValue([]);
    mockGetEmailSignatures.mockResolvedValue([]);
    mockGetEmailSignature.mockResolvedValue(null);
    mockRenderEmailPreview.mockResolvedValue({
      html: '<p>Hello</p>',
      text: 'Hello',
      subject: 'Hello',
      missingVariables: [],
    });
    mockGetEmailMetricsServer.mockResolvedValue({
      metrics: {
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        bounced: 0,
        complained: 0,
        deliveryRate: 0,
        openRate: 0,
        clickRate: 0,
        bounceRate: 0,
        complaintRate: 0,
        periodStart: new Date().toISOString(),
        periodEnd: new Date().toISOString(),
      },
    });

    const idleMutation = { mutateAsync: vi.fn(), isPending: false };
    mockUseTemplates.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseSignatures.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseCampaigns.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseCancelCampaign.mockReturnValue(idleMutation);
    mockUseDeleteCampaign.mockReturnValue(idleMutation);
    mockUseDuplicateCampaign.mockReturnValue(idleMutation);
    mockUseTestSendCampaign.mockReturnValue(idleMutation);
    mockUseResumeCampaign.mockReturnValue(idleMutation);
    mockUseDeleteSignature.mockReturnValue(idleMutation);
    mockUseSetDefaultSignature.mockReturnValue(idleMutation);
    mockUseTransformedFilterUrlState.mockReturnValue({
      filters: { search: '', status: [], templateType: [], dateFrom: null, dateTo: null },
      setFilters: vi.fn(),
    });
  });

  it('keeps campaign detail nullable by design', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useCampaign } = await import('@/hooks/communications/use-campaigns');

    const { result } = renderHook(
      () => useCampaign({ campaignId: 'campaign-1' }),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it('treats template lists as healthy empty success', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useTemplates } = await import('@/hooks/communications/use-templates');

    const { result } = renderHook(
      () => useTemplates(),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('keeps signature detail nullable by design', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useSignature } = await import('@/hooks/communications/use-signatures');

    const { result } = renderHook(
      () => useSignature({ signatureId: 'signature-1' }),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it('preserves not-found semantics for preview rendering when the template is missing', async () => {
    mockRenderEmailPreview.mockRejectedValue({
      message: 'Template not found',
      code: 'NOT_FOUND',
      status: 404,
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useEmailPreview } = await import('@/hooks/communications/use-email-preview');

    renderHook(
      () => useEmailPreview({ templateId: 'template-1' }),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => {
      expect(queryClient.getQueryCache().getAll()[0]?.state.status).toBe('error');
    });
    expect(
      (queryClient.getQueryCache().getAll()[0]?.state.error as { failureKind?: string }).failureKind
    ).toBe('not-found');
  });

  it('treats email analytics as healthy shaped success', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useEmailMetrics } = await import('@/hooks/communications/use-email-analytics');

    const { result } = renderHook(
      () => useEmailMetrics(),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.metrics.deliveryRate).toBe(0);
  });

  it('shows cached-template degradation instead of blocking the templates page', async () => {
    mockUseTemplates.mockReturnValue({
      data: [{ id: 'template-1' }],
      isLoading: false,
      error: new Error('Email templates are temporarily unavailable. Please refresh and try again.'),
      refetch: vi.fn(),
    });

    const { default: TemplatesPage } = await import(
      '@/routes/_authenticated/communications/emails/templates/templates-page'
    );

    render(<TemplatesPage search={{ category: 'all', search: '' }} />);

    expect(screen.getByText('Showing cached templates')).toBeInTheDocument();
    expect(screen.getByText('templates:1')).toBeInTheDocument();
  });

  it('shows cached-signature degradation instead of blocking the signatures page', async () => {
    mockUseSignatures.mockReturnValue({
      data: [{ id: 'signature-1' }],
      isLoading: false,
      error: new Error('Email signatures are temporarily unavailable. Please refresh and try again.'),
      refetch: vi.fn(),
    });

    const { default: SignaturesPage } = await import(
      '@/routes/_authenticated/communications/signatures/signatures-page'
    );

    render(<SignaturesPage />);

    expect(screen.getByText('Showing cached signatures')).toBeInTheDocument();
    expect(screen.getByText('signatures:1')).toBeInTheDocument();
  });

});
