/**
 * KB Suggested Articles
 *
 * Shows relevant KB articles based on issue context (type, tags, search terms).
 * Includes quick preview and helpfulness tracking.
 *
 * @see src/hooks/use-knowledge-base.ts
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-007c
 */

import { useState } from 'react';
import { FileText, Eye, ThumbsUp, ThumbsDown, ExternalLink, BookOpen } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import type { KbArticleResponse } from '@/lib/schemas/support/knowledge-base';

// ============================================================================
// ARTICLE PREVIEW POPOVER
// ============================================================================

interface ArticlePreviewProps {
  article: KbArticleResponse;
  /** From route container (preview detail lookup). */
  previewArticle?: KbArticleResponse;
  onLinkArticle?: (article: KbArticleResponse) => void;
  /** From route container (useRecordArticleFeedback). */
  onFeedback?: (articleId: string, helpful: boolean) => Promise<void>;
  /** From route container (useRecordArticleFeedback). */
  isFeedbackPending?: boolean;
}

function ArticlePreview({
  article,
  previewArticle,
  onLinkArticle,
  onFeedback,
  isFeedbackPending,
}: ArticlePreviewProps) {
  const [hasVoted, setHasVoted] = useState(false);

  const handleFeedback = async (helpful: boolean) => {
    if (hasVoted || !onFeedback || isFeedbackPending) return;
    try {
      await onFeedback(article.id, helpful);
      setHasVoted(true);
      toast.success(helpful ? 'Thanks for the feedback!' : "We'll work on improving this article");
    } catch {
      toast.error('Failed to record feedback');
    }
  };

  const displayArticle = previewArticle ?? article;

  return (
    <div className="max-w-md space-y-3">
      <div>
        <h4 className="font-semibold">{displayArticle.title}</h4>
        {displayArticle.category && (
          <p className="text-muted-foreground text-xs">{displayArticle.category.name}</p>
        )}
      </div>

      {displayArticle.summary && (
        <p className="text-muted-foreground text-sm">{displayArticle.summary}</p>
      )}

      {/* Tags */}
      {displayArticle.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {displayArticle.tags.slice(0, 5).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="text-muted-foreground flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1">
          <Eye className="h-3 w-3" />
          {displayArticle.viewCount} views
        </span>
        <span className="flex items-center gap-1">
          <ThumbsUp className="h-3 w-3" />
          {displayArticle.helpfulCount} helpful
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t pt-2">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">Was this helpful?</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => handleFeedback(true)}
            disabled={hasVoted || isFeedbackPending || !onFeedback}
          >
            <ThumbsUp className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => handleFeedback(false)}
            disabled={hasVoted || isFeedbackPending || !onFeedback}
          >
            <ThumbsDown className="h-3 w-3" />
          </Button>
        </div>
        {onLinkArticle && (
          <Button
            variant="outline"
            size="sm"
            className="h-7"
            onClick={() => onLinkArticle(displayArticle)}
          >
            <ExternalLink className="mr-1 h-3 w-3" />
            Link
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// ARTICLE CARD
// ============================================================================

interface SuggestedArticleCardProps {
  article: KbArticleResponse;
  previewArticle?: KbArticleResponse;
  onLinkArticle?: (article: KbArticleResponse) => void;
  onPreviewOpen?: (article: KbArticleResponse) => void;
  onFeedback?: (articleId: string, helpful: boolean) => Promise<void>;
  isFeedbackPending?: boolean;
}

function SuggestedArticleCard({
  article,
  previewArticle,
  onLinkArticle,
  onPreviewOpen,
  onFeedback,
  isFeedbackPending,
}: SuggestedArticleCardProps) {
  const handleOpenChange = (open: boolean) => {
    if (open) {
      onPreviewOpen?.(article);
    }
  };

  return (
    <Popover onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <div className="hover:bg-muted/50 flex cursor-pointer items-start gap-2 rounded-md p-2 transition-colors">
          <FileText className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="line-clamp-1 text-sm font-medium">{article.title}</p>
            <div className="text-muted-foreground mt-0.5 flex items-center gap-2 text-xs">
              <span className="flex items-center gap-0.5">
                <Eye className="h-3 w-3" />
                {article.viewCount}
              </span>
              <span className="flex items-center gap-0.5">
                <ThumbsUp className="h-3 w-3" />
                {article.helpfulCount}
              </span>
            </div>
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent side="left" className="w-80">
        <ArticlePreview
          article={article}
          previewArticle={previewArticle}
          onLinkArticle={onLinkArticle}
          onFeedback={onFeedback}
          isFeedbackPending={isFeedbackPending}
        />
      </PopoverContent>
    </Popover>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface KbSuggestedArticlesProps {
  /** From route container (useKbArticles). */
  articles: KbArticleResponse[];
  /** From route container (useKbArticles). */
  isLoading?: boolean;
  /** From route container (useKbArticles). */
  error?: unknown;
  /** Maximum number of articles to show */
  limit?: number;
  /** Callback when an article is selected to link */
  onLinkArticle?: (article: KbArticleResponse) => void;
  /** From route container (preview detail lookup). */
  previewArticleById?: Record<string, KbArticleResponse | undefined>;
  /** From route container (useRecordArticleFeedback). */
  onFeedback?: (articleId: string, helpful: boolean) => Promise<void>;
  /** From route container (useRecordArticleFeedback). */
  isFeedbackPending?: (articleId: string) => boolean;
  /** From route container (preview load handler). */
  onPreviewOpen?: (article: KbArticleResponse) => void;
  /** Show as compact list or full cards */
  variant?: 'compact' | 'card';
  /** Title for the section */
  title?: string;
  /** Optional description for card variant */
  description?: string;
}

export function KbSuggestedArticles({
  articles,
  isLoading,
  error,
  limit = 5,
  onLinkArticle,
  previewArticleById,
  onFeedback,
  isFeedbackPending,
  onPreviewOpen,
  variant = 'compact',
  title = 'Suggested Articles',
  description,
}: KbSuggestedArticlesProps) {
  const displayArticles = articles.slice(0, limit);
  const loading = isLoading ?? false;
  const hasError = !!error;

  if (variant === 'card') {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <BookOpen className="h-4 w-4" />
            {title}
          </CardTitle>
          <CardDescription>{description ?? 'Recommended knowledge base articles'}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : hasError ? (
            <p className="text-muted-foreground text-sm">Failed to load suggestions</p>
          ) : displayArticles.length === 0 ? (
            <p className="text-muted-foreground text-sm">No articles found</p>
          ) : (
            <div className="space-y-1">
              {displayArticles.map((article) => (
                <SuggestedArticleCard
                  key={article.id}
                  article={article}
                  previewArticle={previewArticleById?.[article.id]}
                  onLinkArticle={onLinkArticle}
                  onPreviewOpen={onPreviewOpen}
                  onFeedback={onFeedback}
                  isFeedbackPending={isFeedbackPending?.(article.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Compact variant
  return (
    <div className="space-y-2">
      <h4 className="flex items-center gap-2 text-sm font-medium">
        <BookOpen className="h-4 w-4" />
        {title}
      </h4>
      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : hasError ? (
        <p className="text-muted-foreground text-xs">Failed to load suggestions</p>
      ) : displayArticles.length === 0 ? (
        <p className="text-muted-foreground text-xs">No articles found</p>
      ) : (
        <div className="space-y-0.5">
          {displayArticles.map((article) => (
            <SuggestedArticleCard
              key={article.id}
              article={article}
              previewArticle={previewArticleById?.[article.id]}
              onLinkArticle={onLinkArticle}
              onPreviewOpen={onPreviewOpen}
              onFeedback={onFeedback}
              isFeedbackPending={isFeedbackPending?.(article.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
