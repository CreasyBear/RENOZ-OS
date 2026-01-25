/**
 * Add Material Dialog
 *
 * Dialog for adding a material to a job's BOM.
 * Includes product search/selection with ComboboxSearch pattern.
 *
 * @see _Initiation/_prd/2-domains/jobs/jobs.prd.json - DOM-JOBS-002c
 */

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown, Package, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/lib/pricing-utils';
import type { MaterialResponse } from '@/lib/schemas';

// ============================================================================
// TYPES
// ============================================================================

const addMaterialFormSchema = z.object({
  productId: z.string().uuid('Please select a product'),
  quantityRequired: z.number().min(0.001, 'Quantity must be greater than 0'),
  unitCost: z.number().min(0, 'Cost cannot be negative'),
  notes: z.string().max(2000).optional(),
});

type AddMaterialFormValues = z.infer<typeof addMaterialFormSchema>;

export interface Product {
  id: string;
  sku: string | null;
  name: string;
  description: string | null;
  unitPrice?: number;
}

export interface AddMaterialDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Called when the dialog should close */
  onOpenChange: (open: boolean) => void;
  /** Existing material to edit (undefined for new) */
  material?: MaterialResponse;
  /** Available products to select from */
  products: Product[];
  /** Whether products are loading */
  isLoadingProducts?: boolean;
  /** Called when form is submitted */
  onSubmit: (values: {
    productId: string;
    quantityRequired: number;
    unitCost: number;
    notes?: string;
  }) => void;
  /** Whether form is submitting */
  isSubmitting?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function AddMaterialDialog({
  open,
  onOpenChange,
  material,
  products,
  isLoadingProducts = false,
  onSubmit,
  isSubmitting = false,
}: AddMaterialDialogProps) {
  const { formatPrice } = useCurrency();
  const isEditing = !!material;
  const [productSearchOpen, setProductSearchOpen] = React.useState(false);

  const form = useForm<AddMaterialFormValues>({
    resolver: zodResolver(addMaterialFormSchema),
    defaultValues: {
      productId: material?.productId ?? '',
      quantityRequired: material?.quantityRequired ?? 1,
      unitCost: material?.unitCost ?? 0,
      notes: material?.notes ?? '',
    },
  });

  // Reset form when material changes or dialog opens
  React.useEffect(() => {
    if (open) {
      form.reset({
        productId: material?.productId ?? '',
        quantityRequired: material?.quantityRequired ?? 1,
        unitCost: material?.unitCost ?? 0,
        notes: material?.notes ?? '',
      });
    }
  }, [open, material, form]);

  // Auto-fill unit cost when product is selected
  const selectedProductId = form.watch('productId');
  React.useEffect(() => {
    if (selectedProductId && !isEditing) {
      const product = products.find((p) => p.id === selectedProductId);
      if (product?.unitPrice !== undefined) {
        form.setValue('unitCost', product.unitPrice);
      }
    }
  }, [selectedProductId, products, form, isEditing]);

  const handleSubmit = (values: AddMaterialFormValues) => {
    onSubmit({
      productId: values.productId,
      quantityRequired: values.quantityRequired,
      unitCost: values.unitCost,
      notes: values.notes || undefined,
    });
  };

  const selectedProduct = products.find((p) => p.id === form.watch('productId'));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Material' : 'Add Material'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the material details below.'
              : "Add a product to the job's bill of materials."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Product selection */}
            <FormField
              control={form.control}
              name="productId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Product</FormLabel>
                  <Popover open={productSearchOpen} onOpenChange={setProductSearchOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={productSearchOpen}
                          className={cn(
                            'w-full justify-between',
                            !field.value && 'text-muted-foreground'
                          )}
                          disabled={isEditing}
                        >
                          {selectedProduct ? (
                            <span className="flex items-center gap-2 truncate">
                              <Package className="h-4 w-4 shrink-0" />
                              {selectedProduct.name}
                              {selectedProduct.sku && (
                                <span className="text-muted-foreground">
                                  ({selectedProduct.sku})
                                </span>
                              )}
                            </span>
                          ) : (
                            'Select product...'
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[450px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search products..." className="h-9" />
                        <CommandList>
                          {isLoadingProducts ? (
                            <div className="flex items-center justify-center py-6">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="text-muted-foreground ml-2 text-sm">
                                Loading products...
                              </span>
                            </div>
                          ) : (
                            <>
                              <CommandEmpty>No products found.</CommandEmpty>
                              <CommandGroup>
                                {products.map((product) => (
                                  <CommandItem
                                    key={product.id}
                                    value={`${product.name} ${product.sku ?? ''}`}
                                    onSelect={() => {
                                      field.onChange(product.id);
                                      setProductSearchOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        'mr-2 h-4 w-4',
                                        field.value === product.id ? 'opacity-100' : 'opacity-0'
                                      )}
                                    />
                                    <div className="min-w-0 flex-1">
                                      <div className="truncate font-medium">{product.name}</div>
                                      <div className="text-muted-foreground text-xs">
                                        {product.sku && `SKU: ${product.sku}`}
                                        {product.unitPrice !== undefined && (
                                          <span className="ml-2">
                                            {formatPrice(product.unitPrice)}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Quantity and Cost in a row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Quantity required */}
              <FormField
                control={form.control}
                name="quantityRequired"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity Required</FormLabel>
                    <FormControl>
                      <Input type="number" min="0.001" step="0.001" placeholder="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Unit cost */}
              <FormField
                control={form.control}
                name="unitCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit Cost ($)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormDescription>Auto-filled from product price</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Installation notes, special instructions..."
                      className="resize-none"
                      rows={2}
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
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : isEditing ? (
                  'Save Changes'
                ) : (
                  'Add Material'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
