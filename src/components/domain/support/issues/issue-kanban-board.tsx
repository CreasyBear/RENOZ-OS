/**
 * Issue Kanban Board
 *
 * Drag-drop kanban board for issue management by status.
 *
 * @see src/components/domain/support/issue-kanban-card.tsx
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-008
 */

import { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { IssueKanbanCard, IssueKanbanCardOverlay, type IssueKanbanItem } from './issue-kanban-card';
import type { KanbanColumn, StatusChangeEvent } from '@/lib/schemas/support';
import type { IssueStatus } from '@/lib/schemas/support/issues';

// ============================================================================
// COLUMN CONFIG
// ============================================================================

const columns: KanbanColumn[] = [
  { id: 'open', title: 'Open', color: 'bg-blue-500' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-yellow-500' },
  { id: 'on_hold', title: 'On Hold', color: 'bg-gray-500' },
  { id: 'resolved', title: 'Resolved', color: 'bg-green-500' },
  { id: 'closed', title: 'Closed', color: 'bg-slate-500' },
];

// ============================================================================
// KANBAN COLUMN
// ============================================================================

interface IssueKanbanColumnProps {
  column: KanbanColumn;
  issues: IssueKanbanItem[];
  selectedIds: Set<string>;
  pendingIssueIds: Set<string>;
  onSelect: (id: string, selected: boolean) => void;
  onIssueClick: (issue: IssueKanbanItem) => void;
}

function IssueKanbanColumn({
  column,
  issues,
  selectedIds,
  pendingIssueIds,
  onSelect,
  onIssueClick,
}: IssueKanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <Card
      ref={setNodeRef}
      className={cn(
        'flex h-full max-w-[300px] min-w-[300px] flex-col',
        isOver && 'ring-primary ring-2 ring-offset-2'
      )}
    >
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn('h-2 w-2 rounded-full', column.color)} />
            <CardTitle className="text-sm">{column.title}</CardTitle>
          </div>
          <Badge variant="secondary" className="text-xs">
            {issues.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-2 pt-0">
        <ScrollArea className="h-full pr-2">
          <SortableContext items={issues.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2 pb-4">
              {issues.length === 0 ? (
                <div className="text-muted-foreground py-8 text-center text-sm">No issues</div>
              ) : (
                issues.map((issue) => (
                  <IssueKanbanCard
                    key={issue.id}
                    issue={issue}
                    isSelected={selectedIds.has(issue.id)}
                    isPending={pendingIssueIds.has(issue.id)}
                    onSelect={onSelect}
                    onClick={onIssueClick}
                  />
                ))
              )}
            </div>
          </SortableContext>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface IssueKanbanBoardProps {
  issues: IssueKanbanItem[];
  selectedIds: Set<string>;
  pendingIssueIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onStatusChange: (event: StatusChangeEvent) => void;
  onIssueClick: (issue: IssueKanbanItem) => void;
}

export function IssueKanbanBoard({
  issues,
  selectedIds,
  pendingIssueIds,
  onSelectionChange,
  onStatusChange,
  onIssueClick,
}: IssueKanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Group issues by status
  const issuesByStatus = useMemo(() => {
    const grouped: Record<IssueStatus, IssueKanbanItem[]> = {
      open: [],
      in_progress: [],
      pending: [],
      on_hold: [],
      escalated: [],
      resolved: [],
      closed: [],
    };

    issues.forEach((issue) => {
      const status = issue.status;
      if (grouped[status]) {
        grouped[status].push(issue);
      } else {
        // Fallback to open if unknown status
        grouped.open.push(issue);
      }
    });

    return grouped;
  }, [issues]);

  const activeIssue = activeId ? issues.find((i) => i.id === activeId) : null;

  const handleDragStart = (event: DragStartEvent) => {
    const id = event.active.id;
    setActiveId(typeof id === 'string' ? id : String(id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeIdStr = typeof active.id === 'string' ? active.id : String(active.id);
    const activeIssue = issues.find((i) => i.id === activeIdStr);
    if (!activeIssue) return;

    // Check if dropped on a column
    const overIdStr = typeof over.id === 'string' ? over.id : String(over.id);
    const overColumn = columns.find((c) => c.id === overIdStr);
    if (overColumn && activeIssue.status !== overColumn.id) {
      onStatusChange({
        issueId: activeIssue.id,
        fromStatus: activeIssue.status,
        toStatus: overColumn.id,
      });
      return;
    }

    // Check if dropped on another issue (get that issue's status)
    const overIssue = issues.find((i) => i.id === overIdStr);
    if (overIssue && activeIssue.status !== overIssue.status) {
      onStatusChange({
        issueId: activeIssue.id,
        fromStatus: activeIssue.status,
        toStatus: overIssue.status,
      });
    }
  };

  const handleSelect = (id: string, selected: boolean) => {
    const newSelection = new Set(selectedIds);
    if (selected) {
      newSelection.add(id);
    } else {
      newSelection.delete(id);
    }
    onSelectionChange(newSelection);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-[calc(100vh-220px)] gap-4 overflow-x-auto pb-4">
        {columns.map((column) => (
          <IssueKanbanColumn
            key={column.id}
            column={column}
            issues={issuesByStatus[column.id]}
            selectedIds={selectedIds}
            pendingIssueIds={pendingIssueIds}
            onSelect={handleSelect}
            onIssueClick={onIssueClick}
          />
        ))}
      </div>

      <DragOverlay>
        {activeIssue ? <IssueKanbanCardOverlay issue={activeIssue} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
