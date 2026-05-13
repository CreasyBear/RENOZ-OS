import { startTransition, useEffect, useState } from 'react';
import { Edit3 } from 'lucide-react';

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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { useOrgFormat } from '@/hooks/use-org-format';
import { formatProjectBomMutationError, useUpdateBomItem } from '@/hooks/jobs';
import { bomItemStatusSchema, type BomItemStatus, type BomItemWithProduct } from '@/lib/schemas/jobs';
import { PROJECT_BOM_ITEM_STATUS_CONFIG } from './project-bom-status-config';

export interface ProjectBomEditItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  item: BomItemWithProduct | null;
  onSuccess?: () => void;
}

export function ProjectBomEditItemDialog({
  open,
  onOpenChange,
  projectId,
  item,
  onSuccess,
}: ProjectBomEditItemDialogProps) {
  const { formatCurrency } = useOrgFormat();
  const formatCurrencyDisplay = (value: number) =>
    formatCurrency(value, { cents: false, showCents: true });
  const [quantity, setQuantity] = useState(1);
  const [unitCost, setUnitCost] = useState<number | undefined>();
  const [status, setStatus] = useState<BomItemStatus>('planned');
  const [notes, setNotes] = useState('');

  const updateItem = useUpdateBomItem(projectId);

  useEffect(() => {
    if (item) {
      startTransition(() => {
        setQuantity(Number(item.quantityEstimated) || 1);
        setUnitCost(item.unitCostEstimated ? Number(item.unitCostEstimated) : undefined);
        setStatus(item.status);
        setNotes(item.notes || '');
      });
    }
  }, [item]);

  const handleSubmit = async () => {
    if (!item) return;

    try {
      await updateItem.mutateAsync({
        data: {
          itemId: item.id,
          quantity,
          unitCost,
          status,
          notes: notes || undefined,
        }
      });

      toast.success('Item updated');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(formatProjectBomMutationError(error, 'updateItem'));
    }
  };

  if (!item) return null;

  const totalCost = unitCost ? quantity * unitCost : 0;
  const productName = item.product?.name || 'Unknown Product';

  return (
    <Dialog open={open} onOpenChange={createPendingDialogOpenChangeHandler(updateItem.isPending, onOpenChange)}>
      <DialogContent
        className="max-w-lg"
        onEscapeKeyDown={createPendingDialogInteractionGuards(updateItem.isPending).onEscapeKeyDown}
        onInteractOutside={createPendingDialogInteractionGuards(updateItem.isPending).onInteractOutside}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            Edit Material
          </DialogTitle>
          <DialogDescription>{productName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select
              value={status}
              onValueChange={(value) => {
                const parsed = bomItemStatusSchema.safeParse(value);
                if (parsed.success) setStatus(parsed.data);
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
            <p className="text-xs text-muted-foreground">
              {PROJECT_BOM_ITEM_STATUS_CONFIG[status].description}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Quantity</label>
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(event) => setQuantity(parseInt(event.target.value) || 1)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Unit Cost</label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={unitCost || ''}
                onChange={(event) => setUnitCost(event.target.value ? parseFloat(event.target.value) : undefined)}
              />
            </div>
          </div>

          {totalCost > 0 && (
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="font-semibold">{formatCurrencyDisplay(totalCost)}</span>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Notes</label>
            <Input
              placeholder="Specifications, vendor info, etc."
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={updateItem.isPending}>
            {updateItem.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
