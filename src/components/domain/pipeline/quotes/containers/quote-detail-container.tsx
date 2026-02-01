/**
 * Quote Detail Container
 *
 * Handles data fetching, mutations, and state management for quote detail view.
 * Implements render props pattern for flexible header/action composition.
 *
 * @source quote from useQuoteVersion hook
 * @source opportunity from useOpportunity hook
 * @source activities from useUnifiedActivities hook
 *
 * @see STANDARDS.md - Container/Presenter pattern
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 */

import { useState, useCallback, useMemo } from 'react';
import {
  Edit,
  Copy,
  Printer,
  MoreHorizontal,
  Send,
  Download,
  History,
} from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ErrorState } from '@/components/shared/error-state';
import { cn } from '@/lib/utils';
import { toastSuccess, toastError } from '@/hooks';
import { useQuoteVersion, useQuoteVersions } from '@/hooks/pipeline/use-quotes';
import { useOpportunity } from '@/hooks/pipeline';
import { useGenerateQuotePdf, useSendQuote } from '@/hooks/pipeline/use-quote-mutations';
import { useUnifiedActivities } from '@/hooks/activities';
import { QuoteDetailView } from '../views/quote-detail-view';
import {
  QUOTE_STATUS_CONFIG,
  getQuoteDisplayStatus,
  type QuoteDisplayStatus,
} from '../quote-status-config';

// ============================================================================
// TYPES
// ============================================================================

export interface QuoteDetailContainerRenderProps {
  /** Header title element */
  headerTitle: React.ReactNode;
  /** Header action buttons */
  headerActions: React.ReactNode;
  /** Main content */
  content: React.ReactNode;
}

