/**
 * Projects Triage Section
 *
 * Legacy triage component. Prefer filter chips per DOMAIN-LANDING-STANDARDS.
 * Each item has viewAction (required) and optional primaryAction.
 *
 * @see docs/design-system/DOMAIN-LANDING-STANDARDS.md
 */

import { useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { AlertTriangle, ArrowRight, DollarSign, Clock, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format, isPast, isToday, isWithinInterval, addDays } from 'date-fns';
import type { Project, ProjectsTriageItem } from '@/lib/schemas/jobs';

function getTriageIcon(item: ProjectsTriageItem): React.ComponentType<{ className?: string }> {
  if (item.type === 'critical' && item.variant === 'budget') return DollarSign;
  if (item.type === 'critical') return AlertTriangle;
  if (item.type === 'warning') return Clock;
  return Calendar;
}

// ============================================================================
// COMPONENT
// ============================================================================

export interface ProjectsTriageSectionProps {
  projects: Project[];
}

export function ProjectsTriageSection({ projects }: ProjectsTriageSectionProps) {
  const items = useMemo((): ProjectsTriageItem[] => {
    const now = new Date();
    const weekFromNow = addDays(now, 7);
    const result: ProjectsTriageItem[] = [];

    const active = projects.filter((p) => !['completed', 'cancelled'].includes(p.status));

    // Critical: Budget exceeded
    const budgetExceeded = active.filter((p) => {
      const est = p.estimatedTotalValue ? parseFloat(String(p.estimatedTotalValue)) : 0;
      const actual = p.actualTotalCost ? parseFloat(String(p.actualTotalCost)) : 0;
      return est > 0 && actual > est;
    });
    budgetExceeded.slice(0, 3).forEach((p) => {
      result.push({
        id: `budget-${p.id}`,
        type: 'critical',
        variant: 'budget',
        title: `${p.projectNumber} over budget`,
        description: p.title,
        projectId: p.id,
        projectNumber: p.projectNumber,
      });
    });

    // Critical: Overdue
    const overdue = active.filter((p) => {
      if (!p.targetCompletionDate) return false;
      const due = new Date(p.targetCompletionDate);
      return isPast(due) && !isToday(due);
    });
    overdue.slice(0, 3).forEach((p) => {
      if (!result.some((r) => r.id === `budget-${p.id}`)) {
      result.push({
        id: `overdue-${p.id}`,
        type: 'critical',
        variant: 'overdue',
        title: `${p.projectNumber} overdue`,
          description: `${p.title} — due ${format(new Date(p.targetCompletionDate!), 'MMM d')}`,
          projectId: p.id,
          projectNumber: p.projectNumber,
        });
      }
    });

    // Warning: Due this week
    const dueThisWeek = active.filter((p) => {
      if (!p.targetCompletionDate) return false;
      const due = new Date(p.targetCompletionDate);
      return isWithinInterval(due, { start: now, end: weekFromNow }) && !isPast(due);
    });
    dueThisWeek.slice(0, 3).forEach((p) => {
      if (!result.some((r) => r.projectId === p.id)) {
        result.push({
          id: `due-week-${p.id}`,
        type: 'warning',
        title: `${p.projectNumber} due this week`,
          description: p.title,
          projectId: p.id,
          projectNumber: p.projectNumber,
        });
      }
    });

    // Info: Due soon (next 2 weeks)
    const dueSoon = active.filter((p) => {
      if (!p.targetCompletionDate) return false;
      const due = new Date(p.targetCompletionDate);
      const twoWeeks = addDays(now, 14);
      return isWithinInterval(due, { start: weekFromNow, end: twoWeeks });
    });
    dueSoon.slice(0, 2).forEach((p) => {
      if (!result.some((r) => r.projectId === p.id)) {
        result.push({
          id: `due-soon-${p.id}`,
        type: 'info',
        title: `${p.projectNumber} due soon`,
          description: p.title,
          projectId: p.id,
          projectNumber: p.projectNumber,
        });
      }
    });

    return result;
  }, [projects]);

  if (items.length === 0) return null;

  const severityStyles = {
    critical: {
      card: 'border-destructive/50 bg-destructive/5',
      icon: 'bg-destructive/10',
      iconColor: 'text-destructive',
    },
    warning: {
      card: 'border-amber-600/50 bg-amber-50',
      icon: 'bg-amber-100',
      iconColor: 'text-amber-700',
    },
    info: {
      card: 'border-blue-500/50 bg-blue-50',
      icon: 'bg-blue-100',
      iconColor: 'text-blue-700',
    },
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">Needs attention</h3>
      <div className="space-y-2">
        {items.map((item) => {
          const styles = severityStyles[item.type];
          const Icon = getTriageIcon(item);
          return (
            <Card
              key={item.id}
              className={cn('transition-colors duration-200', styles.card)}
              tabIndex={0}
              role="article"
              aria-label={`${item.type} alert: ${item.title}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={cn('rounded-full p-2', styles.icon)}>
                      <Icon className={cn('h-4 w-4', styles.iconColor)} aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-foreground">{item.title}</p>
                      <p className="text-sm text-muted-foreground line-clamp-1">{item.description}</p>
                    </div>
                  </div>
                  <Link
                    to="/projects/$projectId"
                    params={{ projectId: item.projectId }}
                    className={cn(
                      buttonVariants({ variant: 'ghost', size: 'sm' }),
                      'min-h-[44px] sm:min-h-0 shrink-0'
                    )}
                    preload="intent"
                  >
                    View
                    <ArrowRight className="h-3.5 w-3.5 ml-1" aria-hidden />
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
