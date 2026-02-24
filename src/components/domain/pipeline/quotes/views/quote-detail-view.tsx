/**
 * Quote Detail View (Presenter)
 *
 * Full-width layout following Project Management reference patterns.
 * Maximizes schema field presentation with specialized section components.
 *
 * @see STANDARDS.md - Container/Presenter pattern
 * @see _reference/project-management-reference/components/projects/ProjectDetailsPage.tsx
 */

import { memo, useMemo, type ReactNode } from 'react';
import { format, differenceInDays } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FileText,
  Clock,
  PanelRight,
  AlertTriangle,
  Hash,
  Phone,
  Mail,
  Link2,
  Calendar,
  Percent,
  Banknote,
  Tag,
  ExternalLink,
  History,
  Target,
  Plus,
} from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { FormatAmount } from '@/components/shared/format';
import { UnifiedActivityTimeline } from '@/components/shared/activity';
import { getActivitiesFeedSearch } from '@/lib/activities';
import { StatusCell } from '@/components/shared/data-table';
import { OPPORTUNITY_STAGE_CONFIG } from '@/components/domain/pipeline/opportunities/opportunity-status-config';
import type { QuoteVersion, QuoteLineItem, Opportunity } from '@/lib/schemas/pipeline';
import type { UnifiedActivity } from '@/lib/schemas/unified-activity';
import {
  QUOTE_STATUS_CONFIG,
  getQuoteDisplayStatus,
  getDaysUntilExpiry,
  getExpiryStatus,
  type QuoteDisplayStatus,
} from '../quote-status-config';

// ============================================================================
// TYPES
// ============================================================================

// Types moved to schemas - import from there
import type { QuoteDetailCustomer, QuoteVersionSummary } from "@/lib/schemas/pipeline";
import { isValidOpportunityStage } from "@/lib/schemas/pipeline";

