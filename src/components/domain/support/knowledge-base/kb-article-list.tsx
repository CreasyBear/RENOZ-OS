/**
 * Knowledge Base Article List
 *
 * Displays articles with search, filtering, and pagination.
 *
 * @see src/hooks/use-knowledge-base.ts
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-007b
 */

import {
  Search,
  Plus,
  FileText,
  Eye,
  ThumbsUp,
  MoreHorizontal,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingState } from '@/components/shared/loading-state';
import { EmptyState } from '@/components/shared/empty-state';
import type {
  KbArticleResponse,
  KbArticleStatus,
  ListArticlesInput,
  ListArticlesResponse,
} from '@/lib/schemas/support/knowledge-base';

// ============================================================================
// TYPE GUARDS
// ============================================================================

function isKbStatusOrAll(v: string): v is KbArticleStatus | 'all' {
  return ['all', 'draft', 'published', 'archived'].includes(v);
}

function isSortBy(v: string): v is ListArticlesInput['sortBy'] {
  return ['updatedAt', 'createdAt', 'title', 'viewCount'].includes(v);
}

// ============================================================================
// STATUS BADGE
// ============================================================================

const statusConfig: Record<
  KbArticleStatus,
  { label: string; variant: 'default' | 'secondary' | 'outline' }
> = {
  draft: { label: 'Draft', variant: 'secondary' },
  published: { label: 'Published', variant: 'default' },
  archived: { label: 'Archived', variant: 'outline' },
};

function StatusBadge({ status }: { status: KbArticleStatus }) {
  const config = statusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

// ============================================================================
// ARTICLE CARD
// ============================================================================

interface ArticleCardProps {
  article: KbArticleResponse;
  onEdit: (article: KbArticleResponse) => void;
  onDelete: (article: KbArticleResponse) => void;
  onTagClick?: (tag: string) => void;
}

function ArticleCard({ article, onEdit, onDelete, onTagClick }: ArticleCardProps) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-1">
            <CardTitle className="line-clamp-1 text-base">{article.title}</CardTitle>
            {article.category && (
              <CardDescription className="text-xs">{article.category.name}</CardDescription>
            )}
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={article.status} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(article)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={() => onDelete(article)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {article.summary && (
          <p className="text-muted-foreground line-clamp-2 text-sm">{article.summary}</p>
        )}

        {article.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {article.tags.slice(0, 5).map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="hover:bg-muted cursor-pointer text-xs"
                onClick={() => onTagClick?.(tag)}
              >
                {tag}
              </Badge>
            ))}
            {article.tags.length > 5 && (
              <Badge variant="outline" className="text-xs">
                +{article.tags.length - 5}
              </Badge>
            )}
          </div>
        )}

        <div className="text-muted-foreground flex items-center gap-4 border-t pt-2 text-xs">
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {article.viewCount} views
          </span>
          <span className="flex items-center gap-1">
            <ThumbsUp className="h-3 w-3" />
            {article.helpfulCount} helpful
          </span>
          <span className="ml-auto">{new Date(article.updatedAt).toLocaleDateString()}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface KbArticleListProps {
  /** From route container (selected category). */
  categoryId?: string | null;
  /** From route container (useKbArticles). */
  articles: KbArticleResponse[];
  /** From route container (useKbArticles). */
  pagination?: ListArticlesResponse['pagination'];
  /** From route container (useKbArticles). */
  isLoading?: boolean;
  /** From route container (useKbArticles). */
  error?: unknown;
  /** From route container (filter state). */
  searchInput: string;
  /** From route container (filter state). */
  status: KbArticleStatus | 'all';
  /** From route container (filter state). */
  selectedTags: string[];
  /** From route container (filter state). */
  sortBy: ListArticlesInput['sortBy'];
  /** From route container (pagination state). */
  page: number;
  /** From route container (filter handler). */
  onSearchChange: (value: string) => void;
  /** From route container (filter handler). */
  onStatusChange: (value: KbArticleStatus | 'all') => void;
  /** From route container (filter handler). */
  onSortByChange: (value: ListArticlesInput['sortBy']) => void;
  /** From route container (filter handler). */
  onTagToggle: (tag: string) => void;
  /** From route container (filter handler). */
  onClearTags: () => void;
  /** From route container (filter handler). */
  onClearFilters: () => void;
  /** From route container (pagination handler). */
  onPageChange: (page: number) => void;
  /** From route container (action handler). */
  onCreateArticle: () => void;
  /** From route container (action handler). */
  onEditArticle: (article: KbArticleResponse) => void;
  /** From route container (useDeleteKbArticle). */
  onDeleteArticle: (article: KbArticleResponse) => void;
}

export function KbArticleList({
  categoryId,
  articles,
  pagination,
  isLoading,
  error,
  searchInput,
  status,
  selectedTags,
  sortBy,
  page,
  onSearchChange,
  onStatusChange,
  onSortByChange,
  onTagToggle,
  onClearTags,
  onClearFilters,
  onPageChange,
  onCreateArticle,
  onEditArticle,
  onDeleteArticle,
}: KbArticleListProps) {
  const hasFilters = searchInput || status !== 'all' || selectedTags.length > 0 || categoryId;

  if (isLoading) {
    return <LoadingState text="Loading articles..." />;
  }

  if (error) {
    return (
      <div className="text-destructive py-8 text-center">
        Failed to load articles. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search articles..."
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select
          value={status}
          onValueChange={(value) => {
            if (isKbStatusOrAll(value)) onStatusChange(value);
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={sortBy}
          onValueChange={(value) => {
            if (isSortBy(value)) onSortByChange(value);
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updatedAt">Last Updated</SelectItem>
            <SelectItem value="createdAt">Created Date</SelectItem>
            <SelectItem value="title">Title</SelectItem>
            <SelectItem value="viewCount">Most Viewed</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={onCreateArticle}>
          <Plus className="mr-2 h-4 w-4" />
          New Article
        </Button>
      </div>

      {/* Active Tag Filters */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-sm">Filtered by tags:</span>
          {selectedTags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="cursor-pointer gap-1"
              onClick={() => onTagToggle(tag)}
            >
              {tag}
              <X className="h-3 w-3" />
            </Badge>
          ))}
          <Button variant="ghost" size="sm" onClick={onClearTags} className="text-xs">
            Clear tags
          </Button>
        </div>
      )}

      {/* Results */}
      {articles.length === 0 ? (
        <EmptyState
          icon={FileText}
          message={hasFilters ? 'No articles match your filters' : 'No articles yet'}
          primaryAction={
            hasFilters
              ? { label: 'Clear Filters', onClick: onClearFilters }
              : { label: 'Create Article', onClick: onCreateArticle }
          }
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                onEdit={onEditArticle}
                onDelete={onDeleteArticle}
                onTagClick={onTagToggle}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t pt-4">
              <p className="text-muted-foreground text-sm">
                Showing {(pagination.page - 1) * pagination.pageSize + 1} -{' '}
                {Math.min(pagination.page * pagination.pageSize, pagination.totalCount)} of{' '}
                {pagination.totalCount} articles
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(page + 1)}
                  disabled={page >= pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
