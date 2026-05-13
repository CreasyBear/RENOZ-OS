import type { ElementType } from 'react';
import { AlertCircle, CheckCircle2, Circle, Clock } from 'lucide-react';

import type { SemanticColor } from '@/components/shared';
import type { JobTaskPriority, JobTaskStatus, TaskFilters } from '@/lib/schemas/jobs';

export const DEFAULT_TASK_FILTERS: TaskFilters = {
  status: [],
  priority: [],
  assignee: 'all',
};

export function getTaskPriority(priority: string | null | undefined): JobTaskPriority {
  if (priority === 'urgent' || priority === 'high' || priority === 'normal' || priority === 'low') {
    return priority;
  }
  return 'normal';
}

export interface ProjectTaskPriorityConfig {
  label: string;
  color: string;
  bg: string;
  icon: ElementType;
  variant: SemanticColor;
}

export interface ProjectTaskStatusConfig {
  label: string;
  color: string;
  icon: ElementType;
  variant: SemanticColor;
}

export const PROJECT_TASK_PRIORITY_CONFIG: Record<JobTaskPriority, ProjectTaskPriorityConfig> = {
  urgent: {
    label: 'Urgent',
    color: 'text-red-600',
    bg: 'bg-red-100',
    icon: AlertCircle,
    variant: 'error',
  },
  high: {
    label: 'High',
    color: 'text-orange-600',
    bg: 'bg-orange-100',
    icon: AlertCircle,
    variant: 'warning',
  },
  normal: {
    label: 'Normal',
    color: 'text-blue-600',
    bg: 'bg-blue-100',
    icon: Clock,
    variant: 'info',
  },
  low: {
    label: 'Low',
    color: 'text-green-600',
    bg: 'bg-green-100',
    icon: Clock,
    variant: 'success',
  },
};

export const PROJECT_TASK_STATUS_CONFIG: Record<JobTaskStatus, ProjectTaskStatusConfig> = {
  pending: {
    label: 'To Do',
    color: 'text-gray-500',
    icon: Circle,
    variant: 'neutral',
  },
  in_progress: {
    label: 'In Progress',
    color: 'text-blue-500',
    icon: Clock,
    variant: 'progress',
  },
  completed: {
    label: 'Done',
    color: 'text-green-500',
    icon: CheckCircle2,
    variant: 'success',
  },
  blocked: {
    label: 'Blocked',
    color: 'text-red-500',
    icon: AlertCircle,
    variant: 'error',
  },
};
