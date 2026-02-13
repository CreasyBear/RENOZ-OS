/**
 * Projects Dashboard - Enhanced Portfolio Management View
 *
 * Provides a serious management overview of all projects with:
 * - Portfolio stats cards (urgent items, due dates, value)
 * - Status breakdown visualization
 * - Priority-based filtering and grouping
 * - Enhanced project cards with warnings and metadata
 * - At-a-glance "needs attention" section
 *
 * SPRINT-03: Enhanced project list for serious project management
 * @see ui-ux-pro-max skill for design standards
 */

import { useState, useMemo, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import { format, isPast, isToday, isTomorrow, addDays, isWithinInterval } from 'date-fns';
import {
  Briefcase,
  AlertTriangle,
  Clock,
  DollarSign,
  Calendar,
  LayoutGrid,
  List,
  Plus,
  Flag,
  AlertCircle,
  MoreHorizontal,
  MapPin,
  Users,
  Search,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatusCell } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared';
import { PROJECT_STATUS_CONFIG } from './project-status-config';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useOrgFormat } from '@/hooks/use-org-format';
import { useDebounce } from '@/hooks/_shared/use-debounce';
import { ProjectsPageSkeleton } from '@/components/skeletons/projects/projects-page-skeleton';

// Types
import type {
  Project,
  ProjectStatus,
  ProjectPriority,
  ProjectViewMode,
  ProjectDateFilter,
  ProjectsSearchParams,
} from '@/lib/schemas/jobs';

// ============================================================================
// TYPES
// ============================================================================

interface ProjectsDashboardProps {
  projects: Project[];
  isLoading?: boolean;
  /** URL-synced filters (DOMAIN-LANDING Zone 2) */
  filters?: ProjectsSearchParams;
  onFiltersChange?: (updates: Partial<ProjectsSearchParams>) => void;
  onProjectClick: (project: Project) => void;
  onEditProject: (project: Project) => void;
  onDeleteProject: (project: Project) => void;
  onCreateProject: () => void;
}


// ============================================================================
// STATUS CONFIG (extended with UI-specific properties)
// ============================================================================

const PRIORITY_CONFIG: Record<ProjectPriority, {
  label: string;
  color: string;
  bg: string;
  border: string;
}> = {
  urgent: {
    label: 'Urgent',
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
  },
  high: {
    label: 'High',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
  },
  medium: {
    label: 'Medium',
    color: 'text-yellow-600',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
  },
  low: {
    label: 'Low',
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
  },
};

function getDueDateStatus(date: string | null | undefined): {
  label: string;
  color: string;
  isUrgent: boolean;
} {
  if (!date) return { label: 'No date', color: 'text-muted-foreground', isUrgent: false };

  const d = new Date(date);
  if (isPast(d) && !isToday(d)) {
    return { label: `Overdue ${format(d, 'MMM d')}`, color: 'text-red-600', isUrgent: true };
  }
  if (isToday(d)) {
    return { label: 'Due today', color: 'text-orange-600', isUrgent: true };
  }
  if (isTomorrow(d)) {
    return { label: 'Due tomorrow', color: 'text-yellow-600', isUrgent: true };
  }
  return { label: format(d, 'MMM d'), color: 'text-muted-foreground', isUrgent: false };
}

// ============================================================================
// PORTFOLIO STATS CARDS
// ============================================================================

