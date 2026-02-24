/**
 * Opportunity Detail View (Presenter)
 *
 * 5-Zone Layout following DETAIL-VIEW-STANDARDS.md:
 * - Zone 1: Header (light - identity + stage badge + meta chips)
 * - Zone 2: Progress (pipeline stage visualization)
 * - Zone 3: Alerts (contextual alerts from composite hook)
 * - Zone 4: Tabs (substantial content, lazy-loaded)
 * - Zone 5: Main + Sidebar (content with collapsible reference panel)
 *
 * @source opportunity, customer, contact from useOpportunityDetail hook
 * @source alerts from useOpportunityAlerts hook (via composite)
 * @source activeItems from useOpportunityActiveItems hook (via composite)
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 * @see _reference/project-management-reference/components/projects/ProjectDetailsPage.tsx
 */

import { memo, useMemo, Suspense, type ReactNode } from 'react';
import { format, isPast, isBefore, addDays } from 'date-fns';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Building2,
  Calendar,
  Clock,
  TrendingUp,
  Target,
  DollarSign,
  PanelRight,
  Link2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { FormatAmount } from '@/components/shared/format';
import { isValidOpportunityStage } from '@/lib/schemas/pipeline';
import type { UnifiedActivity } from '@/lib/schemas/unified-activity';
import type {
  OpportunityAlert,
  OpportunityActiveItems,
} from '@/lib/schemas/pipeline/opportunity-detail-extended';
import { OPPORTUNITY_STAGE_CONFIG } from '../opportunity-status-config';
import { OpportunitySidebar } from '../sidebar';
import { OpportunityAlerts } from '../alerts';
import {
  LazyOverviewTab,
  LazyQuoteTab,
  LazyActivitiesTab,
  LazyDocumentsTab,
} from '../tabs';

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
  // Core data
  opportunity: OpportunityData;
  customer: CustomerData | null;
  contact: ContactData | null;
  versions: QuoteVersionData[];
  winLossReason: WinLossReasonData | null;

  // Extended data (from composite hook)
  alerts?: OpportunityAlert[];
  activeItems?: OpportunityActiveItems;
  activeItemsLoading?: boolean;
  unifiedActivities?: UnifiedActivity[];
  unifiedActivitiesLoading?: boolean;
  unifiedActivitiesError?: Error | null;
  onCompleteActivity?: (activityId: string, outcome?: string) => void;
  isCompleteActivityPending?: boolean;

  // UI State
  activeTab: string;
  onTabChange: (tab: string) => void;
  showSidebar: boolean;
  onToggleSidebar: () => void;
  isClosedStage?: boolean;

  // Actions
  onAlertAction?: (actionType: string, alertId: string) => void;
  onLogActivity?: () => void;
  onScheduleFollowUp?: () => void;
  onExtendQuote?: () => void;
  onSendQuote?: () => void;
  onCopyLink?: () => void;

  className?: string;
}

// ============================================================================
// TAB SKELETON (for lazy loading)
// ============================================================================

function TabSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 bg-muted rounded w-1/3" />
      <div className="space-y-3">
        <div className="h-4 bg-muted rounded w-full" />
        <div className="h-4 bg-muted rounded w-5/6" />
        <div className="h-4 bg-muted rounded w-4/6" />
      </div>
      <div className="h-32 bg-muted rounded" />
    </div>
  );
}

// ============================================================================
// META CHIPS ROW (Zone 1 - Light Header)
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
// OPPORTUNITY HEADER (Zone 1 - LIGHT)
// ============================================================================

interface OpportunityHeaderProps {
  opportunity: OpportunityData;
  customer: CustomerData | null;
}

