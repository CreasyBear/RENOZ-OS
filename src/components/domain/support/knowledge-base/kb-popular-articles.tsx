/**
 * KB Popular Articles Widget
 *
 * Displays most viewed and most helpful KB articles.
 *
 * @see src/hooks/use-knowledge-base.ts
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-007c
 */

import { Link } from '@tanstack/react-router';
import { FileText, Eye, ThumbsUp, TrendingUp, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { KbArticleResponse } from '@/lib/schemas/support/knowledge-base';

// ============================================================================
// ARTICLE ITEM
// ============================================================================

interface ArticleItemProps {
  article: KbArticleResponse;
  metric: 'views' | 'helpful';
}

function ArticleItem({ article, metric }: ArticleItemProps) {
  return (
    <div className="hover:bg-muted/50 flex items-start gap-3 rounded-md p-2 transition-colors">
      <FileText className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-sm font-medium">{article.title}</p>
        {article.category && (
          <p className="text-muted-foreground text-xs">{article.category.name}</p>
        )}
      </div>
      <div className="text-muted-foreground flex shrink-0 items-center gap-1 text-xs">
        {metric === 'views' ? (
          <>
            <Eye className="h-3 w-3" />
            {article.viewCount}
          </>
        ) : (
          <>
            <ThumbsUp className="h-3 w-3" />
            {article.helpfulCount}
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// LOADING STATE
// ============================================================================

function ArticleListSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-2">
          <Skeleton className="h-4 w-4 shrink-0" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-4 w-8" />
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface KbPopularArticlesProps {
  showTabs?: boolean;
  title?: string;
  /** From route container (useKbArticles). */
  mostViewed: KbArticleResponse[];
  /** From route container (useKbArticles). */
  mostHelpful: KbArticleResponse[];
  /** From route container (useKbArticles). */
  isLoading?: boolean;
  /** From route container (useKbArticles). */
  error?: unknown;
}

export function KbPopularArticles({
  showTabs = true,
  title = 'Popular Articles',
  mostViewed,
  mostHelpful,
  isLoading,
  error,
}: KbPopularArticlesProps) {
  const hasError = !!error;

  if (showTabs) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Tabs defaultValue="viewed" className="w-full">
            <TabsList className="grid h-8 w-full grid-cols-2">
              <TabsTrigger value="viewed" className="text-xs">
                Most Viewed
              </TabsTrigger>
              <TabsTrigger value="helpful" className="text-xs">
                Most Helpful
              </TabsTrigger>
            </TabsList>
            <TabsContent value="viewed" className="mt-3">
              {isLoading ? (
                <ArticleListSkeleton />
              ) : hasError ? (
                <p className="text-muted-foreground py-4 text-center text-sm">
                  Failed to load articles
                </p>
              ) : mostViewed.length === 0 ? (
                <p className="text-muted-foreground py-4 text-center text-sm">No articles yet</p>
              ) : (
                <div className="space-y-0.5">
                  {mostViewed.map((article) => (
                    <ArticleItem key={article.id} article={article} metric="views" />
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="helpful" className="mt-3">
              {isLoading ? (
                <ArticleListSkeleton />
              ) : hasError ? (
                <p className="text-muted-foreground py-4 text-center text-sm">
                  Failed to load articles
                </p>
              ) : mostHelpful.length === 0 ? (
                <p className="text-muted-foreground py-4 text-center text-sm">No articles yet</p>
              ) : (
                <div className="space-y-0.5">
                  {mostHelpful.map((article) => (
                    <ArticleItem key={article.id} article={article} metric="helpful" />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="mt-4 border-t pt-3">
            <Link
              to="/support/knowledge-base"
              className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'w-full')}
            >
              View All Articles
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Non-tabbed simple list (most viewed only)
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <TrendingUp className="h-4 w-4" />
          {title}
        </CardTitle>
        <CardDescription>Top articles by views</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <ArticleListSkeleton />
        ) : hasError ? (
          <p className="text-muted-foreground text-sm">Failed to load articles</p>
        ) : mostViewed.length === 0 ? (
          <p className="text-muted-foreground text-sm">No articles yet</p>
        ) : (
          <div className="space-y-0.5">
            {mostViewed.map((article) => (
              <ArticleItem key={article.id} article={article} metric="views" />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
