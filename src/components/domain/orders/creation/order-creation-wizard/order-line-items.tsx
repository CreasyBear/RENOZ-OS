/**
 * OrderLineItems Component
 *
 * Enhanced line items management for order forms.
 * Uses useFieldArray for dynamic CRUD operations with real-time calculations.
 *
 * Features:
 * - Dynamic line item addition/removal/editing
 * - Real-time subtotal calculations per line item
 * - Product autocomplete integration
 * - Drag-and-drop reordering (future enhancement)
 * - Inline editing capabilities
 * - GST calculation display
 *
 * @see renoz-v3/_reference/.midday-reference/apps/dashboard/src/components/invoice/line-items.tsx
 */

'use client';

import React, { useCallback, useMemo } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { Plus, Trash2, GripVertical, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useOrgFormat } from '@/hooks/use-org-format';
import { calculateLineItemTotal } from '@/lib/order-calculations';
import { useOrderForm, useOrderFormLineItems } from './order-form-context';
import type { TaxType } from '@/lib/schemas/products';

// ============================================================================
// TYPES
// ============================================================================

/** Line item shape for display purposes */
interface LineItemData {
  productId?: string;
  sku?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  discountAmount?: number;
  taxType: 'gst' | 'export' | 'exempt';
  notes?: string;
  isNew?: boolean;
  tempId?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TAX_TYPE_OPTIONS = [
  { value: 'gst', label: 'GST (10%)', description: 'Standard Australian GST' },
  { value: 'export', label: 'Export', description: 'Zero-rated for export' },
  { value: 'exempt', label: 'Exempt', description: 'GST exempt item' },
] as const;

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Individual line item row component
 */
const LineItemRow = React.memo(function LineItemRow({
  index,
  item,
  onEdit,
  onDelete,
  onKeyDown,
  isEditing,
}: {
  index: number;
  item: LineItemData;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
  onKeyDown: (event: React.KeyboardEvent, index: number) => void;
  isEditing: boolean;
}) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext();
  const { template } = useOrderForm();
  const { formatCurrency } = useOrgFormat();

  // Watch fields for real-time calculation
  const quantity = watch(`lineItems.${index}.quantity`);
  const unitPrice = watch(`lineItems.${index}.unitPrice`);
  const discountPercent = watch(`lineItems.${index}.discountPercent`);
  const discountAmount = watch(`lineItems.${index}.discountAmount`);

  // Calculate real-time totals
  const calculation = useMemo(() => {
    return calculateLineItemTotal({
      price: unitPrice || 0,
      quantity: quantity || 0,
      discountPercent: discountPercent || 0,
      discountAmount: discountAmount || 0,
    });
  }, [quantity, unitPrice, discountPercent, discountAmount]);

  // Format currency
  const formatCurrencyDisplay = (amount: number) =>
    formatCurrency(amount, { cents: false, showCents: true });

  const lineItemErrors = errors.lineItems && Array.isArray(errors.lineItems) ? errors.lineItems[index] : undefined;

  return (
    <TableRow
      className={cn(
        'group hover:bg-muted/50 focus-within:bg-muted/30',
        lineItemErrors && 'border-destructive/50'
      )}
      tabIndex={0}
      role="row"
      onKeyDown={(e) => onKeyDown(e, index)}
      aria-label={`Line item ${index + 1}: ${item.description}`}
    >
      {/* Drag Handle */}
      <TableCell className="w-8 p-2">
        <div className="cursor-grab opacity-0 transition-opacity group-hover:opacity-100">
          <GripVertical className="text-muted-foreground h-4 w-4" />
        </div>
      </TableCell>

      {/* Line Number */}
      <TableCell className="text-muted-foreground w-12 text-center text-sm font-medium">
        {String(index + 1).padStart(2, '0')}
      </TableCell>

      {/* Description */}
      <TableCell className="min-w-[200px]">
        {isEditing ? (
          <Input
            {...register(`lineItems.${index}.description`)}
            placeholder="Item description"
            className="h-8 text-base" // Added text-base for mobile font size ≥16px
          />
        ) : (
          <div className="font-medium">{item.description}</div>
        )}
        {item.sku && <div className="text-muted-foreground text-xs">SKU: {item.sku}</div>}
      </TableCell>

      {/* Quantity */}
      <TableCell className="w-24">
        {isEditing ? (
          <Input
            {...register(`lineItems.${index}.quantity`, { valueAsNumber: true })}
            type="number"
            min="0.01"
            step="0.01"
            placeholder="0"
            className="h-8 w-16 text-center text-base"
            inputMode="decimal"
          />
        ) : (
          <span className="font-mono">{quantity || 0}</span>
        )}
      </TableCell>

      {/* Unit Price */}
      <TableCell className="w-32">
        {isEditing ? (
          <Input
            {...register(`lineItems.${index}.unitPrice`, { valueAsNumber: true })}
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            className="h-8 w-20 text-right font-mono text-base"
            inputMode="decimal"
          />
        ) : (
          <span className="font-mono">{formatCurrencyDisplay(unitPrice || 0)}</span>
        )}
      </TableCell>

      {/* Discount Percent */}
      {template.includeDiscounts && (
        <TableCell className="w-24">
          {isEditing ? (
            <Input
              {...register(`lineItems.${index}.discountPercent`, { valueAsNumber: true })}
              type="number"
              min="0"
              max="100"
              step="0.01"
              placeholder="0"
              className="h-8 w-16 text-center text-base"
              inputMode="decimal"
            />
          ) : (
            <span className="text-muted-foreground">{discountPercent || 0}%</span>
          )}
        </TableCell>
      )}

      {/* Discount Amount */}
      {template.includeDiscounts && (
        <TableCell className="w-32">
          {isEditing ? (
            <Input
              {...register(`lineItems.${index}.discountAmount`, { valueAsNumber: true })}
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              className="h-8 w-20 text-right font-mono text-base"
              inputMode="decimal"
            />
          ) : (
            <span className="text-muted-foreground font-mono">
              {formatCurrencyDisplay(discountAmount || 0)}
            </span>
          )}
        </TableCell>
      )}

      {/* Tax Type */}
      <TableCell className="w-32">
        {isEditing ? (
          <Select
            value={item.taxType}
            onValueChange={(value) => setValue(`lineItems.${index}.taxType`, value as TaxType)}
          >
            <SelectTrigger className="h-8 w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TAX_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex flex-col">
                    <span className="text-sm">{option.label}</span>
                    <span className="text-muted-foreground text-xs">{option.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Badge variant="outline" className="text-xs">
            {TAX_TYPE_OPTIONS.find((opt) => opt.value === item.taxType)?.label || item.taxType}
          </Badge>
        )}
      </TableCell>

      {/* Line Total */}
      <TableCell className="w-32 text-right font-mono font-medium">
        {formatCurrencyDisplay(calculation.total)}
      </TableCell>

      {/* Actions */}
      <TableCell className="w-20 text-right">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9" // Increased from h-7 w-7 for touch targets
            onClick={() => onEdit(index)}
            aria-label={isEditing ? 'Save changes to this line item' : 'Edit this line item'}
          >
            <Edit3 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive h-9 w-9"
            onClick={() => onDelete(index)}
            aria-label="Remove this line item"
            disabled={isEditing} // Prevent deletion while editing
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export interface OrderLineItemsProps {
  className?: string;
}

export const OrderLineItems = React.memo(function OrderLineItems({
  className,
}: OrderLineItemsProps) {
  const { control, watch } = useFormContext();
  const { template } = useOrderForm();
  const { formatCurrency } = useOrgFormat();
  const formatCurrencyDisplay = (amount: number) =>
    formatCurrency(amount, { cents: false, showCents: true });
  const { addLineItem, removeLineItem } = useOrderFormLineItems();

  // Use field array for dynamic line items
  const { fields } = useFieldArray({
    control,
    name: 'lineItems',
  });

  // Watch line items for calculations (memoized for stable deps)
  const rawLineItems = watch('lineItems');
  const lineItems = useMemo(() => rawLineItems || [], [rawLineItems]);
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);

  // Keyboard navigation support
  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent, index: number) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setEditingIndex(editingIndex === index ? null : index);
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        if (fields.length > 1) {
          event.preventDefault();
          removeLineItem(index);
        }
      }
    },
    [editingIndex, fields.length, removeLineItem]
  );

