/**
 * ProjectCard Component
 *
 * Displays a project in either list or board (grid) view.
 * Based on reference patterns from project-management-reference.
 *
 * SPRINT-03: New component for project-centric jobs model
 */

import { useMemo } from 'react';
import { format } from 'date-fns';
import {
  Folder,
  Calendar,
  Flag,
  MapPin,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { Project } from 'drizzle/schema/jobs/projects';
import type { ProjectStatus, ProjectPriority } from '@/lib/schemas/jobs/projects';

// ============================================================================
// TYPES
// ============================================================================

export interface ProjectCardProps {
  project: Project;
  variant?: 'list' | 'board';
  onClick?: () => void;
  actions?: React.ReactNode;
}

// ============================================================================
// STATUS CONFIG
// ============================================================================

function getStatusConfig(status: ProjectStatus) {
  switch (status) {
    case 'quoting':
      return {
        label: 'Quoting',
        dot: 'bg-gray-500',
        pill: 'text-gray-700 border-gray-200 bg-gray-50',
      };
    case 'approved':
      return {
        label: 'Approved',
        dot: 'bg-blue-500',
        pill: 'text-blue-700 border-blue-200 bg-blue-50',
      };
    case 'in_progress':
      return {
        label: 'In Progress',
        dot: 'bg-teal-500',
        pill: 'text-teal-700 border-teal-200 bg-teal-50',
      };
    case 'completed':
      return {
        label: 'Completed',
        dot: 'bg-green-500',
        pill: 'text-green-700 border-green-200 bg-green-50',
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        dot: 'bg-red-500',
        pill: 'text-red-700 border-red-200 bg-red-50',
      };
    case 'on_hold':
      return {
        label: 'On Hold',
        dot: 'bg-orange-500',
        pill: 'text-orange-700 border-orange-200 bg-orange-50',
      };
    default:
      return {
        label: status,
        dot: 'bg-gray-400',
        pill: 'text-gray-700 border-gray-200 bg-gray-50',
      };
  }
}

// ============================================================================
// PRIORITY CONFIG
// ============================================================================

function getPriorityConfig(priority: ProjectPriority) {
  switch (priority) {
    case 'urgent':
      return { label: 'Urgent', color: 'text-red-600 bg-red-50' };
    case 'high':
      return { label: 'High', color: 'text-orange-600 bg-orange-50' };
    case 'medium':
      return { label: 'Medium', color: 'text-yellow-600 bg-yellow-50' };
    case 'low':
      return { label: 'Low', color: 'text-green-600 bg-green-50' };
    default:
      return { label: priority, color: 'text-gray-600 bg-gray-50' };
  }
}

// ============================================================================
// PROGRESS CIRCLE COMPONENT
// ============================================================================

interface ProgressCircleProps {
  progress: number;
  size?: number;
}

function ProgressCircle({ progress, size = 20 }: ProgressCircleProps) {
  const s = Math.round(size);
  const strokeWidth = 2;
  const r = Math.floor((s - strokeWidth) / 2);
  const cx = s / 2;
  const cy = s / 2;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - progress / 100);

  return (
    <div className="relative flex items-center justify-center" style={{ width: s, height: s }}>
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} aria-hidden>
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted-foreground/20"
        />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${cx} ${cy})`}
          className={cn(
            'transition-all duration-300',
            progress === 100 ? 'text-green-500' : 'text-primary'
          )}
        />
      </svg>
      <span className="absolute text-[8px] font-medium">{progress}%</span>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ProjectCard({ project, variant = 'list', onClick, actions }: ProjectCardProps) {
  const status = getStatusConfig(project.status);
  const priority = getPriorityConfig(project.priority);
  const isBoard = variant === 'board';

  // Format site address
  const addressLabel = useMemo(() => {
    if (!project.siteAddress) return null;
    const { city, state } = project.siteAddress;
    return [city, state].filter(Boolean).join(', ');
  }, [project.siteAddress]);

  // Format due date
  const dueLabel = useMemo(() => {
    if (!project.targetCompletionDate) return 'No due date';
    return format(new Date(project.targetCompletionDate), isBoard ? 'MMM d' : 'MMM d, yyyy');
  }, [project.targetCompletionDate, isBoard]);

  // Format secondary line (type + address)
  const secondaryLine = useMemo(() => {
    const parts = [
      project.projectType?.replace('_', ' '),
      addressLabel,
    ].filter(Boolean);
    return parts.join(' • ');
  }, [project.projectType, addressLabel]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={cn(
        'rounded-xl border bg-card hover:shadow-md transition-shadow cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring',
        isBoard ? 'p-4' : 'p-5'
      )}
    >
      {/* Header Row */}
      <div className="flex items-start justify-between">
        {isBoard ? (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Flag className="h-3.5 w-3.5" />
            <span>{dueLabel}</span>
          </div>
        ) : (
          <div className="text-muted-foreground">
            <Folder className="h-5 w-5" />
          </div>
        )}

        <div className="flex items-center gap-2">
          {!isBoard && (
            <div
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
                status.pill
              )}
            >
              <span className={cn('inline-block size-1.5 rounded-full', status.dot)} />
              {status.label}
            </div>
          )}
          {isBoard && (
            <Badge variant="secondary" className={cn('text-xs', priority.color)}>
              {priority.label}
            </Badge>
          )}
          {actions && (
            <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
              {actions}
            </div>
          )}
        </div>
      </div>

      {/* Title */}
      <div className={cn('mt-3', isBoard && 'mt-2')}>
        <h3 className={cn('font-semibold text-foreground leading-tight', isBoard ? 'text-sm' : 'text-base')}>
          {project.title}
        </h3>
        {secondaryLine && (
          <p className={cn('text-muted-foreground truncate', isBoard ? 'mt-1 text-xs' : 'mt-1.5 text-sm')}>
            {secondaryLine}
          </p>
        )}
      </div>

      {/* Meta Row (List View Only) */}
      {!isBoard && (
        <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>{dueLabel}</span>
            </div>
            {addressLabel && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                <span className="truncate max-w-[150px]">{addressLabel}</span>
              </div>
            )}
          </div>
          <Badge variant="secondary" className={cn('text-xs', priority.color)}>
            {priority.label}
          </Badge>
        </div>
      )}

      {/* Footer */}
      <div className={cn('border-t border-border/60', isBoard ? 'mt-3 pt-3' : 'mt-4 pt-4')}>
        <div className="flex items-center justify-between">
          <ProgressCircle progress={project.progressPercent ?? 0} size={isBoard ? 18 : 20} />
          
          {/* Project Number / Assignee */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">
              {project.projectNumber}
            </span>
            <Avatar className="h-6 w-6 border">
              <AvatarImage alt="Assignee" />
              <AvatarFallback className="text-[10px]">
                <User className="h-3 w-3 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </div>
  );
}
