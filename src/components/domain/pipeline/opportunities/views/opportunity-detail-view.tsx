/**
 * Opportunity Detail View (Presenter)
 *
 * Full-width layout following Project Management reference patterns.
 * Maximizes schema field presentation with specialized section components.
 *
 * @see STANDARDS.md - Container/Presenter pattern
 * @see _reference/project-management-reference/components/projects/ProjectDetailsPage.tsx
 */

import { memo, useMemo, type ReactNode } from 'react';
import { format, formatDistanceToNow, isPast, isBefore, addDays } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Building2,
  User,
  Calendar,
  Clock,
  TrendingUp,
  Target,
  DollarSign,
  CheckCircle,
  ChevronRight,
  PanelRight,
  Link2,
  AlertTriangle,
  Phone,
  Mail,
  FileText,
  MessageSquare,
  Percent,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { FormatAmount } from '@/components/shared/format';
import { UnifiedActivityTimeline } from '@/components/shared/activity';
import type { OpportunityStage } from '@/lib/schemas/pipeline';
import type { UnifiedActivity } from '@/lib/schemas/unified-activity';
import {
  OPPORTUNITY_STAGE_CONFIG,
  STAGE_PROBABILITY_DEFAULTS,
} from '../opportunity-status-config';

// ============================================================================
// TYPES
// ============================================================================

interface CustomerData {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  customerCode: string | null;
  type: string | null;
}

interface ContactData {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  jobTitle: string | null;
}

interface ActivityData {
  id: string;
  type: string;
  description: string;
  outcome: string | null;
  scheduledAt: Date | string | null;
  completedAt: Date | string | null;
  createdAt: Date | string;
}

interface QuoteVersionData {
  id: string;
  versionNumber: number;
  subtotal: number;
  taxAmount: number;
  total: number;
  notes: string | null;
  createdAt: Date | string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice?: number;
    unitPriceCents?: number;
    discountPercent?: number;
    total?: number;
    totalCents?: number;
  }>;
}

interface WinLossReasonData {
  id: string;
  name: string;
  type: string;
  description: string | null;
}

