/**
 * Project Detail View (Presenter)
 *
 * Full-width layout following Order Detail reference patterns.
 * Maximizes schema field presentation with specialized section components.
 *
 * @see STANDARDS.md - Container/Presenter pattern
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 * @see src/components/domain/orders/views/order-detail-view.tsx
 */

import { memo, type ReactNode } from 'react';
import { format, formatDistanceToNow, isPast, differenceInDays } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Folder,
  Calendar,
  Clock,
  Users,
  DollarSign,
  Building2,
  MapPin,
  Phone,
  Mail,
  Hash,
  ChevronRight,
  PanelRight,
  Link2,
  FileText,
  Package,
  CheckSquare,
  Image as ImageIcon,
  ClipboardList,
  AlertTriangle,
  Target,
  CheckCircle,
  ListChecks,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { FormatAmount } from '@/components/shared/format';
import { UnifiedActivityTimeline } from '@/components/shared/activity';
import { StatusCell } from '@/components/shared/data-table';
import { PROJECT_STATUS_CONFIG, PROJECT_PRIORITY_CONFIG } from '../project-status-config';
import { StatusProgressCircle } from '../progress-circle';
import type { ProjectStatus, ProjectPriority } from '@/lib/schemas/jobs/projects';
import type { UnifiedActivity } from '@/lib/schemas/unified-activity';

// ============================================================================
// TYPES
// ============================================================================

export interface ProjectMember {
  user: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl?: string;
  };
  role: 'owner' | 'manager' | 'member';
}

export interface ProjectDetailData {
  id: string;
  title: string;
  projectNumber: string;
  description: string | null;
  status: ProjectStatus;
  progressPercent: number;
  projectType: string;
  priority: ProjectPriority;
  startDate: string | null;
  targetCompletionDate: string | null;
  actualCompletionDate: string | null;
  estimatedTotalValue: string | number | null;
  actualTotalCost: string | number | null;
  siteAddress: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  } | null;
  scope: {
    inScope: string[];
    outOfScope: string[];
  } | null;
  outcomes: string[] | null;
  keyFeatures: {
    p0: string[];
    p1: string[];
    p2: string[];
  } | null;
  customer?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    companyName?: string;
  } | null;
  members?: ProjectMember[];
  createdAt: string;
  updatedAt: string;
  version?: number;
}

