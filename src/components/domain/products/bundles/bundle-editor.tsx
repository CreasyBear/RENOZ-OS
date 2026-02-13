/**
 * BundleEditor Component
 *
 * Edit bundle components with drag-and-drop reordering, quantity adjustment, and validation.
 */
import { useState } from "react";
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
  useBundleComponents,
  useCalculateBundlePrice,
  useValidateBundle,
  useAddBundleComponent,
  useUpdateBundleComponent,
  useRemoveBundleComponent,
  type BundleComponent,
} from "@/hooks/products";

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
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [deletingComponent, setDeletingComponent] = useState<BundleComponent | null>(null);

  // Queries
  const { data: componentsData, isLoading } = useBundleComponents({
    bundleProductId,
  });
  const { data: priceData } = useCalculateBundlePrice({
    bundleProductId,
  });
  const { data: validation, refetch: refetchValidation } = useValidateBundle({
    bundleProductId,
  });

  // Mutations
  const addComponent = useAddBundleComponent();
  const updateComponent = useUpdateBundleComponent();
  const removeComponent = useRemoveBundleComponent();

  const components = componentsData?.components ?? [];
  const priceBreakdown = priceData
    ? {
        componentTotal: priceData.componentTotal,
        savings: priceData.componentTotal - bundlePrice,
        savingsPercent: priceData.savingsPercent,
      }
    : null;

  // Add components from selector
  const handleAddComponents = async (
    newComponents: Array<{
      product: { id: string };
      quantity: number;
      isOptional: boolean;
    }>
  ) => {
    for (const c of newComponents) {
      await addComponent.mutateAsync({
        bundleProductId,
        component: {
          componentProductId: c.product.id,
          quantity: c.quantity,
          isOptional: c.isOptional,
        },
      });
    }
    onComponentsChange?.();
  };

  // Update component quantity
  const handleQuantityChange = (component: BundleComponent, quantity: number) => {
    if (quantity < 1) return;
    updateComponent.mutate(
      {
        id: component.id,
        quantity,
        bundleProductId,
      },
      {
        onSuccess: () => onComponentsChange?.(),
      }
    );
  };

  // Toggle optional status
  const handleToggleOptional = (component: BundleComponent) => {
    updateComponent.mutate(
      {
        id: component.id,
        isOptional: !component.isOptional,
        bundleProductId,
      },
      {
        onSuccess: () => onComponentsChange?.(),
      }
    );
  };

  // Remove component
  const handleRemove = () => {
    if (!deletingComponent) return;
    removeComponent.mutate(
      {
        id: deletingComponent.id,
        bundleProductId,
      },
      {
        onSuccess: () => {
          setDeletingComponent(null);
          onComponentsChange?.();
        },
      }
    );
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
                  onClick={() => refetchValidation()}
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </div>
              {validation.errors.length > 0 && (
                <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                  {validation.errors.map((e: string, i: number) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              )}
              {validation.warnings.length > 0 && (
                <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside">
                  {validation.warnings.map((w: string, i: number) => (
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
