/**
 * JobsBulkActions Component
 *
 * Bulk actions bar that appears when tasks are selected in the kanban board.
 * Provides bulk status updates and assignment changes.
 */

import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useJobTaskKanbanConfig } from '@/hooks/jobs';

export interface JobsBulkActionsProps {
  selectedTaskIds: Set<string>;
  onClearSelection: () => void;
  onBulkStatusUpdate: (status: string) => Promise<void>;
  onBulkAssign: (assigneeId: string) => Promise<void>;
  availableAssignees?: Array<{ id: string; name: string }>;
  isLoading?: boolean;
}

export function JobsBulkActions({
  selectedTaskIds,
  onClearSelection,
  onBulkStatusUpdate,
  onBulkAssign,
  availableAssignees = [],
  isLoading = false,
}: JobsBulkActionsProps) {
  const kanbanConfig = useJobTaskKanbanConfig();

  if (selectedTaskIds.size === 0) {
    return null;
  }

  const handleStatusChange = async (status: string) => {
    await onBulkStatusUpdate(status);
  };

  const handleAssigneeChange = async (assigneeId: string) => {
    await onBulkAssign(assigneeId);
  };

  return (
    <div className="bg-muted/50 border-border flex items-center justify-between gap-4 border-b p-4">
      <div className="flex items-center gap-4">
        <Badge variant="secondary" className="gap-1">
          {selectedTaskIds.size} task{selectedTaskIds.size !== 1 ? 's' : ''} selected
        </Badge>

        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">Change status to:</span>
          <Select onValueChange={handleStatusChange} disabled={isLoading}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {kanbanConfig.columns.map((column) => (
                <SelectItem key={column.id} value={column.id}>
                  {column.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">Assign to:</span>
          <Select onValueChange={handleAssigneeChange} disabled={isLoading}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassign">Unassign</SelectItem>
              {availableAssignees.map((assignee) => (
                <SelectItem key={assignee.id} value={assignee.id}>
                  {assignee.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={onClearSelection}
        disabled={isLoading}
        className="gap-2"
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
        Clear selection
      </Button>
    </div>
  );
}