export interface ProjectDetailViewProps {
  project: ProjectDetailData;
  activeTab: string;
  onTabChange: (tab: string) => void;
  showMetaPanel: boolean;
  onToggleMetaPanel: () => void;
  activities?: UnifiedActivity[];
  activitiesLoading?: boolean;
  activitiesError?: Error | null;
  // Tab content render props
  renderOverviewTab?: () => ReactNode;
  renderWorkstreamsTab?: () => ReactNode;
  renderVisitsTab?: () => ReactNode;
  renderTasksTab?: () => ReactNode;
  renderBomTab?: () => ReactNode;
  renderNotesTab?: () => ReactNode;
  renderFilesTab?: () => ReactNode;
  className?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getScheduleStatus(
  _startDate: string | null,
  targetDate: string | null,
  status: ProjectStatus
): { isOverdue: boolean; isAtRisk: boolean; text: string } {
  if (status === 'completed' || status === 'cancelled') {
    return { isOverdue: false, isAtRisk: false, text: '' };
  }
  if (!targetDate) return { isOverdue: false, isAtRisk: false, text: '' };

  const target = new Date(targetDate);
  const now = new Date();
  const isOverdue = isPast(target);
  const daysUntil = differenceInDays(target, now);
  const isAtRisk = !isOverdue && daysUntil <= 7;

  const text = isOverdue
    ? `Overdue by ${formatDistanceToNow(target)}`
    : `Due ${formatDistanceToNow(target, { addSuffix: true })}`;

  return { isOverdue, isAtRisk, text };
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

function formatProjectType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
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
// PROJECT HEADER
// ============================================================================

interface ProjectHeaderProps {
  project: ProjectDetailData;
}

function ProjectHeader({ project }: ProjectHeaderProps) {
  const priorityConfig = PROJECT_PRIORITY_CONFIG[project.priority];
  const scheduleStatus = getScheduleStatus(
    project.startDate,
    project.targetCompletionDate,
    project.status
  );

  const metaItems: MetaChip[] = [
    { label: 'ID', value: project.projectNumber, icon: <Hash className="h-3.5 w-3.5" /> },
    { label: 'Type', value: formatProjectType(project.projectType), icon: <Folder className="h-3.5 w-3.5" /> },
    ...(project.startDate
      ? [
          {
            label: 'Started',
            value: format(new Date(project.startDate), 'PP'),
            icon: <Calendar className="h-3.5 w-3.5" />,
          },
        ]
      : []),
    ...(project.targetCompletionDate
      ? [
          {
            label: 'Target',
            value: (
              <span
                className={cn(
                  scheduleStatus.isOverdue && 'text-destructive',
                  scheduleStatus.isAtRisk && 'text-amber-600'
                )}
              >
                {format(new Date(project.targetCompletionDate), 'PP')}
              </span>
            ),
            icon: <Target className="h-3.5 w-3.5" />,
          },
        ]
      : []),
  ];

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-semibold text-foreground leading-tight">{project.title}</h1>
          <div className="flex items-center gap-2">
            <StatusCell status={project.status} statusConfig={PROJECT_STATUS_CONFIG} showIcon />
            {project.priority !== 'medium' && (
              <Badge className={cn('text-[11px]', `bg-${priorityConfig.color}/10`)}>
                {priorityConfig.label}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Schedule Alert */}
      {(scheduleStatus.isOverdue || scheduleStatus.isAtRisk) && (
        <div
          className={cn(
            'flex items-center gap-2 text-sm',
            scheduleStatus.isOverdue
              ? 'text-destructive'
              : 'text-amber-600 dark:text-amber-400'
          )}
        >
          <AlertTriangle className="h-4 w-4" />
          {scheduleStatus.text}
        </div>
      )}

      <MetaChipsRow items={metaItems} />
    </section>
  );
}

// ============================================================================
// PROJECT PROGRESS SECTION
// ============================================================================

interface ProjectProgressProps {
  project: ProjectDetailData;
}

function ProjectProgress({ project }: ProjectProgressProps) {
  const scheduleStatus = getScheduleStatus(
    project.startDate,
    project.targetCompletionDate,
    project.status
  );

  return (
    <section>
      <h2 className="text-base font-semibold text-foreground mb-4">Project Progress</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Progress Visualization */}
        <div className="flex items-center gap-6">
          <StatusProgressCircle
            status={project.status}
            progress={project.progressPercent}
            size={80}
            strokeWidth={6}
            showLabel
          />
          <div className="flex-1 space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Overall Progress</span>
                <span className="font-medium tabular-nums">{project.progressPercent}%</span>
              </div>
              <Progress value={project.progressPercent} className="h-2" />
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-muted-foreground">Complete</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                <span className="text-muted-foreground">In Progress</span>
              </div>
            </div>
          </div>
        </div>

        {/* Schedule Status */}
        <div className="space-y-3">
          {project.startDate && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Start Date
              </span>
              <span className="font-medium">{format(new Date(project.startDate), 'PP')}</span>
            </div>
          )}
          {project.targetCompletionDate && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <Target className="h-4 w-4" /> Target Completion
              </span>
              <span
                className={cn(
                  'font-medium',
                  scheduleStatus.isOverdue && 'text-destructive'
                )}
              >
                {format(new Date(project.targetCompletionDate), 'PP')}
              </span>
            </div>
          )}
          {project.actualCompletionDate && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> Completed
              </span>
              <span className="font-medium text-green-600 dark:text-green-400">
                {format(new Date(project.actualCompletionDate), 'PP')}
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// BUDGET VS ACTUAL SECTION
// ============================================================================

interface BudgetVsActualProps {
  project: ProjectDetailData;
}

function BudgetVsActual({ project }: BudgetVsActualProps) {
  const estimated = project.estimatedTotalValue
    ? Number(project.estimatedTotalValue)
    : 0;
  const actual = project.actualTotalCost ? Number(project.actualTotalCost) : 0;
  const variance = estimated - actual;
  const variancePercent = estimated > 0 ? ((variance / estimated) * 100).toFixed(1) : 0;
  const isOverBudget = actual > estimated && estimated > 0;
  const budgetProgress = estimated > 0 ? Math.min((actual / estimated) * 100, 100) : 0;

  if (!project.estimatedTotalValue && !project.actualTotalCost) return null;

  return (
    <section>
      <h2 className="text-base font-semibold text-foreground mb-4">Budget vs Actual</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Budget Breakdown */}
        <div className="space-y-3">
          {estimated > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" /> Estimated Value
              </span>
              <span className="font-medium tabular-nums">
                <FormatAmount amount={estimated} />
              </span>
            </div>
          )}
          {actual > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" /> Actual Cost
              </span>
              <span className="font-medium tabular-nums">
                <FormatAmount amount={actual} />
              </span>
            </div>
          )}
          {estimated > 0 && actual > 0 && (
            <>
              <Separator />
              <div className="flex justify-between text-sm font-semibold">
                <span>Variance</span>
                <span
                  className={cn(
                    'tabular-nums',
                    isOverBudget ? 'text-destructive' : 'text-green-600 dark:text-green-400'
                  )}
                >
                  {isOverBudget ? '-' : '+'}
                  <FormatAmount amount={Math.abs(variance)} /> ({variancePercent}%)
                </span>
              </div>
            </>
          )}
        </div>