export interface QuoteDetailContainerProps {
  /** Quote version ID to display */
  quoteVersionId: string;
  /** Callback when user navigates back */
  onBack?: () => void;
  /** Callback when user clicks edit */
  onEdit?: () => void;
  /** Render props pattern for layout composition */
  children?: (props: QuoteDetailContainerRenderProps) => React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function QuoteDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-[400px] w-full" />
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function QuoteDetailContainer({
  quoteVersionId,
  onBack: _onBack,
  onEdit,
  children,
  className,
}: QuoteDetailContainerProps) {
  // Note: _onBack is available for render props consumers but not used internally
  const navigate = useNavigate();

  // ─────────────────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('overview');
  const [showMetaPanel, setShowMetaPanel] = useState(true);

  // ─────────────────────────────────────────────────────────────────────────
  // Panel Toggle Handler
  // ─────────────────────────────────────────────────────────────────────────
  const handleToggleMetaPanel = useCallback(() => {
    setShowMetaPanel((prev) => !prev);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Data Fetching
  // ─────────────────────────────────────────────────────────────────────────
  const {
    data: quoteData,
    isLoading: isLoadingQuote,
    error: quoteError,
    refetch: refetchQuote,
  } = useQuoteVersion({ versionId: quoteVersionId });

  // Fetch opportunity once we have the quote
  const opportunityId = quoteData?.quoteVersion?.opportunityId;
  const {
    data: opportunityData,
    isLoading: isLoadingOpportunity,
  } = useOpportunity({
    id: opportunityId ?? '',
    enabled: !!opportunityId,
  });

  // Fetch all quote versions for version history
  const {
    data: versionsData,
  } = useQuoteVersions({
    opportunityId: opportunityId ?? '',
    enabled: !!opportunityId,
  });

  // Fetch activities for the opportunity
  const {
    activities,
    isLoading: activitiesLoading,
    error: activitiesError,
  } = useUnifiedActivities({
    entityType: 'opportunity',
    entityId: opportunityId ?? '',
    enabled: !!opportunityId,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Mutations
  // ─────────────────────────────────────────────────────────────────────────
  const generatePdfMutation = useGenerateQuotePdf();
  const sendQuoteMutation = useSendQuote();

  // ─────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────
  const handleDownloadPdf = useCallback(async () => {
    if (!quoteData?.quoteVersion) return;

    try {
      const result = await generatePdfMutation.mutateAsync({
        quoteVersionId: quoteData.quoteVersion.id,
      });
      if (result?.pdfUrl) {
        window.open(result.pdfUrl, '_blank');
        toastSuccess('PDF generated successfully');
      }
    } catch (error) {
      toastError(error instanceof Error ? error.message : 'Failed to generate PDF');
    }
  }, [generatePdfMutation, quoteData]);

  const handleSendQuote = useCallback(async () => {
    if (!opportunityData?.opportunity || !quoteData?.quoteVersion) return;

    const customer = opportunityData.customer;
    if (!customer?.email) {
      toastError('Customer email is required to send quote');
      return;
    }

    try {
      await sendQuoteMutation.mutateAsync({
        opportunityId: opportunityData.opportunity.id,
        quoteVersionId: quoteData.quoteVersion.id,
        recipientEmail: customer.email,
        subject: `Quote for ${opportunityData.opportunity.title}`,
      });
      toastSuccess('Quote sent successfully');
    } catch (error) {
      toastError(error instanceof Error ? error.message : 'Failed to send quote');
    }
  }, [opportunityData, quoteData, sendQuoteMutation]);

  const handleViewOpportunity = useCallback(() => {
    if (!opportunityData?.opportunity) return;
    navigate({
      to: '/pipeline/$opportunityId',
      params: { opportunityId: opportunityData.opportunity.id },
    });
  }, [navigate, opportunityData]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Derived State
  // ─────────────────────────────────────────────────────────────────────────
  const quote = quoteData?.quoteVersion;
  const opportunity = opportunityData?.opportunity;
  const customer = opportunityData?.customer;
  const versions = versionsData?.versions ?? [];
  const isLoading = isLoadingQuote || (!!opportunityId && isLoadingOpportunity);

  const displayStatus = useMemo<QuoteDisplayStatus>(() => {
    if (!opportunity) return 'draft';
    return getQuoteDisplayStatus(opportunity.quoteExpiresAt);
  }, [opportunity]);

  const statusConfig = QUOTE_STATUS_CONFIG[displayStatus];
  const StatusIcon = statusConfig?.icon;

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Loading
  // ─────────────────────────────────────────────────────────────────────────
  if (isLoading) {
    const loadingContent = <QuoteDetailSkeleton />;
    if (children) {
      return (
        <>
          {children({
            headerTitle: <Skeleton className="h-8 w-48" />,
            headerActions: <Skeleton className="h-10 w-32" />,
            content: loadingContent,
          })}
        </>
      );
    }
    return loadingContent;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Error
  // ─────────────────────────────────────────────────────────────────────────
  if (quoteError || !quote) {
    const errorContent = (
      <ErrorState
        title="Quote not found"
        message="The quote you're looking for doesn't exist or has been deleted."
        onRetry={() => refetchQuote()}
        retryLabel="Try Again"
      />
    );
    if (children) {
      return (
        <>
          {children({
            headerTitle: 'Quote Not Found',
            headerActions: null,
            content: errorContent,
          })}
        </>
      );
    }
    return errorContent;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Header Elements
  // ─────────────────────────────────────────────────────────────────────────
  const headerTitle = (
    <div className="flex items-center gap-3">
      <span className="text-xl font-semibold">Quote v{quote.versionNumber}</span>
      {statusConfig && StatusIcon && (
        <Badge className={cn('gap-1', `bg-${statusConfig.color}-100 text-${statusConfig.color}-800`)}>
          <StatusIcon className="h-3 w-3" />
          {statusConfig.label}
        </Badge>
      )}
    </div>
  );

  const headerActions = (
    <div className="flex items-center gap-2">
      {/* Primary Actions */}
      {displayStatus !== 'expired' && displayStatus !== 'accepted' && (
        <Button
          onClick={handleSendQuote}
          disabled={sendQuoteMutation.isPending || !customer?.email}
        >
          <Send className="h-4 w-4 mr-2" />
          {sendQuoteMutation.isPending ? 'Sending...' : 'Send Quote'}
        </Button>
      )}

      <Button variant="outline" onClick={handleDownloadPdf} disabled={generatePdfMutation.isPending}>
        <Download className="h-4 w-4 mr-2" />
        {generatePdfMutation.isPending ? 'Generating...' : 'Download PDF'}
      </Button>

      {/* More Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">More actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {opportunity && (
            <DropdownMenuItem onClick={handleViewOpportunity}>
              <History className="h-4 w-4 mr-2" />
              View Opportunity
            </DropdownMenuItem>
          )}
          {onEdit && displayStatus === 'draft' && (
            <DropdownMenuItem onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Quote
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigator.clipboard.writeText(window.location.href)}>
            <Copy className="h-4 w-4 mr-2" />
            Copy Link
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Main Content
  // ─────────────────────────────────────────────────────────────────────────
  const content = (
    <QuoteDetailView
      quote={quote}
      opportunity={opportunity ?? null}
      customer={customer ?? null}
      versions={versions}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      showMetaPanel={showMetaPanel}
      onToggleMetaPanel={handleToggleMetaPanel}
      activities={activities}
      activitiesLoading={activitiesLoading}
      activitiesError={activitiesError}
      className={className}
    />
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Render: With Render Props or Default
  // ─────────────────────────────────────────────────────────────────────────
  if (children) {
    return <>{children({ headerTitle, headerActions, content })}</>;
  }

  // Default rendering (standalone usage)
  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        {headerTitle}
        {headerActions}
      </div>
      {content}
    </div>
  );
}

export default QuoteDetailContainer;
