import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockListWinLossReasons = vi.fn();
const mockListIssueTemplates = vi.fn();
const mockGetIssueTemplate = vi.fn();
const mockGetPopularTemplates = vi.fn();
const mockListCategories = vi.fn();
const mockGetCategory = vi.fn();
const mockListArticles = vi.fn();
const mockGetArticle = vi.fn();

vi.mock('@tanstack/react-start', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-start')>('@tanstack/react-start');
  return {
    ...actual,
    useServerFn: (fn: unknown) => fn,
  };
});

vi.mock('@/server/functions/pipeline/win-loss-reasons', () => ({
  listWinLossReasons: (...args: unknown[]) => mockListWinLossReasons(...args),
  createWinLossReason: vi.fn(),
  updateWinLossReason: vi.fn(),
  deleteWinLossReason: vi.fn(),
}));

vi.mock('@/server/functions/support/issue-templates', () => ({
  listIssueTemplates: (...args: unknown[]) => mockListIssueTemplates(...args),
  getIssueTemplate: (...args: unknown[]) => mockGetIssueTemplate(...args),
  createIssueTemplate: vi.fn(),
  updateIssueTemplate: vi.fn(),
  deleteIssueTemplate: vi.fn(),
  incrementTemplateUsage: vi.fn(),
  getPopularTemplates: (...args: unknown[]) => mockGetPopularTemplates(...args),
}));

vi.mock('@/server/functions/support/knowledge-base', () => ({
  createCategory: vi.fn(),
  getCategory: (...args: unknown[]) => mockGetCategory(...args),
  listCategories: (...args: unknown[]) => mockListCategories(...args),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
  createArticle: vi.fn(),
  getArticle: (...args: unknown[]) => mockGetArticle(...args),
  listArticles: (...args: unknown[]) => mockListArticles(...args),
  updateArticle: vi.fn(),
  deleteArticle: vi.fn(),
  recordArticleFeedback: vi.fn(),
}));

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'SupportQueryNormalizationWave5EWrapper';
  return Wrapper;
}

