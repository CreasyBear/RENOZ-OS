/**
 * Issue Quick Filters
 *
 * Quick filter chips for common issue views.
 *
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-008
 */

import { User, Users, AlertTriangle, Clock, Inbox, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// ============================================================================
// TYPES
// ============================================================================

export type QuickFilter =
  | 'all'
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
// FILTER OPTIONS
// ============================================================================

const filterOptions: FilterOption[] = [
  { id: 'all', label: 'All Issues', icon: Inbox, description: 'Show all issues' },
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
    icon: AlertTriangle,
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
// HELPER FUNCTIONS
// ============================================================================

export function getFilterDescription(filter: QuickFilter): string {
  return filterOptions.find((o) => o.id === filter)?.description ?? '';
}