  // Calculate totals
  const totals = useMemo(() => {
    return lineItems.reduce(
      (acc: { subtotal: number; discountAmount: number; total: number }, item: typeof lineItems[number]) => {
        if (!item) return acc;
        const calc = calculateLineItemTotal({
          price: item.unitPrice || 0,
          quantity: item.quantity || 0,
          discountPercent: item.discountPercent || 0,
          discountAmount: item.discountAmount || 0,
        });
        return {
          subtotal: acc.subtotal + calc.subtotal,
          discountAmount: acc.discountAmount + calc.discountAmount,
          total: acc.total + calc.total,
        };
      },
      { subtotal: 0, discountAmount: 0, total: 0 }
    );
  }, [lineItems]);

  // Handlers
  const handleAddLineItem = useCallback(() => {
    addLineItem({
      description: '',
      quantity: 1,
      unitPrice: 0,
      taxType: 'gst' as const,
      isNew: true,
      tempId: `temp-${Date.now()}`,
    });
  }, [addLineItem]);

  const handleRemoveLineItem = useCallback(
    (index: number) => {
      if (fields.length > 1) {
        removeLineItem(index);
      }
    },
    [fields.length, removeLineItem]
  );

  const handleEditLineItem = useCallback(
    (index: number) => {
      setEditingIndex(editingIndex === index ? null : index);
    },
    [editingIndex]
  );

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Line Items</h3>
          <p className="text-muted-foreground text-sm">Add products and services to your order</p>
        </div>
        <Button onClick={handleAddLineItem} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Item
        </Button>
      </div>

