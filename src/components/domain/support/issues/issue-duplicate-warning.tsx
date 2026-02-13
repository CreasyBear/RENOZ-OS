/**
 * Issue Duplicate Warning
 *
 * Displays potential duplicate issues when creating a new issue.
 *
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-008
 */

import { AlertTriangle, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

// ============================================================================
// TYPES
// ============================================================================

import type { PotentialDuplicate } from '@/lib/schemas/support/issues';

// ============================================================================
// COMPONENT
// ============================================================================

interface IssueDuplicateWarningProps {
  duplicates: PotentialDuplicate[];
  onDismiss: () => void;
  onViewIssue: (issueId: string) => void;
  customerName?: string;
}

export function IssueDuplicateWarning({
  duplicates,
  onDismiss,
  onViewIssue,
  customerName,
}: IssueDuplicateWarningProps) {
  if (duplicates.length === 0) return null;

  return (
    <Alert variant="destructive" className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Possible Duplicate Issue</AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-3 text-sm">
          {customerName
            ? `We found ${duplicates.length} existing issue${duplicates.length > 1 ? 's' : ''} for ${customerName} with similar details:`
            : `We found ${duplicates.length} similar existing issue${duplicates.length > 1 ? 's' : ''}:`}
        </p>

        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="mb-2">
              View {duplicates.length > 1 ? 'issues' : 'issue'}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 space-y-2">
              {duplicates.map((dup) => (
                <div
                  key={dup.id}
                  className="bg-background flex items-start justify-between rounded border p-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground font-mono text-xs">
                        {dup.issueNumber}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {dup.status}
                      </Badge>
                      <Badge variant="secondary" className="text-xs" title="Similarity score">
                        {Math.round(dup.similarity * 100)}% match
                      </Badge>
                    </div>
                    <p className="mt-1 line-clamp-1 text-sm font-medium">{dup.title}</p>
                    <p className="text-muted-foreground text-xs">
                      Created {new Date(dup.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2 shrink-0"
                    onClick={() => onViewIssue(dup.id)}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div className="mt-3 flex gap-2">
          <Button variant="outline" size="sm" onClick={onDismiss}>
            Create Anyway
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

