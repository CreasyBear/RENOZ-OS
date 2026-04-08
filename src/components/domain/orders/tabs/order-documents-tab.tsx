/**
 * Order Documents Tab
 *
 * Displays generated documents (quotes, invoices, packing slips, delivery notes)
 * for an order. Shows document history with download links, file sizes, and dates.
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md (Tabs Philosophy)
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
  Receipt,
  Package,
  Truck,
  ArrowRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useServerFn } from '@tanstack/react-start';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  formatFileSize,
  getDocumentTypeLabel,
} from '@/hooks/documents';
import { getOrderGeneratedDocuments } from '@/server/functions/documents';
import type { DocumentActions } from '../views/order-detail-view';

// ============================================================================
// TYPES
// ============================================================================

export interface OrderDocumentsTabProps {
  orderId: string;
  documentActions?: DocumentActions;
  onOpenFulfillment?: () => void;
  className?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

const DOCUMENT_TYPE_ICONS: Record<string, React.ElementType> = {
  quote: FileText,
  invoice: Receipt,
  'packing-slip': Package,
  'dispatch-note': Truck,
  'delivery-note': Truck,
};

function getDocumentBadgeVariant(documentType: string) {
  switch (documentType) {
    case 'quote':
      return 'secondary';
    case 'invoice':
      return 'default';
    case 'packing-slip':
    case 'dispatch-note':
      return 'outline';
    case 'delivery-note':
      return 'outline';
    default:
      return 'secondary';
  }
}

// ============================================================================
// DOCUMENT CARD
// ============================================================================

interface DocumentCardProps {
  document: {
    id: string;
    documentType: string;
    entityType: string;
    entityId: string;
    filename: string;
    storageUrl: string;
    fileSize: number | null;
    generatedAt: Date | string;
    shipmentNumber?: string | null;
    isStale?: boolean;
    staleReason?: string;
  };
  onOpenFulfillment?: () => void;
}

function DocumentCard({ document, onOpenFulfillment }: DocumentCardProps) {
  const generatedDate = new Date(document.generatedAt);
  const IconComponent = DOCUMENT_TYPE_ICONS[document.documentType] ?? FileText;

  const handleDownload = () => {
    if (document.isStale) {
      onOpenFulfillment?.();
      return;
    }
    window.open(document.storageUrl, '_blank');
  };

  return (
    <div
      className={cn(
        'flex items-center justify-between p-4 rounded-lg border bg-card transition-colors',
        document.isStale
          ? 'border-amber-300/80 bg-amber-50/60 hover:bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20 dark:hover:bg-amber-950/30'
          : 'hover:bg-muted/30'
      )}
    >
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
              variant={getDocumentBadgeVariant(document.documentType) as 'default' | 'secondary' | 'outline'}
              className="text-xs"
            >
              {getDocumentTypeLabel(document.documentType as 'quote')}
            </Badge>
            {document.entityType === 'shipment' && (
              <Badge variant="outline" className="text-xs">
                {document.shipmentNumber ? `Shipment ${document.shipmentNumber}` : 'Shipment'}
              </Badge>
            )}
            {document.isStale && (
              <Badge variant="destructive" className="text-xs">
                Stale
              </Badge>
            )}
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
          {document.isStale && (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              {document.staleReason ?? 'Shipment details changed after this document was generated.'}
            </p>
          )}
        </div>
      </div>

      {/* Download button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleDownload}
        className="shrink-0"
      >
        {document.isStale ? (
          <>
            <RefreshCw className="h-4 w-4 mr-2" />
            Regenerate in Fulfillment
          </>
        ) : (
          <>
            <Download className="h-4 w-4 mr-2" />
            Download
          </>
        )}
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
        Generate a commercial document or create a shipment-backed fulfillment note to see it here
      </p>
    </div>
  );
}

interface ActionSectionProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

function ActionSection({ title, description, children }: ActionSectionProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {children}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// LOADING STATE
// ============================================================================

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
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

export const OrderDocumentsTab = memo(function OrderDocumentsTab({
  orderId,
  documentActions,
  onOpenFulfillment,
  className,
}: OrderDocumentsTabProps) {
  const getOrderDocumentsFn = useServerFn(getOrderGeneratedDocuments);
  const {
    data,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: queryKeys.documents.history('order', orderId),
    queryFn: () => getOrderDocumentsFn({ data: { orderId } }),
    enabled: !!orderId,
    staleTime: 60 * 1000,
  });

  const documents = data ?? [];

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Documents</h2>
          <p className="text-sm text-muted-foreground">
            Quotes, invoices, packing slips, dispatch notes, and delivery notes
          </p>
        </div>
        <div className="flex items-center gap-2">
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
      </div>

      {documentActions && (
        <div className="space-y-4">
          <ActionSection
            title="Commercial Documents"
            description="Order-scoped paperwork generated directly from the sales record."
          >
            <Button
              variant="outline"
              size="sm"
              onClick={documentActions.onGenerateQuote}
              disabled={documentActions.isGeneratingQuote}
            >
              <FileText className="h-4 w-4 mr-2" />
              {documentActions.isGeneratingQuote ? 'Generating Quote...' : 'Generate Quote'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={documentActions.onGenerateInvoice}
              disabled={documentActions.isGeneratingInvoice}
            >
              <Receipt className="h-4 w-4 mr-2" />
              {documentActions.isGeneratingInvoice ? 'Generating Invoice...' : 'Generate Invoice'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={documentActions.onGenerateProForma}
              disabled={documentActions.isGeneratingProForma}
            >
              <Receipt className="h-4 w-4 mr-2" />
              {documentActions.isGeneratingProForma ? 'Generating Pro-Forma...' : 'Generate Pro-Forma'}
            </Button>
          </ActionSection>

          <ActionSection
            title="Fulfillment Documents"
            description="Generated from shipment records so the paperwork matches what is actually going out the door."
          >
            <Button
              variant="outline"
              size="sm"
              onClick={documentActions.onGeneratePackingSlip}
              disabled={documentActions.isGeneratingPackingSlip}
            >
              <Package className="h-4 w-4 mr-2" />
              {documentActions.isGeneratingPackingSlip ? 'Generating Packing Slip...' : 'Generate Packing Slip'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={documentActions.onGenerateDeliveryNote}
              disabled={documentActions.isGeneratingDeliveryNote}
            >
              <Truck className="h-4 w-4 mr-2" />
              {documentActions.isGeneratingDeliveryNote ? 'Generating Delivery Note...' : 'Generate Delivery Note'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={documentActions.onGenerateDispatchNote}
              disabled={documentActions.isGeneratingDispatchNote}
            >
              <Truck className="h-4 w-4 mr-2" />
              {documentActions.isGeneratingDispatchNote ? 'Preparing Dispatch Note...' : 'Generate Dispatch Note'}
            </Button>
          </ActionSection>
        </div>
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
            <DocumentCard
              key={doc.id}
              document={doc}
              onOpenFulfillment={onOpenFulfillment}
            />
          ))}
        </div>
      )}

      {documents.some((doc) => doc.isStale) && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-300/80 bg-amber-50/60 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
          <RefreshCw className="h-4 w-4" />
          <span>Stale fulfillment docs need regeneration from the latest shipment state.</span>
          {onOpenFulfillment && (
            <Button variant="ghost" size="sm" className="ml-auto" onClick={onOpenFulfillment}>
              Open Fulfillment
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
});

export default OrderDocumentsTab;
