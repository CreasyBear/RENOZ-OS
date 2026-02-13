/**
 * Project BOM Tab - Full Materials Management
 *
 * Complete Bill of Materials with:
 * - Product search and add
 * - Cost tracking (estimated vs actual)
 * - Quantity management (estimated → ordered → received → installed)
 * - Allocation to workstreams/site visits
 * - Status workflow
 *
 * @source src/components/domain/jobs/projects/project-bom-tab.tsx
 * @see docs/design-system/JOBS-DOMAIN-WORKFLOW.md
 */

import { useState, useMemo, useEffect, useRef, useCallback, startTransition } from 'react';
import { Link } from '@tanstack/react-router';
import {
  Package,
  Plus,
  Search,
  Trash2,
  Edit3,
  MoreHorizontal,
  DollarSign,
  Boxes,
  CheckCircle2,
  Circle,
  Truck,
  AlertCircle,
  Calculator,
  TrendingUp,
  Link as LinkIcon,
  Upload,
  RefreshCw,
  Loader2,
  ShoppingCart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from '@/lib/toast';
import { useOrgFormat } from '@/hooks/use-org-format';
import { useConfirmation } from '@/hooks';
// Hooks
import {
  useProjectBom,
  useCreateProjectBom,
  useAddBomItem,
  useUpdateBomItem,
  useRemoveBomItem,
  useRemoveBomItems,
  useUpdateBomItemsStatus,
  useImportBomFromCsv,
  useImportBomFromOrder,
} from '@/hooks/jobs';
import { useTableSelection, BulkActionsBar, CheckboxCell } from '@/components/shared/data-table';
import { useDebounce } from '@/hooks/_shared';
import { useProductSearch } from '@/hooks/products';
import { BomTabSkeleton } from './bom-tab-skeleton';

// Types
import {
  bomItemStatusSchema,
  type ProjectBom,
  type BomItemStatus,
  type BomItemWithProduct,
} from '@/lib/schemas/jobs';
import type { ProductSearchItem } from '@/lib/schemas/products';

// ============================================================================
// TYPES
// ============================================================================

interface ProjectBomTabProps {
  projectId: string;
  /** When set, enables "Import from Order" button */
  orderId?: string | null;
}

// ============================================================================
// STATUS CONFIG
// ============================================================================

const ITEM_STATUS_CONFIG: Record<BomItemStatus, {
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  description: string;
}> = {
  planned: {
    label: 'Planned',
    icon: Circle,
    color: 'text-gray-600',
    bg: 'bg-gray-100',
    description: 'Item estimated but not yet ordered',
  },
  ordered: {
    label: 'Ordered',
    icon: Truck,
    color: 'text-blue-600',
    bg: 'bg-blue-100',
    description: 'Purchase order placed',
  },
  received: {
    label: 'Received',
    icon: Boxes,
    color: 'text-purple-600',
    bg: 'bg-purple-100',
    description: 'Item in warehouse/yard',
  },
  allocated: {
    label: 'Allocated',
    icon: LinkIcon,
    color: 'text-amber-600',
    bg: 'bg-amber-100',
    description: 'Reserved for this project',
  },
  installed: {
    label: 'Installed',
    icon: CheckCircle2,
    color: 'text-green-600',
    bg: 'bg-green-100',
    description: 'Installed on site',
  },
};

const BOM_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'Draft', color: 'text-gray-600', bg: 'bg-gray-100' },
  approved: { label: 'Approved', color: 'text-blue-600', bg: 'bg-blue-100' },
  ordered: { label: 'Ordered', color: 'text-purple-600', bg: 'bg-purple-100' },
  partial: { label: 'Partial', color: 'text-amber-600', bg: 'bg-amber-100' },
  complete: { label: 'Complete', color: 'text-green-600', bg: 'bg-green-100' },
  cancelled: { label: 'Cancelled', color: 'text-red-600', bg: 'bg-red-100' },
};

// ============================================================================
// ADD ITEM DIALOG
// ============================================================================

