/**
 * Opportunity Overview Tab
 *
 * Substantial overview content for the opportunity detail view.
 * This is NOT a summary - it surfaces real work:
 * - Deal value breakdown with weighted calculations
 * - Pipeline stage progress visualization
 * - Active items (pending activities, follow-ups)
 * - Key dates and milestones
 * - Win/loss analysis when closed
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md (Overview Tab Philosophy)
 */

import { memo } from 'react';
import { format, formatDistanceToNow, isPast, isBefore, addDays } from 'date-fns';
import {
  Calendar,
  Clock,
  DollarSign,
  Target,
  CheckCircle,
  AlertTriangle,
  Percent,
  FileText,
  MessageSquare,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FormatAmount } from '@/components/shared/format';
import type { OpportunityStage } from '@/lib/schemas/pipeline';
import { isValidOpportunityStage } from '@/lib/schemas/pipeline';
import type {
  OpportunityActiveItems,
  PendingActivity,
  RecentQuoteVersion,
} from '@/lib/schemas/pipeline/opportunity-detail-extended';
import {
  OPPORTUNITY_STAGE_CONFIG,
  STAGE_PROBABILITY_DEFAULTS,
} from '../opportunity-status-config';

// ============================================================================
// TYPES
// ============================================================================

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
  lostReason: string | null;
  lostNotes: string | null;
  competitorName: string | null;
  daysInStage: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface WinLossReasonData {
  id: string;
  name: string;
  type: string;
  description: string | null;
}

