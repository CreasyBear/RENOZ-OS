/**
 * BundleEditor Component
 *
 * Edit bundle components with drag-and-drop reordering, quantity adjustment, and validation.
 */
import { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  GripVertical,
  AlertTriangle,
  CheckCircle2,
  Package,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ComponentSelector } from "./component-selector";
import { TruncateTooltip } from "@/components/shared/truncate-tooltip";
import {
  getBundleComponents,
  addBundleComponent,
  updateBundleComponent,
  removeBundleComponent,
  calculateBundlePrice,
  validateBundle,
} from "@/server/functions/products/product-bundles";

interface BundleComponent {
  id: string;
  componentProductId: string;
  quantity: number;
  isOptional: boolean;
  sortOrder: number;
  componentProduct: {
    id: string;
    sku: string;
    name: string;
    basePrice: number | null;
    type: string;
    status: string;
  };
}

interface BundleEditorProps {
  bundleProductId: string;
  bundleName: string;
  bundlePrice: number;
  onComponentsChange?: () => void;
}

// Format price as currency
function formatPrice(price: number | null): string {
  if (price === null) return "-";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(price);
}

export function BundleEditor({
  bundleProductId,
  bundleName: _bundleName,
  bundlePrice,
  onComponentsChange,
}: BundleEditorProps) {
  const [components, setComponents] = useState<BundleComponent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [deletingComponent, setDeletingComponent] = useState<BundleComponent | null>(null);
  const [validation, setValidation] = useState<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  } | null>(null);
  const [priceBreakdown, setPriceBreakdown] = useState<{
    componentTotal: number;
    savings: number;
    savingsPercent: number;
  } | null>(null);

  // Load bundle components
  const loadComponents = async () => {
    setIsLoading(true);
    try {
      const result = await getBundleComponents({ data: { bundleProductId } });
      setComponents(result.components);
      setPriceBreakdown({
        componentTotal: result.calculatedPrice,
        savings: result.calculatedPrice - bundlePrice,
        savingsPercent:
          result.calculatedPrice > 0
            ? ((result.calculatedPrice - bundlePrice) / result.calculatedPrice) * 100
            : 0,
      });
    } catch (error) {
      console.error("Failed to load components:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Validate bundle
  const runValidation = async () => {
    try {
      const result = await validateBundle({ data: { bundleProductId } });
      setValidation(result);
    } catch (error) {
      console.error("Failed to validate bundle:", error);
    }
  };

  useEffect(() => {
    loadComponents();
    runValidation();
  }, [bundleProductId]);

  // Add components from selector
  const handleAddComponents = async (
    newComponents: Array<{
      product: { id: string };
      quantity: number;
      isOptional: boolean;
    }>
  ) => {
    for (const c of newComponents) {
      try {
        await addBundleComponent({
          data: {
            bundleProductId,
            component: {
              componentProductId: c.product.id,
              quantity: c.quantity,
              isOptional: c.isOptional,
            },
          },
        });
      } catch (error) {
        console.error("Failed to add component:", error);
      }
    }
    loadComponents();
    runValidation();
    onComponentsChange?.();
  };

  // Update component quantity
  const handleQuantityChange = async (component: BundleComponent, quantity: number) => {
    if (quantity < 1) return;
    try {
      await updateBundleComponent({
        data: { id: component.id, quantity },
      });
      setComponents((prev) =>
        prev.map((c) => (c.id === component.id ? { ...c, quantity } : c))
      );
      // Recalculate price
      const priceResult = await calculateBundlePrice({
        data: { bundleProductId, includeOptional: false },
      });
      setPriceBreakdown({
        componentTotal: priceResult.componentTotal,
        savings: priceResult.componentTotal - bundlePrice,
        savingsPercent: priceResult.savingsPercent,
      });
      onComponentsChange?.();
    } catch (error) {
      console.error("Failed to update quantity:", error);
    }
  };

  // Toggle optional status
  const handleToggleOptional = async (component: BundleComponent) => {
    try {
      await updateBundleComponent({
        data: { id: component.id, isOptional: !component.isOptional },
      });
      setComponents((prev) =>
        prev.map((c) =>
          c.id === component.id ? { ...c, isOptional: !c.isOptional } : c
        )
      );
      onComponentsChange?.();
    } catch (error) {
      console.error("Failed to toggle optional:", error);
    }
  };

  // Remove component
  const handleRemove = async () => {
    if (!deletingComponent) return;
    try {
      await removeBundleComponent({ data: { id: deletingComponent.id } });
      setComponents((prev) => prev.filter((c) => c.id !== deletingComponent.id));
      setDeletingComponent(null);
      runValidation();
      onComponentsChange?.();
    } catch (error) {
      console.error("Failed to remove component:", error);
    }
  };

  // Calculate line total
  const getLineTotal = (component: BundleComponent): number => {
    return (component.componentProduct.basePrice ?? 0) * component.quantity;
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Bundle Components
            </CardTitle>
            <CardDescription>
              Manage the products included in this bundle
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setIsSelectorOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Components
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Validation status */}
          {validation && (
            <div
              className={`p-3 rounded-lg border ${
                validation.valid
                  ? "bg-green-50 border-green-200"
                  : "bg-yellow-50 border-yellow-200"
              }`}
            >
              <div className="flex items-center gap-2">
                {validation.valid ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                )}
                <span
                  className={`text-sm font-medium ${
                    validation.valid ? "text-green-800" : "text-yellow-800"
                  }`}
                >
                  {validation.valid ? "Bundle configuration is valid" : "Bundle has issues"}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-7"
                  onClick={runValidation}
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </div>
              {validation.errors.length > 0 && (
                <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                  {validation.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              )}
              {validation.warnings.length > 0 && (
                <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside">
                  {validation.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Components table */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : components.length === 0 ? (
            <EmptyState
              title="No components"
              message="Add products to include in this bundle"
              primaryAction={{
                label: "Add Components",
                onClick: () => setIsSelectorOpen(true),
              }}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]" />
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="w-[100px] text-center">Qty</TableHead>
                  <TableHead className="text-right">Line Total</TableHead>
                  <TableHead className="w-[100px] text-center">Optional</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {components.map((component) => (
                  <TableRow key={component.id}>
                    <TableCell>
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    </TableCell>
                    <TableCell>
                      <div>
                        <TruncateTooltip
                          text={component.componentProduct.name}
                          maxLength={30}
                          maxWidth="max-w-[250px]"
                          className="font-medium"
                        />
                        <p className="text-sm text-muted-foreground">
                          {component.componentProduct.sku}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatPrice(component.componentProduct.basePrice)}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        value={component.quantity}
                        onChange={(e) =>
                          handleQuantityChange(component, parseInt(e.target.value) || 1)
                        }
                        className="w-20 h-8 text-center mx-auto"
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatPrice(getLineTotal(component))}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={component.isOptional}
                        onCheckedChange={() => handleToggleOptional(component)}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => setDeletingComponent(component)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Price summary */}
          {components.length > 0 && priceBreakdown && (
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Components Total</p>
                <p className="text-lg font-bold">{formatPrice(priceBreakdown.componentTotal)}</p>
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm text-muted-foreground">Bundle Price</p>
                <p className="text-lg font-bold">{formatPrice(bundlePrice)}</p>
              </div>
              <div className="text-right space-y-1">
                <p className="text-sm text-muted-foreground">Customer Savings</p>
                <div className="flex items-center gap-2 justify-end">
                  <p className="text-lg font-bold text-green-600">
                    {formatPrice(priceBreakdown.savings)}
                  </p>
                  <Badge variant="secondary">
                    {priceBreakdown.savingsPercent.toFixed(0)}% off
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Component Selector Dialog */}
      <ComponentSelector
        open={isSelectorOpen}
        onOpenChange={setIsSelectorOpen}
        onSelect={handleAddComponents}
        excludeProductIds={components.map((c) => c.componentProductId)}
        bundleProductId={bundleProductId}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingComponent} onOpenChange={() => setDeletingComponent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Component</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {deletingComponent?.componentProduct.name} from
              this bundle?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