function PortfolioStats({ projects }: { projects: Project[] }) {
  const { formatCurrency } = useOrgFormat();
  const formatCurrencyDisplay = (value: number) =>
    formatCurrency(value, { cents: false, showCents: true });
  const stats = useMemo(() => {
    const active = projects.filter(p => !['completed', 'cancelled'].includes(p.status));
    const urgent = projects.filter(p => p.priority === 'urgent' && !['completed', 'cancelled'].includes(p.status));
    const high = projects.filter(p => p.priority === 'high' && !['completed', 'cancelled'].includes(p.status));

    // Due this week (next 7 days)
    const now = new Date();
    const weekFromNow = addDays(now, 7);
    const dueThisWeek = projects.filter(p => {
      if (!p.targetCompletionDate || ['completed', 'cancelled'].includes(p.status)) return false;
      const due = new Date(p.targetCompletionDate);
      return isWithinInterval(due, { start: now, end: weekFromNow }) || isPast(due);
    });

    // Overdue
    const overdue = projects.filter(p => {
      if (!p.targetCompletionDate || ['completed', 'cancelled'].includes(p.status)) return false;
      return isPast(new Date(p.targetCompletionDate)) && !isToday(new Date(p.targetCompletionDate));
    });

    // Financial totals
    const estimatedTotal = projects.reduce((sum, p) => {
      const val = p.estimatedTotalValue ? parseFloat(String(p.estimatedTotalValue)) : 0;
      return sum + val;
    }, 0);

    const actualTotal = projects.reduce((sum, p) => {
      const val = p.actualTotalCost ? parseFloat(String(p.actualTotalCost)) : 0;
      return sum + val;
    }, 0);

    return {
      active: active.length,
      urgent: urgent.length,
      highPriority: high.length,
      dueThisWeek: dueThisWeek.length,
      overdue: overdue.length,
      estimatedTotal,
      actualTotal,
      completionRate: projects.length > 0
        ? Math.round((projects.filter(p => p.status === 'completed').length / projects.length) * 100)
        : 0,
    };
  }, [projects]);

  const statCards = [
    {
      title: 'Active Projects',
      value: stats.active,
      icon: Briefcase,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
    },
    {
      title: 'Needs Attention',
      value: stats.urgent + stats.highPriority,
      icon: AlertTriangle,
      color: 'text-red-600',
      bg: 'bg-red-100',
      alert: stats.urgent > 0,
    },
    {
      title: 'Due This Week',
      value: stats.dueThisWeek,
      icon: Clock,
      color: 'text-orange-600',
      bg: 'bg-orange-100',
      alert: stats.overdue > 0,
      subtext: stats.overdue > 0 ? `${stats.overdue} overdue` : undefined,
    },
    {
      title: 'Portfolio Value',
      value: formatCurrencyDisplay(stats.estimatedTotal),
      icon: DollarSign,
      color: 'text-green-600',
      bg: 'bg-green-100',
      subtext: stats.actualTotal > 0 ? `${formatCurrencyDisplay(stats.actualTotal)} actual` : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((card) => (
        <Card key={card.title} className={cn(card.alert && 'border-red-200')}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{card.title}</p>
                <p className="text-2xl font-semibold mt-1">{card.value}</p>
                {card.subtext && (
                  <p className={cn('text-xs mt-1', card.alert ? 'text-red-600' : 'text-muted-foreground')}>
                    {card.subtext}
                  </p>
                )}
              </div>
              <div className={cn('p-2 rounded-lg', card.bg)}>
                <card.icon className={cn('h-5 w-5', card.color)} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============================================================================
// ENHANCED PROJECT CARD
// ============================================================================

function ProjectCardEnhanced({
  project,
  onClick,
  onEdit,
  onDelete,
  viewMode,
}: {
  project: Project;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  viewMode: ProjectViewMode;
}) {
  const { formatCurrency } = useOrgFormat();
  const formatCurrencyDisplay = (value: string | number | null | undefined) =>
    formatCurrency(value == null ? 0 : Number(value), { cents: false, showCents: true });
  const priority = PRIORITY_CONFIG[project.priority];
  const dueStatus = getDueDateStatus(project.targetCompletionDate);

  // Format address
  const addressLabel = project.siteAddress
    ? [project.siteAddress.city, project.siteAddress.state].filter(Boolean).join(', ')
    : null;

  if (viewMode === 'list') {
    return (
      <div
        onClick={onClick}
        className={cn(
          'group flex items-center gap-4 p-4 bg-card border rounded-lg cursor-pointer',
          'hover:shadow-md hover:border-primary/20 transition-all',
          project.priority === 'urgent' && 'border-l-4 border-l-red-500',
          project.priority === 'high' && 'border-l-4 border-l-orange-500',
        )}
      >
        {/* Priority Indicator */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn('p-2 rounded-lg shrink-0', priority.bg)}>
                <Flag className={cn('h-4 w-4', priority.color)} />
              </div>
            </TooltipTrigger>
            <TooltipContent>{priority.label} Priority</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link
              to="/projects/$projectId"
              params={{ projectId: project.id }}
              className="font-semibold truncate hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {project.title}
            </Link>
            <span className="text-xs text-muted-foreground shrink-0">{project.projectNumber}</span>
            {dueStatus.isUrgent && (
              <StatusBadge
                status={dueStatus.label}
                variant={dueStatus.color.includes('red') ? 'error' : 'warning'}
                className="text-[10px] h-5 shrink-0"
              />
            )}
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
            <span className="capitalize">{project.projectType.replace('_', ' ')}</span>
            {addressLabel && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {addressLabel}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <StatusCell status={project.status} statusConfig={PROJECT_STATUS_CONFIG} showIcon />
        </div>

        {/* Due Date */}
        <div className="hidden md:flex items-center gap-2 text-sm shrink-0 w-32">
          <Calendar className={cn('h-4 w-4', dueStatus.color)} />
          <span className={dueStatus.color}>{dueStatus.label}</span>
        </div>

        {/* Progress */}
        <div className="hidden lg:flex items-center gap-3 shrink-0 w-32">
          <Progress value={project.progressPercent} className="h-2 flex-1" />
          <span className="text-xs text-muted-foreground w-8">{project.progressPercent}%</span>
        </div>

        {/* Value */}
        <div className="hidden xl:block text-right shrink-0 w-28">
          <p className="font-medium text-sm">
            {formatCurrencyDisplay(project.estimatedTotalValue)}
          </p>
          {project.actualTotalCost && (
            <p className="text-xs text-muted-foreground">
              {formatCurrencyDisplay(project.actualTotalCost)} actual
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  }

  // Grid View
  return (
    <div
      onClick={onClick}
      className={cn(
        'group bg-card border rounded-xl cursor-pointer overflow-hidden',
        'hover:shadow-lg hover:border-primary/20 transition-all',
        project.priority === 'urgent' && 'ring-1 ring-red-200',
        project.priority === 'high' && 'ring-1 ring-orange-200',
      )}
    >
      {/* Header with priority stripe */}
      <div className={cn('h-1', priority.color.replace('text-', 'bg-'))} />

      <div className="p-4">
        {/* Top Row: Status & Actions */}
        <div className="flex items-start justify-between mb-3">
          <StatusCell status={project.status} statusConfig={PROJECT_STATUS_CONFIG} showIcon />
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-7 w-7 -mr-2 -mt-1">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Title & Number */}
        <Link
          to="/projects/$projectId"
          params={{ projectId: project.id }}
          className="font-semibold text-foreground line-clamp-2 mb-1 hover:underline block"
          onClick={(e) => e.stopPropagation()}
        >
          {project.title}
        </Link>
        <p className="text-xs text-muted-foreground mb-3">{project.projectNumber}</p>

        {/* Type & Address */}
        <div className="space-y-1.5 mb-4">
          <p className="text-sm text-muted-foreground capitalize">
            {project.projectType.replace('_', ' ')}
          </p>
          {addressLabel && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {addressLabel}
            </p>
          )}
        </div>

        {/* Due Date Alert */}
        {dueStatus.isUrgent && (
          <div className={cn('flex items-center gap-1.5 text-xs mb-3', dueStatus.color)}>
            <AlertCircle className="h-3.5 w-3.5" />
            <span className="font-medium">{dueStatus.label}</span>
          </div>
        )}

        {/* Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{project.progressPercent}%</span>
          </div>
          <Progress value={project.progressPercent} className="h-2" />
        </div>

        {/* Footer: Value & Priority */}
        <div className="flex items-center justify-between pt-3 border-t">
          <div>
            <p className="font-medium text-sm">
              {formatCurrencyDisplay(project.estimatedTotalValue)}
            </p>
            <p className={cn('text-xs', priority.color)}>{priority.label} Priority</p>
          </div>
          <Avatar className="h-7 w-7 border">
            <AvatarFallback className="text-[10px] bg-primary/10">
              <Users className="h-3 w-3 text-primary" />
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// FILTER BAR
// ============================================================================

function FilterBar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  priority,
  onPriorityChange,
  dateFilter,
  onDateFilterChange,
  viewMode,
  onViewModeChange,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  status: ProjectStatus | 'all';
  onStatusChange: (status: ProjectStatus | 'all') => void;
  priority: ProjectPriority | 'all';
  onPriorityChange: (priority: ProjectPriority | 'all') => void;
  dateFilter: ProjectDateFilter;
  onDateFilterChange: (filter: ProjectDateFilter) => void;
  viewMode: ProjectViewMode;
  onViewModeChange: (mode: ProjectViewMode) => void;
}) {
  return (
    <div className="flex flex-col lg:flex-row gap-3">
      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search projects by name or number..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
        {search && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
            onClick={() => onSearchChange('')}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={status} onValueChange={(v) => {
          if (v === 'all' || v === 'quoting' || v === 'approved' || v === 'in_progress' || v === 'completed' || v === 'on_hold' || v === 'cancelled') {
            onStatusChange(v);
          }
        }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="quoting">Quoting</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="on_hold">On Hold</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priority} onValueChange={(v) => {
          if (v === 'all' || v === 'urgent' || v === 'high' || v === 'medium' || v === 'low') {
            onPriorityChange(v);
          }
        }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        <Select value={dateFilter} onValueChange={(v) => {
          if (v === 'all' || v === 'overdue' || v === 'today' || v === 'this-week' || v === 'this-month') {
            onDateFilterChange(v);
          }
        }}>
          <SelectTrigger className="w-[140px]">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Any Date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any Date</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="today">Due Today</SelectItem>
            <SelectItem value="this-week">This Week</SelectItem>
            <SelectItem value="this-month">This Month</SelectItem>
          </SelectContent>
        </Select>

        {/* View Toggle */}
        <div className="flex items-center border rounded-md p-0.5">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => onViewModeChange('grid')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => onViewModeChange('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ProjectsDashboard({
  projects,
  isLoading,
  filters: externalFilters,
  onFiltersChange,
  onProjectClick,
  onEditProject,
  onDeleteProject,
  onCreateProject,
}: ProjectsDashboardProps) {
  const [localViewMode, setLocalViewMode] = useState<ProjectViewMode>('grid');
  const [localSearch, setLocalSearch] = useState('');
  const [localStatus, setLocalStatus] = useState<ProjectStatus | 'all'>('all');
  const [localPriority, setLocalPriority] = useState<ProjectPriority | 'all'>('all');
  const [localDateFilter, setLocalDateFilter] = useState<ProjectDateFilter>('all');

  const isControlled = externalFilters != null && onFiltersChange != null;
  const viewMode = isControlled ? externalFilters.viewMode : localViewMode;
  const statusFilter = isControlled ? externalFilters.status : localStatus;
  const priorityFilter = isControlled ? externalFilters.priority : localPriority;
  const dateFilter = isControlled ? externalFilters.dateFilter : localDateFilter;

  const [searchDisplay, setSearchDisplay] = useState(externalFilters?.search ?? '');
  const debouncedSearch = useDebounce(searchDisplay, 300);

  useEffect(() => {
    if (!isControlled || !externalFilters) return;
    const urlSearch = externalFilters.search ?? '';
    const id = requestAnimationFrame(() => setSearchDisplay(urlSearch));
    return () => cancelAnimationFrame(id);
    // Sync URL → display when URL changes (e.g. back/forward). Omit searchDisplay to avoid overwriting user typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isControlled, externalFilters?.search]);

  useEffect(() => {
    if (isControlled && debouncedSearch !== (externalFilters?.search ?? '')) {
      onFiltersChange?.({ search: debouncedSearch });
    }
  }, [isControlled, debouncedSearch, externalFilters?.search, onFiltersChange]);

  const search = isControlled ? searchDisplay : localSearch;

  const setViewMode = (v: ProjectViewMode) => {
    if (isControlled) onFiltersChange?.({ viewMode: v });
    else setLocalViewMode(v);
  };
  const setSearch = (v: string) => {
    if (isControlled) setSearchDisplay(v);
    else setLocalSearch(v);
  };
  const setStatusFilter = (v: ProjectStatus | 'all') => {
    if (isControlled) onFiltersChange?.({ status: v });
    else setLocalStatus(v);
  };
  const setPriorityFilter = (v: ProjectPriority | 'all') => {
    if (isControlled) onFiltersChange?.({ priority: v });
    else setLocalPriority(v);
  };
  const setDateFilter = (v: ProjectDateFilter) => {
    if (isControlled) onFiltersChange?.({ dateFilter: v });
    else setLocalDateFilter(v);
  };

  // Filter projects
  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      // Search filter
      const searchMatch = !search ||
        project.title.toLowerCase().includes(search.toLowerCase()) ||
        project.projectNumber.toLowerCase().includes(search.toLowerCase());

      // Status filter
      const statusMatch = statusFilter === 'all' || project.status === statusFilter;

      // Priority filter
      const priorityMatch = priorityFilter === 'all' || project.priority === priorityFilter;

      // Date filter
      let dateMatch = true;
      if (dateFilter !== 'all' && project.targetCompletionDate) {
        const due = new Date(project.targetCompletionDate);
        const today = new Date();
        switch (dateFilter) {
          case 'overdue':
            dateMatch = isPast(due) && !isToday(due);
            break;
          case 'today':
            dateMatch = isToday(due);
            break;
          case 'this-week':
            dateMatch = isWithinInterval(due, { start: today, end: addDays(today, 7) });
            break;
          case 'this-month':
            dateMatch = isWithinInterval(due, { start: today, end: addDays(today, 30) });
            break;
        }
      }

      return searchMatch && statusMatch && priorityMatch && dateMatch;
    });
  }, [projects, search, statusFilter, priorityFilter, dateFilter]);

  if (isLoading) {
    return <ProjectsPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Portfolio Stats */}
      <PortfolioStats projects={projects} />

      {/* Filters */}
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        status={statusFilter}
        onStatusChange={setStatusFilter}
        priority={priorityFilter}
        onPriorityChange={setPriorityFilter}
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredProjects.length} of {projects.length} projects
        </p>
        <Button onClick={onCreateProject}>
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-16">
          <Briefcase className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">No projects found</h3>
          <p className="text-muted-foreground mb-6">
            {search || statusFilter !== 'all' || priorityFilter !== 'all' || dateFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Get started by creating a new project'}
          </p>
          {(search || statusFilter !== 'all' || priorityFilter !== 'all' || dateFilter !== 'all') && (
            <Button
              variant="outline"
              onClick={() => {
                if (isControlled) {
                  setSearchDisplay('');
                  onFiltersChange?.({
                    search: '',
                    status: 'all',
                    priority: 'all',
                    dateFilter: 'all',
                  });
                } else {
                  setSearch('');
                  setStatusFilter('all');
                  setPriorityFilter('all');
                  setDateFilter('all');
                }
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredProjects.map(project => (
            <ProjectCardEnhanced
              key={project.id}
              project={project}
              onClick={() => onProjectClick(project)}
              onEdit={() => onEditProject(project)}
              onDelete={() => onDeleteProject(project)}
              viewMode="grid"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredProjects.map(project => (
            <ProjectCardEnhanced
              key={project.id}
              project={project}
              onClick={() => onProjectClick(project)}
              onEdit={() => onEditProject(project)}
              onDelete={() => onDeleteProject(project)}
              viewMode="list"
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default ProjectsDashboard;
