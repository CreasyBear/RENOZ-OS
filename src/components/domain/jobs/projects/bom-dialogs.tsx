/**
 * BOM Dialogs
 *
 * Add item dialog for project BOM.
 *
 * SPRINT-03: New components for project-centric jobs model
 * SPRINT-05: Migrated to TanStack Form
 */

import { useState } from 'react';
import { z } from 'zod';
import { Plus, Search, Package } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

import { useTanStackForm } from '@/hooks/_shared/use-tanstack-form';
import { NumberField, TextareaField, extractFieldError } from '@/components/shared/forms';
import { useAddBomItem } from '@/hooks/jobs';
import { useProductSearch } from '@/hooks/products';
import { useDebounce } from '@/hooks/_shared';
import { toast } from '@/lib/toast';
import type { ProductSearchItem } from '@/lib/schemas/products';

// ============================================================================
// SCHEMAS
// ============================================================================

const bomItemFormSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unitCost: z.number().min(0).optional(),
  notes: z.string().optional(),
});

// ============================================================================
// ADD ITEM DIALOG
// ============================================================================

export interface BomAddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  bomId: string;
  onSuccess?: () => void;
}



export function BomAddItemDialog({
  open,
  onOpenChange,
  projectId,
  bomId,
  onSuccess,
}: BomAddItemDialogProps) {
  const addBomItem = useAddBomItem(projectId);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<ProductSearchItem | null>(null);
  const debouncedQuery = useDebounce(searchQuery, 300);
  const { data: searchResults, isFetching: isSearching } = useProductSearch(
    debouncedQuery,
    { limit: 20 },
    debouncedQuery.length >= 2
  );
  const products: ProductSearchItem[] = searchResults?.products ?? [];

  const form = useTanStackForm({
    schema: bomItemFormSchema,
    defaultValues: {
      productId: '',
      quantity: 1,
      unitCost: undefined,
      notes: '',
    },
    onSubmit: async (data) => {
      try {
        await addBomItem.mutateAsync({
          data: {
            bomId,
            productId: data.productId,
            quantity: data.quantity,
            unitCost: data.unitCost,
            notes: data.notes,
          }
        });

        toast.success('Item added to BOM');
        onOpenChange(false);
        form.reset();
        setSelectedProduct(null);
        onSuccess?.();
      } catch {
        toast.error('Failed to add item');
      }
    },
  });

  const handleSelectProduct = (product: ProductSearchItem) => {
    setSelectedProduct(product);
    form.setFieldValue('productId', product.id);
    form.setFieldValue('unitCost', product.basePrice ?? undefined);
    setSearchQuery('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add BOM Item
          </DialogTitle>
          <DialogDescription>Search and add products to the bill of materials</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="space-y-4"
        >
          {/* Product Search */}
          <div className="space-y-2">
            <Label>Product *</Label>
            {selectedProduct ? (
              <div className="flex items-center gap-3 p-3 border rounded-md bg-muted/30">
                <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{selectedProduct.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedProduct.sku || 'No SKU'}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedProduct(null);
                    form.setFieldValue('productId', '');
                  }}
                >
                  Change
                </Button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products by name or SKU..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {isSearching && (
                  <p className="text-sm text-muted-foreground">Searching...</p>
                )}

                {products.length > 0 && (
                  <ScrollArea className="h-48 border rounded-md">
                    <div className="p-2 space-y-1">
                      {products.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          className="w-full flex items-center gap-3 p-2 hover:bg-muted rounded-md text-left transition-colors"
                          onClick={() => handleSelectProduct(product)}
                        >
                          <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
                            <Package className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{product.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {product.sku || 'No SKU'}
                            </p>
                          </div>
                          {product.basePrice && (
                            <span className="text-sm font-medium">
                              ${product.basePrice.toFixed(2)}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                )}

                {debouncedQuery.length >= 2 && !isSearching && products.length === 0 && (
                  <p className="text-sm text-muted-foreground">No products found</p>
                )}
              </>
            )}
            <form.Field name="productId">
              {(field) => {
                const error = extractFieldError(field);
                return error ? (
                  <p className="text-[0.8rem] font-medium text-destructive">{error}</p>
                ) : null;
              }}
            </form.Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <form.Field name="quantity">
              {(field) => (
                <NumberField
                  field={field}
                  label="Quantity"
                  min={1}
                  required
                />
              )}
            </form.Field>

            <form.Field name="unitCost">
              {(field) => (
                <NumberField
                  field={field}
                  label="Unit Cost"
                  min={0}
                  step={0.01}
                  placeholder="0.00"
                  prefix="$"
                />
              )}
            </form.Field>
          </div>

          <form.Field name="notes">
            {(field) => (
              <TextareaField
                field={field}
                label="Notes"
                placeholder="Optional notes for this item..."
                rows={3}
              />
            )}
          </form.Field>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                setSelectedProduct(null);
                form.reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={addBomItem.isPending || !selectedProduct}>
              {addBomItem.isPending ? 'Adding...' : 'Add Item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
