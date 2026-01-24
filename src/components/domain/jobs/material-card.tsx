/**
 * Material Card
 *
 * Individual material card/row component for job BOM display.
 * Shows product info, quantities, progress, and cost with inline editing.
 * Responsive: Card layout on mobile, table row on desktop.
 *
 * @see _Initiation/_prd/2-domains/jobs/jobs.prd.json - DOM-JOBS-002c
 */

import * as React from 'react';
import { MoreVertical, Pencil, Trash2, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { MaterialResponse } from '@/lib/schemas';

// ============================================================================
// TYPES
// ============================================================================

export interface MaterialCardProps {
  material: MaterialResponse;
  /** Called when quantity used is updated */
  onUpdateQuantityUsed?: (materialId: string, quantityUsed: number) => void;
  /** Called when edit is clicked */
  onEdit?: (material: MaterialResponse) => void;
  /** Called when delete is clicked */
  onDelete?: (materialId: string) => void;
  /** Disabled state (e.g., during mutation) */
  disabled?: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Format currency value
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format quantity with appropriate precision
 */
function formatQuantity(value: number): string {
  return value % 1 === 0 ? value.toString() : value.toFixed(2);
}

/**
 * Calculate progress percentage
 */
function calculateProgress(used: number, required: number): number {
  if (required === 0) return 0;
  return Math.min(Math.round((used / required) * 100), 100);
}

// ============================================================================
// COMPONENT
// ============================================================================

export function MaterialCard({
  material,
  onUpdateQuantityUsed,
  onEdit,
  onDelete,
  disabled = false,
}: MaterialCardProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(material.quantityUsed.toString());
  const [pendingQuantityUsed, setPendingQuantityUsed] = React.useState(material.quantityUsed);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const progress = calculateProgress(material.quantityUsed, material.quantityRequired);
  const totalCost = material.quantityUsed * material.unitCost;
  const pendingProgress = calculateProgress(pendingQuantityUsed, material.quantityRequired);
  const pendingTotalCost = pendingQuantityUsed * material.unitCost;

  // Focus input when editing starts
  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  React.useEffect(() => {
    setPendingQuantityUsed(material.quantityUsed);
  }, [material.id, material.quantityUsed]);

  const step = 0.01;

  const handleDecrement = () => {
    if (disabled) return;
    setPendingQuantityUsed((current) => {
      const next = Math.max(0, Number((current - step).toFixed(2)));
      onUpdateQuantityUsed?.(material.id, next);
      return next;
    });
  };

  const handleIncrement = () => {
    if (disabled) return;
    setPendingQuantityUsed((current) => {
      const next = Number((current + step).toFixed(2));
      onUpdateQuantityUsed?.(material.id, next);
      return next;
    });
  };

  const handleStartEdit = () => {
    setEditValue(material.quantityUsed.toString());
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    const newValue = parseFloat(editValue);
    if (!isNaN(newValue) && newValue >= 0) {
      onUpdateQuantityUsed?.(material.id, newValue);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditValue(material.quantityUsed.toString());
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  // Desktop table row
  const desktopRow = (
    <div
      className={cn(
        'hover:bg-muted/50 hidden items-center gap-4 border-b p-4 transition-colors md:flex',
        disabled && 'pointer-events-none opacity-50'
      )}
      role="row"
      aria-label={`Material: ${material.product.name}`}
    >
      {/* Product info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Package className="text-muted-foreground h-4 w-4 shrink-0" />
          <span className="truncate font-medium">{material.product.name}</span>
        </div>
        {material.product.sku && (
          <span className="text-muted-foreground text-sm">SKU: {material.product.sku}</span>
        )}
      </div>

      {/* Quantity required */}
      <div className="w-24 text-center" aria-label="Quantity required">
        <span className="tabular-nums">{formatQuantity(material.quantityRequired)}</span>
      </div>

      {/* Quantity used - editable */}
      <div className="w-24 text-center" aria-label="Quantity used">
        {isEditing ? (
          <Input
            ref={inputRef}
            type="number"
            min="0"
            step="0.01"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSaveEdit}
            onKeyDown={handleKeyDown}
            className="h-8 w-20 text-center tabular-nums"
            aria-label="Edit quantity used"
          />
        ) : (
          <button
            onClick={handleStartEdit}
            className="focus:ring-primary rounded px-2 py-1 tabular-nums hover:underline focus:ring-2 focus:ring-offset-2 focus:outline-none"
            aria-label={`Edit quantity used: ${formatQuantity(material.quantityUsed)}`}
          >
            {formatQuantity(material.quantityUsed)}
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-32" aria-label={`Progress: ${progress}%`}>
        <div className="bg-muted h-2 overflow-hidden rounded-full">
          <div
            className={cn(
              'h-full transition-all',
              progress >= 100 ? 'bg-green-500' : progress >= 50 ? 'bg-primary' : 'bg-amber-500'
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-muted-foreground text-xs">{progress}%</span>
      </div>

      {/* Unit cost */}
      <div className="w-24 text-right tabular-nums" aria-label="Unit cost">
        {formatCurrency(material.unitCost)}
      </div>

      {/* Total cost */}
      <div className="w-24 text-right font-medium tabular-nums" aria-label="Total cost">
        {formatCurrency(totalCost)}
      </div>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            aria-label={`Actions for ${material.product.name}`}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit?.(material)} className="gap-2">
            <Pencil className="h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onDelete?.(material.id)}
            className="text-destructive focus:text-destructive gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Remove
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  // Mobile card
  const mobileCard = (
    <div
      className={cn(
        'space-y-3 rounded-lg border p-4 md:hidden',
        disabled && 'pointer-events-none opacity-50'
      )}
      role="listitem"
      aria-label={`Material: ${material.product.name}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Package className="text-muted-foreground h-4 w-4 shrink-0" />
            <span className="truncate font-medium">{material.product.name}</span>
          </div>
          {material.product.sku && (
            <span className="text-muted-foreground text-sm">SKU: {material.product.sku}</span>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              aria-label={`Actions for ${material.product.name}`}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit?.(material)} className="gap-2">
              <Pencil className="h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete?.(material.id)}
              className="text-destructive focus:text-destructive gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Progress bar */}
      <div aria-label={`Progress: ${pendingProgress}%`}>
        <div className="bg-muted h-2 overflow-hidden rounded-full">
          <div
            className={cn(
              'h-full transition-all',
              pendingProgress >= 100
                ? 'bg-green-500'
                : pendingProgress >= 50
                  ? 'bg-primary'
                  : 'bg-amber-500'
            )}
            style={{ width: `${pendingProgress}%` }}
          />
        </div>
        <div className="text-muted-foreground mt-1 flex justify-between text-xs">
          <span>
            {formatQuantity(pendingQuantityUsed)} / {formatQuantity(material.quantityRequired)}
          </span>
          <span>{pendingProgress}%</span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-muted-foreground">Required</span>
          <p className="font-medium tabular-nums">{formatQuantity(material.quantityRequired)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Used</span>
          <div className="mt-1 flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-12 w-12"
              onClick={handleDecrement}
              disabled={disabled}
              aria-label="Decrease quantity used"
            >
              -
            </Button>
            <div className="w-16 text-center font-medium tabular-nums">
              {formatQuantity(pendingQuantityUsed)}
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-12 w-12"
              onClick={handleIncrement}
              disabled={disabled}
              aria-label="Increase quantity used"
            >
              +
            </Button>
          </div>
        </div>
        <div>
          <span className="text-muted-foreground">Unit Cost</span>
          <p className="font-medium tabular-nums">{formatCurrency(material.unitCost)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Total</span>
          <p className="font-medium tabular-nums">{formatCurrency(pendingTotalCost)}</p>
        </div>
      </div>

      {/* Notes */}
      {material.notes && (
        <p className="text-muted-foreground border-t pt-2 text-sm">{material.notes}</p>
      )}
    </div>
  );

  return (
    <>
      {desktopRow}
      {mobileCard}
    </>
  );
}