      {/* Line Items Table */}
      <div className="focus-within:ring-primary/20 overflow-hidden rounded-lg border focus-within:ring-2">
        <Table role="table" aria-label="Order line items">
          <TableHeader>
            <TableRow role="row">
              <TableHead className="w-8" scope="col" aria-label="Row controls"></TableHead>
              <TableHead className="w-12" scope="col">
                #
              </TableHead>
              <TableHead scope="col">Description</TableHead>
              <TableHead className="w-24" scope="col">
                Qty
              </TableHead>
              <TableHead className="w-32" scope="col">
                Unit Price
              </TableHead>
              {template.includeDiscounts && (
                <>
                  <TableHead className="w-24" scope="col">
                    Disc %
                  </TableHead>
                  <TableHead className="w-32" scope="col">
                    Disc $
                  </TableHead>
                </>
              )}
              <TableHead className="w-32" scope="col">
                Tax Type
              </TableHead>
              <TableHead className="w-32 text-right" scope="col">
                Total
              </TableHead>
              <TableHead className="w-20" scope="col" aria-label="Actions"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={template.includeDiscounts ? 10 : 8}
                  className="py-8 text-center"
                >
                  <div className="text-muted-foreground">
                    <p className="text-sm">No line items added yet.</p>
                    <p className="mt-1 text-xs">Click &quot;Add Item&quot; to get started.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              fields.map((field, index) => {
                const item = lineItems[index];
                if (!item) return null;

                return (
                  <LineItemRow
                    key={field.id}
                    index={index}
                    item={item}
                    onEdit={handleEditLineItem}
                    onDelete={handleRemoveLineItem}
                    onKeyDown={handleKeyDown}
                    isEditing={editingIndex === index}
                  />
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Summary */}
      {fields.length > 0 && (
        <div className="flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span className="font-mono">{formatCurrencyDisplay(totals.subtotal)}</span>
            </div>
            {template.includeDiscounts && totals.discountAmount > 0 && (
              <div className="text-muted-foreground flex justify-between text-sm">
                <span>Discount:</span>
                <span className="font-mono">-{formatCurrencyDisplay(totals.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 text-sm font-medium">
              <span>Total (excl. GST):</span>
              <span className="font-mono">
                {formatCurrencyDisplay(totals.subtotal - totals.discountAmount)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Minimum items validation */}
      {fields.length === 0 && (
        <div className="text-destructive text-sm">At least one line item is required.</div>
      )}
    </div>
  );
});
