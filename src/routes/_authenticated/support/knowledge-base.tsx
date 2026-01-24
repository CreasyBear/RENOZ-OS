/**
 * Knowledge Base Articles Page
 *
 * Main page for browsing and managing KB articles.
 *
 * @see src/components/domain/support/kb-article-list.tsx
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-007b
 */

import { useMemo, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { BookOpen, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/shared/loading-state';
import { KbCategoryTree } from '@/components/domain/support/kb-category-tree';
import { KbArticleList } from '@/components/domain/support/kb-article-list';
import { KbArticleSearch } from '@/components/domain/support/kb-article-search';
import { KbPopularArticles } from '@/components/domain/support/kb-popular-articles';
import { KbSuggestedArticles } from '@/components/domain/support/kb-suggested-articles';
import {
  KbArticleFormDialog,
  type ArticleFormValues,
} from '@/components/domain/support/kb-article-form-dialog';
import {
  useKbCategories,
  useKbArticles,
  useKbArticle,
  useDeleteKbArticle,
  useCreateKbArticle,
  useUpdateKbArticle,
  useRecordArticleFeedback,
} from '@/hooks/support';
import { useDebounce } from '@/hooks/_shared';
import { useConfirmation } from '@/hooks/use-confirmation';
import { toast } from 'sonner';
import type {
  KbCategoryResponse,
  KbArticleResponse,
  KbArticleStatus,
  ListArticlesInput,
} from '@/lib/schemas/support/knowledge-base';

export const Route = createFileRoute('/_authenticated/support/knowledge-base')({
  component: KnowledgeBasePage,
});

function KnowledgeBasePage() {
  const [selectedCategory, setSelectedCategory] = useState<KbCategoryResponse | null>(null);
  const [articleDialogOpen, setArticleDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<KbArticleResponse | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState<KbArticleStatus | 'all'>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<ListArticlesInput['sortBy']>('updatedAt');
  const [quickSearchOpen, setQuickSearchOpen] = useState(false);
  const [quickSearchInput, setQuickSearchInput] = useState('');
  const [previewArticleId, setPreviewArticleId] = useState<string | null>(null);

  const { data: categories, isLoading: categoriesLoading } = useKbCategories({
    isActive: true,
    includeArticleCount: true,
  });

  const debouncedSearch = useDebounce(searchInput, 300);
  const {
    data: articlesData,
    isLoading: articlesLoading,
    error: articlesError,
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
  const suggestedArticles = hasSuggestionFilters
    ? (suggestedData?.data ?? [])
    : (popularViewedData?.data ?? []);
  const suggestedIsLoading = hasSuggestionFilters ? suggestedLoading : popularViewedLoading;
  const suggestedErrorState = hasSuggestionFilters ? suggestedError : popularViewedError;

  const { data: previewArticle } = useKbArticle({
    articleId: previewArticleId ?? '',
    incrementViews: true,
    enabled: !!previewArticleId,
  });
  const previewArticleById = previewArticle ? { [previewArticle.id]: previewArticle } : undefined;

  const feedbackMutation = useRecordArticleFeedback();

  const confirm = useConfirmation();
  const deleteArticleMutation = useDeleteKbArticle();
  const createArticleMutation = useCreateKbArticle();
  const updateArticleMutation = useUpdateKbArticle();

  const handleCreateArticle = () => {
    setEditingArticle(null);
    setArticleDialogOpen(true);
  };

  const handleEditArticle = (article: KbArticleResponse) => {
    setEditingArticle(article);
    setArticleDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setArticleDialogOpen(false);
    setEditingArticle(null);
  };

  const handleCategorySelect = (category: KbCategoryResponse | null) => {
    setSelectedCategory(category);
    setPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    setPage(1);
  };

  const handleStatusChange = (value: KbArticleStatus | 'all') => {
    setStatus(value);
    setPage(1);
  };

  const handleSortByChange = (value: ListArticlesInput['sortBy']) => {
    setSortBy(value);
    setPage(1);
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
    setPage(1);
  };

  const handleClearTags = () => {
    setSelectedTags([]);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setStatus('all');
    setSelectedTags([]);
    setPage(1);
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
  };

  const handleQuickSearchSelect = (article: KbArticleResponse) => {
    setSearchInput(article.title);
    setPage(1);
  };

  const handleDeleteArticle = async (article: KbArticleResponse) => {
    const confirmed = await confirm.confirm({
      title: 'Delete Article',
      description:
        'Are you sure you want to delete this knowledge base article? This action cannot be undone.',
      confirmLabel: 'Delete Article',
      variant: 'destructive',
    });

    if (confirmed.confirmed) {
      try {
        await deleteArticleMutation.mutateAsync(article.id);
        toast.success('Article deleted successfully');
      } catch {
        toast.error('Failed to delete article');
      }
    }
  };

  const handleRecordFeedback = async (articleId: string, helpful: boolean) => {
    await feedbackMutation.mutateAsync({ articleId, helpful });
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
    <div className="container space-y-6 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Knowledge Base</h1>
          <p className="text-muted-foreground">Articles, guides, and documentation</p>
        </div>
        <Link to="/settings/knowledge-base">
          <Button variant="outline" size="sm">
            <Settings className="mr-2 h-4 w-4" />
            Manage Categories
          </Button>
        </Link>
      </div>

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
                selectedId={selectedCategory?.id ?? null}
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
              <button onClick={() => setSelectedCategory(null)} className="hover:text-foreground">
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
            isFeedbackPending={() => feedbackMutation.isPending}
          />
        </div>
      </div>

      {/* Article Dialog */}
      <KbArticleFormDialog
        key={editingArticle?.id ?? 'new'}
        open={articleDialogOpen}
        onOpenChange={handleCloseDialog}
        article={editingArticle}
        categories={categories ?? []}
        isSubmitting={createArticleMutation.isPending || updateArticleMutation.isPending}
        onSubmit={handleSubmitArticle}
      />
    </div>
  );
}
