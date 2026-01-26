/**
 * DocumentHistoryList Component
 *
 * Displays a list of previously generated documents for an entity.
 * Shows filename, type, date, and file size with download links.
 *
 * @example
 * ```tsx
 * // Show document history for an order
 * <DocumentHistoryList
 *   entityType="order"
 *   entityId={orderId}
 * />
 *
 * // Filter to specific document type
 * <DocumentHistoryList
 *   entityType="order"
 *   entityId={orderId}
 *   documentType="quote"
 * />
 * ```
 */

import { memo } from 'react';
import {
  FileText,
  Download,
  Calendar,
  HardDrive,
  ExternalLink,
  FileQuestion,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  useDocumentHistory,
  formatFileSize,
  getDocumentTypeLabel,
  type DocumentEntityType,
  type DocumentType,
  type GeneratedDocument,
} from '@/hooks/documents/use-document-history';

// ============================================================================
// TYPES
// ============================================================================

export interface DocumentHistoryListProps {
  /** The type of entity to show documents for */
  entityType: DocumentEntityType;
  /** The ID of the entity */
  entityId: string;
  /** Optional filter by document type */
  documentType?: DocumentType;
  /** Maximum number of documents to show */
  limit?: number;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show as a card with header */
  showCard?: boolean;
  /** Title for the card header */
  title?: string;
  /** Display variant */
  variant?: 'table' | 'list' | 'compact';
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Format date for display
 */
function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get badge variant for document type
 */
function getDocumentBadgeVariant(
  type: DocumentType
): 'default' | 'secondary' | 'outline' {
  switch (type) {
    case 'quote':
    case 'invoice':
      return 'default';
    case 'work-order':
    case 'delivery-note':
      return 'secondary';
    default:
      return 'outline';
  }
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface DocumentRowProps {
  document: GeneratedDocument;
}

const DocumentTableRow = memo(function DocumentTableRow({ document }: DocumentRowProps) {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium truncate max-w-[200px]" title={document.filename}>
            {document.filename}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={getDocumentBadgeVariant(document.documentType)}>
          {getDocumentTypeLabel(document.documentType)}
        </Badge>
      </TableCell>
      <TableCell className="text-muted-foreground">
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {formatDate(document.generatedAt)}
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">
        <div className="flex items-center gap-1">
          <HardDrive className="h-3 w-3" />
          {formatFileSize(document.fileSize)}
        </div>
      </TableCell>
      <TableCell>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => window.open(document.storageUrl, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Open document</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>
    </TableRow>
  );
});

const DocumentListItem = memo(function DocumentListItem({ document }: DocumentRowProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-b-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex-shrink-0 w-8 h-8 rounded-md bg-muted flex items-center justify-center">
          <FileText className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="font-medium truncate" title={document.filename}>
            {document.filename}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge
              variant={getDocumentBadgeVariant(document.documentType)}
              className="text-xs"
            >
              {getDocumentTypeLabel(document.documentType)}
            </Badge>
            <span>{formatDate(document.generatedAt)}</span>
            <span>{formatFileSize(document.fileSize)}</span>
          </div>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="flex-shrink-0"
        onClick={() => window.open(document.storageUrl, '_blank')}
      >
        <Download className="h-4 w-4 mr-1" />
        Download
      </Button>
    </div>
  );
});

const DocumentCompactItem = memo(function DocumentCompactItem({ document }: DocumentRowProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-full justify-start gap-2 h-auto py-2"
      onClick={() => window.open(document.storageUrl, '_blank')}
    >
      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <span className="truncate flex-1 text-left">{document.filename}</span>
      <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
    </Button>
  );
});

// ============================================================================
// LOADING STATES
// ============================================================================

function TableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Filename</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Generated</TableHead>
          <TableHead>Size</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[1, 2, 3].map((i) => (
          <TableRow key={i}>
            <TableCell>
              <Skeleton className="h-4 w-40" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-16" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-32" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-12" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-8 w-8" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center justify-between py-3 border-b">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-md" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <Skeleton className="h-8 w-24" />
        </div>
      ))}
    </div>
  );
}

function CompactSkeleton() {
  return (
    <div className="space-y-1">
      {[1, 2].map((i) => (
        <Skeleton key={i} className="h-9 w-full" />
      ))}
    </div>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyState({ documentType }: { documentType?: DocumentType }) {
  const typeLabel = documentType ? getDocumentTypeLabel(documentType) : 'document';
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <FileQuestion className="h-12 w-12 text-muted-foreground/50 mb-3" />
      <p className="text-sm text-muted-foreground">
        No {typeLabel.toLowerCase()}s have been generated yet
      </p>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const DocumentHistoryList = memo(function DocumentHistoryList({
  entityType,
  entityId,
  documentType,
  limit = 10,
  className,
  showCard = true,
  title = 'Document History',
  variant = 'table',
}: DocumentHistoryListProps) {
  const { data, isLoading, error } = useDocumentHistory({
    entityType,
    entityId,
    documentType,
    limit,
  });

  // Render content based on variant
  const renderContent = () => {
    if (isLoading) {
      switch (variant) {
        case 'compact':
          return <CompactSkeleton />;
        case 'list':
          return <ListSkeleton />;
        default:
          return <TableSkeleton />;
      }
    }

    if (error) {
      return (
        <div className="flex items-center justify-center py-8 text-center text-destructive">
          <p className="text-sm">Failed to load document history</p>
        </div>
      );
    }

    if (!data?.documents.length) {
      return <EmptyState documentType={documentType} />;
    }

    switch (variant) {
      case 'compact':
        return (
          <div className="space-y-1">
            {data.documents.map((doc) => (
              <DocumentCompactItem key={doc.id} document={doc} />
            ))}
          </div>
        );

      case 'list':
        return (
          <div>
            {data.documents.map((doc) => (
              <DocumentListItem key={doc.id} document={doc} />
            ))}
          </div>
        );

      default:
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Filename</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Generated</TableHead>
                <TableHead>Size</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.documents.map((doc) => (
                <DocumentTableRow key={doc.id} document={doc} />
              ))}
            </TableBody>
          </Table>
        );
    }
  };

  // Wrap in card if requested
  if (showCard) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {title}
            </CardTitle>
            {data?.total ? (
              <Badge variant="secondary" className="font-normal">
                {data.total} document{data.total !== 1 ? 's' : ''}
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="pt-0">{renderContent()}</CardContent>
      </Card>
    );
  }

  return <div className={cn(className)}>{renderContent()}</div>;
});

export default DocumentHistoryList;
