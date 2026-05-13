import type { MouseEvent } from 'react';
import { Link } from '@tanstack/react-router';
import { Edit3, MoreHorizontal, Package, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CheckboxCell } from '@/components/shared/data-table';
import { useOrgFormat } from '@/hooks/use-org-format';
import { cn } from '@/lib/utils';
import type { BomItemWithProduct } from '@/lib/schemas/jobs';
import { PROJECT_BOM_ITEM_STATUS_CONFIG } from './project-bom-status-config';

export interface ProjectBomItemsTableSelection {
  isSelected: (id: string) => boolean;
  handleSelect: (id: string, checked: boolean) => void;
  handleSelectAll: (checked: boolean) => void;
  handleShiftClickRange: (startIdx: number, endIdx: number) => void;
  setLastClickedIndex: (index: number | null) => void;
  lastClickedIndex: number | null;
  isAllSelected: boolean;
  isPartiallySelected: boolean;
}

export interface ProjectBomItemsTableProps {
  items: BomItemWithProduct[];
  onEdit: (item: BomItemWithProduct) => void;
  onDelete: (item: BomItemWithProduct) => void;
  selection?: ProjectBomItemsTableSelection;
}

export function ProjectBomItemsTable({
  items,
  onEdit,
  onDelete,
  selection,
}: ProjectBomItemsTableProps) {
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
            const statusConfig = PROJECT_BOM_ITEM_STATUS_CONFIG[item.status];
            const qty = Number(item.quantityEstimated) || 0;
            const unitCost = Number(item.unitCostEstimated) || 0;
            const total = qty * unitCost;
            const StatusIcon = statusConfig.icon;

            const handleRowClick = (event: MouseEvent) => {
              if (!selection) return;
              if (event.shiftKey && selection.lastClickedIndex !== null) {
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
                  <TableCell onClick={(event) => event.stopPropagation()}>
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
