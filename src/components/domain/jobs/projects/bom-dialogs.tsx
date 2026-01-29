/**
 * BOM Dialogs
 *
 * Add item dialog for project BOM.
 *
 * SPRINT-03: New components for project-centric jobs model
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAddBomItem } from '@/hooks/jobs';
import { useProductSearch } from '@/hooks/products';
import { useDebounce } from '@/hooks/_shared';
import { toast } from '@/lib/toast';
import type { Product } from 'drizzle/schema';

// ============================================================================
// SCHEMAS
// ============================================================================

const bomItemFormSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unitCost: z.number().min(0).optional(),
  notes: z.string().optional(),
});

type BomItemFormData = z.infer<typeof bomItemFormSchema>;

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
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const debouncedQuery = useDebounce(searchQuery, 300);
  const { data: searchResults, isFetching: isSearching } = useProductSearch(
    debouncedQuery,
    { limit: 20 },
    debouncedQuery.length >= 2
  );
  // quickSearchProducts returns { products, total }
  const products: Product[] = searchResults?.products || [];

  const form = useForm<BomItemFormData>({
    resolver: zodResolver(bomItemFormSchema),
    defaultValues: {
      productId: '',
      quantity: 1,
      unitCost: undefined,
      notes: '',
    },
  });



  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    form.setValue('productId', product.id);
    form.setValue('unitCost', product.basePrice || undefined);
    setSearchQuery('');
  };

  const onSubmit = async (data: BomItemFormData) => {
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
    } catch (error) {
      toast.error('Failed to add item');
    }
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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Product Search */}
            <div className="space-y-2">
              <FormLabel>Product *</FormLabel>
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
                      form.setValue('productId', '');
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
              {form.formState.errors.productId && (
                <p className="text-sm font-medium text-destructive">
                  {form.formState.errors.productId.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unitCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit Cost</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        placeholder="0.00"
                        {...field}
                        onChange={(e) =>
                          field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional notes for this item..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
        </Form>
      </DialogContent>
    </Dialog>
  );
}
