/**
 * Opportunity Documents Tab
 *
 * Displays generated documents (quotes, PDFs) for an opportunity.
 * Shows document history with download links, file sizes, and generation dates.
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md (Tabs Philosophy)
 */

import { memo } from 'react';
import { format } from 'date-fns';
import {
  FileText,
  Download,
  Calendar,
  HardDrive,
  RefreshCw,
  FileQuestion,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  useDocumentHistory,
  formatFileSize,
  getDocumentTypeLabel,
} from '@/hooks/documents';

// ============================================================================
// TYPES
// ============================================================================

export interface OpportunityDocumentsTabProps {
  opportunityId: string;
  className?: string;
}

// ============================================================================
// DOCUMENT CARD
// ============================================================================

interface DocumentCardProps {
  document: {
    id: string;
    documentType: string;
    filename: string;
    storageUrl: string;
    fileSize: number | null;
    generatedAt: Date | string;
  };
}

function DocumentCard({ document }: DocumentCardProps) {
  const generatedDate = new Date(document.generatedAt);

  const handleDownload = () => {
    window.open(document.storageUrl, '_blank');
  };

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-4">
        {/* Document icon */}
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <FileText className="h-5 w-5 text-primary" />
        </div>

        {/* Document info */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{document.filename}</span>
            <Badge variant="secondary" className="text-xs">
              {getDocumentTypeLabel(document.documentType as 'quote')}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(generatedDate, 'PPp')}
            </span>
            {document.fileSize && (
              <span className="flex items-center gap-1">
                <HardDrive className="h-3 w-3" />
                {formatFileSize(document.fileSize)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Download button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleDownload}
        className="shrink-0"
      >
        <Download className="h-4 w-4 mr-2" />
        Download
      </Button>
    </div>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 border border-dashed rounded-lg">
      <FileQuestion className="h-12 w-12 text-muted-foreground/50 mb-4" />
      <p className="text-muted-foreground font-medium">No documents yet</p>
      <p className="text-sm text-muted-foreground mt-1">
        Generate a quote PDF to see it here
      </p>
    </div>
  );
}

// ============================================================================
// LOADING STATE
// ============================================================================

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2].map((i) => (
        <div key={i} className="flex items-center gap-4 p-4 rounded-lg border">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-9 w-24" />
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const OpportunityDocumentsTab = memo(function OpportunityDocumentsTab({
  opportunityId,
  className,
}: OpportunityDocumentsTabProps) {
  const {
    data,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useDocumentHistory({
    entityType: 'opportunity',
    entityId: opportunityId,
  });

  const documents = data?.documents ?? [];

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Documents</h2>
          <p className="text-sm text-muted-foreground">
            Generated quotes and other documents
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCw className={cn('h-4 w-4 mr-2', isRefetching && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : error ? (
        <div className="text-center py-8 text-destructive">
          <p>Failed to load documents</p>
          <Button variant="link" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : documents.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <DocumentCard key={doc.id} document={doc} />
          ))}
        </div>
      )}
    </div>
  );
});

export default OpportunityDocumentsTab;
