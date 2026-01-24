/**
 * Issue Bulk Actions Toolbar
 *
 * Toolbar for bulk operations on selected issues.
 *
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-008
 */

import { useState } from 'react';
import { X, UserPlus, Flag, Trash2, Archive, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useConfirmation } from '@/hooks/use-confirmation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// ============================================================================
// TYPES
// ============================================================================

export type BulkAction = 'assign' | 'change_priority' | 'change_status' | 'close' | 'delete';

export interface BulkActionEvent {
  action: BulkAction;
  issueIds: string[];
  value?: string;
}

interface User {
  id: string;
  name: string | null;
  email: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

interface IssueBulkActionsProps {
  selectedCount: number;
  onClearSelection: () => void;
  onAction: (event: BulkActionEvent) => void;
  users?: User[];
  isPending?: boolean;
}

export function IssueBulkActions({
  selectedCount,
  onClearSelection,
  onAction,
  users = [],
  isPending = false,
}: IssueBulkActionsProps) {
  const confirm = useConfirmation();
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [priorityDialogOpen, setPriorityDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);

  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  if (selectedCount === 0) return null;

  const handleAssign = () => {
    if (selectedUserId) {
      onAction({
        action: 'assign',
        issueIds: [], // Will be filled by parent
        value: selectedUserId,
      });
      setAssignDialogOpen(false);
      setSelectedUserId('');
    }
  };

  const handlePriorityChange = () => {
    if (selectedPriority) {
      onAction({
        action: 'change_priority',
        issueIds: [],
        value: selectedPriority,
      });
      setPriorityDialogOpen(false);
      setSelectedPriority('');
    }
  };

  const handleStatusChange = () => {
    if (selectedStatus) {
      onAction({
        action: 'change_status',
        issueIds: [],
        value: selectedStatus,
      });
      setStatusDialogOpen(false);
      setSelectedStatus('');
    }
  };

  const handleClose = () => {
    onAction({
      action: 'close',
      issueIds: [],
      value: 'closed',
    });
  };

  const handleBulkDelete = async () => {
    const confirmed = await confirm.confirm({
      title: 'Delete Issues',
      description: `Are you sure you want to delete ${selectedCount} selected issue${selectedCount === 1 ? '' : 's'}? This action cannot be undone.`,
      confirmLabel: 'Delete Issues',
      variant: 'destructive',
    });

    if (confirmed.confirmed) {
      onAction({
        action: 'delete',
        issueIds: [],
      });
    }
  };

  return (
    <>
      <div
        className={cn(
          'fixed bottom-4 left-1/2 z-50 -translate-x-1/2',
          'bg-background rounded-lg border p-2 shadow-lg',
          'flex items-center gap-2'
        )}
      >
        {/* Selection count */}
        <div className="flex items-center gap-2 border-r px-2">
          <span className="text-sm font-medium">{selectedCount} selected</span>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClearSelection}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Assign */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setAssignDialogOpen(true)}
          disabled={isPending}
        >
          <UserPlus className="mr-1 h-4 w-4" />
          Assign
        </Button>

        {/* Change Priority */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setPriorityDialogOpen(true)}
          disabled={isPending}
        >
          <Flag className="mr-1 h-4 w-4" />
          Priority
        </Button>

        {/* Change Status */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setStatusDialogOpen(true)}
          disabled={isPending}
        >
          <CheckCircle2 className="mr-1 h-4 w-4" />
          Status
        </Button>

        {/* Close Issues */}
        <Button variant="ghost" size="sm" onClick={handleClose} disabled={isPending}>
          <Archive className="mr-1 h-4 w-4" />
          Close
        </Button>

        {/* Delete */}
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={handleBulkDelete}
          disabled={isPending}
        >
          <Trash2 className="mr-1 h-4 w-4" />
          Delete
        </Button>
      </div>

      {/* Assign Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Issues</DialogTitle>
            <DialogDescription>
              Assign {selectedCount} issue{selectedCount > 1 ? 's' : ''} to a team member.
            </DialogDescription>
          </DialogHeader>
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger>
              <SelectValue placeholder="Select assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassign</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name ?? user.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={!selectedUserId || isPending}>
              {isPending ? 'Assigning...' : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Priority Dialog */}
      <Dialog open={priorityDialogOpen} onOpenChange={setPriorityDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Priority</DialogTitle>
            <DialogDescription>
              Update priority for {selectedCount} issue{selectedCount > 1 ? 's' : ''}.
            </DialogDescription>
          </DialogHeader>
          <Select value={selectedPriority} onValueChange={setSelectedPriority}>
            <SelectTrigger>
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPriorityDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePriorityChange} disabled={!selectedPriority || isPending}>
              {isPending ? 'Updating...' : 'Update Priority'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Status</DialogTitle>
            <DialogDescription>
              Update status for {selectedCount} issue{selectedCount > 1 ? 's' : ''}.
            </DialogDescription>
          </DialogHeader>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="on_hold">On Hold</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleStatusChange} disabled={!selectedStatus || isPending}>
              {isPending ? 'Updating...' : 'Update Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
