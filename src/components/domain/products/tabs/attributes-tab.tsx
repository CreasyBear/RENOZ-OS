/**
 * ProductAttributesTab Component
 *
 * Displays and manages dynamic product attributes with type-specific inputs.
 */
import { useState, useCallback, useEffect } from "react";
import { Plus, Pencil, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  AttributeValueEditor,
  type AttributeDefinition,
} from "../attributes/attribute-value-editor";
import {
  getProductAttributeValues,
  deleteProductAttribute,
  checkRequiredAttributes,
} from "@/server/functions/products/product-attributes";

interface ProductAttributesTabProps {
  productId: string;
  onAttributesChange?: () => void;
}

// Format attribute value for display based on type
function formatValue(value: AttributeDefinition["value"], type: string): string {
  if (value === null || value === undefined) return "-";

  switch (type) {
    case "boolean":
      return value ? "Yes" : "No";
    case "number":
      return String(value);
    case "date":
      try {
        return new Date(value as string).toLocaleDateString();
      } catch {
        return String(value);
      }
    case "select":
    case "multiselect":
      if (Array.isArray(value)) {
        return value.join(", ");
      }
      return String(value);
    default:
      return String(value);
  }
}

// Get badge variant for attribute type
function getTypeBadge(type: string): "default" | "secondary" | "outline" {
  switch (type) {
    case "boolean":
      return "default";
    case "number":
      return "secondary";
    case "select":
    case "multiselect":
      return "outline";
    default:
      return "secondary";
  }
}

export function ProductAttributesTab({
  productId,
  onAttributesChange,
}: ProductAttributesTabProps) {
  const [attributes, setAttributes] = useState<AttributeDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingAttribute, setEditingAttribute] = useState<AttributeDefinition | null>(null);
  const [deletingAttribute, setDeletingAttribute] = useState<AttributeDefinition | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [validation, setValidation] = useState<{
    complete: boolean;
    missing: Array<{ attributeId: string; attributeName: string }>;
  } | null>(null);

  // Load attributes
  const loadAttributes = useCallback(async () => {
    setIsLoading(true);
    try {
      const [attrValues, validationResult] = await Promise.all([
        getProductAttributeValues({ data: { productId } }),
        checkRequiredAttributes({ data: { productId } }),
      ]);
      setAttributes(attrValues as AttributeDefinition[]);
      setValidation(validationResult);
    } catch (error) {
      console.error("Failed to load attributes:", error);
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadAttributes();
  }, [loadAttributes]);

  // Handle attribute saved
  const handleSaved = async () => {
    await loadAttributes();
    onAttributesChange?.();
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deletingAttribute) return;

    setIsDeleting(true);
    try {
      await deleteProductAttribute({
        data: {
          productId,
          attributeId: deletingAttribute.attributeId,
        },
      });
      await loadAttributes();
      setDeletingAttribute(null);
      onAttributesChange?.();
    } catch (error) {
      console.error("Failed to delete attribute:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Group attributes
  const withValues = attributes.filter((a) => a.value !== null);
  const withoutValues = attributes.filter((a) => a.value === null);

  return (
    <div className="space-y-6">
      {/* Validation status */}
      {validation && (
        <div
          className={`p-3 rounded-lg border ${
            validation.complete
              ? "bg-green-50 border-green-200"
              : "bg-amber-50 border-amber-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {validation.complete ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-amber-600" />
            )}
            <span
              className={`text-sm font-medium ${
                validation.complete ? "text-green-800" : "text-amber-800"
              }`}
            >
              {validation.complete
                ? "All required attributes are set"
                : `${validation.missing.length} required attribute${validation.missing.length !== 1 ? "s" : ""} missing`}
            </span>
          </div>
          {!validation.complete && validation.missing.length > 0 && (
            <ul className="mt-2 text-sm text-amber-700">
              {validation.missing.map((m) => (
                <li key={m.attributeId}>• {m.attributeName}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Attribute values */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Product Attributes</CardTitle>
            <CardDescription>
              Custom attributes and specifications for this product
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : attributes.length === 0 ? (
            <EmptyState
              title="No attributes available"
              message="No attributes are defined for this product's category"
            />
          ) : withValues.length === 0 ? (
            <EmptyState
              title="No attributes set"
              message="Add custom attributes to provide additional product information"
              primaryAction={{
                label: "Set Attribute",
                onClick: () => withoutValues.length > 0 && setEditingAttribute(withoutValues[0]),
              }}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Attribute</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Required</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withValues.map((attr) => (
                  <TableRow key={attr.attributeId}>
                    <TableCell className="font-medium">
                      {attr.attributeName}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getTypeBadge(attr.attributeType)}>
                        {attr.attributeType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {formatValue(attr.value, attr.attributeType)}
                    </TableCell>
                    <TableCell>
                      {attr.isRequired ? (
                        <Badge variant="destructive">Required</Badge>
                      ) : (
                        <span className="text-muted-foreground">Optional</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setEditingAttribute(attr)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {!attr.isRequired && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => setDeletingAttribute(attr)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Unset attributes */}
      {withoutValues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Available Attributes</CardTitle>
            <CardDescription>
              Attributes that haven't been set for this product
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {withoutValues.map((attr) => (
                <Button
                  key={attr.attributeId}
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingAttribute(attr)}
                  className={attr.isRequired ? "border-amber-300 bg-amber-50" : ""}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {attr.attributeName}
                  {attr.isRequired && (
                    <Badge variant="destructive" className="ml-2 text-xs">
                      Required
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attribute info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">About Attributes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              Product attributes allow you to add custom fields to your products.
              These can be used for filtering, search, and display.
            </p>
            <p>
              <strong>Supported types:</strong> Text, Number, Boolean, Date, Select, Multi-select
            </p>
            <p>
              <strong>Required attributes</strong> must be set before the product can be published.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Value editor dialog */}
      <AttributeValueEditor
        key={editingAttribute?.attributeId ?? 'new'}
        productId={productId}
        attribute={editingAttribute}
        open={!!editingAttribute}
        onOpenChange={(open) => {
          if (!open) setEditingAttribute(null);
        }}
        onSaved={handleSaved}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingAttribute} onOpenChange={() => setDeletingAttribute(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Attribute Value</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the value for "{deletingAttribute?.attributeName}"?
              You can set it again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
