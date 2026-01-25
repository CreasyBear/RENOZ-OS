/**
 * Quote Detail Route
 *
 * Standalone quote view page with line items, totals, and actions.
 * Fetches quote version and linked opportunity for context.
 *
 * @see PIPE-QUOTE-DETAIL story
 */
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { ArrowLeft, Edit, MoreHorizontal, Send, Download, History } from 'lucide-react';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { QuoteDetail } from '@/components/domain/pipeline/quotes/quote-detail';
import { useQuoteVersion } from '@/hooks/pipeline/use-quotes';
import { useOpportunity } from '@/hooks/pipeline';
import { useGenerateQuotePdf } from '@/hooks/pipeline/use-quote-mutations';
import { toastSuccess, toastError } from '@/hooks';
import { FormatAmount } from '@/components/shared/format';

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute('/_authenticated/pipeline/quotes/$quoteId')({
  component: QuoteDetailPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/pipeline" />
  ),
  pendingComponent: () => (
    <PageLayout>
      <PageLayout.Header title="Loading Quote..." />
      <PageLayout.Content>
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </PageLayout.Content>
    </PageLayout>
  ),
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function QuoteDetailPage() {
  const navigate = useNavigate();
  const { quoteId } = Route.useParams();

  // Fetch quote version
  const {
    data: quoteData,
    isLoading: isLoadingQuote,
    error: quoteError,
  } = useQuoteVersion({ versionId: quoteId });

  // Fetch opportunity once we have the quote
  const opportunityId = quoteData?.quoteVersion?.opportunityId;
  const {
    data: opportunityData,
    isLoading: isLoadingOpportunity,
  } = useOpportunity({
    id: opportunityId ?? '',
    enabled: !!opportunityId,
  });

  // Mutations
  const generatePdfMutation = useGenerateQuotePdf();
  // Note: Send quote would typically use useSendQuote() but for now we redirect to opportunity

  // Handle PDF download
  const handleDownloadPdf = async () => {
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
  };

  // Handle send quote (simplified - would typically open a dialog)
  const handleSendQuote = () => {
    if (!opportunityData?.opportunity || !quoteData?.quoteVersion) return;

    // Navigate to opportunity with send quote action
    navigate({
      to: '/pipeline/$opportunityId',
      params: { opportunityId: opportunityData.opportunity.id },
      search: { action: 'send-quote' },
    });
  };

  const isLoading = isLoadingQuote || (!!opportunityId && isLoadingOpportunity);

  // Loading state
  if (isLoading) {
    return (
      <PageLayout>
        <PageLayout.Header title="Loading Quote..." />
        <PageLayout.Content>
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
            <Skeleton className="h-64" />
          </div>
        </PageLayout.Content>
      </PageLayout>
    );
  }

  // Error state
  if (quoteError || !quoteData?.quoteVersion) {
    return (
      <PageLayout variant="container">
        <PageLayout.Header title="Quote Not Found" />
        <PageLayout.Content>
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              The quote you're looking for doesn't exist or you don't have access.
            </p>
            <Button variant="outline" onClick={() => navigate({ to: '/pipeline' })}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Pipeline
            </Button>
          </div>
        </PageLayout.Content>
      </PageLayout>
    );
  }

  const quote = quoteData.quoteVersion;
  const opportunity = opportunityData?.opportunity;
  const customer = opportunityData?.customer;

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title={`Quote v${quote.versionNumber}`}
        description={
          <span className="text-muted-foreground flex items-center gap-2">
            <FormatAmount amount={quote.total} currency="AUD" />
            {opportunity && ` · ${opportunity.title}`}
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link to="/pipeline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Pipeline
              </Link>
            </Button>
            {opportunity && (
              <Button variant="outline" asChild>
                <Link
                  to="/pipeline/$opportunityId"
                  params={{ opportunityId: opportunity.id }}
                >
                  <History className="mr-2 h-4 w-4" />
                  View Opportunity
                </Link>
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleSendQuote}>
                  <Send className="mr-2 h-4 w-4" />
                  Send Quote
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadPdf}>
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </DropdownMenuItem>
                {opportunity && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link
                        to="/pipeline/$opportunityId"
                        params={{ opportunityId: opportunity.id }}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Quote
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />
      <PageLayout.Content>
        <QuoteDetail
          quote={quote}
          opportunity={
            opportunity
              ? {
                  id: opportunity.id,
                  title: opportunity.title,
                  stage: opportunity.stage,
                  quoteExpiresAt: opportunity.quoteExpiresAt,
                  customer: customer
                    ? {
                        id: customer.id,
                        name: customer.name,
                        email: customer.email,
                      }
                    : null,
                }
              : null
          }
          isLoading={isLoading}
          onSend={handleSendQuote}
          onDownloadPdf={handleDownloadPdf}
        />
      </PageLayout.Content>
    </PageLayout>
  );
}
