/**
 * Knowledge Base Articles Page
 *
 * LAYOUT: full-width
 *
 * Main page for browsing and managing KB articles.
 *
 * @see src/components/domain/support/kb-article-list.tsx
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-007b
 * @see docs/reliability/MUTATION-CONTRACT-STANDARD.md - Mutation checklist for article/category forms
 */

import { useMemo, useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { z } from 'zod';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { KnowledgeBaseSkeleton } from '@/components/skeletons/support';
import { BookOpen, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LoadingState } from '@/components/shared/loading-state';
import { KbCategoryTree } from '@/components/domain/support/knowledge-base/kb-category-tree';
import { KbArticleList } from '@/components/domain/support/knowledge-base/kb-article-list';
import { KbArticleSearch } from '@/components/domain/support/knowledge-base/kb-article-search';
import { KbPopularArticles } from '@/components/domain/support/knowledge-base/kb-popular-articles';
import { KbSuggestedArticles } from '@/components/domain/support/knowledge-base/kb-suggested-articles';
import { KbArticleFormDialog, type ArticleFormValues } from '@/components/domain/support/knowledge-base/kb-article-form-dialog';
import {
  useKbCategories,
  useKbArticles,
  useKbArticle,
  useDeleteKbArticle,
  useCreateKbArticle,
  useUpdateKbArticle,
  useRecordArticleFeedback,
  useOptimisticFeedbackDeltas,
} from '@/hooks/support';
import { useDebounce } from '@/hooks/_shared';
import { useConfirmation } from '@/hooks';
import { toast } from 'sonner';
import type {
  KbCategoryResponse,
  KbArticleResponse,
  KbArticleStatus,
  ListArticlesInput,
} from '@/lib/schemas/support/knowledge-base';

export const Route = createFileRoute('/_authenticated/support/knowledge-base')({
  validateSearch: z.object({
    categoryId: z.string().uuid().optional(),
    search: z.string().optional(),
    status: z.enum(['all', 'draft', 'published', 'archived']).default('all').optional(),
    tags: z.string().optional(),
    page: z.coerce.number().int().positive().default(1).optional(),
    sortBy: z.enum(['updatedAt', 'createdAt', 'title', 'viewCount', 'publishedAt']).default('updatedAt').optional(),
  }),
  component: KnowledgeBasePage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/support" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Knowledge Base"
        description="Articles, guides, and documentation"
      />
      <PageLayout.Content>
        <KnowledgeBaseSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

function KnowledgeBasePage() {
  const navigate = useNavigate({ from: Route.fullPath });
  const searchState = Route.useSearch();
  const [articleDialogOpen, setArticleDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<KbArticleResponse | null>(null);
  const [quickSearchOpen, setQuickSearchOpen] = useState(false);
  const [quickSearchInput, setQuickSearchInput] = useState('');
  const [previewArticleId, setPreviewArticleId] = useState<string | null>(null);
  const [pendingFeedbackArticleId, setPendingFeedbackArticleId] = useState<string | null>(null);
  const {
    apply: applyFeedbackDelta,
    rollback: rollbackFeedbackDelta,
    clear: clearFeedbackDelta,
    adjustCounts: adjustFeedbackCounts,
  } = useOptimisticFeedbackDeltas();

  const { data: categories, isLoading: categoriesLoading } = useKbCategories({
    isActive: true,
    includeArticleCount: true,
  });

  const searchInput = searchState.search ?? '';
  const status = (searchState.status ?? 'all') as KbArticleStatus | 'all';
  const selectedTags = (searchState.tags ?? '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
  const page = searchState.page ?? 1;
  const sortBy = (searchState.sortBy ?? 'updatedAt') as ListArticlesInput['sortBy'];
  const selectedCategory = (categories ?? []).find((category) => category.id === searchState.categoryId) ?? null;

  const updateSearchState = (updates: Partial<{
    categoryId?: string;
    search?: string;
    status?: 'all' | KbArticleStatus;
    tags?: string;
    page?: number;
    sortBy?: ListArticlesInput['sortBy'];
  }>) => {
    navigate({
      search: (prev) => ({
        ...prev,
        ...updates,
      }),
      replace: true,
    });
  };

  const debouncedSearch = useDebounce(searchInput, 300);
  const {
    data: articlesData,
    isLoading: articlesLoading,
    error: articlesError,
    refetch: refetchArticles,
  } = useKbArticles({
    categoryId: selectedCategory?.id ?? undefined,
    status: status === 'all' ? undefined : status,
    tags: selectedTags.length > 0 ? selectedTags : undefined,
    search: debouncedSearch || undefined,
    page,
    pageSize: 12,
    sortBy,
    sortOrder: 'desc',
  });

  const quickSearchDebounced = useDebounce(quickSearchInput, 300);
  const { data: quickSearchData, isLoading: quickSearchLoading } = useKbArticles({
    search: quickSearchDebounced || undefined,
    status: 'published',
    pageSize: 10,
    enabled: quickSearchOpen && quickSearchDebounced.length > 0,
  });

  const popularLimit = 5;
  const {
    data: popularViewedData,
    isLoading: popularViewedLoading,
    error: popularViewedError,
  } = useKbArticles({
    status: 'published',
    pageSize: popularLimit,
    sortBy: 'viewCount',
    sortOrder: 'desc',
  });
  const {
    data: helpfulData,
    isLoading: helpfulLoading,
    error: helpfulError,
  } = useKbArticles({
    status: 'published',
    pageSize: popularLimit * 2,
    sortBy: 'viewCount',
    sortOrder: 'desc',
  });

  const mostHelpful = useMemo(() => {
    return (helpfulData?.data ?? [])
      .slice()
      .sort((a, b) => {
        const scoreA = a.helpfulCount - a.notHelpfulCount;
        const scoreB = b.helpfulCount - b.notHelpfulCount;
        return scoreB - scoreA;
      })
      .slice(0, popularLimit);
  }, [helpfulData, popularLimit]);

  const hasSuggestionFilters = !!(debouncedSearch || selectedTags.length > 0);
  const {
    data: suggestedData,
    isLoading: suggestedLoading,
    error: suggestedError,
  } = useKbArticles({
    search: debouncedSearch || undefined,
    tags: selectedTags.length > 0 ? selectedTags : undefined,
    status: 'published',
    pageSize: popularLimit,
    sortBy: 'viewCount',
    sortOrder: 'desc',
    enabled: hasSuggestionFilters,
  });
  const rawSuggestedArticles = hasSuggestionFilters
    ? (suggestedData?.data ?? [])
    : (popularViewedData?.data ?? []);
  const suggestedArticles = rawSuggestedArticles.map(adjustFeedbackCounts);
  const suggestedIsLoading = hasSuggestionFilters ? suggestedLoading : popularViewedLoading;
  const suggestedErrorState = hasSuggestionFilters ? suggestedError : popularViewedError;

  const { data: previewArticle } = useKbArticle({
    articleId: previewArticleId ?? '',
    incrementViews: true,
    enabled: !!previewArticleId,
  });
  const previewArticleById = previewArticle
    ? {
        [previewArticle.id]: adjustFeedbackCounts(previewArticle),
      }
    : undefined;

  const feedbackMutation = useRecordArticleFeedback();

  const confirm = useConfirmation();
  const deleteArticleMutation = useDeleteKbArticle();
  const createArticleMutation = useCreateKbArticle();
  const updateArticleMutation = useUpdateKbArticle();
  const isArticleSubmitting = createArticleMutation.isPending || updateArticleMutation.isPending;

  const handleCreateArticle = () => {
    setEditingArticle(null);
    setArticleDialogOpen(true);
  };

  const handleEditArticle = (article: KbArticleResponse) => {
    setEditingArticle(article);
    setArticleDialogOpen(true);
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isArticleSubmitting) return;
    setArticleDialogOpen(nextOpen);
    if (!nextOpen) {
      setEditingArticle(null);
    }
  };

  const handleCategorySelect = (category: KbCategoryResponse | null) => {
    updateSearchState({
      categoryId: category?.id,
      page: 1,
    });
  };

  const handleSearchChange = (value: string) => {
    updateSearchState({ search: value || undefined, page: 1 });
  };

  const handleStatusChange = (value: KbArticleStatus | 'all') => {
    updateSearchState({ status: value, page: 1 });
  };

  const handleSortByChange = (value: ListArticlesInput['sortBy']) => {
    updateSearchState({ sortBy: value, page: 1 });
  };

  const handleTagToggle = (tag: string) => {
    const nextTags = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];
    updateSearchState({
      tags: nextTags.length > 0 ? nextTags.join(',') : undefined,
      page: 1,
    });
  };

  const handleClearTags = () => {
    updateSearchState({ tags: undefined, page: 1 });
  };

  const handleClearFilters = () => {
    updateSearchState({
      search: undefined,
      status: 'all',
      tags: undefined,
      page: 1,
    });
  };

  const handlePageChange = (nextPage: number) => {
    updateSearchState({ page: nextPage });
  };

  const handleQuickSearchSelect = (article: KbArticleResponse) => {
    updateSearchState({ search: article.title, page: 1 });
  };

  const handleDeleteArticle = async (article: KbArticleResponse) => {
    if (deleteArticleMutation.isPending) return;

    const confirmed = await confirm.confirm({
      title: 'Delete Article',
      description:
        'Are you sure you want to delete this knowledge base article? This action cannot be undone.',
      confirmLabel: 'Delete Article',
      variant: 'destructive',
    });

    if (confirmed.confirmed) {
      try {
        const result = await deleteArticleMutation.mutateAsync(article.id);
        toast.success(result.message ?? 'Article deleted successfully');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to delete article');
      }
    }
  };

  const handleRecordFeedback = async (articleId: string, helpful: boolean) => {
    applyFeedbackDelta(articleId, helpful);
    setPendingFeedbackArticleId(articleId);
    try {
      await feedbackMutation.mutateAsync({ articleId, helpful });
      clearFeedbackDelta(articleId);
    } catch (error) {
      rollbackFeedbackDelta(articleId, helpful);
      throw error;
    } finally {
      setPendingFeedbackArticleId(null);
    }
  };

  const handleSubmitArticle = async (values: ArticleFormValues) => {
    try {
      if (editingArticle) {
        await updateArticleMutation.mutateAsync({
          articleId: editingArticle.id,
          ...values,
        });
        toast.success('Article updated successfully');
      } else {
        await createArticleMutation.mutateAsync({
          title: values.title,
          slug: values.slug,
          summary: values.summary,
          content: values.content,
          categoryId: values.categoryId,
          tags: values.tags,
          status: values.status,
          metaTitle: values.metaTitle,
          metaDescription: values.metaDescription,
        });
        toast.success('Article created successfully');
      }
    } catch (error) {
      toast.error(editingArticle ? 'Failed to update article' : 'Failed to create article');
      throw error;
    }
  };

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Knowledge Base"
        description="Articles, guides, and documentation"
        actions={
          <Link
            to="/settings/knowledge-base"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          >
            <Settings className="mr-2 h-4 w-4" />
            Manage Categories
          </Link>
        }
      />

      <PageLayout.Content>
        <div className="grid gap-6 xl:grid-cols-[280px_1fr_320px]">
        {/* Sidebar - Categories */}
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <BookOpen className="h-4 w-4" />
              Categories
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {categoriesLoading ? (
              <LoadingState text="Loading..." />
            ) : (
                <KbCategoryTree
                  categories={categories ?? []}
                  selectedId={searchState.categoryId ?? null}
                  onSelect={handleCategorySelect}
                  showActions={false}
                  showCounts={true}
              />
            )}
          </CardContent>
        </Card>

        {/* Main Content - Articles */}
        <div className="space-y-4">
          {/* Breadcrumb */}
          {selectedCategory && (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <button onClick={() => handleCategorySelect(null)} className="hover:text-foreground">
                All Articles
              </button>
              <span>/</span>
              <span className="text-foreground font-medium">{selectedCategory.name}</span>
            </div>
          )}

          <KbArticleList
            categoryId={selectedCategory?.id}
            articles={articlesData?.data ?? []}
            pagination={articlesData?.pagination}
            isLoading={articlesLoading}
            error={articlesError}
            searchInput={searchInput}
            status={status}
            selectedTags={selectedTags}
            sortBy={sortBy}
            page={page}
            onSearchChange={handleSearchChange}
            onStatusChange={handleStatusChange}
            onSortByChange={handleSortByChange}
            onTagToggle={handleTagToggle}
            onClearTags={handleClearTags}
            onClearFilters={handleClearFilters}
            onPageChange={handlePageChange}
            onCreateArticle={handleCreateArticle}
            onEditArticle={handleEditArticle}
            onDeleteArticle={handleDeleteArticle}
            onRetry={() => {
              void refetchArticles();
            }}
          />
        </div>

        {/* Sidebar - Tools */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Quick Search</CardTitle>
            </CardHeader>
            <CardContent>
              <KbArticleSearch
                open={quickSearchOpen}
                onOpenChange={(open) => {
                  setQuickSearchOpen(open);
                  if (!open) {
                    setQuickSearchInput('');
                  }
                }}
                searchInput={quickSearchInput}
                onSearchChange={setQuickSearchInput}
                articles={quickSearchData?.data ?? []}
                isLoading={quickSearchLoading}
                onSelect={handleQuickSearchSelect}
                placeholder="Search published articles..."
              />
            </CardContent>
          </Card>

          <KbPopularArticles
            mostViewed={popularViewedData?.data ?? []}
            mostHelpful={mostHelpful}
            isLoading={popularViewedLoading || helpfulLoading}
            error={popularViewedError ?? helpfulError}
          />

          <KbSuggestedArticles
            articles={suggestedArticles}
            isLoading={suggestedIsLoading}
            error={suggestedErrorState}
            title="Suggested Articles"
            description={
              hasSuggestionFilters ? 'Articles matching your filters' : 'Most viewed articles'
            }
            previewArticleById={previewArticleById}
            onPreviewOpen={(article) => setPreviewArticleId(article.id)}
            onFeedback={handleRecordFeedback}
            isFeedbackPending={(articleId) =>
              feedbackMutation.isPending && pendingFeedbackArticleId === articleId
            }
          />
        </div>
      </div>

        {/* Article Dialog */}
        <KbArticleFormDialog
          key={editingArticle?.id ?? 'new'}
          open={articleDialogOpen}
          onOpenChange={handleDialogOpenChange}
          article={editingArticle}
          categories={categories ?? []}
          isSubmitting={isArticleSubmitting}
          onSubmit={handleSubmitArticle}
        />
      </PageLayout.Content>
    </PageLayout>
  );
}
