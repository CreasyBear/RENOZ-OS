/* eslint-disable react-refresh/only-export-components -- Component exports component + filter config */
/**
 * Issue Quick Filters
 *
 * Quick filter chips for common issue views.
 *
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-008
 */

import { User, Users, AlertTriangle, AlertCircle, Clock, Inbox, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// ============================================================================
// TYPES
// ============================================================================

export type QuickFilter =
  | 'all'
  | 'overdue_sla'
  | 'escalated'
  | 'my_issues'
  | 'unassigned'
  | 'sla_at_risk'
  | 'high_priority'
  | 'recent';

interface FilterOption {
  id: QuickFilter;
  label: string;
  icon: React.ElementType;
  description: string;
}

// ============================================================================
// FILTER OPTIONS (triage chips first per DOMAIN-LANDING-STANDARDS)
// ============================================================================

const filterOptions: FilterOption[] = [
  { id: 'all', label: 'All', icon: Inbox, description: 'Show all issues' },
  {
    id: 'overdue_sla',
    label: 'Overdue SLA',
    icon: AlertCircle,
    description: 'SLA breached',
  },
  {
    id: 'escalated',
    label: 'Escalated',
    icon: AlertTriangle,
    description: 'Escalated issues',
  },
  { id: 'my_issues', label: 'My Issues', icon: User, description: 'Assigned to me' },
  {
    id: 'unassigned',
    label: 'Unassigned',
    icon: Users,
    description: 'Not assigned to anyone',
  },
  {
    id: 'sla_at_risk',
    label: 'SLA At Risk',
    icon: Clock,
    description: 'SLA deadlines approaching',
  },
  {
    id: 'high_priority',
    label: 'High Priority',
    icon: Clock,
    description: 'High and critical priority',
  },
  {
    id: 'recent',
    label: 'Recent',
    icon: CheckCircle2,
    description: 'Created in last 24 hours',
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

interface IssueQuickFiltersProps {
  activeFilter: QuickFilter;
  onFilterChange: (filter: QuickFilter) => void;
  counts?: Partial<Record<QuickFilter, number>>;
  className?: string;
}

export function IssueQuickFilters({
  activeFilter,
  onFilterChange,
  counts,
  className,
}: IssueQuickFiltersProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {filterOptions.map((option) => {
        const Icon = option.icon;
        const isActive = activeFilter === option.id;
        const count = counts?.[option.id];

        return (
          <Button
            key={option.id}
            variant={isActive ? 'secondary' : 'ghost'}
            size="sm"
            className={cn('h-8 gap-1.5', isActive && 'bg-secondary')}
            onClick={() => onFilterChange(option.id)}
          >
            <Icon className="h-3.5 w-3.5" />
            {option.label}
            {count !== undefined && count > 0 && (
              <Badge
                variant={isActive ? 'default' : 'secondary'}
                className="ml-1 h-5 px-1.5 text-xs"
              >
                {count}
              </Badge>
            )}
          </Button>
        );
      })}
    </div>
  );
}

// ============================================================================
// HELPER FUNCTIONS (URL sync)
// ============================================================================

export function getFilterDescription(filter: QuickFilter): string {
  return filterOptions.find((o) => o.id === filter)?.description ?? '';
}

/** Derive QuickFilter from URL search params */
export function quickFilterFromSearch(
  search: {
    slaStatus?: string;
    escalated?: boolean;
    assignedToUserId?: string;
    quickFilter?: QuickFilter;
  },
  currentUserId?: string
): QuickFilter {
  // quickFilter takes precedence when present
  if (search.quickFilter) return search.quickFilter;
  if (search.slaStatus === 'breached') return 'overdue_sla';
  if (search.escalated === true) return 'escalated';
  if (search.assignedToUserId && search.assignedToUserId === currentUserId) return 'my_issues';
  return 'all';
}

/** Map QuickFilter click to URL search params */
export function quickFilterToSearch(
  filter: QuickFilter,
  currentUserId?: string
): Record<string, string | boolean | undefined> {
  switch (filter) {
    case 'overdue_sla':
      return { quickFilter: 'overdue_sla', slaStatus: 'breached', escalated: undefined, assignedToUserId: undefined };
    case 'escalated':
      return { quickFilter: 'escalated', slaStatus: undefined, escalated: true, assignedToUserId: undefined };
    case 'my_issues':
      return currentUserId
        ? { quickFilter: 'my_issues', slaStatus: undefined, escalated: undefined, assignedToUserId: currentUserId }
        : { quickFilter: 'all' };
    case 'unassigned':
      return { quickFilter: 'unassigned', slaStatus: undefined, escalated: undefined, assignedToUserId: undefined };
    case 'sla_at_risk':
      return { quickFilter: 'sla_at_risk', slaStatus: undefined, escalated: undefined, assignedToUserId: undefined };
    case 'high_priority':
      return { quickFilter: 'high_priority', slaStatus: undefined, escalated: undefined, assignedToUserId: undefined };
    case 'recent':
      return { quickFilter: 'recent', slaStatus: undefined, escalated: undefined, assignedToUserId: undefined };
    case 'all':
    default:
      return { quickFilter: undefined, slaStatus: undefined, escalated: undefined, assignedToUserId: undefined };
  }
}
