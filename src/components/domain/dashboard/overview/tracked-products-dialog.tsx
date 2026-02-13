/**
 * TrackedProductsDialog Component
 *
 * Dialog for selecting products to track on the dashboard.
 * Allows searching and selecting up to 5 products to monitor inventory levels.
 *
 * @see src/lib/schemas/dashboard/tracked-products.ts
 */
import { useState, useMemo, useCallback } from 'react';
import { Search, Package, Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useProductSearch } from '@/hooks/products';
import { cn } from '@/lib/utils';
import type { TrackedProduct } from '@/lib/schemas/dashboard/tracked-products';
import type { ProductSearchItem } from '@/lib/schemas/products';

// Re-export for convenience
export type { TrackedProduct };

// ============================================================================
// TYPES
// ============================================================================

interface TrackedProductsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProducts: TrackedProduct[];
  onSave: (products: TrackedProduct[]) => void;
  maxProducts?: number;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatPrice(price: number | null): string {
  if (price === null) return '-';
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(price);
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TrackedProductsDialog({
  open,
  onOpenChange,
  selectedProducts,
  onSave,
  maxProducts = 5,
}: TrackedProductsDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<Map<string, TrackedProduct>>(
    () => new Map(selectedProducts.map((p) => [p.id, p]))
  );

  // Reset selection when dialog opens
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (isOpen) {
        setSelected(new Map(selectedProducts.map((p) => [p.id, p])));
        setSearchQuery('');
      }
      onOpenChange(isOpen);
    },
    [selectedProducts, onOpenChange]
  );

  // Use TanStack Query hook for product search
  const { data, isLoading } = useProductSearch(
    searchQuery,
    { limit: 20 },
    open && searchQuery.length >= 2
  );

  // Map products from search results
  // Server already filters by isActive = true
  const products: ProductSearchItem[] = useMemo(() => {
    if (!data?.products) return [];
    return data.products;
  }, [data]);

  // Toggle product selection
  const toggleProduct = useCallback(
    (product: { id: string; sku: string | null; name: string }) => {
      setSelected((prev) => {
        const next = new Map(prev);
        if (next.has(product.id)) {
          next.delete(product.id);
        } else if (next.size < maxProducts) {
          next.set(product.id, {
            id: product.id,
            sku: product.sku ?? '',
            name: product.name,
          });
        }
        return next;
      });
    },
    [maxProducts]
  );

  // Remove a selected product
  const removeProduct = useCallback((productId: string) => {
    setSelected((prev) => {
      const next = new Map(prev);
      next.delete(productId);
      return next;
    });
  }, []);

  // Save and close
  const handleSave = useCallback(() => {
    onSave(Array.from(selected.values()));
    onOpenChange(false);
  }, [selected, onSave, onOpenChange]);

  const selectedArray = Array.from(selected.values());
  const canAddMore = selected.size < maxProducts;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Track Inventory Items</DialogTitle>
          <DialogDescription>
            Select up to {maxProducts} products to monitor on your dashboard.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Currently Selected */}
          {selectedArray.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Currently Tracking ({selectedArray.length}/{maxProducts})
              </label>
              <div className="flex flex-wrap gap-2">
                {selectedArray.map((product) => (
                  <Badge
                    key={product.id}
                    variant="secondary"
                    className="flex items-center gap-1 pr-1"
                  >
                    <span className="max-w-[150px] truncate">
                      {product.sku || product.name}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 hover:bg-destructive/20"
                      onClick={() => removeProduct(product.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search products by name or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Search Results */}
          <ScrollArea className="h-[250px] rounded-md border">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <span className="text-sm text-muted-foreground">Searching...</span>
              </div>
            ) : searchQuery.length < 2 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <Package className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">
                  Type at least 2 characters to search
                </span>
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <Package className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">No products found</span>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {products.map((product) => {
                  const isSelected = selected.has(product.id);
                  const disabled = !isSelected && !canAddMore;

                  return (
                    <button
                      key={product.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => toggleProduct(product)}
                      className={cn(
                        'w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors',
                        isSelected
                          ? 'bg-primary/10 border border-primary/20'
                          : disabled
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:bg-muted'
                      )}
                    >
                      <div
                        className={cn(
                          'flex h-5 w-5 items-center justify-center rounded border',
                          isSelected
                            ? 'bg-primary border-primary text-primary-foreground'
                            : 'border-muted-foreground/30'
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{product.name}</div>
                        <div className="text-xs text-muted-foreground flex gap-2">
                          {product.sku && <span>SKU: {product.sku}</span>}
                          {product.basePrice !== null && (
                            <span>{formatPrice(product.basePrice)}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save ({selected.size} selected)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
