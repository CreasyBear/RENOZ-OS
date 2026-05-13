import { useState } from 'react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  createPendingDialogInteractionGuards,
  createPendingDialogOpenChangeHandler,
} from '@/components/ui/dialog-pending-guards';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { formatProjectBomMutationError } from '@/hooks/jobs';
import { bomItemStatusSchema, type BomItemStatus, type BomItemWithProduct } from '@/lib/schemas/jobs';
import { PROJECT_BOM_ITEM_STATUS_CONFIG } from './project-bom-status-config';

export interface ProjectBomBulkStatusMutation {
  isPending: boolean;
  mutateAsync: (params: {
    data: {
      itemIds: string[];
      status: BomItemStatus;
    };
  }) => Promise<unknown>;
}

export interface ProjectBomBulkStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: BomItemWithProduct[];
  onComplete: () => void;
  onUpdateStatus: ProjectBomBulkStatusMutation;
}

export function ProjectBomBulkStatusDialog({
  open,
  onOpenChange,
  items,
  onComplete,
  onUpdateStatus,
}: ProjectBomBulkStatusDialogProps) {
  const [newStatus, setNewStatus] = useState<BomItemStatus>('planned');

  const handleConfirm = async () => {
    try {
      await onUpdateStatus.mutateAsync({
        data: { itemIds: items.map((item) => item.id), status: newStatus },
      });
      toast.success(`Updated ${items.length} item${items.length > 1 ? 's' : ''} to ${PROJECT_BOM_ITEM_STATUS_CONFIG[newStatus].label}`);
      onComplete();
    } catch (error) {
      toast.error(formatProjectBomMutationError(error, 'updateStatus'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={createPendingDialogOpenChangeHandler(onUpdateStatus.isPending, onOpenChange)}>
      <DialogContent
        onEscapeKeyDown={createPendingDialogInteractionGuards(onUpdateStatus.isPending).onEscapeKeyDown}
        onInteractOutside={createPendingDialogInteractionGuards(onUpdateStatus.isPending).onInteractOutside}
      >
        <DialogHeader>
          <DialogTitle>Update Status</DialogTitle>
          <DialogDescription>
            Change the status of {items.length} selected item{items.length > 1 ? 's' : ''}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>New Status</Label>
            <Select
              value={newStatus}
              onValueChange={(value) => {
                const parsed = bomItemStatusSchema.safeParse(value);
                if (parsed.success) setNewStatus(parsed.data);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PROJECT_BOM_ITEM_STATUS_CONFIG).map(([value, config]) => (
                  <SelectItem key={value} value={value}>
                    <div className="flex items-center gap-2">
                      <config.icon className={cn('h-4 w-4', config.color)} />
                      {config.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={onUpdateStatus.isPending}
          >
            {onUpdateStatus.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Update {items.length} items
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
