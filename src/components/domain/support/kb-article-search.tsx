/**
 * Knowledge Base Article Search
 *
 * Command-style search for KB articles, used in issue forms.
 *
 * @see src/hooks/use-knowledge-base.ts
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-007c
 */

import { Search, FileText, Eye, ThumbsUp, X } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { KbArticleResponse } from '@/lib/schemas/support/knowledge-base';

// ============================================================================
// COMPONENT
// ============================================================================

interface KbArticleSearchProps {
  onSelect: (article: KbArticleResponse) => void;
  selectedArticle?: KbArticleResponse | null;
  onClear?: () => void;
  placeholder?: string;
  disabled?: boolean;
  /** From route container (search state). */
  open: boolean;
  /** From route container (search state). */
  onOpenChange: (open: boolean) => void;
  /** From route container (search state). */
  searchInput: string;
  /** From route container (search state). */
  onSearchChange: (value: string) => void;
  /** From route container (useKbArticles). */
  articles: KbArticleResponse[];
  /** From route container (useKbArticles). */
  isLoading?: boolean;
}

export function KbArticleSearch({
  onSelect,
  selectedArticle,
  onClear,
  placeholder = 'Search knowledge base...',
  disabled = false,
  open,
  onOpenChange,
  searchInput,
  onSearchChange,
  articles,
  isLoading,
}: KbArticleSearchProps) {
  const handleSelect = (article: KbArticleResponse) => {
    onSelect(article);
    onOpenChange(false);
    onSearchChange('');
  };

  // If there's a selected article, show it instead of the search button
  if (selectedArticle) {
    return (
      <div className="bg-muted/30 flex items-center gap-2 rounded-md border p-2">
        <FileText className="text-muted-foreground h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{selectedArticle.title}</p>
          {selectedArticle.category && (
            <p className="text-muted-foreground text-xs">{selectedArticle.category.name}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            <Eye className="mr-1 h-3 w-3" />
            {selectedArticle.viewCount}
          </Badge>
          {onClear && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={onClear}
              disabled={disabled}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="text-muted-foreground w-full justify-start"
          disabled={disabled}
        >
          <Search className="mr-2 h-4 w-4" />
          {placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search articles..."
            value={searchInput}
            onValueChange={onSearchChange}
          />
          <CommandList>
            {isLoading ? (
              <div className="text-muted-foreground p-4 text-center text-sm">Searching...</div>
            ) : searchInput.length === 0 ? (
              <div className="text-muted-foreground p-4 text-center text-sm">
                Type to search articles
              </div>
            ) : articles.length === 0 ? (
              <CommandEmpty>No articles found.</CommandEmpty>
            ) : (
              <CommandGroup>
                {articles.map((article) => (
                  <CommandItem
                    key={article.id}
                    value={article.id}
                    onSelect={() => handleSelect(article)}
                    className="flex flex-col items-start py-3"
                  >
                    <div className="flex w-full items-center gap-2">
                      <FileText className="text-muted-foreground h-4 w-4 shrink-0" />
                      <span className="flex-1 truncate font-medium">{article.title}</span>
                    </div>
                    {article.summary && (
                      <p className="text-muted-foreground mt-1 ml-6 line-clamp-1 text-xs">
                        {article.summary}
                      </p>
                    )}
                    <div className="text-muted-foreground mt-1 ml-6 flex items-center gap-3 text-xs">
                      {article.category && <span>{article.category.name}</span>}
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {article.viewCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="h-3 w-3" />
                        {article.helpfulCount}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