interface OpportunityData {
  id: string;
  title: string;
  description: string | null;
  stage: string;
  probability: number | null;
  value: number;
  weightedValue: number | null;
  expectedCloseDate: Date | string | null;
  actualCloseDate: Date | string | null;
  followUpDate: Date | string | null;
  quoteExpiresAt: Date | string | null;
  quotePdfUrl: string | null;
  lostReason: string | null;
  lostNotes: string | null;
  competitorName: string | null;
  daysInStage: number;
  version: number;
  metadata: Record<string, unknown> | null;
  tags: string[] | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface OpportunityDetailViewProps {
  opportunity: OpportunityData;
  customer: CustomerData | null;
  contact: ContactData | null;
  activities: ActivityData[];
  versions: QuoteVersionData[];
  winLossReason: WinLossReasonData | null;
  activeTab: string;
  onTabChange: (tab: string) => void;
  showMetaPanel: boolean;
  onToggleMetaPanel: () => void;
  unifiedActivities?: UnifiedActivity[];
  unifiedActivitiesLoading?: boolean;
  unifiedActivitiesError?: Error | null;
  className?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getExpectedCloseDateStatus(
  date: Date | string | null
): { isOverdue: boolean; isUrgent: boolean; text: string } {
  if (!date) return { isOverdue: false, isUrgent: false, text: '' };
  const closeDate = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const isOverdue = isPast(closeDate);
  const isUrgent = !isOverdue && isBefore(closeDate, addDays(now, 7));
  const text = isOverdue
    ? `Overdue by ${formatDistanceToNow(closeDate)}`
    : `Due ${formatDistanceToNow(closeDate, { addSuffix: true })}`;
  return { isOverdue, isUrgent, text };
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
// OPPORTUNITY HEADER (Project Management pattern)
// ============================================================================

interface OpportunityHeaderProps {
  opportunity: OpportunityData;
  customer: CustomerData | null;
}

function OpportunityHeader({ opportunity, customer }: OpportunityHeaderProps) {
  const stageConfig = OPPORTUNITY_STAGE_CONFIG[opportunity.stage as OpportunityStage];
  const StageIcon = stageConfig?.icon ?? TrendingUp;
  const expectedCloseDateStatus = getExpectedCloseDateStatus(opportunity.expectedCloseDate);

  const metaItems: MetaChip[] = [
    {
      label: 'Customer',
      value: customer?.name ?? 'Unknown',
      icon: <Building2 className="h-3.5 w-3.5" />,
    },
    {
      label: 'Value',
      value: <FormatAmount amount={opportunity.value} />,
      icon: <DollarSign className="h-3.5 w-3.5" />,
    },
    {
      label: 'Probability',
      value: `${opportunity.probability ?? 0}%`,
      icon: <Target className="h-3.5 w-3.5" />,
    },
    ...(opportunity.expectedCloseDate
      ? [
          {
            label: 'Expected Close',
            value: (
              <span
                className={cn(
                  expectedCloseDateStatus.isOverdue && 'text-destructive',
                  expectedCloseDateStatus.isUrgent && 'text-amber-600'
                )}
              >
                {format(
                  typeof opportunity.expectedCloseDate === 'string'
                    ? new Date(opportunity.expectedCloseDate)
                    : opportunity.expectedCloseDate,
                  'PP'
                )}
              </span>
            ),
            icon: <Calendar className="h-3.5 w-3.5" />,
          },
        ]
      : []),
    {
      label: 'Days in Stage',
      value: String(opportunity.daysInStage),
      icon: <Clock className="h-3.5 w-3.5" />,
    },
  ];

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-semibold text-foreground leading-tight">
            {opportunity.title}
          </h1>
          <div className="flex items-center gap-2">
            <Badge className={cn('gap-1 text-[11px]', stageConfig?.color)}>
              <StageIcon className="h-3 w-3" />
              {stageConfig?.label ?? opportunity.stage}
            </Badge>
          </div>
        </div>
      </div>

      {/* Overdue Alert */}
      {(expectedCloseDateStatus.isOverdue || expectedCloseDateStatus.isUrgent) && (
        <div
          className={cn(
            'flex items-center gap-2 text-sm',
            expectedCloseDateStatus.isOverdue
              ? 'text-destructive'
              : 'text-amber-600 dark:text-amber-400'
          )}
        >
          <AlertTriangle className="h-4 w-4" />
          {expectedCloseDateStatus.text}
        </div>
      )}

      <MetaChipsRow items={metaItems} />
    </section>
  );
}

// ============================================================================
// DEAL VALUE BREAKDOWN (2-column layout)
// ============================================================================

interface DealValueBreakdownProps {
  opportunity: OpportunityData;
}

function DealValueBreakdown({ opportunity }: DealValueBreakdownProps) {
  const probability = opportunity.probability ?? 0;
  const weightedValue = opportunity.weightedValue ?? (opportunity.value * probability) / 100;
  const stageDefault = STAGE_PROBABILITY_DEFAULTS[opportunity.stage as OpportunityStage] ?? 10;
  const probabilityVariance = probability - stageDefault;

  return (
    <section>
      <h2 className="text-base font-semibold text-foreground mb-4">Deal Value</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Value Breakdown */}
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Deal Value
            </span>
            <span className="font-medium tabular-nums">
              <FormatAmount amount={opportunity.value} />
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-2">
              <Percent className="h-4 w-4" /> Probability
            </span>
            <span className="font-medium tabular-nums">
              {probability}%
              {probabilityVariance !== 0 && (
                <span
                  className={cn(
                    'ml-2 text-xs',
                    probabilityVariance > 0 ? 'text-green-600' : 'text-amber-600'
                  )}
                >
                  ({probabilityVariance > 0 ? '+' : ''}
                  {probabilityVariance}% vs stage default)
                </span>
              )}
            </span>
          </div>
          <Separator />
          <div className="flex justify-between text-sm font-semibold">
            <span>Weighted Value</span>
            <span className="tabular-nums text-primary">
              <FormatAmount amount={weightedValue} />
            </span>
          </div>
        </div>

        {/* Stage Progress */}
        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Stage Probability</span>
            <span className="text-xs text-muted-foreground">{probability}%</span>
          </div>
          <Progress value={probability} className="h-2" />
          <div className="text-xs text-muted-foreground">
            Based on {opportunity.stage} stage, typical close rate is {stageDefault}%
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// STAGE PROGRESS VISUALIZATION
// ============================================================================

interface StageProgressProps {
  currentStage: string;
}

const PIPELINE_STAGES: OpportunityStage[] = ['new', 'qualified', 'proposal', 'negotiation', 'won'];

function StageProgress({ currentStage }: StageProgressProps) {
  const currentIndex = PIPELINE_STAGES.indexOf(currentStage as OpportunityStage);
  const isLost = currentStage === 'lost';

  return (
    <section>
      <h2 className="text-base font-semibold text-foreground mb-4">Pipeline Progress</h2>

      {isLost ? (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" />
          This opportunity was marked as Lost
        </div>
      ) : (
        <div className="flex items-center gap-1" role="list" aria-label="Pipeline progress">
          {PIPELINE_STAGES.map((stage, index) => {
            const stageConfig = OPPORTUNITY_STAGE_CONFIG[stage];
            const isComplete = index <= currentIndex;
            const isCurrent = index === currentIndex;

            return (
              <div
                key={stage}
                className="flex-1 flex flex-col items-center"
                role="listitem"
              >
                <div className="flex items-center w-full">
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium',
                      isComplete
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {isComplete ? <CheckCircle className="h-4 w-4" /> : index + 1}
                  </div>
                  {index < PIPELINE_STAGES.length - 1 && (
                    <div
                      className={cn('flex-1 h-1 mx-2', isComplete ? 'bg-primary' : 'bg-muted')}
                    />
                  )}
                </div>
                <p
                  className={cn(
                    'text-xs mt-2 text-center',
                    isCurrent ? 'font-medium text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {stageConfig.label}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <Progress
        value={isLost ? 0 : ((currentIndex + 1) / PIPELINE_STAGES.length) * 100}
        className="h-2 mt-4"
      />
    </section>
  );
}

// ============================================================================
// KEY DATES SECTION
// ============================================================================

interface KeyDatesProps {
  opportunity: OpportunityData;
}

function KeyDates({ opportunity }: KeyDatesProps) {
  const expectedCloseDateStatus = getExpectedCloseDateStatus(opportunity.expectedCloseDate);

  return (
    <section>
      <h2 className="text-base font-semibold text-foreground mb-4">Key Dates</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div>
          <div className="text-xs text-muted-foreground mb-1">Created</div>
          <div className="text-sm font-medium">
            {format(
              typeof opportunity.createdAt === 'string'
                ? new Date(opportunity.createdAt)
                : opportunity.createdAt,
              'PP'
            )}
          </div>
        </div>
        {opportunity.expectedCloseDate && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">Expected Close</div>
            <div
              className={cn('text-sm font-medium', expectedCloseDateStatus.isOverdue && 'text-destructive')}
            >
              {format(
                typeof opportunity.expectedCloseDate === 'string'
                  ? new Date(opportunity.expectedCloseDate)
                  : opportunity.expectedCloseDate,
                'PP'
              )}
            </div>
          </div>
        )}
        {opportunity.followUpDate && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">Follow Up</div>
            <div className="text-sm font-medium">
              {format(
                typeof opportunity.followUpDate === 'string'
                  ? new Date(opportunity.followUpDate)
                  : opportunity.followUpDate,
                'PP'
              )}
            </div>
          </div>
        )}
        {opportunity.actualCloseDate && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">Actual Close</div>
            <div
              className={cn(
                'text-sm font-medium',
                opportunity.stage === 'won'
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-destructive'
              )}
            >
              {format(
                typeof opportunity.actualCloseDate === 'string'
                  ? new Date(opportunity.actualCloseDate)
                  : opportunity.actualCloseDate,
                'PP'
              )}
            </div>
          </div>
        )}
        <div>
          <div className="text-xs text-muted-foreground mb-1">Last Updated</div>
          <div className="text-sm font-medium">
            {formatDistanceToNow(
              typeof opportunity.updatedAt === 'string'
                ? new Date(opportunity.updatedAt)
                : opportunity.updatedAt,
              { addSuffix: true }
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// WIN/LOSS SECTION
// ============================================================================

interface WinLossSectionProps {
  opportunity: OpportunityData;
  winLossReason: WinLossReasonData | null;
}

function WinLossSection({ opportunity, winLossReason }: WinLossSectionProps) {
  const isClosedStage = opportunity.stage === 'won' || opportunity.stage === 'lost';

  if (!isClosedStage) return null;
  if (!winLossReason && !opportunity.lostNotes && !opportunity.competitorName) return null;

  return (
    <section>
      <h2 className="text-base font-semibold text-foreground mb-4">
        {opportunity.stage === 'won' ? 'Win Details' : 'Loss Details'}
      </h2>
      <div className="space-y-4">
        {winLossReason && (
          <div>
            <div className="text-xs text-muted-foreground mb-2">Reason</div>
            <Badge
              className={cn(
                opportunity.stage === 'won'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                  : 'bg-destructive/10 text-destructive'
              )}
            >
              {winLossReason.name}
            </Badge>
            {winLossReason.description && (
              <p className="text-sm text-muted-foreground mt-2">{winLossReason.description}</p>
            )}
          </div>
        )}
        {opportunity.lostNotes && (
          <div>
            <div className="text-xs text-muted-foreground mb-2">Notes</div>
            <p className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-md">
              {opportunity.lostNotes}
            </p>
          </div>
        )}
        {opportunity.competitorName && (
          <div>
            <div className="text-xs text-muted-foreground mb-2">Competitor</div>
            <p className="text-sm font-medium">{opportunity.competitorName}</p>
          </div>
        )}
      </div>
    </section>
  );
}

// ============================================================================
// DESCRIPTION SECTION
// ============================================================================

interface DescriptionSectionProps {
  description: string | null;
}

function DescriptionSection({ description }: DescriptionSectionProps) {
  if (!description) return null;

  return (
    <section>
      <h2 className="text-base font-semibold text-foreground mb-4">Description</h2>
      <p className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-md">{description}</p>
    </section>
  );
}

// ============================================================================
// QUOTE VERSIONS PREVIEW
// ============================================================================

interface QuoteVersionsPreviewProps {
  versions: QuoteVersionData[];
}

function QuoteVersionsPreview({ versions }: QuoteVersionsPreviewProps) {
  if (!versions.length) return null;

  const displayVersions = versions.slice(0, 3);
  const hasMore = versions.length > 3;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-foreground">Quote Versions</h2>
        <span className="text-sm text-muted-foreground">{versions.length} versions</span>
      </div>
      <div className="space-y-2">
        {displayVersions.map((version) => (
          <div
            key={version.id}
            className="flex items-center justify-between py-2 border-b border-border last:border-0"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-muted rounded flex items-center justify-center text-xs font-medium">
                v{version.versionNumber}
              </div>
              <div>
                <div className="text-sm font-medium">
                  {version.items.length} items
                </div>
                <div className="text-xs text-muted-foreground">
                  {format(
                    typeof version.createdAt === 'string'
                      ? new Date(version.createdAt)
                      : version.createdAt,
                    'PP'
                  )}
                </div>
              </div>
            </div>
            <div className="text-sm font-medium tabular-nums">
              <FormatAmount amount={version.total} />
            </div>
          </div>
        ))}
        {hasMore && (
          <div className="text-sm text-muted-foreground text-center py-2">
            +{versions.length - 3} more versions
          </div>
        )}
      </div>
    </section>
  );
}

// ============================================================================
// RIGHT META PANEL (Project Management pattern)
// ============================================================================

interface RightMetaPanelProps {
  opportunity: OpportunityData;
  customer: CustomerData | null;
  contact: ContactData | null;
}

function RightMetaPanel({ opportunity, customer, contact }: RightMetaPanelProps) {

  return (
    <aside className="flex flex-col gap-8 p-4 pt-8 lg:sticky lg:self-start lg:top-4">
      {/* Customer Card */}
      {customer && (
        <>
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Customer
            </h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                {customer.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{customer.name}</div>
                {customer.customerCode && (
                  <div className="text-xs text-muted-foreground">{customer.customerCode}</div>
                )}
              </div>
            </div>
            {customer.email && (
              <div className="mt-3 text-xs text-muted-foreground flex items-center gap-2">
                <Mail className="h-3 w-3" />
                <a href={`mailto:${customer.email}`} className="hover:underline truncate">
                  {customer.email}
                </a>
              </div>
            )}
            {customer.phone && (
              <div className="mt-2 text-xs text-muted-foreground flex items-center gap-2">
                <Phone className="h-3 w-3" />
                <a href={`tel:${customer.phone}`} className="hover:underline">
                  {customer.phone}
                </a>
              </div>
            )}
          </div>
          <Separator />
        </>
      )}

      {/* Contact Card */}
      {contact && (
        <>
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Primary Contact
            </h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">
                  {contact.firstName} {contact.lastName}
                </div>
                {contact.jobTitle && (
                  <div className="text-xs text-muted-foreground">{contact.jobTitle}</div>
                )}
              </div>
            </div>
            {contact.email && (
              <div className="mt-3 text-xs text-muted-foreground flex items-center gap-2">
                <Mail className="h-3 w-3" />
                <a href={`mailto:${contact.email}`} className="hover:underline truncate">
                  {contact.email}
                </a>
              </div>
            )}
            {contact.phone && (
              <div className="mt-2 text-xs text-muted-foreground flex items-center gap-2">
                <Phone className="h-3 w-3" />
                <a href={`tel:${contact.phone}`} className="hover:underline">
                  {contact.phone}
                </a>
              </div>
            )}
          </div>
          <Separator />
        </>
      )}

      {/* Tags */}
      {opportunity.tags && opportunity.tags.length > 0 && (
        <>
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Tags
            </h3>
            <div className="flex flex-wrap gap-2">
              {opportunity.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[10px]">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
          <Separator />
        </>
      )}

      {/* Quote Status */}
      {opportunity.quoteExpiresAt && (
        <>
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Quote Status
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Expires</span>
                <span
                  className={cn(
                    isPast(
                      typeof opportunity.quoteExpiresAt === 'string'
                        ? new Date(opportunity.quoteExpiresAt)
                        : opportunity.quoteExpiresAt
                    ) && 'text-destructive'
                  )}
                >
                  {format(
                    typeof opportunity.quoteExpiresAt === 'string'
                      ? new Date(opportunity.quoteExpiresAt)
                      : opportunity.quoteExpiresAt,
                    'PP'
                  )}
                </span>
              </div>
              {opportunity.quotePdfUrl && (
                <a
                  href={opportunity.quotePdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-primary hover:underline"
                >
                  <FileText className="h-4 w-4" />
                  View Quote PDF
                </a>
              )}
            </div>
          </div>
          <Separator />
        </>
      )}

      {/* Audit Trail */}
      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Audit Trail
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Created</span>
            <span>
              {format(
                typeof opportunity.createdAt === 'string'
                  ? new Date(opportunity.createdAt)
                  : opportunity.createdAt,
                'PP'
              )}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Updated</span>
            <span>
              {format(
                typeof opportunity.updatedAt === 'string'
                  ? new Date(opportunity.updatedAt)
                  : opportunity.updatedAt,
                'PP'
              )}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Version</span>
            <span>v{opportunity.version}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const OpportunityDetailView = memo(function OpportunityDetailView({
  opportunity,
  customer,
  contact,
  activities,
  versions,
  winLossReason,
  activeTab,
  onTabChange,
  showMetaPanel,
  onToggleMetaPanel,
  unifiedActivities = [],
  unifiedActivitiesLoading = false,
  unifiedActivitiesError,
  className,
}: OpportunityDetailViewProps) {
  const activitiesCount = useMemo(() => activities?.length ?? 0, [activities]);
  const versionsCount = useMemo(() => versions?.length ?? 0, [versions]);

  return (
    <div className={cn('flex flex-1 flex-col min-w-0 m-2 border border-border rounded-lg', className)}>
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-4 px-4 py-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Pipeline</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{opportunity.title}</span>
        </div>

        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => copyToClipboard(window.location.href)}
                >
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
                  className={cn('h-8 w-8', showMetaPanel && 'bg-muted')}
                  onClick={onToggleMetaPanel}
                >
                  <PanelRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{showMetaPanel ? 'Hide' : 'Show'} details panel</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Main Content - FULL WIDTH (no max-w-7xl) */}
      <div className="flex flex-1 flex-col bg-background px-2 rounded-b-lg min-w-0 border-t">
        <div className="px-4">
          <div
            className={cn(
              'grid grid-cols-1 gap-12',
              showMetaPanel ? 'lg:grid-cols-[minmax(0,2fr)_minmax(0,320px)]' : 'lg:grid-cols-1'
            )}
          >
            {/* Primary Content */}
            <div className="space-y-6 pt-4 pb-6">
              <OpportunityHeader opportunity={opportunity} customer={customer} />

              <Tabs value={activeTab} onValueChange={onTabChange}>
                <TabsList className="w-full gap-6 bg-transparent border-b border-border rounded-none h-auto p-0">
                  <TabsTrigger
                    value="overview"
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3"
                  >
                    Overview
                  </TabsTrigger>
                  <TabsTrigger
                    value="quote"
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3"
                  >
                    Quote ({versionsCount})
                  </TabsTrigger>
                  <TabsTrigger
                    value="activities"
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3"
                  >
                    Activities ({activitiesCount})
                  </TabsTrigger>
                  <TabsTrigger
                    value="activity"
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3"
                  >
                    Activity Log
                  </TabsTrigger>
                </TabsList>

                {/* Overview Tab - space-y-10 for generous spacing between sections */}
                <TabsContent value="overview" className="mt-0 pt-6">
                  <div className="space-y-10">
                    <DealValueBreakdown opportunity={opportunity} />
                    <StageProgress currentStage={opportunity.stage} />
                    <KeyDates opportunity={opportunity} />
                    <WinLossSection opportunity={opportunity} winLossReason={winLossReason} />
                    <DescriptionSection description={opportunity.description} />
                    <QuoteVersionsPreview versions={versions} />
                  </div>
                </TabsContent>

                {/* Quote Tab - Placeholder for quote builder integration */}
                <TabsContent value="quote" className="mt-0 pt-6">
                  <div className="text-sm text-muted-foreground">
                    Quote builder integration. View the original OpportunityDetail for full
                    QuoteBuilderContainer integration.
                  </div>
                </TabsContent>

                {/* Activities Tab */}
                <TabsContent value="activities" className="mt-0 pt-6">
                  {activities.length > 0 ? (
                    <div className="space-y-4">
                      {activities.map((activity, index) => (
                        <div
                          key={activity.id}
                          className={cn(
                            'flex gap-4 pb-4',
                            index < activities.length - 1 && 'border-b'
                          )}
                        >
                          <div
                            className={cn(
                              'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
                              activity.completedAt ? 'bg-green-100' : 'bg-muted'
                            )}
                          >
                            <MessageSquare
                              className={cn(
                                'h-5 w-5',
                                activity.completedAt
                                  ? 'text-green-600'
                                  : 'text-muted-foreground'
                              )}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-medium capitalize">{activity.type}</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {activity.description}
                                </p>
                                {activity.outcome && (
                                  <p className="text-sm mt-2">
                                    <span className="font-medium">Outcome:</span> {activity.outcome}
                                  </p>
                                )}
                              </div>
                              <div className="text-right text-sm text-muted-foreground whitespace-nowrap">
                                {formatDistanceToNow(
                                  typeof activity.createdAt === 'string'
                                    ? new Date(activity.createdAt)
                                    : activity.createdAt,
                                  { addSuffix: true }
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No activities logged yet</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Log calls, emails, meetings, and notes here
                      </p>
                    </div>
                  )}
                </TabsContent>

                {/* Activity Log Tab (Unified) */}
                <TabsContent value="activity" className="mt-0 pt-6">
                  <UnifiedActivityTimeline
                    activities={unifiedActivities}
                    isLoading={unifiedActivitiesLoading}
                    hasError={!!unifiedActivitiesError}
                    error={unifiedActivitiesError || undefined}
                    title="Activity Timeline"
                    description="Complete history of opportunity changes, status updates, and system events"
                    showFilters={true}
                    emptyMessage="No activity recorded yet"
                    emptyDescription="Opportunity activities will appear here when changes are made."
                  />
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
                  className="lg:border-l lg:border-border"
                >
                  <RightMetaPanel
                    opportunity={opportunity}
                    customer={customer}
                    contact={contact}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <Separator className="mt-auto" />
      </div>
    </div>
  );
});

export default OpportunityDetailView;
