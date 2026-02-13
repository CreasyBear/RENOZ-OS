/**
 * Opportunity Quote Tab
 *
 * Full quote management with inline View/Edit modes.
 * This is a FULL FEATURE tab - not a preview.
 *
 * Features:
 * - View mode: Read-only quote display
 * - Edit mode: Inline quote builder with product selection
 * - Version history
 * - PDF generation and email sending
 * - Quote validity management
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md (Tabs Philosophy)
 */

import { memo, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import {
  FileText,
  Send,
  Clock,
  Plus,
  Download,
  History,
  Edit3,
  X,
  Save,
  Trash2,
  Loader2,
  Search,
  Package,
  Check,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { FormatAmount } from '@/components/shared/format';
import { toastSuccess, toastError } from '@/hooks';
import { useCreateQuoteVersion, useGenerateQuotePdf } from '@/hooks/pipeline';
import { useProductSearch } from '@/hooks/products';
import { GST_RATE } from '@/lib/order-calculations';
import type { QuoteLineItem } from '@/lib/schemas/pipeline';

// ============================================================================
// TYPES
// ============================================================================

interface QuoteVersionData {
  id: string;
  versionNumber: number;
  subtotal: number;
  taxAmount: number;
  total: number;
  notes: string | null;
  createdAt: Date | string;
  items: Array<{
    id?: string;
    productId?: string;
    sku?: string;
    description: string;
    quantity: number;
    unitPrice?: number;
    unitPriceCents?: number;
    discountPercent?: number;
    total?: number;
    totalCents?: number;
  }>;
}

export interface OpportunityQuoteTabProps {
  opportunityId: string;
  versions: QuoteVersionData[];
  quoteExpiresAt?: Date | string | null;
  quotePdfUrl?: string | null;
  isClosedStage?: boolean;
  onCreateVersion?: () => void;
  onSendQuote?: () => void;
  onExtendValidity?: () => void;
  className?: string;
}

interface EditableLineItem {
  tempId: string;
  productId?: string;
  sku?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  total: number;
}

// ============================================================================
// HELPERS
// ============================================================================

function generateTempId(): string {
  return `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function calculateLineTotal(quantity: number, unitPrice: number, discountPercent?: number): number {
  const subtotal = quantity * unitPrice;
  const discount = discountPercent ? subtotal * (discountPercent / 100) : 0;
  return Math.round((subtotal - discount) * 100) / 100;
}

function calculateTotals(items: EditableLineItem[]): {
  subtotal: number;
  taxAmount: number;
  total: number;
} {
  const subtotal = items.reduce((sum, item) => sum + (item.total ?? 0), 0);
  const taxAmount = Math.round(subtotal * GST_RATE * 100) / 100;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;
  return { subtotal, taxAmount, total };
}

// ============================================================================
// PRODUCT SEARCH INPUT
// ============================================================================

interface ProductSearchResult {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  basePrice: number | null;
  type: string;
  status: string;
}

interface ProductSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onProductSelect: (product: ProductSearchResult) => void;
  placeholder?: string;
  className?: string;
}

function ProductSearchInput({
  value,
  onChange,
  onProductSelect,
  placeholder = 'Search products or enter description...',
  className,
}: ProductSearchInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Search products when query has at least 2 characters
  const { data, isLoading } = useProductSearch(
    searchQuery,
    { limit: 10 },
    searchQuery.length >= 2
  );

  const rawProducts = data?.products;
  const products = useMemo(() => {
    if (!rawProducts) return [];
    return rawProducts.filter((p) => p.status === 'active') as ProductSearchResult[];
  }, [rawProducts]);

  // Handle input change - update both search and value
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setSearchQuery(newValue);
    if (newValue.length >= 2) {
      setIsOpen(true);
    }
  };

  // Handle product selection
  const handleSelectProduct = (product: ProductSearchResult) => {
    onProductSelect(product);
    setIsOpen(false);
    setSearchQuery('');
  };

  // Close popover when clicking outside or pressing Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <Popover open={isOpen && searchQuery.length >= 2} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            ref={inputRef}
            value={value}
            onChange={handleInputChange}
            onFocus={() => searchQuery.length >= 2 && setIsOpen(true)}
            placeholder={placeholder}
            className={cn('pl-8 h-9', className)}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-[400px] p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <ScrollArea className="max-h-[280px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
              <Package className="h-8 w-8 mb-2" />
              <p className="text-sm">No products found</p>
              <p className="text-xs mt-1">Type a custom description instead</p>
            </div>
          ) : (
            <div className="p-1">
              {products.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  className="w-full flex items-center gap-3 p-2.5 rounded-md hover:bg-muted transition-colors text-left"
                  onClick={() => handleSelectProduct(product)}
                >
                  <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{product.name}</span>
                      {product.sku && (
                        <Badge variant="secondary" className="text-[11px] font-mono shrink-0">
                          {product.sku}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {product.basePrice !== null ? (
                        <FormatAmount amount={product.basePrice} />
                      ) : (
                        'No price set'
                      )}
                    </div>
                  </div>
                  <Check className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
        <div className="border-t p-2 bg-muted/30">
          <p className="text-xs text-muted-foreground text-center">
            Select a product or continue typing for custom description
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ============================================================================
// QUOTE EDITOR (Edit Mode)
// ============================================================================

interface QuoteEditorProps {
  opportunityId: string;
  currentVersion?: QuoteVersionData | null;
  onCancel: () => void;
  onSaveSuccess: () => void;
}

function QuoteEditor({ opportunityId, currentVersion, onCancel, onSaveSuccess }: QuoteEditorProps) {
  const createVersionMutation = useCreateQuoteVersion();

  // Initialize from current version or empty
  const [lineItems, setLineItems] = useState<EditableLineItem[]>(() => {
    if (currentVersion?.items && currentVersion.items.length > 0) {
      return currentVersion.items.map((item) => ({
        tempId: generateTempId(),
        productId: item.productId,
        sku: item.sku,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice ?? (item.unitPriceCents ? item.unitPriceCents / 100 : 0),
        discountPercent: item.discountPercent,
        total: item.total ?? (item.totalCents ? item.totalCents / 100 : 0),
      }));
    }
    return [
      {
        tempId: generateTempId(),
        description: '',
        quantity: 1,
        unitPrice: 0,
        total: 0,
      },
    ];
  });

  const [notes, setNotes] = useState(currentVersion?.notes ?? '');
  const { subtotal, taxAmount, total } = useMemo(() => calculateTotals(lineItems), [lineItems]);

  // Update line item field
  const updateLineItem = useCallback((tempId: string, field: keyof EditableLineItem, value: string | number) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.tempId !== tempId) return item;

        const updated = { ...item, [field]: value };

        // Recalculate total when quantity, price, or discount changes
        if (field === 'quantity' || field === 'unitPrice' || field === 'discountPercent') {
          updated.total = calculateLineTotal(
            field === 'quantity' ? (value as number) : updated.quantity,
            field === 'unitPrice' ? (value as number) : updated.unitPrice,
            field === 'discountPercent' ? (value as number) : updated.discountPercent
          );
        }

        return updated;
      })
    );
  }, []);

  // Add new line item
  const addLineItem = useCallback(() => {
    setLineItems((prev) => [
      ...prev,
      {
        tempId: generateTempId(),
        description: '',
        quantity: 1,
        unitPrice: 0,
        total: 0,
      },
    ]);
  }, []);

  // Remove line item
  const removeLineItem = useCallback((tempId: string) => {
    setLineItems((prev) => {
      if (prev.length <= 1) return prev; // Keep at least one
      return prev.filter((item) => item.tempId !== tempId);
    });
  }, []);

  // Handle product selection from search
  const handleProductSelect = useCallback((tempId: string, product: ProductSearchResult) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.tempId !== tempId) return item;

        const unitPrice = product.basePrice ?? 0;
        const total = calculateLineTotal(item.quantity, unitPrice, item.discountPercent);

        return {
          ...item,
          productId: product.id,
          sku: product.sku,
          description: product.name,
          unitPrice,
          total,
        };
      })
    );
  }, []);

  // Save quote
  const handleSave = useCallback(() => {
    // Filter out empty line items
    const validItems = lineItems.filter(
      (item) => item.description.trim() && item.quantity > 0
    );

    if (validItems.length === 0) {
      toastError('At least one line item with a description is required');
      return;
    }

    // Convert to QuoteLineItem format
    const itemsToSave: QuoteLineItem[] = validItems.map((item) => ({
      productId: item.productId,
      sku: item.sku,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountPercent: item.discountPercent,
      total: item.total,
    }));

    createVersionMutation.mutate(
      {
        opportunityId,
        items: itemsToSave,
        notes: notes || undefined,
      },
      {
        onSuccess: (data) => {
          toastSuccess(`Quote v${data.quoteVersion.versionNumber} saved successfully`);
          onSaveSuccess();
        },
        onError: (error) => {
          toastError(error instanceof Error ? error.message : 'Failed to save quote');
        },
      }
    );
  }, [lineItems, notes, opportunityId, createVersionMutation, onSaveSuccess]);

  const isSaving = createVersionMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            {currentVersion ? `Edit Quote (creating v${currentVersion.versionNumber + 1})` : 'Create Quote'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {currentVersion ? 'Make changes and save as a new version' : 'Add line items to build your quote'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={isSaving}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isSaving ? 'Saving...' : 'Save Quote'}
          </Button>
        </div>
      </div>

      {/* Line Items Editor */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full" aria-label="Quote line items editor">
          <thead>
            <tr className="bg-muted/50">
              <th scope="col" className="text-left text-xs font-medium text-muted-foreground p-3">
                Description
              </th>
              <th scope="col" className="text-right text-xs font-medium text-muted-foreground p-3 w-20">
                Qty
              </th>
              <th scope="col" className="text-right text-xs font-medium text-muted-foreground p-3 w-28">
                Unit Price
              </th>
              <th scope="col" className="text-right text-xs font-medium text-muted-foreground p-3 w-20">
                Disc %
              </th>
              <th scope="col" className="text-right text-xs font-medium text-muted-foreground p-3 w-28">
                Total
              </th>
              <th scope="col" className="w-12 p-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item) => (
              <tr key={item.tempId} className="border-t">
                <td className="p-2">
                  <ProductSearchInput
                    value={item.description}
                    onChange={(value) => updateLineItem(item.tempId, 'description', value)}
                    onProductSelect={(product) => handleProductSelect(item.tempId, product)}
                    placeholder="Search products or type description..."
                  />
                  {item.sku && (
                    <div className="mt-1 flex items-center gap-1">
                      <Badge variant="outline" className="text-[11px] font-mono">
                        {item.sku}
                      </Badge>
                    </div>
                  )}
                </td>
                <td className="p-2">
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateLineItem(item.tempId, 'quantity', parseInt(e.target.value) || 1)}
                    className="h-9 text-right tabular-nums"
                  />
                </td>
                <td className="p-2">
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={item.unitPrice}
                    onChange={(e) => updateLineItem(item.tempId, 'unitPrice', parseFloat(e.target.value) || 0)}
                    className="h-9 text-right tabular-nums"
                  />
                </td>
                <td className="p-2">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={item.discountPercent ?? ''}
                    onChange={(e) => updateLineItem(item.tempId, 'discountPercent', parseFloat(e.target.value) || 0)}
                    placeholder="-"
                    className="h-9 text-right tabular-nums"
                  />
                </td>
                <td className="p-2 text-right">
                  <span className="text-sm font-medium tabular-nums">
                    <FormatAmount amount={item.total} />
                  </span>
                </td>
                <td className="p-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-muted-foreground hover:text-destructive"
                    onClick={() => removeLineItem(item.tempId)}
                    disabled={lineItems.length <= 1}
                    aria-label="Remove line item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Add Item Button */}
        <div className="border-t p-3">
          <Button variant="ghost" size="sm" onClick={addLineItem} className="w-full justify-center">
            <Plus className="h-4 w-4 mr-2" />
            Add Line Item
          </Button>
        </div>

        {/* Totals */}
        <div className="border-t bg-muted/30 p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="tabular-nums">
              <FormatAmount amount={subtotal} />
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">GST ({(GST_RATE * 100).toFixed(0)}%)</span>
            <span className="tabular-nums">
              <FormatAmount amount={taxAmount} />
            </span>
          </div>
          <Separator />
          <div className="flex justify-between text-base font-semibold">
            <span>Total</span>
            <span className="tabular-nums text-primary">
              <FormatAmount amount={total} />
            </span>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <label htmlFor="quote-notes" className="text-sm font-medium">
          Notes for Customer
        </label>
        <Textarea
          id="quote-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any notes or terms for the customer..."
          rows={3}
        />
      </div>
    </div>
  );
}

// ============================================================================
// VERSION HISTORY SECTION
// ============================================================================

interface VersionHistoryProps {
  versions: QuoteVersionData[];
  onCreateVersion?: () => void;
  isEditMode?: boolean;
}

function VersionHistory({ versions, onCreateVersion, isEditMode }: VersionHistoryProps) {
  if (versions.length === 0 && !isEditMode) {
    return (
      <div className="text-center py-12 border border-dashed rounded-lg">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground font-medium">No quotes created yet</p>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          Create a quote to send to the customer
        </p>
        {onCreateVersion && (
          <Button onClick={onCreateVersion}>
            <Plus className="h-4 w-4 mr-2" />
            Create Quote
          </Button>
        )}
      </div>
    );
  }

  if (versions.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <History className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-base font-semibold text-foreground">Version History</h2>
        <Badge variant="secondary" className="text-xs">
          {versions.length} version{versions.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <div className="space-y-3" role="list" aria-label="Quote versions">
        {versions.map((version, index) => (
          <div
            key={version.id}
            role="listitem"
            className={cn(
              'flex items-center justify-between p-4 rounded-lg border',
              'hover:bg-muted/30 transition-colors',
              index === 0 && 'border-primary bg-primary/5'
            )}
            aria-label={`Version ${version.versionNumber}${index === 0 ? ', current version' : ''}: ${version.items.length} items, total ${version.total}`}
          >
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold',
                  index === 0
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
                aria-hidden="true"
              >
                v{version.versionNumber}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {version.items.length} line item{version.items.length !== 1 ? 's' : ''}
                  </span>
                  {index === 0 && (
                    <Badge variant="secondary" className="text-xs">
                      Current
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  Created {format(new Date(version.createdAt), 'PPp')}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold tabular-nums">
                <FormatAmount amount={version.total} />
              </div>
              <div className="text-xs text-muted-foreground">
                Tax: <FormatAmount amount={version.taxAmount} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ============================================================================
// CURRENT QUOTE DETAIL (View Mode)
// ============================================================================

interface CurrentQuoteDetailProps {
  version: QuoteVersionData;
  quoteExpiresAt?: Date | string | null;
  quotePdfUrl?: string | null;
  isClosedStage?: boolean;
  onEdit?: () => void;
  onSendQuote?: () => void;
  onExtendValidity?: () => void;
}

function CurrentQuoteDetail({
  version,
  quoteExpiresAt,
  quotePdfUrl,
  isClosedStage,
  onEdit,
  onSendQuote,
  onExtendValidity,
}: CurrentQuoteDetailProps) {
  const isExpired = quoteExpiresAt && new Date(quoteExpiresAt) < new Date();
  const generatePdfMutation = useGenerateQuotePdf();

  const handleGeneratePdf = useCallback(() => {
    generatePdfMutation.mutate(
      { quoteVersionId: version.id },
      {
        onSuccess: (data) => {
          toastSuccess('Quote PDF generated successfully');
          // Open PDF in new tab
          if (data.pdfUrl) {
            window.open(data.pdfUrl, '_blank');
          }
        },
        onError: (error) => {
          toastError(error instanceof Error ? error.message : 'Failed to generate PDF');
        },
      }
    );
  }, [version.id, generatePdfMutation]);

  const handleDownloadPdf = useCallback(() => {
    if (quotePdfUrl) {
      window.open(quotePdfUrl, '_blank');
    }
  }, [quotePdfUrl]);

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-foreground">
          Current Quote (v{version.versionNumber})
        </h2>
        <div className="flex gap-2">
          {!isClosedStage && onEdit && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit3 className="h-4 w-4 mr-2" />
              Edit Quote
            </Button>
          )}
          {/* Generate PDF button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleGeneratePdf}
            disabled={generatePdfMutation.isPending}
          >
            {generatePdfMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 mr-2" />
            )}
            {generatePdfMutation.isPending ? 'Generating...' : 'Generate PDF'}
          </Button>
          {/* Download existing PDF if available */}
          {quotePdfUrl && (
            <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          )}
          {!isClosedStage && onSendQuote && (
            <Button size="sm" onClick={onSendQuote}>
              <Send className="h-4 w-4 mr-2" />
              Send Quote
            </Button>
          )}
        </div>
      </div>

      {/* Validity Status */}
      {quoteExpiresAt && (
        <div
          className={cn(
            'flex items-center justify-between p-3 rounded-lg mb-4',
            isExpired ? 'bg-destructive/10 border border-destructive/50' : 'bg-muted'
          )}
        >
          <div className="flex items-center gap-2">
            <Clock className={cn('h-4 w-4', isExpired ? 'text-destructive' : 'text-muted-foreground')} />
            <span className={cn('text-sm', isExpired && 'text-destructive font-medium')}>
              {isExpired ? 'Quote expired' : 'Valid until'}{' '}
              {format(new Date(quoteExpiresAt), 'PPP')}
            </span>
          </div>
          {isExpired && onExtendValidity && (
            <Button variant="outline" size="sm" onClick={onExtendValidity}>
              Extend Validity
            </Button>
          )}
        </div>
      )}

      {/* Line Items Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full" aria-label="Quote line items">
          <thead>
            <tr className="bg-muted/50">
              <th scope="col" className="text-left text-xs font-medium text-muted-foreground p-3">
                Description
              </th>
              <th scope="col" className="text-right text-xs font-medium text-muted-foreground p-3 w-20">
                Qty
              </th>
              <th scope="col" className="text-right text-xs font-medium text-muted-foreground p-3 w-28">
                Unit Price
              </th>
              <th scope="col" className="text-right text-xs font-medium text-muted-foreground p-3 w-20">
                Disc.
              </th>
              <th scope="col" className="text-right text-xs font-medium text-muted-foreground p-3 w-28">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {version.items.map((item, index) => {
              const unitPrice = item.unitPrice ?? (item.unitPriceCents ? item.unitPriceCents / 100 : 0);
              const total = item.total ?? (item.totalCents ? item.totalCents / 100 : 0);

              return (
                <tr key={item.id ?? index} className="border-t hover:bg-muted/30 transition-colors">
                  <td className="p-3 text-sm">{item.description}</td>
                  <td className="p-3 text-sm text-right tabular-nums">{item.quantity}</td>
                  <td className="p-3 text-sm text-right tabular-nums">
                    <FormatAmount amount={unitPrice} />
                  </td>
                  <td className="p-3 text-sm text-right tabular-nums">
                    {item.discountPercent ? `${item.discountPercent}%` : '-'}
                  </td>
                  <td className="p-3 text-sm text-right tabular-nums font-medium">
                    <FormatAmount amount={total} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Totals */}
        <div className="border-t bg-muted/30 p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="tabular-nums">
              <FormatAmount amount={version.subtotal} />
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tax</span>
            <span className="tabular-nums">
              <FormatAmount amount={version.taxAmount} />
            </span>
          </div>
          <Separator />
          <div className="flex justify-between text-base font-semibold">
            <span>Total</span>
            <span className="tabular-nums text-primary">
              <FormatAmount amount={version.total} />
            </span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {version.notes && (
        <div className="mt-4">
          <h3 className="text-sm font-medium mb-2">Notes</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-md">
            {version.notes}
          </p>
        </div>
      )}
    </section>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const OpportunityQuoteTab = memo(function OpportunityQuoteTab({
  opportunityId,
  versions,
  quoteExpiresAt,
  quotePdfUrl,
  isClosedStage,
  onSendQuote,
  onExtendValidity,
  className,
}: OpportunityQuoteTabProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const currentVersion = versions[0]; // Most recent version

  const handleEnterEditMode = useCallback(() => {
    setIsEditMode(true);
  }, []);

  const handleExitEditMode = useCallback(() => {
    setIsEditMode(false);
  }, []);

  // Edit Mode
  if (isEditMode) {
    return (
      <div className={cn('space-y-8', className)}>
        <QuoteEditor
          opportunityId={opportunityId}
          currentVersion={currentVersion}
          onCancel={handleExitEditMode}
          onSaveSuccess={handleExitEditMode}
        />
        <Separator />
        <VersionHistory versions={versions} isEditMode />
      </div>
    );
  }

  // View Mode
  return (
    <div className={cn('space-y-8', className)}>
      {currentVersion ? (
        <CurrentQuoteDetail
          version={currentVersion}
          quoteExpiresAt={quoteExpiresAt}
          quotePdfUrl={quotePdfUrl}
          isClosedStage={isClosedStage}
          onEdit={!isClosedStage ? handleEnterEditMode : undefined}
          onSendQuote={onSendQuote}
          onExtendValidity={onExtendValidity}
        />
      ) : null}

      <Separator />

      <VersionHistory
        versions={versions}
        onCreateVersion={!isClosedStage ? handleEnterEditMode : undefined}
      />
    </div>
  );
});

export default OpportunityQuoteTab;
