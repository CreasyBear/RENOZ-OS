/**
 * Project Detail View (Presenter)
 *
 * 5-Zone Layout following DETAIL-VIEW-STANDARDS.md:
 * - Zone 1: Header (Identity + Status + Key Metrics)
 * - Zone 2: Progress (Visual Progress + Schedule/Budget Status)
 * - Zone 3: Alerts (Contextual Problems)
 * - Zone 4: Tabs (Navigation)
 * - Zone 5: Main Content + Sidebar
 *
 * @see docs/design-system/PROJECTS-DOMAIN-PHILOSOPHY.md Part 4
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 * @see STANDARDS.md - Container/Presenter pattern
 */

import { memo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Calendar,
  Clock,
  PanelRight,
  Link2,
  FileText,
  Package,
  CheckSquare,
  Image as ImageIcon,
  ClipboardList,
  Target,
  DollarSign,
  Info,
  Plus,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { UnifiedActivityTimeline } from '@/components/shared/activity';
import { getActivitiesFeedSearch } from '@/lib/activities';
import { EntityHeader, MetricCard, type EntityHeaderAction } from '@/components/shared';
import { PROJECT_STATUS_CONFIG, PROJECT_PRIORITY_CONFIG } from '../project-status-config';
import { StatusProgressCircle } from '../progress-circle';
import { ProjectAlerts } from '../alerts';
import { ProjectLifecycleProgress } from '../project-lifecycle-progress';
import {
  CustomerCard,
  SiteAddressCard,
  ProgressCard,
  TeamCard,
  AuditTrailCard,
  TimeCard,
  RelatedLinksCard,
  type TeamMember,
} from '../sidebar';
import type { UnifiedActivity } from '@/lib/schemas/unified-activity';
import type { ProjectAlert } from '@/lib/schemas/jobs/project-alerts';
import type { ProjectMember, ProjectDetailData } from '@/lib/schemas/jobs/project-detail';

// ============================================================================
// TYPES
// ============================================================================

// Types moved to schemas - import from '@/lib/schemas/jobs/project-detail'
// Re-export for backward compatibility
export type { ProjectMember, ProjectDetailData };

export interface ProjectDetailViewProps {
  /** Project data */
  project: ProjectDetailData;
  /** Project alerts (Zone 3) */
  alerts?: ProjectAlert[];
  /** Active tab */
  activeTab: string;
  /** Tab change handler */
  onTabChange: (tab: string) => void;
  /** Show sidebar panel */
  showSidebar: boolean;
  /** Toggle sidebar handler */
  onToggleSidebar: () => void;
  /** Activity data */
  activities?: UnifiedActivity[];
  /** Activities loading */
  activitiesLoading?: boolean;
  /** Activities error */
  activitiesError?: Error | null;
  /** Handler to open activity logging dialog */
  onLogActivity?: () => void;
  /** Handler to open follow-up scheduling dialog */
  onScheduleFollowUp?: () => void;
  /** Derived: Schedule status */
  scheduleStatus?: 'on-track' | 'at-risk' | 'overdue';
  /** Derived: Budget status */
  budgetStatus?: 'under' | 'on-target' | 'over';
  /** Derived: Completed task count */
  completedTasks?: number;
  /** Derived: Total task count */
  totalTasks?: number;
  /** Tab counts for badges */
  tabCounts?: {
    workstreams?: number;
    visits?: number;
    tasks?: number;
    notes?: number;
    files?: number;
    documents?: number;
  };
  /** Tab content render props */
  renderOverviewTab?: () => ReactNode;
  renderWorkstreamsTab?: () => ReactNode;
  renderVisitsTab?: () => ReactNode;
  renderTasksTab?: () => ReactNode;
  renderBomTab?: () => ReactNode;
  renderNotesTab?: () => ReactNode;
  renderFilesTab?: () => ReactNode;
  renderDocumentsTab?: () => ReactNode;
  /** Header actions (EntityHeader) - per DETAIL-VIEW-STANDARDS */
  primaryAction?: { label: string; onClick: () => void; icon?: ReactNode; disabled?: boolean };
  secondaryActions?: EntityHeaderAction[];
  onEdit?: () => void;
  onDelete?: () => void;
  /** Cross-entity links for RelatedLinksCard (WORKFLOW-CONTINUITY P3) */
  relatedLinks?: {
    orderId?: string | null;
    installerId?: string | null;
    installerName?: string | null;
  };
  className?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

function formatProjectType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

// ============================================================================
// META CHIPS ROW (Zone 1 sub-component)
// ============================================================================

// ============================================================================
// ZONE 1: PROJECT HEADER
// ============================================================================

interface ProjectHeaderProps {
  project: ProjectDetailData;
  scheduleStatus: 'on-track' | 'at-risk' | 'overdue';
  budgetStatus: 'under' | 'on-target' | 'over';
  completedTasks: number;
  totalTasks: number;
  primaryAction?: { label: string; onClick: () => void; icon?: ReactNode; disabled?: boolean };
  secondaryActions?: EntityHeaderAction[];
  onEdit?: () => void;
  onDelete?: () => void;
}

function ProjectHeader({
  project,
  scheduleStatus,
  budgetStatus,
  completedTasks,
  totalTasks,
  primaryAction,
  secondaryActions,
  onEdit,
  onDelete,
}: ProjectHeaderProps) {
  const scheduleConfig = {
    'on-track': { label: 'On Track', color: 'text-green-600' },
    'at-risk': { label: 'At Risk', color: 'text-amber-600' },
    'overdue': { label: 'Overdue', color: 'text-red-600' },
  };
  const budgetConfig = {
    'under': { label: 'Under Budget', color: 'text-green-600' },
    'on-target': { label: 'On Target', color: 'text-blue-600' },
    'over': { label: 'Over Budget', color: 'text-red-600' },
  };
  const daysRemaining = project.targetCompletionDate
    ? Math.ceil(
        (new Date(project.targetCompletionDate).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  const typeBadge =
    project.priority !== 'medium' ? (
      <Badge className={cn('text-[11px]', `bg-${PROJECT_PRIORITY_CONFIG[project.priority].color}/10`)}>
        {PROJECT_PRIORITY_CONFIG[project.priority].label}
      </Badge>
    ) : undefined;

  return (
    <section className="space-y-4">
      <EntityHeader
        name={project.title}
        subtitle={`${project.projectNumber} · ${formatProjectType(project.projectType)}`}
        avatarFallback="P"
        status={{
          value: project.status,
          config: PROJECT_STATUS_CONFIG,
        }}
        typeBadge={typeBadge}
        primaryAction={primaryAction}
        secondaryActions={secondaryActions}
        onEdit={onEdit}
        onDelete={onDelete}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          variant="compact"
          title="Progress"
          value={`${project.progressPercent}%`}
          icon={CheckSquare}
          iconClassName="text-muted-foreground"
          subtitle={totalTasks > 0 ? `${completedTasks}/${totalTasks} tasks` : undefined}
        />
        <MetricCard
          variant="compact"
          title="Schedule"
          value={
            daysRemaining !== null
              ? daysRemaining < 0
                ? `${Math.abs(daysRemaining)}d overdue`
                : `${daysRemaining}d left`
              : scheduleConfig[scheduleStatus].label
          }
          icon={Target}
          iconClassName={scheduleConfig[scheduleStatus].color}
          alert={scheduleStatus === 'overdue'}
        />
        <MetricCard
          variant="compact"
          title="Budget"
          value={budgetConfig[budgetStatus].label}
          icon={DollarSign}
          iconClassName={budgetConfig[budgetStatus].color}
          alert={budgetStatus === 'over'}
        />
        {totalTasks > 0 && (
          <MetricCard
            variant="compact"
            title="Tasks"
            value={`${completedTasks}/${totalTasks}`}
            icon={ClipboardList}
            iconClassName="text-muted-foreground"
          />
        )}
      </div>
    </section>
  );
}

// ============================================================================
// ZONE 2: PROGRESS INDICATOR (Lifecycle + Status)
// ============================================================================

interface ProgressZoneProps {
  project: ProjectDetailData;
  scheduleStatus: 'on-track' | 'at-risk' | 'overdue';
  budgetStatus: 'under' | 'on-target' | 'over';
  completedTasks: number;
  totalTasks: number;
}

function ProgressZone({
  project,
  scheduleStatus,
  budgetStatus,
  completedTasks,
  totalTasks,
}: ProgressZoneProps) {
  const scheduleStatusConfig = {
    'on-track': { label: 'On Track', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
    'at-risk': { label: 'At Risk', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
    'overdue': { label: 'Overdue', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  };

  const budgetStatusConfig = {
    'under': { label: 'Under Budget', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
    'on-target': { label: 'On Target', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
    'over': { label: 'Over Budget', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  };

  return (
    <section className="space-y-4">
      {/* Lifecycle Progress Bar */}
      <div className="py-4 px-4 bg-muted/30 rounded-lg border">
        <ProjectLifecycleProgress status={project.status} />
      </div>

      {/* Status Summary */}
      <div className="flex items-center gap-6 py-3 px-4 bg-muted/30 rounded-lg border">
        {/* Progress Circle */}
        <div className="flex items-center gap-4">
          <StatusProgressCircle
            status={project.status}
            progress={project.progressPercent}
            size={56}
            strokeWidth={4}
            showLabel
          />
          <div>
            <p className="text-sm font-medium">{project.progressPercent}% Complete</p>
            {totalTasks > 0 && (
              <p className="text-xs text-muted-foreground">
                {completedTasks}/{totalTasks} tasks done
              </p>
            )}
          </div>
        </div>

        <Separator orientation="vertical" className="h-10" />

        {/* Status Badges */}
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant="secondary" className={cn('text-xs flex items-center gap-1', scheduleStatusConfig[scheduleStatus].className)}>
            <Calendar className="h-3 w-3" aria-hidden="true" />
            {scheduleStatusConfig[scheduleStatus].label}
          </Badge>
          <Badge variant="secondary" className={cn('text-xs flex items-center gap-1', budgetStatusConfig[budgetStatus].className)}>
            <DollarSign className="h-3 w-3" aria-hidden="true" />
            {budgetStatusConfig[budgetStatus].label}
          </Badge>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// PROJECT SIDEBAR (Zone 5B)
// ============================================================================

interface ProjectSidebarProps {
  project: ProjectDetailData;
  completedTasks: number;
  totalTasks: number;
  relatedLinks?: {
    orderId?: string | null;
    installerId?: string | null;
    installerName?: string | null;
  };
}

function ProjectSidebar({ project, completedTasks, totalTasks, relatedLinks }: ProjectSidebarProps) {
  // ProjectDetailData uses flat ProjectTeamMember { id, name, email, avatarUrl, role }
  const teamMembers: TeamMember[] = (project.members ?? []).map((m) => ({
    id: m.id,
    name: m.name ?? m.email ?? '',
    email: m.email ?? '',
    avatarUrl: m.avatarUrl ?? undefined,
    role: m.role ?? undefined,
  }));

  return (
    <ScrollArea className="h-[calc(100vh-200px)]">
      <div className="space-y-4 p-1">
        {/* Customer Card */}
        {project.customer && (
          <CustomerCard
            customerId={project.customer.id}
            customerName={project.customer.name}
            email={project.customer.email}
            phone={project.customer.phone}
          />
        )}

        {/* Site Address Card */}
        {project.siteAddress && (
          <SiteAddressCard
            addressLine1={project.siteAddress.addressLine1}
            addressLine2={project.siteAddress.addressLine2}
            city={project.siteAddress.city}
            state={project.siteAddress.state}
            postcode={project.siteAddress.postcode}
            country={project.siteAddress.country}
          />
        )}

        {/* Progress Card */}
        <ProgressCard
          progressPercent={project.progressPercent}
          completedTasks={completedTasks}
          totalTasks={totalTasks}
          estimatedBudget={
            project.estimatedTotalValue
              ? parseFloat(String(project.estimatedTotalValue))
              : null
          }
          actualCost={
            project.actualTotalCost
              ? parseFloat(String(project.actualTotalCost))
              : null
          }
        />

        {/* Team Card */}
        {teamMembers.length > 0 && <TeamCard members={teamMembers} />}

        {/* Related Links (Cross-Entity Navigation - WORKFLOW-CONTINUITY P3) */}
        <RelatedLinksCard
          customerId={project.customer?.id}
          customerName={project.customer?.name}
          orderId={project.orderId ?? relatedLinks?.orderId ?? undefined}
          installerId={relatedLinks?.installerId ?? undefined}
          installerName={relatedLinks?.installerName ?? undefined}
        />

        {/* Time Tracking Card */}
        <TimeCard projectId={project.id} />

        {/* Audit Trail Card */}
        <AuditTrailCard
          createdAt={project.createdAt}
          createdByName={project.createdByName}
          updatedAt={project.updatedAt}
          updatedByName={project.updatedByName}
          version={project.version}
        />
      </div>
    </ScrollArea>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ProjectDetailView = memo(function ProjectDetailView({
  project,
  alerts = [],
  activeTab,
  onTabChange,
  showSidebar,
  onToggleSidebar,
  activities = [],
  activitiesLoading = false,
  activitiesError,
  onLogActivity,
  onScheduleFollowUp,
  scheduleStatus = 'on-track',
  budgetStatus = 'on-target',
  completedTasks = 0,
  totalTasks = 0,
  tabCounts = {},
  renderOverviewTab,
  renderWorkstreamsTab,
  renderVisitsTab,
  renderTasksTab,
  renderBomTab,
  renderNotesTab,
  renderFilesTab,
  renderDocumentsTab,
  primaryAction,
  secondaryActions,
  onEdit,
  onDelete,
  relatedLinks,
  className,
}: ProjectDetailViewProps) {
  // Mobile sidebar sheet state (separate from desktop sidebar toggle)
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  // Helper to format tab counts
  const formatCount = (count?: number) => {
    if (count === undefined || count === null) return undefined;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* ─────────────────────────────────────────────────────────────────────
          ZONE 1: HEADER (Identity + Status + Quick Metrics + Actions)
          ───────────────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <ProjectHeader
            project={project}
            scheduleStatus={scheduleStatus}
            budgetStatus={budgetStatus}
            completedTasks={completedTasks}
            totalTasks={totalTasks}
            primaryAction={primaryAction}
            secondaryActions={secondaryActions}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Mobile Info Sheet Trigger - visible only on small screens */}
          <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 lg:hidden"
                aria-label="View project details"
              >
                <Info className="h-4 w-4" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[340px] sm:w-[400px] p-0">
              <SheetHeader className="px-6 pt-6 pb-4 border-b">
                <SheetTitle>Project Details</SheetTitle>
              </SheetHeader>
              <div className="px-4 py-4">
                <ProjectSidebar
                  project={project}
                  completedTasks={completedTasks}
                  totalTasks={totalTasks}
                  relatedLinks={relatedLinks}
                />
              </div>
            </SheetContent>
          </Sheet>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
                  onClick={() => copyToClipboard(window.location.href)}
                  aria-label="Copy link to clipboard"
                >
                  <Link2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy link</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {/* Desktop Sidebar Toggle - hidden on mobile since we use the sheet */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn('h-8 w-8 hidden lg:flex min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0', showSidebar && 'bg-muted')}
                  onClick={onToggleSidebar}
                  aria-label={showSidebar ? 'Hide details panel' : 'Show details panel'}
                  aria-expanded={showSidebar}
                >
                  <PanelRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{showSidebar ? 'Hide' : 'Show'} details panel</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────
          ZONE 2: PROGRESS INDICATOR (Visual Progress + Schedule/Budget Status)
          ───────────────────────────────────────────────────────────────────── */}
      <ProgressZone
        project={project}
        scheduleStatus={scheduleStatus}
        budgetStatus={budgetStatus}
        completedTasks={completedTasks}
        totalTasks={totalTasks}
      />

      {/* ─────────────────────────────────────────────────────────────────────
          ZONE 3: ALERTS (Contextual Problems)
          ───────────────────────────────────────────────────────────────────── */}
      {alerts.length > 0 && (
        <ProjectAlerts projectId={project.id} alerts={alerts} />
      )}

      {/* ─────────────────────────────────────────────────────────────────────
          ZONE 4 & 5: TABS + MAIN CONTENT + SIDEBAR
          ───────────────────────────────────────────────────────────────────── */}
      <div
        className={cn(
          'grid grid-cols-1 gap-8',
          showSidebar ? 'lg:grid-cols-[minmax(0,1fr)_320px]' : 'lg:grid-cols-1'
        )}
      >
        {/* Primary Content (Zone 5A) */}
        <div className="space-y-6 min-w-0">
          <Tabs value={activeTab} onValueChange={onTabChange}>
            {/* Zone 4: Tabs */}
            <TabsList className="w-full gap-6 bg-transparent border-b border-border rounded-none h-auto p-0 overflow-x-auto flex-nowrap">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 gap-2 whitespace-nowrap"
              >
                <ClipboardList className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="workstreams"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 gap-2 whitespace-nowrap"
              >
                <Package className="h-4 w-4" />
                Workstreams
                {tabCounts.workstreams !== undefined && (
                  <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs ml-1">
                    {formatCount(tabCounts.workstreams)}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="visits"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 gap-2 whitespace-nowrap"
              >
                <Calendar className="h-4 w-4" />
                Visits
                {tabCounts.visits !== undefined && (
                  <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs ml-1">
                    {formatCount(tabCounts.visits)}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="tasks"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 gap-2 whitespace-nowrap"
              >
                <CheckSquare className="h-4 w-4" />
                Tasks
                {tabCounts.tasks !== undefined && (
                  <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs ml-1">
                    {formatCount(tabCounts.tasks)}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="bom"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 gap-2 whitespace-nowrap"
              >
                <Package className="h-4 w-4" />
                BOM
              </TabsTrigger>
              <TabsTrigger
                value="notes"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 gap-2 whitespace-nowrap"
              >
                <FileText className="h-4 w-4" />
                Notes
                {tabCounts.notes !== undefined && (
                  <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs ml-1">
                    {formatCount(tabCounts.notes)}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="files"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 gap-2 whitespace-nowrap"
              >
                <ImageIcon className="h-4 w-4" />
                Files
                {tabCounts.files !== undefined && (
                  <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs ml-1">
                    {formatCount(tabCounts.files)}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="documents"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 gap-2 whitespace-nowrap"
              >
                <FileText className="h-4 w-4" />
                Documents
                {tabCounts.documents !== undefined && (
                  <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs ml-1">
                    {formatCount(tabCounts.documents)}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="activity"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 gap-2 whitespace-nowrap"
              >
                <Clock className="h-4 w-4" />
                Activity
              </TabsTrigger>
            </TabsList>

            {/* Tab Contents (Zone 5A) */}
            <TabsContent value="overview" className="mt-0 pt-6">
              {renderOverviewTab ? renderOverviewTab() : <div>Overview content</div>}
            </TabsContent>

            <TabsContent value="workstreams" className="mt-0 pt-6">
              {renderWorkstreamsTab ? renderWorkstreamsTab() : <div>Workstreams content</div>}
            </TabsContent>

            <TabsContent value="visits" className="mt-0 pt-6">
              {renderVisitsTab ? renderVisitsTab() : <div>Visits content</div>}
            </TabsContent>

            <TabsContent value="tasks" className="mt-0 pt-6">
              {renderTasksTab ? renderTasksTab() : <div>Tasks content</div>}
            </TabsContent>

            <TabsContent value="bom" className="mt-0 pt-6">
              {renderBomTab ? renderBomTab() : <div>BOM content</div>}
            </TabsContent>

            <TabsContent value="notes" className="mt-0 pt-6">
              {renderNotesTab ? renderNotesTab() : <div>Notes content</div>}
            </TabsContent>

            <TabsContent value="files" className="mt-0 pt-6">
              {renderFilesTab ? renderFilesTab() : <div>Files content</div>}
            </TabsContent>

            <TabsContent value="documents" className="mt-0 pt-6">
              {renderDocumentsTab ? renderDocumentsTab() : <div>Documents content</div>}
            </TabsContent>

            <TabsContent value="activity" className="mt-0 pt-6">
              <div className="space-y-4">
                {/* Action buttons */}
                {(onLogActivity || onScheduleFollowUp) && (
                  <div className="flex items-center justify-end gap-2">
                    {onScheduleFollowUp && (
                      <Button variant="outline" size="sm" onClick={onScheduleFollowUp}>
                        <Clock className="h-4 w-4 mr-2" />
                        Schedule Follow-up
                      </Button>
                    )}
                    {onLogActivity && (
                      <Button size="sm" onClick={onLogActivity}>
                        <Plus className="h-4 w-4 mr-2" />
                        Log Activity
                      </Button>
                    )}
                  </div>
                )}

                <UnifiedActivityTimeline
                  activities={activities}
                  isLoading={activitiesLoading}
                  hasError={!!activitiesError}
                  error={activitiesError || undefined}
                  title="Activity Timeline"
                  description="Complete history of project changes, status updates, and system events"
                  showFilters={true}
                  viewAllSearch={getActivitiesFeedSearch('project')}
                  emptyMessage="No activity recorded yet"
                  emptyDescription="Project activities will appear here when changes are made."
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Animated Side Panel (Zone 5B) */}
        <AnimatePresence initial={false}>
          {showSidebar && (
            <motion.aside
              key="sidebar"
              role="complementary"
              aria-label="Project details sidebar"
              initial={{ x: 80, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 80, opacity: 0 }}
              transition={{
                type: 'spring',
                stiffness: 260,
                damping: 26,
                // Respect reduced motion preference
                duration: 0,
              }}
              style={{
                // Use CSS for reduced motion support
                transitionDuration: 'var(--motion-duration, 0.3s)',
              }}
              className="hidden lg:block border-l border-border pl-6 sticky top-20 self-start motion-reduce:transition-none"
            >
              <ProjectSidebar
                project={project}
                completedTasks={completedTasks}
                totalTasks={totalTasks}
                relatedLinks={relatedLinks}
              />
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});

export default ProjectDetailView;
