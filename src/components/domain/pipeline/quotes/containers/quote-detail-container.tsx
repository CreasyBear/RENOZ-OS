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
  Trash2,
} from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ErrorState } from '@/components/shared/error-state';
import { EntityActivityLogger } from '@/components/shared/activity';
import { useEntityActivityLogging } from '@/hooks/activities/use-entity-activity-logging';
import { toastSuccess, toastError } from '@/hooks';
import { useQuoteVersion, useQuoteVersions, useDeleteQuote } from '@/hooks/pipeline';
import { useOpportunity } from '@/hooks/pipeline';
import { useGenerateQuotePdf, useSendQuote } from '@/hooks/pipeline/use-quote-mutations';
import { useUnifiedActivities } from '@/hooks/activities';
import { useTrackView } from '@/hooks/search';
import { QuoteDetailView } from '../views/quote-detail-view';
import {
  getQuoteDisplayStatus,
  type QuoteDisplayStatus,
} from '../quote-status-config';
import type { Opportunity } from '@/lib/schemas/pipeline';
import { isValidOpportunityMetadata } from '@/lib/schemas/pipeline';

// ============================================================================
// TYPES
// ============================================================================

export interface QuoteDetailContainerRenderProps {
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

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
  useTrackView('quote', quoteData?.quoteVersion?.id, quoteData?.quoteVersion ? `Quote v${quoteData.quoteVersion.versionNumber}` : undefined, undefined, `/pipeline/quotes/${quoteVersionId}`);

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

  const { onLogActivity, loggerProps } = useEntityActivityLogging({
    entityType: 'opportunity',
    entityId: opportunityId ?? '',
    entityLabel: `Quote: ${opportunityData?.opportunity?.title ?? 'Opportunity'}`,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Mutations
  // ─────────────────────────────────────────────────────────────────────────
  const generatePdfMutation = useGenerateQuotePdf();
  const sendQuoteMutation = useSendQuote();
  const deleteMutation = useDeleteQuote();

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
  // Derived State - cast types for presenter compatibility
  // ─────────────────────────────────────────────────────────────────────────
  const quote = quoteData?.quoteVersion;

  const handleDelete = useCallback(async () => {
    if (!quote) return;

    try {
      await deleteMutation.mutateAsync(quote.id);
      toastSuccess('Quote deleted successfully');
      setDeleteDialogOpen(false);
      navigate({ to: '/pipeline' });
    } catch (error) {
      toastError(error instanceof Error ? error.message : 'Failed to delete quote');
    }
  }, [deleteMutation, quote, navigate]);
  // Transform opportunity to handle Date/string differences from server
  const opportunity = useMemo((): Opportunity | undefined => {
    const rawOpp = opportunityData?.opportunity;
    if (!rawOpp) return undefined;
    return {
      ...rawOpp,
      expectedCloseDate: rawOpp.expectedCloseDate
        ? new Date(rawOpp.expectedCloseDate)
        : null,
      actualCloseDate: rawOpp.actualCloseDate
        ? new Date(rawOpp.actualCloseDate)
        : null,
      followUpDate: rawOpp.followUpDate
        ? new Date(rawOpp.followUpDate)
        : null,
      quoteExpiresAt: rawOpp.quoteExpiresAt
        ? new Date(rawOpp.quoteExpiresAt)
        : null,
      metadata: isValidOpportunityMetadata(rawOpp.metadata) ? rawOpp.metadata : null,
    };
  }, [opportunityData]);
  const customer = opportunityData?.customer;
  const versions = versionsData?.versions ?? [];
  const isLoading = isLoadingQuote || (!!opportunityId && isLoadingOpportunity);

  const displayStatus = useMemo<QuoteDisplayStatus>(() => {
    if (!opportunity) return 'draft';
    return getQuoteDisplayStatus(opportunity.quoteExpiresAt);
  }, [opportunity]);

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Loading
  // ─────────────────────────────────────────────────────────────────────────
  if (isLoading) {
    const loadingContent = <QuoteDetailSkeleton />;
    if (children) {
      return (
        <>
          {children({
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
            headerActions: null,
            content: errorContent,
          })}
        </>
      );
    }
    return errorContent;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Header Actions
  // ─────────────────────────────────────────────────────────────────────────
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
          {displayStatus !== 'accepted' && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteDialogOpen(true)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Main Content
  // ─────────────────────────────────────────────────────────────────────────
  const content = (
    <>
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
        onLogActivity={opportunityId ? onLogActivity : undefined}
        className={className}
      />

      {opportunityId && <EntityActivityLogger {...loggerProps} />}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quote</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this quote (v{quote.versionNumber})? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Render: With Render Props or Default
  // ─────────────────────────────────────────────────────────────────────────
  if (children) {
    return <>{children({ headerActions, content })}</>;
  }

  // Default rendering (standalone usage)
  return (
    <div className={className}>
      <div className="flex items-center justify-end mb-6">
        {headerActions}
      </div>
      {content}
    </div>
  );
}

export default QuoteDetailContainer;
