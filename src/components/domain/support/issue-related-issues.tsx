/**
 * Related Issues Component
 *
 * Displays and manages linked/related issues.
 *
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-008
 */

import { useState } from 'react';
import { Link2, Plus, ExternalLink, Link2Off } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ============================================================================
// TYPES
// ============================================================================

export type RelationType = 'blocks' | 'blocked_by' | 'duplicates' | 'duplicated_by' | 'relates_to';

export interface RelatedIssue {
  id: string;
  issueNumber: string;
  title: string;
  status: string;
  priority: string;
  relationType: RelationType;
}

interface IssueSearchResult {
  id: string;
  issueNumber: string;
  title: string;
  status: string;
}

// ============================================================================
// RELATION CONFIG
// ============================================================================

const relationConfig: Record<RelationType, { label: string; description: string }> = {
  blocks: { label: 'Blocks', description: 'This issue blocks another' },
  blocked_by: { label: 'Blocked by', description: 'This issue is blocked by another' },
  duplicates: { label: 'Duplicates', description: 'This issue duplicates another' },
  duplicated_by: { label: 'Duplicated by', description: 'This issue is duplicated by another' },
  relates_to: { label: 'Relates to', description: 'Related issue' },
};

// ============================================================================
// LINK ISSUE POPOVER
// ============================================================================

interface LinkIssuePopoverProps {
  onLink: (issueId: string, relationType: RelationType) => void;
  searchResults: IssueSearchResult[];
  onSearch: (query: string) => void;
  isSearching: boolean;
  excludeIds?: string[];
}

function LinkIssuePopover({
  onLink,
  searchResults,
  onSearch,
  isSearching,
  excludeIds = [],
}: LinkIssuePopoverProps) {
  const [open, setOpen] = useState(false);
  const [relationType, setRelationType] = useState<RelationType>('relates_to');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredResults = searchResults.filter((r) => !excludeIds.includes(r.id));

  const handleLink = (issueId: string) => {
    onLink(issueId, relationType);
    setOpen(false);
    setSearchQuery('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Link Issue
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <div className="space-y-2 border-b p-3">
          <p className="text-sm font-medium">Link to Issue</p>
          <Select value={relationType} onValueChange={(v) => setRelationType(v as RelationType)}>
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(relationConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search issues..."
            value={searchQuery}
            onValueChange={(v) => {
              setSearchQuery(v);
              onSearch(v);
            }}
          />
          <CommandList>
            {isSearching ? (
              <div className="text-muted-foreground p-4 text-center text-sm">Searching...</div>
            ) : searchQuery.length === 0 ? (
              <div className="text-muted-foreground p-4 text-center text-sm">
                Start typing to search issues
              </div>
            ) : filteredResults.length === 0 ? (
              <CommandEmpty>No issues found.</CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredResults.map((issue) => (
                  <CommandItem
                    key={issue.id}
                    value={issue.id}
                    onSelect={() => handleLink(issue.id)}
                    className="flex flex-col items-start py-2"
                  >
                    <div className="flex w-full items-center gap-2">
                      <span className="text-muted-foreground font-mono text-xs">
                        {issue.issueNumber}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {issue.status}
                      </Badge>
                    </div>
                    <span className="mt-0.5 line-clamp-1 text-sm">{issue.title}</span>
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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface IssueRelatedIssuesProps {
  relatedIssues: RelatedIssue[];
  onLink: (issueId: string, relationType: RelationType) => void;
  onUnlink: (relatedIssueId: string) => void;
  onViewIssue: (issueId: string) => void;
  searchResults: IssueSearchResult[];
  onSearch: (query: string) => void;
  isSearching: boolean;
  currentIssueId: string;
}

export function IssueRelatedIssues({
  relatedIssues,
  onLink,
  onUnlink,
  onViewIssue,
  searchResults,
  onSearch,
  isSearching,
  currentIssueId,
}: IssueRelatedIssuesProps) {
  const excludeIds = [currentIssueId, ...relatedIssues.map((r) => r.id)];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Link2 className="h-4 w-4" />
              Related Issues
            </CardTitle>
            <CardDescription>
              {relatedIssues.length} linked issue{relatedIssues.length !== 1 ? 's' : ''}
            </CardDescription>
          </div>
          <LinkIssuePopover
            onLink={onLink}
            searchResults={searchResults}
            onSearch={onSearch}
            isSearching={isSearching}
            excludeIds={excludeIds}
          />
        </div>
      </CardHeader>
      <CardContent>
        {relatedIssues.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-sm">No related issues</p>
        ) : (
          <div className="space-y-2">
            {relatedIssues.map((issue) => (
              <div
                key={issue.id}
                className="hover:bg-muted/50 group flex items-start gap-2 rounded-md p-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {relationConfig[issue.relationType].label}
                    </Badge>
                    <span className="text-muted-foreground font-mono text-xs">
                      {issue.issueNumber}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {issue.status}
                    </Badge>
                  </div>
                  <p className="line-clamp-1 text-sm">{issue.title}</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => onViewIssue(issue.id)}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive h-7 w-7 p-0"
                    onClick={() => onUnlink(issue.id)}
                  >
                    <Link2Off className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