        {/* Budget Progress */}
        {estimated > 0 && (
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Budget Utilization</span>
              <span className="text-xs text-muted-foreground">
                {budgetProgress.toFixed(0)}%
              </span>
            </div>
            <Progress
              value={budgetProgress}
              className={cn('h-2', isOverBudget && '[&>div]:bg-destructive')}
            />
            {isOverBudget && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Over budget
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

// ============================================================================
// CUSTOMER INFO SECTION
// ============================================================================

interface CustomerInfoProps {
  customer: ProjectDetailData['customer'];
  siteAddress: ProjectDetailData['siteAddress'];
}

function CustomerInfo({ customer, siteAddress }: CustomerInfoProps) {
  if (!customer && !siteAddress) return null;

  return (
    <section>
      <h2 className="text-base font-semibold text-foreground mb-4">Customer & Location</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Customer Details */}
        {customer && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Customer
            </h3>
            <div className="flex items-start gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {customer.name?.charAt(0).toUpperCase() || 'C'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{customer.name}</p>
                {customer.companyName && (
                  <p className="text-xs text-muted-foreground">{customer.companyName}</p>
                )}
                {customer.email && (
                  <a
                    href={`mailto:${customer.email}`}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-2"
                  >
                    <Mail className="h-3 w-3" /> {customer.email}
                  </a>
                )}
                {customer.phone && (
                  <a
                    href={`tel:${customer.phone}`}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Phone className="h-3 w-3" /> {customer.phone}
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Site Address */}
        {siteAddress && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Site Address
            </h3>
            <div className="text-sm space-y-0.5">
              <p>{siteAddress.street}</p>
              <p>
                {siteAddress.city}, {siteAddress.state} {siteAddress.postalCode}
              </p>
              <p className="text-muted-foreground">{siteAddress.country}</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ============================================================================
// TEAM ASSIGNMENTS SECTION
// ============================================================================

interface TeamAssignmentsProps {
  members: ProjectMember[] | undefined;
}

function TeamAssignments({ members }: TeamAssignmentsProps) {
  if (!members || members.length === 0) return null;

  const roleOrder = { owner: 0, manager: 1, member: 2 };
  const sortedMembers = [...members].sort((a, b) => roleOrder[a.role] - roleOrder[b.role]);

  return (
    <section>
      <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
        <Users className="h-4 w-4" /> Team ({members.length})
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {sortedMembers.map((member) => (
          <div
            key={member.user.id}
            className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
          >
            <Avatar className="h-9 w-9">
              <AvatarImage src={member.user.avatarUrl} />
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {member.user.name?.charAt(0).toUpperCase() ||
                  member.user.email.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {member.user.name || member.user.email}
              </p>
              <Badge variant="secondary" className="text-[10px] capitalize">
                {member.role}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ============================================================================
// SCOPE & FEATURES SECTION
// ============================================================================

interface ScopeAndFeaturesProps {
  scope: ProjectDetailData['scope'];
  keyFeatures: ProjectDetailData['keyFeatures'];
  outcomes: ProjectDetailData['outcomes'];
}

function ScopeAndFeatures({ scope, keyFeatures, outcomes }: ScopeAndFeaturesProps) {
  const hasScope = scope && (scope.inScope.length > 0 || scope.outOfScope.length > 0);
  const hasFeatures =
    keyFeatures && (keyFeatures.p0.length > 0 || keyFeatures.p1.length > 0 || keyFeatures.p2.length > 0);
  const hasOutcomes = outcomes && outcomes.length > 0;

  if (!hasScope && !hasFeatures && !hasOutcomes) return null;

  return (
    <section className="space-y-6">
      {/* Scope */}
      {hasScope && (
        <div>
          <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <ClipboardList className="h-4 w-4" /> Scope
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {scope!.inScope.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" /> In Scope
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5 text-sm">
                    {scope!.inScope.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
            {scope!.outOfScope.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> Out of Scope
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5 text-sm text-muted-foreground">
                    {scope!.outOfScope.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-muted-foreground">-</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Key Features */}
      {hasFeatures && (
        <div>
          <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <ListChecks className="h-4 w-4" /> Key Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {keyFeatures!.p0.length > 0 && (
              <Card className="border-l-4 border-l-red-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Must Have (P0)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm">
                    {keyFeatures!.p0.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
            {keyFeatures!.p1.length > 0 && (
              <Card className="border-l-4 border-l-amber-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Should Have (P1)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm">
                    {keyFeatures!.p1.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
            {keyFeatures!.p2.length > 0 && (
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Nice to Have (P2)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm">
                    {keyFeatures!.p2.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Outcomes */}
      {hasOutcomes && (
        <div>
          <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <Target className="h-4 w-4" /> Expected Outcomes
          </h2>
          <Card>
            <CardContent className="pt-4">
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                {outcomes!.map((outcome, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                    {outcome}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
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
      <p className="text-sm whitespace-pre-wrap bg-muted/50 p-4 rounded-lg">{description}</p>
    </section>
  );
}

// ============================================================================
// RIGHT META PANEL
// ============================================================================

interface RightMetaPanelProps {
  project: ProjectDetailData;
}

function RightMetaPanel({ project }: RightMetaPanelProps) {
  return (
    <aside className="flex flex-col gap-8 p-4 pt-8 lg:sticky lg:self-start lg:top-4">
      {/* Customer Card */}
      {project.customer && (
        <>
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Customer
            </h3>
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {project.customer.name?.charAt(0).toUpperCase() || 'C'}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{project.customer.name}</div>
                {project.customer.email && (
                  <div className="text-xs text-muted-foreground truncate">
                    {project.customer.email}
                  </div>
                )}
              </div>
            </div>
            {project.customer.phone && (
              <div className="mt-3 text-xs text-muted-foreground flex items-center gap-2">
                <Phone className="h-3 w-3" /> {project.customer.phone}
              </div>
            )}
          </div>
          <Separator />
        </>
      )}

      {/* Site Address */}
      {project.siteAddress && (
        <>
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Site Location
            </h3>
            <div className="text-sm space-y-0.5">
              <p>{project.siteAddress.street}</p>
              <p>
                {project.siteAddress.city}, {project.siteAddress.state}{' '}
                {project.siteAddress.postalCode}
              </p>
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(
                  `${project.siteAddress.street}, ${project.siteAddress.city}, ${project.siteAddress.state}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1 mt-2"
              >
                <MapPin className="h-3 w-3" /> View on Maps
              </a>
            </div>
          </div>
          <Separator />
        </>
      )}

      {/* Progress Overview */}
      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Progress
        </h3>
        <div className="flex items-center gap-3 mb-3">
          <StatusProgressCircle
            status={project.status}
            progress={project.progressPercent}
            size={48}
            strokeWidth={4}
            showLabel
          />
          <div>
            <StatusCell status={project.status} statusConfig={PROJECT_STATUS_CONFIG} showIcon />
            <p className="text-xs text-muted-foreground mt-1 capitalize">
              {PROJECT_PRIORITY_CONFIG[project.priority].label} Priority
            </p>
          </div>
        </div>
        <Progress value={project.progressPercent} className="h-2" />
      </div>
      <Separator />

      {/* Team Preview */}
      {project.members && project.members.length > 0 && (
        <>
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Team ({project.members.length})
            </h3>
            <div className="flex -space-x-2">
              {project.members.slice(0, 5).map((member) => (
                <TooltipProvider key={member.user.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Avatar className="h-8 w-8 border-2 border-background">
                        <AvatarImage src={member.user.avatarUrl} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {member.user.name?.charAt(0).toUpperCase() ||
                            member.user.email.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{member.user.name || member.user.email}</p>
                      <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
              {project.members.length > 5 && (
                <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium">
                  +{project.members.length - 5}
                </div>
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
            <span>{format(new Date(project.createdAt), 'PP')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Updated</span>
            <span>{format(new Date(project.updatedAt), 'PP')}</span>
          </div>
          {project.version && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Version</span>
              <span>v{project.version}</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ProjectDetailView = memo(function ProjectDetailView({
  project,
  activeTab,
  onTabChange,
  showMetaPanel,
  onToggleMetaPanel,
  activities = [],
  activitiesLoading = false,
  activitiesError,
  renderOverviewTab,
  renderWorkstreamsTab,
  renderVisitsTab,
  renderTasksTab,
  renderBomTab,
  renderNotesTab,
  renderFilesTab,
  className,
}: ProjectDetailViewProps) {
  return (
    <div className={cn('flex flex-1 flex-col min-w-0 m-2 border border-border rounded-lg', className)}>
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-4 px-4 py-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Projects</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{project.projectNumber}</span>
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
              <ProjectHeader project={project} />

              <Tabs value={activeTab} onValueChange={onTabChange}>
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
                  </TabsTrigger>
                  <TabsTrigger
                    value="visits"
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 gap-2 whitespace-nowrap"
                  >
                    <Calendar className="h-4 w-4" />
                    Visits
                  </TabsTrigger>
                  <TabsTrigger
                    value="tasks"
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 gap-2 whitespace-nowrap"
                  >
                    <CheckSquare className="h-4 w-4" />
                    Tasks
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
                  </TabsTrigger>
                  <TabsTrigger
                    value="files"
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 gap-2 whitespace-nowrap"
                  >
                    <ImageIcon className="h-4 w-4" />
                    Files
                  </TabsTrigger>
                  <TabsTrigger
                    value="activity"
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 gap-2 whitespace-nowrap"
                  >
                    <Clock className="h-4 w-4" />
                    Activity
                  </TabsTrigger>
                </TabsList>

                {/* Overview Tab - space-y-10 for generous spacing between sections */}
                <TabsContent value="overview" className="mt-0 pt-6">
                  {renderOverviewTab ? (
                    renderOverviewTab()
                  ) : (
                    <div className="space-y-10">
                      <ProjectProgress project={project} />
                      <DescriptionSection description={project.description} />
                      <BudgetVsActual project={project} />
                      <CustomerInfo customer={project.customer} siteAddress={project.siteAddress} />
                      <ScopeAndFeatures
                        scope={project.scope}
                        keyFeatures={project.keyFeatures}
                        outcomes={project.outcomes}
                      />
                      <TeamAssignments members={project.members} />
                    </div>
                  )}
                </TabsContent>

                {/* Workstreams Tab */}
                <TabsContent value="workstreams" className="mt-0 pt-6">
                  {renderWorkstreamsTab ? renderWorkstreamsTab() : <div>Workstreams content</div>}
                </TabsContent>

                {/* Visits Tab */}
                <TabsContent value="visits" className="mt-0 pt-6">
                  {renderVisitsTab ? renderVisitsTab() : <div>Visits content</div>}
                </TabsContent>

                {/* Tasks Tab */}
                <TabsContent value="tasks" className="mt-0 pt-6">
                  {renderTasksTab ? renderTasksTab() : <div>Tasks content</div>}
                </TabsContent>

                {/* BOM Tab */}
                <TabsContent value="bom" className="mt-0 pt-6">
                  {renderBomTab ? renderBomTab() : <div>BOM content</div>}
                </TabsContent>

                {/* Notes Tab */}
                <TabsContent value="notes" className="mt-0 pt-6">
                  {renderNotesTab ? renderNotesTab() : <div>Notes content</div>}
                </TabsContent>

                {/* Files Tab */}
                <TabsContent value="files" className="mt-0 pt-6">
                  {renderFilesTab ? renderFilesTab() : <div>Files content</div>}
                </TabsContent>

                {/* Activity Tab */}
                <TabsContent value="activity" className="mt-0 pt-6">
                  <UnifiedActivityTimeline
                    activities={activities}
                    isLoading={activitiesLoading}
                    hasError={!!activitiesError}
                    error={activitiesError || undefined}
                    title="Activity Timeline"
                    description="Complete history of project changes, status updates, and system events"
                    showFilters={true}
                    emptyMessage="No activity recorded yet"
                    emptyDescription="Project activities will appear here when changes are made."
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
                  <RightMetaPanel project={project} />
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

export default ProjectDetailView;