function AddBomItemDialog({
  open,
  onOpenChange,
  projectId,
  bomId,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  bomId: string;
  onSuccess?: () => void;
}) {
  const { formatCurrency } = useOrgFormat();
  const formatCurrencyDisplay = (value: number) =>
    formatCurrency(value, { cents: false, showCents: true });
  const [searchQuery, setSearchQuery] = useState('');
  // Use looser type to handle DB type variations (e.g., dimensions can be null in DB but not in schema)
  const [selectedProduct, setSelectedProduct] = useState<ProductSearchItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [unitCost, setUnitCost] = useState<number | undefined>();
  const [notes, setNotes] = useState('');

  const debouncedQuery = useDebounce(searchQuery, 300);
  const { data: searchResults, isFetching: isSearching } = useProductSearch(
    debouncedQuery,
    { limit: 20 },
    debouncedQuery.length >= 2
  );

  const addItem = useAddBomItem(projectId);
  const products = searchResults?.products || [];

  const handleSelectProduct = (product: ProductSearchItem) => {
    setSelectedProduct(product);
    setUnitCost(product.basePrice || undefined);
    setSearchQuery('');
  };

  const handleSubmit = async () => {
    if (!selectedProduct) return;

    try {
      await addItem.mutateAsync({
        data: {
          bomId,
          productId: selectedProduct.id,
          quantity,
          unitCost,
          notes: notes || undefined,
        }
      });

      toast.success(`${selectedProduct.name} added to BOM`);
      onOpenChange(false);
      resetForm();
      onSuccess?.();
    } catch {
      toast.error('Failed to add item');
    }
  };

  const resetForm = () => {
    setSelectedProduct(null);
    setQuantity(1);
    setUnitCost(undefined);
    setNotes('');
    setSearchQuery('');
  };

  const totalCost = selectedProduct && unitCost
    ? quantity * unitCost
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Material to BOM
          </DialogTitle>
          <DialogDescription>
            Search products and add to your bill of materials
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4 py-4">
          {/* Product Search */}
          {!selectedProduct ? (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products by name or SKU..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>

              {isSearching && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                  Searching...
                </div>
              )}

              {products.length > 0 && (
                <ScrollArea className="h-64 border rounded-md">
                  <div className="p-2 space-y-1">
                    {products.map((product) => (
                      <button
                        key={product.id}
                        className="w-full flex items-center gap-3 p-3 hover:bg-muted rounded-md text-left transition-colors"
                        onClick={() => handleSelectProduct(product)}
                      >
                        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            SKU: {product.sku || 'N/A'}
                          </p>
                        </div>
                        {product.basePrice && (
                          <span className="text-sm font-medium">
                            {formatCurrencyDisplay(product.basePrice)}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}

              {debouncedQuery.length >= 2 && !isSearching && products.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="mx-auto h-10 w-10 mb-2 opacity-50" />
                  <p>No products found</p>
                  <p className="text-sm">Try a different search term</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Selected Product */}
              <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/30">
                <div className="h-12 w-12 rounded bg-primary/10 flex items-center justify-center">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{selectedProduct.name}</p>
                  <p className="text-sm text-muted-foreground">
                    SKU: {selectedProduct.sku || 'N/A'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedProduct(null)}
                >
                  Change
                </Button>
              </div>

              {/* Quantity & Cost */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Quantity *</label>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Unit Cost</label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="0.00"
                    value={unitCost || ''}
                    onChange={(e) => setUnitCost(e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </div>
              </div>

              {/* Total Cost Preview */}
              {totalCost > 0 && (
                <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg">
                  <span className="text-sm text-muted-foreground">Total Line Cost</span>
                  <span className="text-lg font-semibold">{formatCurrencyDisplay(totalCost)}</span>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Notes</label>
                <Input
                  placeholder="Specifications, vendor info, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedProduct || addItem.isPending}
          >
            {addItem.isPending
              ? 'Adding...'
              : `Add Item${totalCost > 0 ? ` (${formatCurrencyDisplay(totalCost)})` : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// EDIT ITEM DIALOG
// ============================================================================

function EditBomItemDialog({
  open,
  onOpenChange,
  projectId,
  item,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  item: BomItemWithProduct | null;
  onSuccess?: () => void;
}) {
  const { formatCurrency } = useOrgFormat();
  const formatCurrencyDisplay = (value: number) =>
    formatCurrency(value, { cents: false, showCents: true });
  const [quantity, setQuantity] = useState(1);
  const [unitCost, setUnitCost] = useState<number | undefined>();
  const [status, setStatus] = useState<BomItemStatus>('planned');
  const [notes, setNotes] = useState('');

  const updateItem = useUpdateBomItem(projectId);

  // Reset form when item changes
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
    } catch {
      toast.error('Failed to update item');
    }
  };

  if (!item) return null;

  const totalCost = unitCost ? quantity * unitCost : 0;
  const productName = item.product?.name || 'Unknown Product';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            Edit Material
          </DialogTitle>
          <DialogDescription>{productName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Status */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select
              value={status}
              onValueChange={(v) => {
                const parsed = bomItemStatusSchema.safeParse(v);
                if (parsed.success) setStatus(parsed.data);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ITEM_STATUS_CONFIG).map(([value, config]) => (
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
              {ITEM_STATUS_CONFIG[status].description}
            </p>
          </div>

          {/* Quantity & Cost */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Quantity</label>
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Unit Cost</label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={unitCost || ''}
                onChange={(e) => setUnitCost(e.target.value ? parseFloat(e.target.value) : undefined)}
              />
            </div>
          </div>

          {/* Total */}
          {totalCost > 0 && (
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="font-semibold">{formatCurrencyDisplay(totalCost)}</span>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Notes</label>
            <Input
              placeholder="Specifications, vendor info, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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

// ============================================================================
// BOM SUMMARY CARDS
// ============================================================================

function BomSummaryCards({
  items,
  bom
}: {
  items: BomItemWithProduct[];
  bom: ProjectBom;
}) {
  const { formatCurrency } = useOrgFormat();
  const formatCurrencyDisplay = (value: number) =>
    formatCurrency(value, { cents: false, showCents: true });
  const stats = useMemo(() => {
    const totalItems = items.length;
    const totalEstimatedCost = items.reduce((sum, item) => {
      const qty = Number(item.quantityEstimated) || 0;
      const cost = Number(item.unitCostEstimated) || 0;
      return sum + (qty * cost);
    }, 0);

    const byStatus = items.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});

    const installedCount = byStatus['installed'] || 0;
    const progress = totalItems > 0 ? (installedCount / totalItems) * 100 : 0;

    return {
      totalItems,
      totalEstimatedCost,
      byStatus,
      progress,
      installedCount,
    };
  }, [items]);

  const bomStatus = BOM_STATUS_CONFIG[bom.status] || BOM_STATUS_CONFIG.draft;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* BOM Status */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <div className={cn('p-2 rounded-lg', bomStatus.bg)}>
              <Package className={cn('h-4 w-4', bomStatus.color)} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">BOM Status</p>
              <p className={cn('font-semibold', bomStatus.color)}>{bomStatus.label}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Items */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-100">
              <Boxes className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Items</p>
              <p className="font-semibold">{stats.totalItems}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estimated Cost */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-green-100">
              <DollarSign className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Estimated Cost</p>
              <p className="font-semibold">{formatCurrencyDisplay(stats.totalEstimatedCost)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-purple-100">
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Progress</p>
                <p className="font-semibold">{Math.round(stats.progress)}%</p>
              </div>
            </div>
          </div>
          <Progress value={stats.progress} className="h-1.5" />
          <p className="text-xs text-muted-foreground mt-1">
            {stats.installedCount} of {stats.totalItems} installed
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// BOM ITEMS TABLE
// ============================================================================

function BomItemsTable({
  items,
  onEdit,
  onDelete,
  selection,
}: {
  items: BomItemWithProduct[];
  onEdit: (item: BomItemWithProduct) => void;
  onDelete: (item: BomItemWithProduct) => void;
  selection?: {
    isSelected: (id: string) => boolean;
    handleSelect: (id: string, checked: boolean) => void;
    handleSelectAll: (checked: boolean) => void;
    handleShiftClickRange: (startIdx: number, endIdx: number) => void;
    setLastClickedIndex: (index: number | null) => void;
    lastClickedIndex: number | null;
    isAllSelected: boolean;
    isPartiallySelected: boolean;
  };
}) {
  const { formatCurrency } = useOrgFormat();
  const formatCurrencyDisplay = (value: number) =>
    formatCurrency(value, { cents: false, showCents: true });
  if (items.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg bg-muted/30">
        <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-medium">No materials yet</h3>
        <p className="text-muted-foreground mt-1">
          Add products to estimate materials for this project
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            {selection && (
              <TableHead className="w-[50px]">
                <CheckboxCell
                  checked={selection.isAllSelected}
                  onChange={(checked) => selection.handleSelectAll(checked)}
                  indeterminate={selection.isPartiallySelected}
                  ariaLabel={selection.isAllSelected ? 'Deselect all' : 'Select all'}
                />
              </TableHead>
            )}
            <TableHead>Product</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Unit Cost</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, rowIndex) => {
            const product = item.product;
            const statusConfig = ITEM_STATUS_CONFIG[item.status];
            const qty = Number(item.quantityEstimated) || 0;
            const unitCost = Number(item.unitCostEstimated) || 0;
            const total = qty * unitCost;
            const StatusIcon = statusConfig.icon;

            const handleRowClick = (e: React.MouseEvent) => {
              if (!selection) return;
              if (e.shiftKey && selection.lastClickedIndex !== null) {
                selection.handleShiftClickRange(selection.lastClickedIndex, rowIndex);
              } else {
                selection.handleSelect(item.id, !selection.isSelected(item.id));
              }
              selection.setLastClickedIndex(rowIndex);
            };

            return (
              <TableRow
                key={item.id}
                className={cn('group', selection?.isSelected(item.id) && 'bg-muted/50')}
                onClick={selection ? handleRowClick : undefined}
              >
                {selection && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <CheckboxCell
                      checked={selection.isSelected(item.id)}
                      onChange={(checked) => {
                        selection.handleSelect(item.id, checked);
                        selection.setLastClickedIndex(rowIndex);
                      }}
                      onShiftClick={() => {
                        if (selection.lastClickedIndex !== null) {
                          selection.handleShiftClickRange(selection.lastClickedIndex, rowIndex);
                        }
                        selection.setLastClickedIndex(rowIndex);
                      }}
                      ariaLabel={`Select ${product?.name || 'item'}`}
                    />
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      {product?.id ? (
                        <Link
                          to="/products/$productId"
                          params={{ productId: product.id }}
                          className="font-medium hover:underline"
                        >
                          {product.name || 'Unknown Product'}
                        </Link>
                      ) : (
                        <p className="font-medium">{product?.name || 'Unknown Product'}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        SKU: {product?.sku || 'N/A'}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={cn(statusConfig.bg, statusConfig.color, 'border-0')}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {statusConfig.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono">{qty}</TableCell>
                <TableCell className="text-right font-mono">
                  {unitCost > 0 ? formatCurrencyDisplay(unitCost) : '-'}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {total > 0 ? formatCurrencyDisplay(total) : '-'}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(item)}>
                        <Edit3 className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => onDelete(item)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ProjectBomTab({ projectId, orderId }: ProjectBomTabProps) {
  const { data: bomData, isLoading } = useProjectBom({ projectId });
  const createBom = useCreateProjectBom(projectId);
  const removeItem = useRemoveBomItem(projectId);
  const removeItems = useRemoveBomItems(projectId);
  const updateItemsStatus = useUpdateBomItemsStatus(projectId);
  const importCsv = useImportBomFromCsv(projectId);
  const importFromOrder = useImportBomFromOrder(projectId);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const confirm = useConfirmation();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BomItemWithProduct | null>(null);
  const [bulkStatusDialogOpen, setBulkStatusDialogOpen] = useState(false);

  const bom = bomData?.data?.bom ?? undefined;
  const items: BomItemWithProduct[] = bomData?.data?.items ?? [];

  const {
    selectedItems,
    isAllSelected,
    isPartiallySelected,
    handleSelect,
    handleSelectAll,
    handleShiftClickRange,
    lastClickedIndex,
    setLastClickedIndex,
    clearSelection,
    isSelected,
  } = useTableSelection({ items });

  const handleCreateBom = async () => {
    try {
      await createBom.mutateAsync('Bill of Materials');
      toast.success('BOM created');
    } catch {
      toast.error('Failed to create BOM');
    }
  };

  const handleEditItem = (item: BomItemWithProduct) => {
    setEditingItem(item);
    setEditDialogOpen(true);
  };

  const handleDeleteItem = async (item: BomItemWithProduct) => {
    const { confirmed } = await confirm.confirm({
      title: 'Remove from BOM',
      description: `Remove "${item.product?.name || 'this item'}" from the Bill of Materials?`,
      confirmLabel: 'Remove',
      variant: 'destructive',
    });
    if (confirmed) {
      try {
        await removeItem.mutateAsync({ data: { itemId: item.id } });
        toast.success('Item removed');
      } catch {
        toast.error('Failed to remove item');
      }
    }
  };

  const handleBulkRemove = useCallback(async () => {
    const count = selectedItems.length;
    const { confirmed } = await confirm.confirm({
      title: 'Remove from BOM',
      description: `Remove ${count} item${count > 1 ? 's' : ''} from the Bill of Materials? This cannot be undone.`,
      confirmLabel: 'Remove',
      variant: 'destructive',
    });
    if (!confirmed) return;
    try {
      await removeItems.mutateAsync({
        data: { itemIds: selectedItems.map((i) => i.id) },
      });
      toast.success(`Removed ${count} item${count > 1 ? 's' : ''}`);
      clearSelection();
    } catch {
      toast.error('Failed to remove items');
    }
  }, [selectedItems, confirm, removeItems, clearSelection]);

  const handleBulkStatusOpen = useCallback(() => {
    setBulkStatusDialogOpen(true);
  }, []);

  const handleBulkStatusComplete = useCallback(() => {
    clearSelection();
    setBulkStatusDialogOpen(false);
  }, [clearSelection]);

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      const text = await file.text();
      const result = await importCsv.mutateAsync(text);
      const msg =
        result.added > 0
          ? `Imported ${result.added} item(s)`
          : 'No items imported';
      if (result.errors.length > 0) {
        toast.warning(`${msg}. ${result.errors.length} row(s) skipped.`);
      } else {
        toast.success(msg);
      }
    } catch {
      toast.error('Failed to import CSV');
    }
  };

  const handleImportFromOrder = async () => {
    if (!orderId) return;
    try {
      const result = await importFromOrder.mutateAsync();
      const msg =
        result.added > 0
          ? `Imported ${result.added} item(s) from order`
          : 'No items imported';
      if (result.errors.length > 0) {
        toast.warning(`${msg}. ${result.errors.length} row(s) skipped.`);
      } else {
        toast.success(msg);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to import from order';
      toast.error(message);
    }
  };

  if (isLoading) {
    return <BomTabSkeleton />;
  }

  // No BOM yet - create prompt
  if (!bom) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium">Bill of Materials</h3>
            <p className="text-sm text-muted-foreground">
              Track materials, costs, and installation progress
            </p>
          </div>
        </div>

        <Card className="p-12 text-center">
          <div className="p-4 bg-muted rounded-full w-fit mx-auto mb-4">
            <Calculator className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No BOM yet</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Create a Bill of Materials to estimate costs, track materials through procurement,
            and monitor installation progress. Or import from CSV (sku,quantity[,unitCost]).
          </p>
          <div className="flex items-center justify-center gap-2">
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleCsvImport}
            />
            <Button
              variant="outline"
              onClick={() => csvInputRef.current?.click()}
              disabled={importCsv.isPending}
            >
              <Upload className="mr-2 h-4 w-4" />
              {importCsv.isPending ? 'Importing...' : 'Import CSV'}
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      variant="outline"
                      onClick={handleImportFromOrder}
                      disabled={!orderId || importFromOrder.isPending}
                    >
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      {importFromOrder.isPending ? 'Importing...' : 'Import from Order'}
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {orderId
                    ? 'Import line items from the linked order'
                    : 'Link an order to this project first'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button onClick={handleCreateBom} disabled={createBom.isPending}>
              <Plus className="mr-2 h-4 w-4" />
              {createBom.isPending ? 'Creating...' : 'Create BOM'}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!bom) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-medium">Bill of Materials</h3>
            <Badge variant="outline">{bom.bomNumber}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {items.length} items • Track materials from estimate to installation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleCsvImport}
          />
          <Button
            variant="outline"
            onClick={() => csvInputRef.current?.click()}
            disabled={importCsv.isPending}
          >
            <Upload className="mr-2 h-4 w-4" />
            {importCsv.isPending ? 'Importing...' : 'Import CSV'}
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    variant="outline"
                    onClick={handleImportFromOrder}
                    disabled={!orderId || importFromOrder.isPending}
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    {importFromOrder.isPending ? 'Importing...' : 'Import from Order'}
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {orderId
                  ? 'Import line items from the linked order'
                  : 'Link an order to this project first'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Material
          </Button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      <BulkActionsBar selectedCount={selectedItems.length} onClear={clearSelection}>
        <Button
          size="sm"
          variant="destructive"
          onClick={handleBulkRemove}
          disabled={removeItems.isPending}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Remove
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleBulkStatusOpen}
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Update status
        </Button>
      </BulkActionsBar>

      {/* Summary Cards */}
      <BomSummaryCards items={items} bom={bom} />

      {/* Items Table */}
      <BomItemsTable
        items={items}
        onEdit={handleEditItem}
        onDelete={handleDeleteItem}
        selection={{
          isSelected,
          handleSelect,
          handleSelectAll,
          handleShiftClickRange,
          setLastClickedIndex,
          lastClickedIndex,
          isAllSelected,
          isPartiallySelected,
        }}
      />

      {/* Allocation Note */}
      {items.length > 0 && (
        <div className="flex items-start gap-2 p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <p>
            Materials can be allocated to specific workstreams or site visits.
            Edit an item to set its status and track progress from planned → ordered → received → installed.
          </p>
        </div>
      )}

      {/* Dialogs */}
      <AddBomItemDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        projectId={projectId}
        bomId={bom.id}
      />

      <EditBomItemDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        projectId={projectId}
        item={editingItem}
      />

      <BulkStatusDialog
        open={bulkStatusDialogOpen}
        onOpenChange={setBulkStatusDialogOpen}
        items={selectedItems}
        onComplete={handleBulkStatusComplete}
        onUpdateStatus={updateItemsStatus}
      />
    </div>
  );
}

// ============================================================================
// BULK STATUS DIALOG
// ============================================================================

function BulkStatusDialog({
  open,
  onOpenChange,
  items,
  onComplete,
  onUpdateStatus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: BomItemWithProduct[];
  onComplete: () => void;
  onUpdateStatus: ReturnType<typeof useUpdateBomItemsStatus>;
}) {
  const [newStatus, setNewStatus] = useState<BomItemStatus>('planned');

  const handleConfirm = async () => {
    try {
      await onUpdateStatus.mutateAsync({
        data: { itemIds: items.map((i) => i.id), status: newStatus },
      });
      toast.success(`Updated ${items.length} item${items.length > 1 ? 's' : ''} to ${ITEM_STATUS_CONFIG[newStatus].label}`);
      onComplete();
    } catch {
      toast.error('Failed to update status');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
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
              onValueChange={(v) => {
                const parsed = bomItemStatusSchema.safeParse(v);
                if (parsed.success) setNewStatus(parsed.data);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ITEM_STATUS_CONFIG).map(([value, config]) => (
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
