/**
 * PO Costs Tab
 *
 * Displays and manages additional costs (freight, duty, insurance, etc.)
 * for a purchase order, with allocation preview across line items.
 */

import { useState, useCallback } from 'react';
import { Link } from '@tanstack/react-router';
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { FormatAmount } from '@/components/shared/format';
import { toastSuccess, toastError } from '@/hooks';
import {
  usePurchaseOrderCosts,
  useAllocatedCosts,
  useAddPurchaseOrderCost,
  useUpdatePurchaseOrderCost,
  useDeletePurchaseOrderCost,
} from '@/hooks/suppliers';
import { useOrganizationSettings } from '~/contexts/organization-settings-context';
import { useOrgFormat } from '@/hooks/use-org-format';

import {
  poCostTypeSchema,
  poAllocationMethodSchema,
  type CostFormData,
} from '@/lib/schemas/purchase-orders';

// ============================================================================
// TYPES
// ============================================================================

interface POCostsTabProps {
  poId: string;
  poStatus: string;
  totalPOValue: number;
  poCurrency?: string;
}

const COST_TYPE_LABELS: Record<string, string> = {
  freight: 'Freight',
  duty: 'Duty',
  insurance: 'Insurance',
  handling: 'Handling',
  customs: 'Customs',
  other: 'Other',
};

const ALLOCATION_METHOD_LABELS: Record<string, string> = {
  equal: 'Equal Split',
  by_value: 'By Value',
  by_weight: 'By Weight',
  by_quantity: 'By Quantity',
};

const INITIAL_FORM: CostFormData = {
  costType: 'freight',
  amount: '',
  allocationMethod: 'equal',
  description: '',
  supplierInvoiceNumber: '',
  notes: '',
};

// ============================================================================
// COMPONENT
// ============================================================================

