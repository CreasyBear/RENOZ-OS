/**
 * Issue Kanban Card
 *
 * Draggable card for issues in the kanban board.
 *
 * @see src/components/domain/support/issue-kanban-board.tsx
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-008
 */

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Link } from '@tanstack/react-router';
import { AlertTriangle, User, Calendar, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { buttonVariants } from '@/components/ui/button';
import type { IssueKanbanItem, IssuePriority } from '@/lib/schemas/support/issues';

export type { IssueKanbanItem };

// ============================================================================
// PRIORITY CONFIG
// ============================================================================

const priorityConfig: Record<
  IssuePriority,
  {
    label: string;
    variant: 'default' | 'secondary' | 'outline' | 'destructive';
    className?: string;
  }
> = {
  low: { label: 'Low', variant: 'outline' },
  medium: { label: 'Medium', variant: 'secondary' },
  high: { label: 'High', variant: 'default', className: 'bg-orange-500' },
  critical: { label: 'Critical', variant: 'destructive' },
};

// ============================================================================
// COMPONENT
// ============================================================================

interface IssueKanbanCardProps {
  issue: IssueKanbanItem;
  isSelected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  onClick?: (issue: IssueKanbanItem) => void;
  isDragging?: boolean;
}

export function IssueKanbanCard({
  issue,
  isSelected = false,
  onSelect,
  onClick,
  isDragging = false,
}: IssueKanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: issue.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priorityInfo = priorityConfig[issue.priority];
  const createdDate = new Date(issue.createdAt);
  const isAtRisk = issue.slaStatus === 'at_risk' || issue.slaStatus === 'breached';

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        'cursor-pointer transition-all',
        (isDragging || isSortableDragging) && 'rotate-2 opacity-50 shadow-lg',
        isSelected && 'ring-primary ring-2',
        isAtRisk && 'border-orange-500'
      )}
    >
      <CardHeader className="p-3 pb-2">
        <div className="flex items-start gap-2">
          {/* Drag Handle */}
          <button
            {...attributes}
            {...listeners}
            className="text-muted-foreground hover:text-foreground -ml-1 cursor-grab p-0.5 active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" />
          </button>

          {/* Selection Checkbox */}
          {onSelect && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelect(issue.id, checked === true)}
              onClick={(e) => e.stopPropagation()}
              className="mt-0.5"
            />
          )}

          {/* Content */}
          <div className="min-w-0 flex-1" onClick={() => onClick?.(issue)}>
            <div className="mb-1 flex items-center gap-2">
              <span className="text-muted-foreground font-mono text-xs">{issue.issueNumber}</span>
              <Badge
                variant={priorityInfo.variant}
                className={cn('h-5 text-xs', priorityInfo.className)}
              >
                {priorityInfo.label}
              </Badge>
              {isAtRisk && (
                <Tooltip>
                  <TooltipTrigger>
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    SLA {issue.slaStatus === 'breached' ? 'Breached' : 'At Risk'}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <p className="line-clamp-2 text-sm font-medium">{issue.title}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0" onClick={() => onClick?.(issue)}>
        <div className="text-muted-foreground flex items-center gap-3 text-xs">
          {issue.customerId ? (
            <Link
              to="/customers/$customerId"
              params={{ customerId: issue.customerId }}
              search={{}}
              className={cn(buttonVariants({ variant: 'link' }), 'h-auto max-w-[100px] truncate p-0 text-xs')}
              onClick={(e) => e.stopPropagation()}
            >
              {issue.customer?.name ?? 'Customer'}
            </Link>
          ) : (
            issue.customer && <span className="max-w-[100px] truncate">{issue.customer.name}</span>
          )}
          {issue.assignedTo && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {issue.assignedTo.name ?? issue.assignedTo.email.split('@')[0]}
                </span>
              </TooltipTrigger>
              <TooltipContent>Assigned to {issue.assignedTo.email}</TooltipContent>
            </Tooltip>
          )}
          <span className="ml-auto flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {createdDate.toLocaleDateString()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// OVERLAY CARD (for drag overlay)
// ============================================================================

export function IssueKanbanCardOverlay({ issue }: { issue: IssueKanbanItem }) {
  const priorityInfo = priorityConfig[issue.priority];

  return (
    <Card className="w-[280px] rotate-3 shadow-xl">
      <CardHeader className="p-3 pb-2">
        <div className="flex items-start gap-2">
          <GripVertical className="text-muted-foreground h-4 w-4" />
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <span className="text-muted-foreground font-mono text-xs">{issue.issueNumber}</span>
              <Badge
                variant={priorityInfo.variant}
                className={cn('h-5 text-xs', priorityInfo.className)}
              >
                {priorityInfo.label}
              </Badge>
            </div>
            <p className="line-clamp-2 text-sm font-medium">{issue.title}</p>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
