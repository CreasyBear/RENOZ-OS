/**
 * QuoteBuilder Component
 *
 * Full quote building interface with line item management,
 * automatic GST calculations, and version control.
 *
 * @see _Initiation/_prd/2-domains/pipeline/pipeline.prd.json (PIPE-QUOTE-BUILDER-UI)
 */

import { memo, useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  Plus,
  Trash2,
  Save,
  Calculator,
  History,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { toastSuccess, toastError } from "@/hooks";
import { createQuoteVersion } from "@/server/functions/quote-versions";
import { FormatAmount } from "@/components/shared/format";
import type { QuoteLineItem, QuoteVersion } from "@/lib/schemas/pipeline";

// ============================================================================
// TYPES
// ============================================================================

export interface QuoteBuilderProps {
  opportunityId: string;
  currentVersion?: QuoteVersion | null;
  onSave?: (version: QuoteVersion) => void;
  onViewHistory?: () => void;
  className?: string;
}

interface EditableLineItem extends QuoteLineItem {
  tempId: string; // For React keys before DB save
}

// ============================================================================
// CONSTANTS
// ============================================================================

const GST_RATE = 0.10;

const EMPTY_LINE_ITEM: Omit<EditableLineItem, "tempId"> = {
  description: "",
  quantity: 1,
  unitPriceCents: 0,
  totalCents: 0,
};

// ============================================================================
// HELPERS
// ============================================================================

function generateTempId(): string {
  return `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function calculateLineTotal(quantity: number, unitPriceCents: number, discountPercent?: number): number {
  const subtotal = quantity * unitPriceCents;
  const discount = discountPercent ? subtotal * (discountPercent / 100) : 0;
  return Math.round(subtotal - discount);
}

function calculateTotals(items: EditableLineItem[]): {
  subtotal: number;
  taxAmount: number;
  total: number;
} {
  const subtotal = items.reduce((sum, item) => sum + item.totalCents, 0);
  const taxAmount = Math.round(subtotal * GST_RATE);
  const total = subtotal + taxAmount;
  return { subtotal, taxAmount, total };
}

// ============================================================================
// COMPONENT
// ============================================================================

export const QuoteBuilder = memo(function QuoteBuilder({
  opportunityId,
  currentVersion,
  onSave,
  onViewHistory,
  className,
}: QuoteBuilderProps) {
  const queryClient = useQueryClient();

  // Initialize line items from current version or empty
  const [lineItems, setLineItems] = useState<EditableLineItem[]>(() => {
    if (currentVersion?.items && currentVersion.items.length > 0) {
      return currentVersion.items.map((item) => ({
        ...item,
        tempId: generateTempId(),
      }));
    }
    return [{ ...EMPTY_LINE_ITEM, tempId: generateTempId() }];
  });

  const [notes, setNotes] = useState(currentVersion?.notes ?? "");
  const [hasChanges, setHasChanges] = useState(false);

  // Calculate totals
  const { subtotal, taxAmount, total } = calculateTotals(lineItems);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Filter out empty line items
      const validItems = lineItems.filter(
        (item) => item.description.trim() && item.quantity > 0
      );

      if (validItems.length === 0) {
        throw new Error("At least one line item is required");
      }

      // Strip tempId before sending to server
      const itemsToSave: QuoteLineItem[] = validItems.map(({ tempId, ...item }) => item);

      const result = await createQuoteVersion({
        data: {
          opportunityId,
          items: itemsToSave,
          notes: notes || undefined,
        },
      });

      return result;
    },
    onSuccess: (data) => {
      toastSuccess(`Quote v${data.quoteVersion.versionNumber} saved successfully.`);
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.detail(opportunityId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.quoteVersions(opportunityId) });
      onSave?.(data.quoteVersion);
    },
    onError: (error) => {
      toastError(error instanceof Error ? error.message : "Failed to save quote");
    },
  });

  // Add new line item
  const addLineItem = useCallback(() => {
    setLineItems((prev) => [
      ...prev,
      { ...EMPTY_LINE_ITEM, tempId: generateTempId() },
    ]);
    setHasChanges(true);
  }, []);

  // Remove line item
  const removeLineItem = useCallback((tempId: string) => {
    setLineItems((prev) => {
      const filtered = prev.filter((item) => item.tempId !== tempId);
      // Always keep at least one line item
      return filtered.length > 0
        ? filtered
        : [{ ...EMPTY_LINE_ITEM, tempId: generateTempId() }];
    });
    setHasChanges(true);
  }, []);

  // Update line item field
  const updateLineItem = useCallback(
    (tempId: string, field: keyof EditableLineItem, value: string | number) => {
      setLineItems((prev) =>
        prev.map((item) => {
          if (item.tempId !== tempId) return item;

          const updated = { ...item, [field]: value };

          // Recalculate total when quantity, price, or discount changes
          if (field === "quantity" || field === "unitPriceCents" || field === "discountPercent") {
            updated.totalCents = calculateLineTotal(
              field === "quantity" ? (value as number) : updated.quantity,
              field === "unitPriceCents" ? (value as number) : updated.unitPriceCents,
              field === "discountPercent" ? (value as number) : updated.discountPercent
            );
          }

          return updated;
        })
      );
      setHasChanges(true);
    },
    []
  );

  // Handle notes change
  const handleNotesChange = useCallback((value: string) => {
    setNotes(value);
    setHasChanges(true);
  }, []);

  // Check if save is possible
  const canSave = lineItems.some(
    (item) => item.description.trim() && item.quantity > 0
  ) && !saveMutation.isPending;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Quote Builder
              {currentVersion && (
                <Badge variant="secondary">v{currentVersion.versionNumber}</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Add products and services to build your quote
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {onViewHistory && (
              <Button variant="outline" size="sm" onClick={onViewHistory}>
                <History className="h-4 w-4 mr-2" />
                History
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Unsaved changes warning */}
        {hasChanges && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Unsaved Changes</AlertTitle>
            <AlertDescription>
              You have unsaved changes. Save to create a new quote version.
            </AlertDescription>
          </Alert>
        )}

        {/* Line Items Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Description</TableHead>
                <TableHead className="w-[12%] text-right">Qty</TableHead>
                <TableHead className="w-[18%] text-right">Unit Price</TableHead>
                <TableHead className="w-[12%] text-right">Discount %</TableHead>
                <TableHead className="w-[15%] text-right">Total</TableHead>
                <TableHead className="w-[3%]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineItems.map((item) => (
                <TableRow key={item.tempId}>
                  <TableCell>
                    <Input
                      value={item.description}
                      onChange={(e) =>
                        updateLineItem(item.tempId, "description", e.target.value)
                      }
                      placeholder="Product or service description"
                      className="border-0 shadow-none focus-visible:ring-0 px-0"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={item.quantity}
                      onChange={(e) =>
                        updateLineItem(item.tempId, "quantity", parseInt(e.target.value) || 0)
                      }
                      className="border-0 shadow-none focus-visible:ring-0 px-0 text-right"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end">
                      <span className="text-muted-foreground mr-1">$</span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={(item.unitPriceCents / 100).toFixed(2)}
                        onChange={(e) =>
                          updateLineItem(
                            item.tempId,
                            "unitPriceCents",
                            Math.round(parseFloat(e.target.value) * 100) || 0
                          )
                        }
                        className="border-0 shadow-none focus-visible:ring-0 px-0 text-right w-24"
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={item.discountPercent ?? ""}
                      onChange={(e) =>
                        updateLineItem(
                          item.tempId,
                          "discountPercent",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      placeholder="0"
                      className="border-0 shadow-none focus-visible:ring-0 px-0 text-right"
                    />
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    <FormatAmount amount={item.totalCents} cents={true} />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removeLineItem(item.tempId)}
                      disabled={lineItems.length === 1 && !item.description}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={6} className="p-0">
                  <Button
                    variant="ghost"
                    className="w-full rounded-none h-10"
                    onClick={addLineItem}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Line Item
                  </Button>
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span><FormatAmount amount={subtotal} cents={true} /></span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">GST (10%)</span>
              <span><FormatAmount amount={taxAmount} cents={true} /></span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold text-lg">
              <span>Total</span>
              <span><FormatAmount amount={total} cents={true} /></span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="quote-notes">Notes</Label>
          <Textarea
            id="quote-notes"
            value={notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="Additional notes, terms, or conditions..."
            rows={3}
          />
        </div>
      </CardContent>

      <CardFooter className="flex justify-between">
        <div className="text-sm text-muted-foreground">
          {lineItems.filter((i) => i.description.trim()).length} line item(s)
        </div>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={!canSave}
        >
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending
            ? "Saving..."
            : currentVersion
            ? "Save New Version"
            : "Create Quote"}
        </Button>
      </CardFooter>
    </Card>
  );
});

export default QuoteBuilder;