describe('support/settings query normalization wave 5e', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockListWinLossReasons.mockResolvedValue({ reasons: [] });
    mockListIssueTemplates.mockResolvedValue({
      data: [],
      pagination: {
        totalCount: 0,
        totalPages: 0,
        page: 1,
        pageSize: 20,
      },
    });
    mockGetIssueTemplate.mockResolvedValue({
      id: 'template-1',
      organizationId: 'org-1',
      name: 'Hardware Fault',
      description: null,
      type: 'hardware_fault',
      defaultPriority: 'medium',
      defaultAssigneeId: null,
      titleTemplate: null,
      descriptionPrompt: null,
      requiredFields: null,
      defaults: null,
      usageCount: 0,
      isActive: true,
      createdAt: new Date('2026-04-20T00:00:00.000Z'),
      updatedAt: null,
      createdBy: null,
      updatedBy: null,
      assigneeName: null,
      assigneeEmail: null,
    });
    mockGetPopularTemplates.mockResolvedValue([]);
    mockListCategories.mockResolvedValue([]);
    mockGetCategory.mockResolvedValue({
      id: 'category-1',
      name: 'FAQ',
      slug: 'faq',
      description: null,
      parentId: null,
      sortOrder: 0,
      isActive: true,
      createdAt: new Date('2026-04-20T00:00:00.000Z'),
      updatedAt: null,
      articleCount: 0,
    });
    mockListArticles.mockResolvedValue({
      data: [],
      pagination: {
        totalCount: 0,
        totalPages: 0,
        page: 1,
        pageSize: 20,
      },
    });
    mockGetArticle.mockResolvedValue({
      id: 'article-1',
      organizationId: 'org-1',
      title: 'Reset procedure',
      slug: 'reset-procedure',
      summary: null,
      content: 'Steps',
      categoryId: null,
      tags: [],
      status: 'published',
      publishedAt: null,
      viewCount: 0,
      helpfulCount: 0,
      notHelpfulCount: 0,
      metaTitle: null,
      metaDescription: null,
      createdAt: new Date('2026-04-20T00:00:00.000Z'),
      updatedAt: null,
      createdBy: null,
      updatedBy: null,
      categoryName: null,
      categorySlug: null,
      authorName: null,
      authorEmail: null,
    });
  });

  it('treats settings and support list reads as healthy shaped empty success', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useWinLossReasons } = await import('@/hooks/settings/use-win-loss-reasons');
    const { useIssueTemplates, usePopularTemplates } = await import('@/hooks/support/use-issue-templates');
    const { useKbCategories, useKbArticles } = await import('@/hooks/support/use-knowledge-base');

    const reasons = renderHook(() => useWinLossReasons(), { wrapper: createWrapper(queryClient) });
    const templates = renderHook(() => useIssueTemplates(), { wrapper: createWrapper(queryClient) });
    const popularTemplates = renderHook(() => usePopularTemplates(), {
      wrapper: createWrapper(queryClient),
    });
    const categories = renderHook(() => useKbCategories(), { wrapper: createWrapper(queryClient) });
    const articles = renderHook(() => useKbArticles(), { wrapper: createWrapper(queryClient) });

    await waitFor(() => expect(reasons.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(templates.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(popularTemplates.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(categories.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(articles.result.current.isSuccess).toBe(true));

    expect(reasons.result.current.data).toEqual({ reasons: [] });
    expect(templates.result.current.data?.data).toEqual([]);
    expect(popularTemplates.result.current.data).toEqual([]);
    expect(categories.result.current.data).toEqual([]);
    expect(articles.result.current.data?.data).toEqual([]);
  });

  it('preserves not-found semantics for issue template and knowledge-base detail reads', async () => {
    mockGetIssueTemplate.mockRejectedValueOnce({
      message: 'Template not found',
      code: 'NOT_FOUND',
      statusCode: 404,
    });
    mockGetArticle.mockRejectedValueOnce({
      message: 'Article not found',
      code: 'NOT_FOUND',
      statusCode: 404,
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useIssueTemplate } = await import('@/hooks/support/use-issue-templates');
    const { useKbArticle } = await import('@/hooks/support/use-knowledge-base');

    const template = renderHook(
      () => useIssueTemplate({ templateId: 'missing-template' }),
      { wrapper: createWrapper(queryClient) }
    );
    const article = renderHook(
      () => useKbArticle({ articleId: 'missing-article' }),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => expect(template.result.current.error).toBeTruthy());
    await waitFor(() => expect(article.result.current.error).toBeTruthy());

    expect(template.result.current.error).toMatchObject({
      failureKind: 'not-found',
      contractType: 'detail-not-found',
      message: 'The requested issue template could not be found.',
    });
    expect(article.result.current.error).toMatchObject({
      failureKind: 'not-found',
      contractType: 'detail-not-found',
      message: 'The requested knowledge base article could not be found.',
    });
  });

  it('shows explicit unavailable copy in the won/lost dialog instead of fake empty reasons', async () => {
    vi.resetModules();

    vi.doMock('@/components/shared/format', () => ({
      FormatAmount: ({ amount }: { amount: number }) => <span>${amount}</span>,
    }));
    vi.doMock('@/hooks/settings', () => ({
      useWinLossReasons: () => ({
        data: undefined,
        isLoading: false,
        error: new Error('Win/loss reasons are temporarily unavailable. Please refresh and try again.'),
      }),
    }));

    const { WonLostDialog } = await import('@/components/domain/pipeline/won-lost-dialog');

    render(
      <WonLostDialog
        open
        type="won"
        opportunity={{ title: 'Enterprise Upgrade', value: 5000 }}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText('Reasons are temporarily unavailable.')).toBeInTheDocument();
    expect(screen.queryByText('No reasons available.')).not.toBeInTheDocument();
  });

  it('keeps stale issue templates visible when refresh fails', async () => {
    vi.resetModules();

    vi.doMock('@/hooks', () => ({
      useIssueTemplates: () => ({
        data: {
          data: [
            {
              id: 'template-1',
              name: 'Hardware Fault',
              description: 'Template description',
              type: 'hardware_fault',
              usageCount: 7,
              defaultPriority: 'medium',
              defaultAssigneeId: null,
              titleTemplate: null,
              descriptionPrompt: null,
              requiredFields: null,
              defaults: null,
              isActive: true,
              createdAt: new Date('2026-04-20T00:00:00.000Z'),
              updatedAt: null,
              createdBy: null,
              updatedBy: null,
              organizationId: 'org-1',
              assigneeName: null,
              assigneeEmail: null,
            },
          ],
          pagination: { totalCount: 1, totalPages: 1, page: 1, pageSize: 10 },
        },
        isLoading: false,
        error: new Error('Issue templates are temporarily unavailable. Please refresh and try again.'),
        refetch: vi.fn(),
      }),
      useDeleteIssueTemplate: () => ({ mutateAsync: vi.fn(), isPending: false }),
      useCreateIssueTemplate: () => ({ mutateAsync: vi.fn(), isPending: false }),
      useUpdateIssueTemplate: () => ({ mutateAsync: vi.fn(), isPending: false }),
      useConfirmation: () => ({ confirm: vi.fn() }),
    }));

    const { Route } = await import('@/routes/_authenticated/settings/issue-templates');
    const IssueTemplatesPage = Route.options.component as React.ComponentType;

    render(<IssueTemplatesPage />);

    expect(screen.getByText('Templates unavailable')).toBeInTheDocument();
    expect(screen.getAllByText('Hardware Fault').length).toBeGreaterThan(0);
  });

  it('shows category load failure instead of empty onboarding copy on knowledge-base settings', async () => {
    vi.resetModules();

    vi.doMock('@/hooks', () => ({
      useKbCategories: () => ({
        data: undefined,
        isLoading: false,
        error: new Error('Knowledge base categories are temporarily unavailable. Please refresh and try again.'),
        refetch: vi.fn(),
      }),
      useDeleteKbCategory: () => ({ mutateAsync: vi.fn(), isPending: false }),
      useCreateKbCategory: () => ({ mutateAsync: vi.fn(), isPending: false }),
      useUpdateKbCategory: () => ({ mutateAsync: vi.fn(), isPending: false }),
      useConfirmation: () => ({ confirm: vi.fn() }),
    }));

    const { Route } = await import('@/routes/_authenticated/settings/knowledge-base');
    const KnowledgeBaseSettingsPage = Route.options.component as React.ComponentType;

    render(<KnowledgeBaseSettingsPage />);

    expect(screen.getByText('Failed to load categories')).toBeInTheDocument();
    expect(screen.queryByText('No categories yet')).not.toBeInTheDocument();
  });
});
