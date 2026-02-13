/**
 * DownloadPdfButton Component
 *
 * A button that triggers PDF document generation or downloads an existing PDF.
 * Shows loading state during generation and handles success/error states.
 *
 * @example
 * ```tsx
 * // Generate/download a quote
 * <DownloadPdfButton
 *   entityType="order"
 *   entityId={orderId}
 *   documentType="quote"
 *   onGenerated={(url) => console.log('Generated:', url)}
 * />
 *
 * // With existing URL (opens directly)
 * <DownloadPdfButton
 *   entityType="order"
 *   entityId={orderId}
 *   documentType="invoice"
 *   existingUrl={order.invoicePdfUrl}
 * />
 * ```
 */

import { memo, useState, useCallback } from 'react';
import { Download, FileText, Loader2, RefreshCw, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { toastSuccess, toastError, toastLoading, dismissToast } from '@/hooks/_shared/use-toast';
import {
  useGenerateQuote,
  useGenerateInvoice,
  useDocumentPolling,
} from '@/hooks/documents/use-generate-document';

// ============================================================================
// TYPES
// ============================================================================

export type DocumentEntityType = 'order' | 'warranty' | 'job';

export type DocumentType =
  | 'quote'
  | 'invoice'
  | 'delivery-note'
  | 'work-order'
  | 'warranty-certificate'
  | 'completion-certificate';

export interface DownloadPdfButtonProps {
  /** The type of entity the document belongs to */
  entityType: DocumentEntityType;
  /** The ID of the entity */
  entityId: string;
  /** The type of document to generate/download */
  documentType: DocumentType;
  /** URL of an existing document (if any) */
  existingUrl?: string | null;
  /** Callback when a new document is generated */
  onGenerated?: (url: string) => void;
  /** Optional invoice due date (required for invoices) */
  dueDate?: string;
  /** Button variant */
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  /** Button size */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /** Additional CSS classes */
  className?: string;
  /** Show dropdown menu with regenerate option when document exists */
  showRegenerateOption?: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get display label for document type
 */
function getDocumentLabel(type: DocumentType): string {
  const labels: Record<DocumentType, string> = {
    quote: 'Quote',
    invoice: 'Invoice',
    'delivery-note': 'Delivery Note',
    'work-order': 'Work Order',
    'warranty-certificate': 'Warranty Certificate',
    'completion-certificate': 'Completion Certificate',
  };
  return labels[type] ?? type;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const DownloadPdfButton = memo(function DownloadPdfButton({
  entityType,
  entityId,
  documentType,
  existingUrl,
  onGenerated,
  dueDate,
  variant = 'outline',
  size = 'default',
  className,
  showRegenerateOption = true,
}: DownloadPdfButtonProps) {
  const [isPolling, setIsPolling] = useState(false);
  const [toastId, setToastId] = useState<string | number | null>(null);
  const supportsGeneration = documentType === 'quote' || documentType === 'invoice';

  // Generation mutations
  const generateQuote = useGenerateQuote();
  const generateInvoice = useGenerateInvoice();

  // Polling for status
  const { data: pollData } = useDocumentPolling({
    orderId: entityId,
    documentType: documentType as 'quote' | 'invoice',
    enabled: supportsGeneration && isPolling,
  });

  // Handle polling completion
  if (isPolling && pollData?.status === 'completed' && pollData?.url) {
    setIsPolling(false);
    if (toastId) {
      dismissToast(toastId);
      setToastId(null);
    }
    toastSuccess(`${getDocumentLabel(documentType)} PDF generated successfully`);
    onGenerated?.(pollData.url);
    window.open(pollData.url, '_blank');
  } else if (isPolling && pollData?.status === 'failed') {
    setIsPolling(false);
    if (toastId) {
      dismissToast(toastId);
      setToastId(null);
    }
    toastError(`Failed to generate ${getDocumentLabel(documentType)} PDF`);
  }

  // Determine which mutation to use
  const isGenerating = generateQuote.isPending || generateInvoice.isPending || isPolling;

  // Handle generate click
  const handleGenerate = useCallback(
    async (regenerate = false) => {
      // Show loading toast
      const id = toastLoading(`Generating ${getDocumentLabel(documentType)} PDF...`);
      setToastId(id);

      try {
        if (documentType === 'quote') {
          await generateQuote.mutateAsync({
            orderId: entityId,
            regenerate,
          });
        } else if (documentType === 'invoice') {
          await generateInvoice.mutateAsync({
            orderId: entityId,
            dueDate,
            regenerate,
          });
        } else {
          // TODO: Handle other document types when implemented
          dismissToast(id);
          toastError(`${getDocumentLabel(documentType)} generation not yet implemented`);
          return;
        }

        // Start polling for completion
        setIsPolling(true);
      } catch (error) {
        dismissToast(id);
        setToastId(null);
        toastError(
          error instanceof Error
            ? error.message
            : `Failed to generate ${getDocumentLabel(documentType)} PDF`
        );
      }
    },
    [documentType, entityId, dueDate, generateQuote, generateInvoice]
  );

  // Handle download of existing document
  const handleDownload = useCallback(() => {
    if (existingUrl) {
      window.open(existingUrl, '_blank');
    }
  }, [existingUrl]);

  const label = getDocumentLabel(documentType);
  const hasExisting = !!existingUrl;

  if (!supportsGeneration) {
    if (hasExisting) {
      return (
        <Button
          variant={variant}
          size={size}
          className={cn('gap-2', className)}
          onClick={handleDownload}
        >
          <ExternalLink className="h-4 w-4" />
          <span>{label} PDF</span>
        </Button>
      );
    }

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={variant}
              size={size}
              className={cn('gap-2', className)}
              disabled
            >
              <FileText className="h-4 w-4" />
              <span>{label} PDF</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{label} PDF generation is not available yet</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // If there's an existing URL and we want to show regenerate option
  if (hasExisting && showRegenerateOption) {
    return (
      <DropdownMenu>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={variant}
                  size={size}
                  className={cn('gap-2', className)}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4" />
                      <span>{label} PDF</span>
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Download or regenerate {label} PDF</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleDownload}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Current PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleGenerate(true)}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Regenerate PDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Simple button for generating or downloading
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            className={cn('gap-2', className)}
            onClick={hasExisting ? handleDownload : () => handleGenerate(false)}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Generating...</span>
              </>
            ) : hasExisting ? (
              <>
                <Download className="h-4 w-4" />
                <span>Download {label}</span>
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                <span>Generate {label}</span>
              </>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {hasExisting
              ? `Download existing ${label} PDF`
              : `Generate ${label} PDF for this ${entityType}`}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

export default DownloadPdfButton;