function OpportunityHeader({ opportunity, customer }: OpportunityHeaderProps) {
  const stageConfig = isValidOpportunityStage(opportunity.stage) 
    ? OPPORTUNITY_STAGE_CONFIG[opportunity.stage] 
    : OPPORTUNITY_STAGE_CONFIG.new;
  const StageIcon = stageConfig?.icon ?? TrendingUp;

  // Check if close date is approaching
  const expectedCloseDate = opportunity.expectedCloseDate
    ? new Date(opportunity.expectedCloseDate)
    : null;
  const isOverdue = expectedCloseDate && isPast(expectedCloseDate);
  const isUrgent = expectedCloseDate && !isOverdue && isBefore(expectedCloseDate, addDays(new Date(), 7));

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
    ...(expectedCloseDate
      ? [
          {
            label: 'Expected Close',
            value: (
              <span
                className={cn(
                  isOverdue && 'text-destructive',
                  isUrgent && 'text-amber-600'
                )}
              >
                {format(expectedCloseDate, 'PP')}
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
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-2xl md:text-3xl font-semibold text-foreground leading-tight tracking-tight">
          {opportunity.title}
        </h1>
        <Badge className={cn('gap-1.5 text-xs px-2.5 py-1', stageConfig?.color)}>
          <StageIcon className="h-3.5 w-3.5" />
          {stageConfig?.label ?? opportunity.stage}
        </Badge>
      </div>
      <MetaChipsRow items={metaItems} />
    </section>
  );
}

// ============================================================================
// HEADER ACTIONS
// ============================================================================

interface HeaderActionsProps {
  showSidebar: boolean;
  onToggleSidebar: () => void;
  onCopyLink?: () => void;
}

function HeaderActions({ showSidebar, onToggleSidebar, onCopyLink }: HeaderActionsProps) {
  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      {onCopyLink && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 min-h-[44px] min-w-[44px]"
                onClick={onCopyLink}
                aria-label="Copy link"
              >
                <Link2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy link</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-10 w-10 min-h-[44px] min-w-[44px] transition-colors',
                showSidebar && 'bg-muted'
              )}
              onClick={onToggleSidebar}
              aria-label={showSidebar ? 'Hide details panel' : 'Show details panel'}
            >
              <PanelRight className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{showSidebar ? 'Hide' : 'Show'} details panel</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const OpportunityDetailView = memo(function OpportunityDetailView({
  opportunity,
  customer,
  contact,
  versions,
  winLossReason,
  alerts = [],
  activeItems,
  activeItemsLoading,
  unifiedActivities = [],
  unifiedActivitiesLoading = false,
  unifiedActivitiesError,
  onCompleteActivity,
  isCompleteActivityPending = false,
  activeTab,
  onTabChange,
  showSidebar,
  onToggleSidebar,
  isClosedStage,
  onAlertAction,
  onLogActivity,
  onScheduleFollowUp,
  onExtendQuote,
  onSendQuote,
  onCopyLink,
  className,
}: OpportunityDetailViewProps) {
  const shouldReduceMotion = useReducedMotion();
  const activitiesCount = useMemo(() => unifiedActivities?.length ?? 0, [unifiedActivities]);
  const versionsCount = useMemo(() => versions?.length ?? 0, [versions]);

  return (
    <div className={cn('flex flex-1 flex-col min-w-0', className)}>
      <div className="flex flex-1 flex-col bg-background min-w-0">
        <div className="px-4">
          {/* ══════════════════════════════════════════════════════════════════
              ZONE 1: HEADER (Light - identity + stage + meta chips)
              ══════════════════════════════════════════════════════════════════ */}
          <div className="flex items-start justify-between gap-4 pt-4 pb-4">
            <OpportunityHeader opportunity={opportunity} customer={customer} />
            <HeaderActions
              showSidebar={showSidebar}
              onToggleSidebar={onToggleSidebar}
              onCopyLink={onCopyLink}
            />
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              ZONE 3: ALERTS (Contextual alerts from composite hook)
              ══════════════════════════════════════════════════════════════════ */}
          {alerts.length > 0 && (
            <div className="pb-4">
              <OpportunityAlerts alerts={alerts} onAction={onAlertAction} />
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              ZONE 4 & 5: TABS + MAIN CONTENT + SIDEBAR
              ══════════════════════════════════════════════════════════════════ */}
          <div
            className={cn(
              'grid grid-cols-1 gap-8',
              showSidebar ? 'lg:grid-cols-[minmax(0,2fr)_minmax(0,320px)]' : 'lg:grid-cols-1'
            )}
          >
            {/* Primary Content with Tabs */}
            <div className="space-y-6 pb-6">
              <Tabs value={activeTab} onValueChange={onTabChange}>
                <TabsList className="w-full gap-4 md:gap-6 bg-transparent border-b border-border rounded-none h-auto p-0 overflow-x-auto">
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
                    value="documents"
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3"
                  >
                    Documents
                  </TabsTrigger>
                </TabsList>

                {/* Overview Tab - SUBSTANTIAL content */}
                <TabsContent value="overview" className="mt-0 pt-6">
                  <Suspense fallback={<TabSkeleton />}>
                    <LazyOverviewTab
                      opportunity={opportunity}
                      winLossReason={winLossReason}
                      activeItems={activeItems}
                      activeItemsLoading={activeItemsLoading}
                      onLogActivity={onLogActivity}
                      onScheduleFollowUp={onScheduleFollowUp}
                      onExtendQuote={onExtendQuote}
                    />
                  </Suspense>
                </TabsContent>

                {/* Quote Tab - FULL FEATURE */}
                <TabsContent value="quote" className="mt-0 pt-6">
                  <Suspense fallback={<TabSkeleton />}>
                    <LazyQuoteTab
                      opportunityId={opportunity.id}
                      versions={versions}
                      quoteExpiresAt={opportunity.quoteExpiresAt}
                      quotePdfUrl={opportunity.quotePdfUrl}
                      isClosedStage={isClosedStage}
                      onSendQuote={onSendQuote}
                      onExtendValidity={onExtendQuote}
                    />
                  </Suspense>
                </TabsContent>

                {/* Activities Tab - FULL FEATURE */}
                <TabsContent value="activities" className="mt-0 pt-6">
                  <Suspense fallback={<TabSkeleton />}>
                    <LazyActivitiesTab
                      activities={unifiedActivities}
                      isLoading={unifiedActivitiesLoading}
                      error={unifiedActivitiesError}
                      onLogActivity={onLogActivity}
                      onScheduleFollowUp={onScheduleFollowUp}
                      onComplete={onCompleteActivity}
                      isCompletePending={isCompleteActivityPending}
                    />
                  </Suspense>
                </TabsContent>

                {/* Documents Tab - FULL FEATURE */}
                <TabsContent value="documents" className="mt-0 pt-6">
                  <Suspense fallback={<TabSkeleton />}>
                    <LazyDocumentsTab opportunityId={opportunity.id} />
                  </Suspense>
                </TabsContent>
              </Tabs>
            </div>

            {/* Sidebar (Animated with reduced motion support) */}
            <AnimatePresence initial={false}>
              {showSidebar && (
                <motion.div
                  key="sidebar"
                  initial={shouldReduceMotion ? { opacity: 0 } : { x: 80, opacity: 0 }}
                  animate={shouldReduceMotion ? { opacity: 1 } : { x: 0, opacity: 1 }}
                  exit={shouldReduceMotion ? { opacity: 0 } : { x: 80, opacity: 0 }}
                  transition={
                    shouldReduceMotion
                      ? { duration: 0.01 }
                      : { type: 'spring', stiffness: 260, damping: 26 }
                  }
                  className="lg:border-l lg:border-border"
                >
                  <OpportunitySidebar
                    opportunityId={opportunity.id}
                    customer={customer}
                    contact={contact}
                    quoteStatus={{
                      expiresAt: opportunity.quoteExpiresAt,
                      pdfUrl: opportunity.quotePdfUrl,
                      currentVersion: versions.length > 0 ? versions[0].versionNumber : 1,
                      totalVersions: versions.length,
                    }}
                    className="p-4 pt-8"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
});

export default OpportunityDetailView;