export interface OpportunityOverviewTabProps {
  opportunity: OpportunityData;
  winLossReason: WinLossReasonData | null;
  activeItems?: OpportunityActiveItems;
  activeItemsLoading?: boolean;
  onLogActivity?: () => void;
  onScheduleFollowUp?: () => void;
  onExtendQuote?: () => void;
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

// ============================================================================
// DEAL VALUE BREAKDOWN
// ============================================================================

interface DealValueBreakdownProps {
  opportunity: OpportunityData;
}

function DealValueBreakdown({ opportunity }: DealValueBreakdownProps) {
  const probability = opportunity.probability ?? 0;
  const weightedValue = opportunity.weightedValue ?? (opportunity.value * probability) / 100;
  const stageDefault = isValidOpportunityStage(opportunity.stage) 
    ? STAGE_PROBABILITY_DEFAULTS[opportunity.stage] ?? 10
    : 10;
  const probabilityVariance = probability - stageDefault;

  return (
    <section>
      <h2 className="text-base font-semibold text-foreground mb-4">Deal Value</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
// PIPELINE STAGE PROGRESS
// ============================================================================

interface StageProgressProps {
  currentStage: string;
}

const PIPELINE_STAGES: OpportunityStage[] = ['new', 'qualified', 'proposal', 'negotiation', 'won'];

function StageProgress({ currentStage }: StageProgressProps) {
  const currentIndex = isValidOpportunityStage(currentStage) 
    ? PIPELINE_STAGES.indexOf(currentStage)
    : -1;
  const isLost = currentStage === 'lost';

  return (
    <section>
      <h2 className="text-base font-semibold text-foreground mb-4">Pipeline Progress</h2>

      {isLost ? (
        <div className="flex items-center gap-2 text-sm text-destructive" role="alert">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          This opportunity was marked as Lost
        </div>
      ) : (
        <div className="flex items-center gap-1" role="list" aria-label="Pipeline progress stages">
          {PIPELINE_STAGES.map((stage, index) => {
            const stageConfig = OPPORTUNITY_STAGE_CONFIG[stage];
            const isComplete = index <= currentIndex;
            const isCurrent = index === currentIndex;

            return (
              <div
                key={stage}
                className="flex-1 flex flex-col items-center"
                role="listitem"
                aria-current={isCurrent ? 'step' : undefined}
              >
                <div className="flex items-center w-full">
                  <div
                    tabIndex={0}
                    role="button"
                    aria-label={`${stageConfig.label}: ${isComplete ? 'completed' : 'not completed'}${isCurrent ? ', current stage' : ''}`}
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium',
                      'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                      isComplete
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {isComplete ? <CheckCircle className="h-4 w-4" aria-hidden="true" /> : index + 1}
                  </div>
                  {index < PIPELINE_STAGES.length - 1 && (
                    <div
                      className={cn('flex-1 h-1 mx-2', isComplete ? 'bg-primary' : 'bg-muted')}
                      aria-hidden="true"
                    />
                  )}
                </div>
                <p
                  className={cn(
                    'text-xs mt-2 text-center',
                    isCurrent ? 'font-medium text-foreground' : 'text-muted-foreground'
                  )}
                  aria-hidden="true"
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
// ACTIVE ITEMS (Pending work from composite hook)
// ============================================================================

interface ActiveItemsSectionProps {
  activeItems?: OpportunityActiveItems;
  isLoading?: boolean;
  onLogActivity?: () => void;
  onScheduleFollowUp?: () => void;
}

function ActiveItemsSection({
  activeItems,
  isLoading,
  onLogActivity,
  onScheduleFollowUp,
}: ActiveItemsSectionProps) {
  if (isLoading) {
    return (
      <section>
        <h2 className="text-base font-semibold text-foreground mb-4">Active Items</h2>
        <div className="animate-pulse space-y-3">
          <div className="h-12 bg-muted rounded" />
          <div className="h-12 bg-muted rounded" />
        </div>
      </section>
    );
  }

  const hasPendingWork =
    (activeItems?.pendingActivities?.length ?? 0) > 0 ||
    (activeItems?.scheduledFollowUps?.length ?? 0) > 0;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-foreground">Active Items</h2>
        <div className="flex gap-2">
          {onLogActivity && (
            <Button variant="outline" size="sm" onClick={onLogActivity}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Log Activity
            </Button>
          )}
          {onScheduleFollowUp && (
            <Button variant="outline" size="sm" onClick={onScheduleFollowUp}>
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Follow-up
            </Button>
          )}
        </div>
      </div>

      {!hasPendingWork ? (
        <div className="text-center py-8 border border-dashed rounded-lg">
          <CheckCircle className="h-8 w-8 mx-auto text-green-500 mb-2" />
          <p className="text-sm text-muted-foreground">All caught up!</p>
          <p className="text-xs text-muted-foreground mt-1">
            No pending activities or follow-ups
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Pending Activities */}
          {activeItems?.pendingActivities && activeItems.pendingActivities.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2" id="pending-activities-heading">
                Pending Activities ({activeItems.counts?.pendingActivities ?? 0})
              </h3>
              <div className="space-y-2" role="list" aria-labelledby="pending-activities-heading">
                {activeItems.pendingActivities.map((activity: PendingActivity) => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))}
              </div>
            </div>
          )}

          {/* Scheduled Follow-ups */}
          {activeItems?.scheduledFollowUps && activeItems.scheduledFollowUps.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2" id="scheduled-followups-heading">
                Scheduled Follow-ups ({activeItems.counts?.scheduledFollowUps ?? 0})
                {(activeItems.counts?.overdueFollowUps ?? 0) > 0 && (
                  <Badge variant="destructive" className="ml-2 text-xs">
                    {activeItems.counts.overdueFollowUps} overdue
                  </Badge>
                )}
              </h3>
              <div className="space-y-2" role="list" aria-labelledby="scheduled-followups-heading">
                {activeItems.scheduledFollowUps.map((activity: PendingActivity) => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

interface ActivityItemProps {
  activity: PendingActivity;
}

function ActivityItem({ activity }: ActivityItemProps) {
  return (
    <div
      role="listitem"
      className={cn(
        'flex items-center justify-between p-3 rounded-lg border',
        'hover:bg-muted/30 transition-colors',
        activity.isOverdue && 'border-destructive/50 bg-destructive/5'
      )}
      aria-label={`${activity.type} activity: ${activity.description}${activity.isOverdue ? ', overdue' : ''}`}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center',
            activity.isOverdue ? 'bg-destructive/10' : 'bg-muted'
          )}
          aria-hidden="true"
        >
          <MessageSquare
            className={cn('h-4 w-4', activity.isOverdue ? 'text-destructive' : 'text-muted-foreground')}
          />
        </div>
        <div>
          <p className="text-sm font-medium capitalize">{activity.type}</p>
          <p className="text-xs text-muted-foreground line-clamp-1">{activity.description}</p>
        </div>
      </div>
      <div className="text-right">
        {activity.scheduledAt && (
          <p
            className={cn(
              'text-xs',
              activity.isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'
            )}
          >
            {activity.isOverdue ? 'Overdue' : 'Due'}{' '}
            {formatDistanceToNow(new Date(activity.scheduledAt), { addSuffix: true })}
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// KEY DATES
// ============================================================================

interface KeyDatesProps {
  opportunity: OpportunityData;
}

function KeyDates({ opportunity }: KeyDatesProps) {
  const expectedCloseDateStatus = getExpectedCloseDateStatus(opportunity.expectedCloseDate);

  return (
    <section>
      <h2 className="text-base font-semibold text-foreground mb-4">Key Dates</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div>
          <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Created
          </div>
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
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <Target className="h-3 w-3" /> Expected Close
            </div>
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
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <Clock className="h-3 w-3" /> Follow Up
            </div>
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
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" /> Closed
            </div>
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
          <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <Clock className="h-3 w-3" /> Days in Stage
          </div>
          <div className="text-sm font-medium">{opportunity.daysInStage}</div>
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
// RECENT QUOTE VERSIONS (Quick Reference)
// ============================================================================

interface RecentQuotesProps {
  versions?: RecentQuoteVersion[];
  onExtendQuote?: () => void;
}

function RecentQuotes({ versions, onExtendQuote }: RecentQuotesProps) {
  if (!versions || versions.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-foreground">Recent Quotes</h2>
        {onExtendQuote && (
          <Button variant="ghost" size="sm" onClick={onExtendQuote}>
            <FileText className="h-4 w-4 mr-2" />
            Extend Validity
          </Button>
        )}
      </div>
      <div className="space-y-2">
        {versions.map((version) => (
          <div
            key={version.id}
            className="flex items-center justify-between py-2 border-b border-border last:border-0"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-muted rounded flex items-center justify-center text-xs font-medium">
                v{version.versionNumber}
              </div>
              <div>
                <div className="text-sm font-medium">{version.itemCount} items</div>
                <div className="text-xs text-muted-foreground">
                  {format(new Date(version.createdAt), 'PP')}
                </div>
              </div>
            </div>
            <div className="text-sm font-medium tabular-nums">
              <FormatAmount amount={version.total} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ============================================================================
// DESCRIPTION
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
// MAIN COMPONENT
// ============================================================================

export const OpportunityOverviewTab = memo(function OpportunityOverviewTab({
  opportunity,
  winLossReason,
  activeItems,
  activeItemsLoading,
  onLogActivity,
  onScheduleFollowUp,
  onExtendQuote,
  className,
}: OpportunityOverviewTabProps) {
  return (
    <div className={cn('space-y-8', className)}>
      <DealValueBreakdown opportunity={opportunity} />
      <StageProgress currentStage={opportunity.stage} />
      <ActiveItemsSection
        activeItems={activeItems}
        isLoading={activeItemsLoading}
        onLogActivity={onLogActivity}
        onScheduleFollowUp={onScheduleFollowUp}
      />
      <KeyDates opportunity={opportunity} />
      <WinLossSection opportunity={opportunity} winLossReason={winLossReason} />
      <DescriptionSection description={opportunity.description} />
      <RecentQuotes
        versions={activeItems?.recentQuoteVersions}
        onExtendQuote={onExtendQuote}
      />
    </div>
  );
});

export default OpportunityOverviewTab;
