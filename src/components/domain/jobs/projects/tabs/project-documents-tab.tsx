/**
 * Project Documents Tab
 *
 * Displays generated documents (work orders, completion certificates)
 * for a project. Shows document history with download links, file sizes, and dates.
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md (Tabs Philosophy)
 * @see src/components/domain/orders/tabs/order-documents-tab.tsx (Pattern reference)
 */

import React, { memo } from 'react';
import { format } from 'date-fns';
import {
  FileText,
  Download,
  Calendar,
  HardDrive,
  RefreshCw,
  FileQuestion,
  ClipboardList,
  Award,
  Loader2,
  Package,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  useDocumentHistory,
  formatFileSize,
  getDocumentTypeLabel,
  type DocumentType,
} from '@/hooks/documents';

// ============================================================================
// TYPES
// ============================================================================

export interface ProjectDocumentActions {
  onGenerateWorkOrder: () => Promise<void>;
  onGenerateCompletionCertificate: () => Promise<void>;
  isGeneratingWorkOrder: boolean;
  isGeneratingCompletionCertificate: boolean;
  // Generated URLs (for immediate download after generation)
  workOrderUrl?: string;
  completionCertificateUrl?: string;
}

export interface ProjectDocumentsTabProps {
  projectId: string;
  projectStatus?: string;
  documentActions?: ProjectDocumentActions;
  className?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

const PROJECT_DOCUMENT_TYPE_ICONS: Record<string, React.ElementType> = {
  'work-order': ClipboardList,
  'completion-certificate': Award,
  'handover-pack': Package,
};

const BADGE_VARIANT_BY_TYPE: Record<string, 'default' | 'secondary' | 'outline'> = {
  'work-order': 'secondary',
  'completion-certificate': 'default',
  'handover-pack': 'default',
};

function getDocumentBadgeVariant(documentType: string): 'default' | 'secondary' | 'outline' {
  return BADGE_VARIANT_BY_TYPE[documentType] ?? 'outline';
}

const DOCUMENT_TYPE_SET: Record<DocumentType, true> = {
  quote: true,
  invoice: true,
  'delivery-note': true,
  'work-order': true,
  'warranty-certificate': true,
  'completion-certificate': true,
};

function isDocumentType(s: string): s is DocumentType {
  return s in DOCUMENT_TYPE_SET;
}

function getProjectDocumentTypeLabel(documentType: string): string {
  switch (documentType) {
    case 'work-order':
      return 'Work Order';
    case 'completion-certificate':
      return 'Completion Certificate';
    case 'handover-pack':
      return 'Handover Pack';
    default:
      return isDocumentType(documentType) ? getDocumentTypeLabel(documentType) : 'Document';
  }
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
  const IconComponent = PROJECT_DOCUMENT_TYPE_ICONS[document.documentType] ?? FileText;

  const handleDownload = () => {
    window.open(document.storageUrl, '_blank');
  };

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-4">
        {/* Document icon */}
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <IconComponent className="h-5 w-5 text-primary" />
        </div>

        {/* Document info */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{document.filename}</span>
            <Badge
              variant={getDocumentBadgeVariant(document.documentType)}
              className="text-xs"
            >
              {getProjectDocumentTypeLabel(document.documentType)}
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
// GENERATE BUTTONS
// ============================================================================

interface GenerateButtonsProps {
  projectStatus?: string;
  documentActions: ProjectDocumentActions;
}

function GenerateButtons({ projectStatus, documentActions }: GenerateButtonsProps) {
  const isCompleted = projectStatus === 'completed';

  return (
    <div className="flex flex-wrap gap-2">
      {/* Work Order */}
      {documentActions.workOrderUrl ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(documentActions.workOrderUrl, '_blank')}
        >
          <Download className="h-4 w-4 mr-2" />
          Download Work Order
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={documentActions.onGenerateWorkOrder}
          disabled={documentActions.isGeneratingWorkOrder}
        >
          {documentActions.isGeneratingWorkOrder ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <ClipboardList className="h-4 w-4 mr-2" />
              Generate Work Order
            </>
          )}
        </Button>
      )}

      {/* Completion Certificate - only show if project is completed */}
      {isCompleted && (
        documentActions.completionCertificateUrl ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(documentActions.completionCertificateUrl, '_blank')}
          >
            <Download className="h-4 w-4 mr-2" />
            Download Certificate
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={documentActions.onGenerateCompletionCertificate}
            disabled={documentActions.isGeneratingCompletionCertificate}
          >
            {documentActions.isGeneratingCompletionCertificate ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Award className="h-4 w-4 mr-2" />
                Generate Certificate
              </>
            )}
          </Button>
        )
      )}
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
        Generate a work order, completion certificate, or handover pack to see it here
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

export const ProjectDocumentsTab = memo(function ProjectDocumentsTab({
  projectId,
  projectStatus,
  documentActions,
  className,
}: ProjectDocumentsTabProps) {
  const {
    data,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useDocumentHistory({
    entityType: 'project',
    entityId: projectId,
  });

  const documents = data?.documents ?? [];

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Documents</h2>
          <p className="text-sm text-muted-foreground">
            Work orders, completion certificates, and handover packs
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

      {/* Generate Buttons */}
      {documentActions && (
        <GenerateButtons
          projectStatus={projectStatus}
          documentActions={documentActions}
        />
      )}

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

export default ProjectDocumentsTab;
