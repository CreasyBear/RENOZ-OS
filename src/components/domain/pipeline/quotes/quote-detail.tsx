/**
 * Quote Detail Component
 *
 * Standalone quote view with line items, totals, and actions.
 * Used for the /pipeline/quotes/$quoteId route.
 *
 * @see PIPE-QUOTE-DETAIL story
 */
import { memo } from 'react';
import { Link } from '@tanstack/react-router';
import {
  FileText,
  Send,
  Download,
  Calendar,
  Building2,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { FormatAmount } from '@/components/shared/format';
import type { QuoteVersion, QuoteLineItem } from '@/lib/schemas/pipeline';

// ============================================================================
// HELPERS
// ============================================================================

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ============================================================================
// TYPES
// ============================================================================

export interface QuoteDetailCustomer {
  id: string;
  name: string;
  email?: string | null;
}

export interface QuoteDetailOpportunity {
  id: string;
  title: string;
  stage: string;
  quoteExpiresAt?: Date | string | null;
  customer?: QuoteDetailCustomer | null;
}

export interface QuoteDetailProps {
  /** @source useQuoteVersion(quoteId) in /pipeline/quotes/$quoteId.tsx */
  quote: QuoteVersion;
  /** @source fetched from opportunity lookup */
  opportunity?: QuoteDetailOpportunity | null;
  /** @source useQuoteVersion loading state */
  isLoading?: boolean;
  /** Callback when send button is clicked */
  onSend?: () => void;
  /** Callback when download PDF button is clicked */
  onDownloadPdf?: () => void;
  className?: string;
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

const QuoteStatusBadge = memo(function QuoteStatusBadge({
  expiresAt,
}: {
  expiresAt: Date | string | null | undefined;
}) {
  if (!expiresAt) {
    return <Badge variant="secondary">No Expiry</Badge>;
  }

  const expiryDate = new Date(expiresAt);
  const now = new Date();
  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry < 0) {
    return (
      <Badge variant="destructive" className="flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />
        Expired
      </Badge>
    );
  }

  if (daysUntilExpiry <= 7) {
    return (
      <Badge variant="outline" className="flex items-center gap-1 border-yellow-500 text-yellow-600">
        <Clock className="h-3 w-3" />
        Expires in {daysUntilExpiry} days
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="flex items-center gap-1 text-green-600">
      <CheckCircle2 className="h-3 w-3" />
      Valid
    </Badge>
  );
});

const StageBadge = memo(function StageBadge({ stage }: { stage: string }) {
  const stageColors: Record<string, string> = {
    new: 'bg-blue-100 text-blue-800',
    qualified: 'bg-purple-100 text-purple-800',
    proposal: 'bg-amber-100 text-amber-800',
    negotiation: 'bg-orange-100 text-orange-800',
    won: 'bg-green-100 text-green-800',
    lost: 'bg-red-100 text-red-800',
  };

  return (
    <Badge variant="outline" className={stageColors[stage] || ''}>
      {stage.charAt(0).toUpperCase() + stage.slice(1)}
    </Badge>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const QuoteDetail = memo(function QuoteDetail({
  quote,
  opportunity,
  isLoading,
  onSend,
  onDownloadPdf,
  className,
}: QuoteDetailProps) {
  // ============================================================================
  // LOADING STATE
  // ============================================================================
  if (isLoading) {
    return (
      <div className={className}>
        <div className="grid gap-6 md:grid-cols-3 mb-6">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const items = quote.items as QuoteLineItem[];

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div className={className}>
      {/* Header Info Row */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        {/* Quote Info Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Quote Version</CardDescription>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              Version {quote.versionNumber}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <QuoteStatusBadge expiresAt={opportunity?.quoteExpiresAt} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Created {formatDate(quote.createdAt)}
            </p>
          </CardContent>
        </Card>

        {/* Opportunity Card */}
        {opportunity && (
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Opportunity</CardDescription>
              <CardTitle className="text-lg flex items-center gap-2">
                <ExternalLink className="h-5 w-5 text-muted-foreground" />
                <Link
                  to="/pipeline/$opportunityId"
                  params={{ opportunityId: opportunity.id }}
                  className="hover:underline"
                >
                  {opportunity.title}
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <StageBadge stage={opportunity.stage} />
            </CardContent>
          </Card>
        )}

        {/* Customer Card */}
        {opportunity?.customer && (
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Customer</CardDescription>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <Link
                  to="/customers/$customerId"
                  params={{ customerId: opportunity.customer.id }}
                  className="hover:underline"
                >
                  {opportunity.customer.name}
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {opportunity.customer.email && (
                <p className="text-sm text-muted-foreground">{opportunity.customer.email}</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mb-6">
        {onSend && (
          <Button onClick={onSend}>
            <Send className="mr-2 h-4 w-4" />
            Send Quote
          </Button>
        )}
        {onDownloadPdf && (
          <Button variant="outline" onClick={onDownloadPdf}>
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        )}
      </div>

      {/* Line Items Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Line Items</CardTitle>
          <CardDescription>
            {items.length} item{items.length !== 1 ? 's' : ''} in this quote
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50%]">Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  {items.some((item) => item.discountPercent) && (
                    <TableHead className="text-right">Discount</TableHead>
                  )}
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.description}</p>
                        {item.sku && (
                          <p className="text-xs text-muted-foreground font-mono">{item.sku}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">
                      <FormatAmount amount={item.unitPriceCents} currency="AUD" />
                    </TableCell>
                    {items.some((i) => i.discountPercent) && (
                      <TableCell className="text-right">
                        {item.discountPercent ? `${item.discountPercent}%` : '-'}
                      </TableCell>
                    )}
                    <TableCell className="text-right font-medium">
                      <FormatAmount amount={item.totalCents} currency="AUD" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell
                    colSpan={items.some((i) => i.discountPercent) ? 4 : 3}
                    className="text-right"
                  >
                    Subtotal
                  </TableCell>
                  <TableCell className="text-right">
                    <FormatAmount amount={quote.subtotal} currency="AUD" />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell
                    colSpan={items.some((i) => i.discountPercent) ? 4 : 3}
                    className="text-right"
                  >
                    GST (10%)
                  </TableCell>
                  <TableCell className="text-right">
                    <FormatAmount amount={quote.taxAmount} currency="AUD" />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell
                    colSpan={items.some((i) => i.discountPercent) ? 4 : 3}
                    className="text-right font-bold"
                  >
                    Total (inc. GST)
                  </TableCell>
                  <TableCell className="text-right font-bold text-lg">
                    <FormatAmount amount={quote.total} currency="AUD" />
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {quote.notes && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{quote.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Expiry Info */}
      {opportunity?.quoteExpiresAt && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Quote Validity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Expires On</p>
                <p className="font-medium">
                  {formatDate(opportunity.quoteExpiresAt)}
                </p>
              </div>
              <QuoteStatusBadge expiresAt={opportunity.quoteExpiresAt} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
});

export default QuoteDetail;