export interface QuoteDetailViewProps {
  quote: QuoteVersion;
  opportunity: Opportunity | null;
  customer: QuoteDetailCustomer | null;
  versions: QuoteVersionSummary[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  showMetaPanel: boolean;
  onToggleMetaPanel: () => void;
  activities?: UnifiedActivity[];
  activitiesLoading?: boolean;
  activitiesError?: Error | null;
  /** Handler to open activity logging dialog */
  onLogActivity?: () => void;
  /** Header actions (panel toggle, copy link, etc.) to display next to entity header */
  headerActions?: React.ReactNode;
  className?: string;
}

// ============================================================================
// LOCAL CONFIGURATIONS
// ============================================================================

const DETAIL_STATUS_CONFIG: Record<QuoteDisplayStatus, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-secondary text-secondary-foreground' },
  sent: { label: 'Sent', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200' },
  viewed: { label: 'Viewed', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200' },
  accepted: { label: 'Accepted', color: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' },
  rejected: { label: 'Rejected', color: 'bg-destructive/10 text-destructive' },
  expired: { label: 'Expired', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200' },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'PP');
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

// ============================================================================
// META CHIPS ROW (Project Management pattern)
// ============================================================================

interface MetaChip {
  label: string;
  value: string | ReactNode;
  icon?: ReactNode;
}

function MetaChipsRow({ items }: { items: MetaChip[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {items.map((item, idx) => (
        <div key={`${item.label}-${idx}`} className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            {item.icon && <span className="text-muted-foreground">{item.icon}</span>}
            {item.label && <span className="text-muted-foreground">{item.label}:</span>}
            <span className="text-foreground font-medium">{item.value}</span>
          </div>
          {idx < items.length - 1 && <Separator orientation="vertical" className="h-4" />}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// QUOTE HEADER (Project Management pattern)
// ============================================================================

interface QuoteHeaderProps {
  quote: QuoteVersion;
  opportunity: Opportunity | null;
  /** Actions to display in header (panel toggle, copy link, etc.) */
  headerActions?: React.ReactNode;
}

function QuoteHeader({ quote, opportunity, headerActions }: QuoteHeaderProps) {
  const displayStatus = getQuoteDisplayStatus(opportunity?.quoteExpiresAt);
  const statusConfig = DETAIL_STATUS_CONFIG[displayStatus];
  const StatusIcon = QUOTE_STATUS_CONFIG[displayStatus]?.icon ?? FileText;
  const daysUntil = getDaysUntilExpiry(opportunity?.quoteExpiresAt);
  const expiryStatus = getExpiryStatus(opportunity?.quoteExpiresAt);

  const metaItems: MetaChip[] = [
    { label: 'Version', value: `v${quote.versionNumber}`, icon: <Hash className="h-3.5 w-3.5" /> },
    { label: 'Created', value: formatDate(quote.createdAt), icon: <Calendar className="h-3.5 w-3.5" /> },
    ...(opportunity?.quoteExpiresAt ? [{
      label: 'Valid Until',
      value: (
        <span className={cn(
          expiryStatus === 'expired' && 'text-destructive',
          expiryStatus === 'expiring' && 'text-amber-600'
        )}>
          {formatDate(opportunity.quoteExpiresAt)}
        </span>
      ),
      icon: <Clock className="h-3.5 w-3.5" />,
    }] : []),
    { label: 'Items', value: String(quote.items?.length ?? 0), icon: <Tag className="h-3.5 w-3.5" /> },
  ];

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-semibold text-foreground leading-tight">
            Quote v{quote.versionNumber}
          </h1>
          <div className="flex items-center gap-2">
            <Badge className={cn('gap-1 text-[11px]', statusConfig.color)}>
              <StatusIcon className="h-3 w-3" />
              {statusConfig.label}
            </Badge>
            {opportunity && (
              <Badge variant="outline" className="text-[11px]">
                {opportunity.probability}% probability
              </Badge>
            )}
          </div>
        </div>
        {/* Panel toggle and utility actions next to entity header */}
        {headerActions && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {headerActions}
          </div>
        )}
      </div>

      {/* Expiry Alert */}
      {expiryStatus === 'expired' && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" />
          Quote expired {daysUntil !== null ? `${Math.abs(daysUntil)} days ago` : ''}
        </div>
      )}
      {expiryStatus === 'expiring' && daysUntil !== null && (
        <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4" />
          Quote expires in {daysUntil} days
        </div>
      )}

      <MetaChipsRow items={metaItems} />
    </section>
  );
}

// ============================================================================
// CUSTOMER INFO SECTION
// ============================================================================

interface CustomerInfoProps {
  customer: QuoteDetailCustomer | null;
}

function CustomerInfo({ customer }: CustomerInfoProps) {
  if (!customer) {
    return (
      <section>
        <h2 className="text-base font-semibold text-foreground mb-4">Customer</h2>
        <p className="text-sm text-muted-foreground">No customer linked</p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-base font-semibold text-foreground mb-4">Customer</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
            {customer.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <Link
              to="/customers/$customerId"
              params={{ customerId: customer.id }}
              search={{}}
              className="text-sm font-medium hover:underline"
            >
              {customer.name}
            </Link>
            {customer.customerCode && (
              <div className="text-xs text-muted-foreground font-mono">{customer.customerCode}</div>
            )}
            {customer.type && (
              <Badge variant="outline" className="text-[11px] mt-1">{customer.type}</Badge>
            )}
          </div>
        </div>

        <div className="space-y-2 text-sm">
          {customer.email && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4" />
              <a href={`mailto:${customer.email}`} className="hover:underline">{customer.email}</a>
            </div>
          )}
          {customer.phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" />
              <a href={`tel:${customer.phone}`} className="hover:underline">{customer.phone}</a>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// LINE ITEMS BREAKDOWN
// ============================================================================

interface LineItemsBreakdownProps {
  items: QuoteLineItem[];
}

function LineItemsBreakdown({ items }: LineItemsBreakdownProps) {
  if (!items?.length) {
    return (
      <section>
        <h2 className="text-base font-semibold text-foreground mb-4">Line Items</h2>
        <p className="text-sm text-muted-foreground">No items in this quote</p>
      </section>
    );
  }

  const hasDiscounts = items.some((item) => item.discountPercent && item.discountPercent > 0);

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-foreground">Line Items</h2>
        <span className="text-sm text-muted-foreground">{items.length} items</span>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[50%]">Description</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Unit Price</TableHead>
              {hasDiscounts && <TableHead className="text-right">Discount</TableHead>}
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
                <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                <TableCell className="text-right tabular-nums">
                  <FormatAmount amount={item.unitPrice} />
                </TableCell>
                {hasDiscounts && (
                  <TableCell className="text-right tabular-nums">
                    {item.discountPercent ? (
                      <span className="text-destructive">-{item.discountPercent}%</span>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                )}
                <TableCell className="text-right font-medium tabular-nums">
                  <FormatAmount amount={item.total} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

// ============================================================================
// PRICING SUMMARY
// ============================================================================

interface PricingSummaryProps {
  quote: QuoteVersion;
}

function PricingSummary({ quote }: PricingSummaryProps) {
  const items = quote.items;
  const totalDiscount = items.reduce((sum, item) => {
    if (item.discountPercent && item.discountPercent > 0) {
      const originalTotal = item.unitPrice * item.quantity;
      return sum + (originalTotal - item.total);
    }
    return sum;
  }, 0);

  return (
    <section>
      <h2 className="text-base font-semibold text-foreground mb-4">Pricing Summary</h2>
      <div className="max-w-sm ml-auto space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-2">
            <Banknote className="h-4 w-4" /> Subtotal
          </span>
          <span className="font-medium tabular-nums">
            <FormatAmount amount={Number(quote.subtotal)} />
          </span>
        </div>
        {totalDiscount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-2">
              <Percent className="h-4 w-4" /> Discounts
            </span>
            <span className="font-medium tabular-nums text-destructive">
              -<FormatAmount amount={totalDiscount} />
            </span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-2">
            <Tag className="h-4 w-4" /> GST (10%)
          </span>
          <span className="font-medium tabular-nums">
            <FormatAmount amount={Number(quote.taxAmount)} />
          </span>
        </div>
        <Separator />
        <div className="flex justify-between text-base font-semibold">
          <span>Total (inc. GST)</span>
          <span className="tabular-nums text-lg">
            <FormatAmount amount={Number(quote.total)} />
          </span>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// VALIDITY PERIOD SECTION (with countdown/progress)
// ============================================================================

interface ValidityPeriodProps {
  opportunity: Opportunity | null;
  quote: QuoteVersion;
}

function ValidityPeriod({ opportunity, quote }: ValidityPeriodProps) {
  if (!opportunity?.quoteExpiresAt) {
    return (
      <section>
        <h2 className="text-base font-semibold text-foreground mb-4">Quote Validity</h2>
        <p className="text-sm text-muted-foreground">No expiration date set</p>
      </section>
    );
  }

  const expiresAt = new Date(opportunity.quoteExpiresAt);
  const createdAt = new Date(quote.createdAt);

  const totalDays = differenceInDays(expiresAt, createdAt);
  const daysRemaining = getDaysUntilExpiry(opportunity.quoteExpiresAt) ?? 0;
  const daysElapsed = totalDays - daysRemaining;
  const progressPercent = totalDays > 0 ? Math.min(100, Math.max(0, (daysElapsed / totalDays) * 100)) : 100;

  const expiryStatus = getExpiryStatus(opportunity.quoteExpiresAt);
  const isExpired = expiryStatus === 'expired';
  const isExpiring = expiryStatus === 'expiring';

  return (
    <section>
      <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
        <Calendar className="h-5 w-5" />
        Quote Validity
      </h2>
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Created</div>
            <div className="text-sm font-medium">{formatDate(quote.createdAt)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Valid Until</div>
            <div className={cn(
              'text-sm font-medium',
              isExpired && 'text-destructive',
              isExpiring && 'text-amber-600'
            )}>
              {formatDate(expiresAt)}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Status</div>
            <div className={cn(
              'text-sm font-medium',
              isExpired && 'text-destructive',
              isExpiring && 'text-amber-600',
              !isExpired && !isExpiring && 'text-green-600'
            )}>
              {isExpired ? 'Expired' : isExpiring ? `${daysRemaining} days left` : 'Valid'}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Total Duration</div>
            <div className="text-sm font-medium">{totalDays} days</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Validity Progress</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <Progress
            value={progressPercent}
            className={cn(
              'h-2',
              isExpired && '[&>div]:bg-destructive',
              isExpiring && '[&>div]:bg-amber-500'
            )}
          />
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// VERSION HISTORY SECTION
// ============================================================================

interface VersionHistoryProps {
  versions: QuoteVersionSummary[];
  currentVersionId: string;
}

function VersionHistory({ versions, currentVersionId }: VersionHistoryProps) {
  if (!versions?.length) {
    return null;
  }

  const sortedVersions = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <History className="h-5 w-5" />
          Version History
        </h2>
        <span className="text-sm text-muted-foreground">{versions.length} versions</span>
      </div>
      <div className="space-y-3">
        {sortedVersions.map((version) => {
          const isCurrent = version.id === currentVersionId;
          return (
            <div
              key={version.id}
              className={cn(
                'flex items-center justify-between p-3 rounded-lg border',
                isCurrent ? 'border-primary bg-primary/5' : 'border-border'
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold',
                  isCurrent ? 'bg-primary text-primary-foreground' : 'bg-muted'
                )}>
                  v{version.versionNumber}
                </div>
                <div>
                  <div className="text-sm font-medium flex items-center gap-2">
                    Version {version.versionNumber}
                    {isCurrent && <Badge variant="outline" className="text-[11px]">Current</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(version.createdAt)} - {version.items?.length ?? 0} items
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium tabular-nums">
                  <FormatAmount amount={version.total} />
                </div>
                {version.notes && (
                  <div className="text-xs text-muted-foreground max-w-[150px] truncate">
                    {version.notes}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ============================================================================
// LINKED OPPORTUNITY SECTION
// ============================================================================

interface LinkedOpportunityProps {
  opportunity: Opportunity | null;
}

function LinkedOpportunity({ opportunity }: LinkedOpportunityProps) {
  if (!opportunity) {
    return null;
  }

  return (
    <section>
      <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
        <Target className="h-5 w-5" />
        Linked Opportunity
      </h2>
      <div className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
        <Link
          to="/pipeline/$opportunityId"
          params={{ opportunityId: opportunity.id }}
          className="block"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm font-medium hover:underline truncate">
                {opportunity.title}
              </div>
              {opportunity.description && (
                <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {opportunity.description}
                </div>
              )}
              <div className="flex items-center gap-2 mt-2">
                <StatusCell
                  status={opportunity.stage}
                  statusConfig={OPPORTUNITY_STAGE_CONFIG}
                  showIcon
                />
                <span className="text-xs text-muted-foreground">
                  {opportunity.probability}% probability
                </span>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-sm font-medium tabular-nums">
                <FormatAmount amount={Number(opportunity.value)} />
              </div>
              {opportunity.expectedCloseDate && (
                <div className="text-xs text-muted-foreground mt-1">
                  Expected: {formatDate(opportunity.expectedCloseDate)}
                </div>
              )}
              <ExternalLink className="h-4 w-4 text-muted-foreground mt-2 ml-auto" />
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}

// ============================================================================
// NOTES SECTION
// ============================================================================

interface NotesSectionProps {
  notes?: string | null;
}

function NotesSection({ notes }: NotesSectionProps) {
  if (!notes) return null;

  return (
    <section>
      <h2 className="text-base font-semibold text-foreground mb-4">Notes</h2>
      <p className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-md">{notes}</p>
    </section>
  );
}

// ============================================================================
// RIGHT META PANEL (Project Management pattern)
// ============================================================================

interface RightMetaPanelProps {
  quote: QuoteVersion;
  opportunity: Opportunity | null;
  customer: QuoteDetailCustomer | null;
}

function RightMetaPanel({ quote, opportunity, customer }: RightMetaPanelProps) {
  const expiryStatus = getExpiryStatus(opportunity?.quoteExpiresAt);
  const daysUntil = getDaysUntilExpiry(opportunity?.quoteExpiresAt);

  return (
    <aside className="flex flex-col gap-8 p-4 pt-8 lg:sticky lg:self-start lg:top-4">
      {/* Customer Card */}
      {customer && (
        <>
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Customer</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                {customer.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <Link
                  to="/customers/$customerId"
                  params={{ customerId: customer.id }}
                  search={{}}
                  className="text-sm font-medium truncate hover:underline block"
                >
                  {customer.name}
                </Link>
                {customer.email && (
                  <div className="text-xs text-muted-foreground truncate">{customer.email}</div>
                )}
              </div>
            </div>
            {customer.phone && (
              <div className="mt-3 text-xs text-muted-foreground flex items-center gap-2">
                <Phone className="h-3 w-3" /> {customer.phone}
              </div>
            )}
          </div>
          <Separator />
        </>
      )}

      {/* Quote Value */}
      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Quote Value</h3>
        <div className="text-2xl font-semibold tabular-nums">
          <FormatAmount amount={Number(quote.total)} />
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          inc. GST (<FormatAmount amount={Number(quote.taxAmount)} />)
        </div>
      </div>
      <Separator />

      {/* Validity Status */}
      {opportunity?.quoteExpiresAt && (
        <>
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Validity</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Expires</span>
                <span className={cn(
                  expiryStatus === 'expired' && 'text-destructive',
                  expiryStatus === 'expiring' && 'text-amber-600'
                )}>
                  {formatDate(opportunity.quoteExpiresAt)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge className={cn(
                  'text-[11px] h-5',
                  expiryStatus === 'expired' && 'bg-destructive/10 text-destructive',
                  expiryStatus === 'expiring' && 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
                  expiryStatus === 'valid' && 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                )}>
                  {expiryStatus === 'expired' ? 'Expired' :
                    expiryStatus === 'expiring' ? `${daysUntil}d left` : 'Valid'}
                </Badge>
              </div>
            </div>
          </div>
          <Separator />
        </>
      )}

      {/* Opportunity Link */}
      {opportunity && (
        <>
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Opportunity</h3>
            <Link
              to="/pipeline/$opportunityId"
              params={{ opportunityId: opportunity.id }}
              className="text-sm hover:underline flex items-center gap-2"
            >
              <Target className="h-4 w-4" />
              {opportunity.title}
            </Link>
            <div className="mt-2 flex items-center gap-2">
              <StatusCell
                status={isValidOpportunityStage(opportunity.stage) ? opportunity.stage : 'new'}
                statusConfig={OPPORTUNITY_STAGE_CONFIG}
              />
            </div>
          </div>
          <Separator />
        </>
      )}

      {/* Audit Trail */}
      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Audit Trail</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Created</span>
            <span>{formatDate(quote.createdAt)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Updated</span>
            <span>{formatDate(quote.updatedAt)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Version</span>
            <span>v{quote.versionNumber}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const QuoteDetailView = memo(function QuoteDetailView({
  quote,
  opportunity,
  customer,
  versions,
  activeTab,
  onTabChange,
  showMetaPanel,
  onToggleMetaPanel,
  activities = [],
  activitiesLoading = false,
  activitiesError,
  onLogActivity,
  headerActions,
  className,
}: QuoteDetailViewProps) {
  const items = useMemo(() => quote.items ?? [], [quote.items]);
  const itemsCount = items.length;

  // Build header actions for panel toggle and copy link
  const internalHeaderActions = (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0" onClick={() => copyToClipboard(window.location.href)} aria-label="Copy link">
              <Link2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy link</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn('h-8 w-8 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0', showMetaPanel && 'bg-muted')}
              onClick={onToggleMetaPanel}
              aria-label={showMetaPanel ? 'Hide details panel' : 'Show details panel'}
            >
              <PanelRight className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{showMetaPanel ? 'Hide' : 'Show'} details panel</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      {headerActions}
    </div>
  );

  return (
    <div className={cn('space-y-6', className)}>
      {/* Main Content Grid */}
      <div className={cn(
        'grid grid-cols-1 gap-6',
        showMetaPanel ? 'lg:grid-cols-[1fr_320px]' : 'lg:grid-cols-1'
      )}>
        {/* Primary Content */}
        <div className="space-y-6">
          <QuoteHeader quote={quote} opportunity={opportunity} headerActions={internalHeaderActions} />

              <Tabs value={activeTab} onValueChange={onTabChange}>
                <TabsList className="w-full gap-6 bg-transparent border-b border-border rounded-none h-auto p-0">
                  <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3">
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="items" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3">
                    Items ({itemsCount})
                  </TabsTrigger>
                  <TabsTrigger value="versions" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3">
                    Versions ({versions.length})
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3">
                    Activity
                  </TabsTrigger>
                </TabsList>

                {/* Overview Tab - space-y-10 for generous spacing between sections */}
                <TabsContent value="overview" className="mt-0 pt-6">
                  <div className="space-y-10">
                    <CustomerInfo customer={customer} />
                    <PricingSummary quote={quote} />
                    <ValidityPeriod opportunity={opportunity} quote={quote} />
                    <LinkedOpportunity opportunity={opportunity} />
                    <NotesSection notes={quote.notes} />
                  </div>
                </TabsContent>

                {/* Items Tab */}
                <TabsContent value="items" className="mt-0 pt-6">
                  <LineItemsBreakdown items={items} />
                </TabsContent>

                {/* Versions Tab */}
                <TabsContent value="versions" className="mt-0 pt-6">
                  <VersionHistory versions={versions} currentVersionId={quote.id} />
                </TabsContent>

                {/* Activity Tab */}
                <TabsContent value="activity" className="mt-0 pt-6">
                  <div className="space-y-4">
                    {onLogActivity && (
                      <div className="flex items-center justify-end">
                        <Button size="sm" onClick={onLogActivity}>
                          <Plus className="h-4 w-4 mr-2" />
                          Log Activity
                        </Button>
                      </div>
                    )}
                    <UnifiedActivityTimeline
                      activities={activities}
                      isLoading={activitiesLoading}
                      hasError={!!activitiesError}
                      error={activitiesError || undefined}
                      title="Activity Timeline"
                      description="Complete history of quote changes, status updates, and system events"
                      showFilters={true}
                      viewAllSearch={getActivitiesFeedSearch('quote')}
                      emptyMessage="No activity recorded yet"
                      emptyDescription="Quote activities will appear here when changes are made."
                    />
                  </div>
                </TabsContent>
          </Tabs>
        </div>

        {/* Animated Side Meta Panel */}
        <AnimatePresence initial={false}>
          {showMetaPanel && (
            <motion.div
              key="meta-panel"
              initial={{ x: 80, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 80, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
              className="hidden lg:block border-l pl-6"
            >
              <RightMetaPanel quote={quote} opportunity={opportunity} customer={customer} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});

export default QuoteDetailView;