export function POCostsTab({ poId, poStatus, totalPOValue, poCurrency }: POCostsTabProps) {
  const { currency: orgCurrency } = useOrganizationSettings();
  const { formatCurrency } = useOrgFormat();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCostId, setEditingCostId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showAllocation, setShowAllocation] = useState(false);
  const [formData, setFormData] = useState<CostFormData>(INITIAL_FORM);

  const isReadOnly = ['cancelled', 'closed'].includes(poStatus);

  // Data fetching
  const { data: costsData, isLoading: costsLoading } = usePurchaseOrderCosts(poId);
  const { data: allocationData, isLoading: allocationLoading } = useAllocatedCosts(poId);

  // Mutations
  const addCost = useAddPurchaseOrderCost();
  const updateCost = useUpdatePurchaseOrderCost(poId);
  const removeCost = useDeletePurchaseOrderCost(poId);

  const costs = costsData?.costs ?? [];
  const totalCosts = costsData?.totalCosts ?? 0;

  // Handlers
  const handleOpenAdd = useCallback(() => {
    setFormData(INITIAL_FORM);
    setEditingCostId(null);
    setDialogOpen(true);
  }, []);

  const handleOpenEdit = useCallback(
    (cost: (typeof costs)[0]) => {
      const costTypeParse = poCostTypeSchema.safeParse(cost.costType);
      const allocationParse = poAllocationMethodSchema.safeParse(cost.allocationMethod ?? 'equal');
      const costType: CostFormData['costType'] = costTypeParse.success ? costTypeParse.data : 'freight';
      const allocationMethod: CostFormData['allocationMethod'] = allocationParse.success
        ? allocationParse.data
        : 'equal';
      setFormData({
        costType,
        amount: String(Number(cost.amount ?? 0)),
        allocationMethod,
        description: cost.description ?? '',
        supplierInvoiceNumber: cost.supplierInvoiceNumber ?? '',
        notes: cost.notes ?? '',
      });
      setEditingCostId(cost.id);
      setDialogOpen(true);
    },
    []
  );

  const handleSubmit = useCallback(async () => {
    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toastError('Please enter a valid amount greater than zero');
      return;
    }

    try {
      if (editingCostId) {
        await updateCost.mutateAsync({
          costId: editingCostId,
          costType: formData.costType,
          amount,
          allocationMethod: formData.allocationMethod,
          description: formData.description || undefined,
          supplierInvoiceNumber: formData.supplierInvoiceNumber || undefined,
          notes: formData.notes || undefined,
        });
        toastSuccess(`${COST_TYPE_LABELS[formData.costType]} cost updated`);
      } else {
        await addCost.mutateAsync({
          purchaseOrderId: poId,
          costType: formData.costType,
          amount,
          allocationMethod: formData.allocationMethod,
          description: formData.description || undefined,
          supplierInvoiceNumber: formData.supplierInvoiceNumber || undefined,
          notes: formData.notes || undefined,
        });
        toastSuccess(
          `${COST_TYPE_LABELS[formData.costType]} cost added — ${formatCurrency(amount, { cents: false, showCents: true })} allocated ${ALLOCATION_METHOD_LABELS[formData.allocationMethod].toLowerCase()}`
        );
      }
      setDialogOpen(false);
    } catch {
      toastError(editingCostId ? 'Failed to update cost' : 'Failed to add cost');
    }
  }, [formData, editingCostId, poId, addCost, updateCost, formatCurrency]);

  const handleDelete = useCallback(async () => {
    if (!deleteConfirmId) return;
    try {
      await removeCost.mutateAsync({ costId: deleteConfirmId });
      toastSuccess('Cost removed');
      setDeleteConfirmId(null);
    } catch {
      toastError('Failed to remove cost');
    }
  }, [deleteConfirmId, removeCost]);

  // Loading state
  if (costsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="grid grid-cols-3 gap-6">
          <div>
            <div className="text-xs text-muted-foreground">PO Value</div>
            <div className="text-lg font-semibold tabular-nums">
              <FormatAmount amount={totalPOValue} currency={poCurrency} />
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Additional Costs</div>
            <div className="text-lg font-semibold tabular-nums">
              <FormatAmount amount={totalCosts} currency={orgCurrency} />
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Total Landed Cost</div>
            <div className="text-lg font-semibold tabular-nums text-primary">
              <FormatAmount
                amount={
                  allocationData?.summary?.totalLandedCost ??
                  (poCurrency === orgCurrency ? totalPOValue + totalCosts : null)
                }
                currency={orgCurrency}
              />
            </div>
          </div>
        </div>
        {!isReadOnly && (
          <Button onClick={handleOpenAdd} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Cost
          </Button>
        )}
      </div>

      {/* Costs Table */}
      {costs.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No additional costs recorded</p>
          {!isReadOnly && (
            <p className="text-xs mt-1">Add freight, duty, insurance, or other costs to track landed cost</p>
          )}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Allocation</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              {!isReadOnly && <TableHead className="w-[80px]" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {costs.map((cost) => (
              <TableRow key={cost.id}>
                <TableCell>
                  <Badge variant="outline">{COST_TYPE_LABELS[cost.costType] ?? cost.costType}</Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm">{cost.description || '---'}</div>
                  {cost.supplierInvoiceNumber && (
                    <div className="text-xs text-muted-foreground">
                      Invoice: {cost.supplierInvoiceNumber}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {ALLOCATION_METHOD_LABELS[cost.allocationMethod ?? 'equal']}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  <FormatAmount amount={Number(cost.amount ?? 0)} currency={cost.currency ?? orgCurrency} />
                </TableCell>
                {!isReadOnly && (
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => handleOpenEdit(cost)}
                        aria-label={`Edit ${COST_TYPE_LABELS[cost.costType] ?? cost.costType} cost`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive"
                        onClick={() => setDeleteConfirmId(cost.id)}
                        aria-label={`Delete ${COST_TYPE_LABELS[cost.costType] ?? cost.costType} cost`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Allocation Preview Toggle */}
      {costs.length > 0 && (
        <>
          <Separator />
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={() => setShowAllocation((prev) => !prev)}
            >
              {showAllocation ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              {showAllocation ? 'Hide' : 'Show'} Allocation Preview
            </Button>

            {showAllocation && (
              <div className="mt-4">
                {allocationLoading ? (
                  <Skeleton className="h-[150px] w-full" />
                ) : allocationData ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Allocated Costs</TableHead>
                        <TableHead className="text-right">Landed Unit Cost</TableHead>
                        <TableHead className="text-right">Landed Line Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allocationData.items.map((item) => (
                        <TableRow key={item.itemId}>
                          <TableCell className="font-medium">
                            {item.productId ? (
                              <Link
                                to="/products/$productId"
                                params={{ productId: item.productId }}
                                className="text-primary hover:underline"
                              >
                                {item.productName}
                              </Link>
                            ) : (
                              item.productName
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            <FormatAmount amount={item.unitPrice} currency={poCurrency} />
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-amber-600">
                            +<FormatAmount amount={item.allocatedPerUnit} currency={orgCurrency} />
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-medium">
                            <FormatAmount amount={item.landedUnitCost} currency={orgCurrency} />
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-medium">
                            <FormatAmount amount={item.landedLineTotal} currency={orgCurrency} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : null}
              </div>
            )}
          </div>
        </>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingCostId ? 'Edit Cost' : 'Add Cost'}</DialogTitle>
            <DialogDescription>
              {editingCostId
                ? 'Update the cost details below.'
                : 'Add an additional cost to this purchase order.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="costType">Cost Type</Label>
              <Select
                value={formData.costType}
                onValueChange={(v) => {
                  const parsed = poCostTypeSchema.safeParse(v);
                  if (parsed.success) {
                    setFormData((prev) => ({ ...prev, costType: parsed.data }));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(COST_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="allocationMethod">Allocation Method</Label>
              <Select
                value={formData.allocationMethod}
                onValueChange={(v) => {
                  const parsed = poAllocationMethodSchema.safeParse(v);
                  if (parsed.success) {
                    setFormData((prev) => ({ ...prev, allocationMethod: parsed.data }));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ALLOCATION_METHOD_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="e.g., Sea freight from Shanghai"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="invoiceNumber">Supplier Invoice #</Label>
              <Input
                id="invoiceNumber"
                value={formData.supplierInvoiceNumber}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, supplierInvoiceNumber: e.target.value }))
                }
                placeholder="Optional"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Optional notes"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={addCost.isPending || updateCost.isPending}
            >
              {addCost.isPending || updateCost.isPending
                ? 'Saving...'
                : editingCostId
                  ? 'Update'
                  : 'Add Cost'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Cost</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this cost? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={removeCost.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeCost.isPending ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
