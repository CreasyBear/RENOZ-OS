/**
 * ProductRelationsTab Component
 *
 * Displays and manages product relationships and bundle components.
 */
import { Plus, Trash2, ArrowRight, Package, Link2 } from "lucide-react";
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
import { EmptyState } from "@/components/shared/empty-state";

interface ProductRelation {
  id: string;
  relatedProductId: string;
  relationType: string;
  relatedProduct?: {
    id: string;
    name: string;
    sku: string;
  };
}

interface BundleComponent {
  id: string;
  componentProductId: string;
  quantity: number;
  isOptional: boolean;
  componentProduct?: {
    id: string;
    name: string;
    sku: string;
  };
}

interface ProductRelationsTabProps {
  productId: string;
  relations: ProductRelation[];
  productType: string;
  bundleComponents?: BundleComponent[];
  onAddComponent?: () => void;
  onRemoveComponent?: (componentId: string) => void;
  onAddRelation?: () => void;
  onRemoveRelation?: (relationId: string) => void;
}

// Relation type labels and colors
const relationTypes: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  accessory: { label: "Accessory", variant: "default" },
  alternative: { label: "Alternative", variant: "secondary" },
  cross_sell: { label: "Cross-Sell", variant: "outline" },
  up_sell: { label: "Up-Sell", variant: "outline" },
  related: { label: "Related", variant: "secondary" },
};

export function ProductRelationsTab({
  productId: _productId,
  relations,
  productType,
  bundleComponents = [],
  onAddComponent,
  onRemoveComponent,
  onAddRelation,
  onRemoveRelation,
}: ProductRelationsTabProps) {
  const isBundle = productType === "bundle";

  return (
    <div className="space-y-6">
      {/* Bundle components (only for bundle products) */}
      {isBundle && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Bundle Components
              </CardTitle>
              <CardDescription>
                Products included when this bundle is purchased
              </CardDescription>
            </div>
            <Button
              size="sm"
              disabled={!onAddComponent}
              title={!onAddComponent ? "Bundle component management is not available yet" : undefined}
              onClick={() => onAddComponent?.()}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Component
            </Button>
          </CardHeader>
          <CardContent>
            {bundleComponents.length === 0 ? (
              <EmptyState
                title="No bundle components"
                message="Add products to include in this bundle"
                primaryAction={
                  onAddComponent
                    ? {
                        label: "Add Component",
                        onClick: onAddComponent,
                      }
                    : undefined
                }
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead>Optional</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bundleComponents.map((component) => (
                    <TableRow key={component.id}>
                      <TableCell className="font-medium">
                        {component.componentProduct?.name ?? "Unknown Product"}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {component.componentProduct?.sku ?? "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">×{component.quantity}</Badge>
                      </TableCell>
                      <TableCell>
                        {component.isOptional ? (
                          <Badge variant="secondary">Optional</Badge>
                        ) : (
                          <Badge variant="default">Required</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          disabled={!onRemoveComponent}
                          title={!onRemoveComponent ? "Bundle component removal is not available yet" : undefined}
                          onClick={() => onRemoveComponent?.(component.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Product relations */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Related Products
            </CardTitle>
            <CardDescription>
              Products that are related to this product
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={!onAddRelation}
            title={!onAddRelation ? "Product relation management is not available yet" : undefined}
            onClick={() => onAddRelation?.()}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Relation
          </Button>
        </CardHeader>
        <CardContent>
          {relations.length === 0 ? (
              <EmptyState
                title="No related products"
                message="Link related products to improve cross-selling and product discovery"
                primaryAction={
                  onAddRelation
                    ? {
                        label: "Add Relation",
                        onClick: onAddRelation,
                      }
                    : undefined
                }
              />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Relation Type</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {relations.map((relation) => {
                  const typeInfo = relationTypes[relation.relationType] ?? {
                    label: relation.relationType,
                    variant: "secondary" as const,
                  };

                  return (
                    <TableRow key={relation.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          <Badge variant={typeInfo.variant}>{typeInfo.label}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {relation.relatedProduct?.name ?? "Unknown Product"}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {relation.relatedProduct?.sku ?? "-"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          disabled={!onRemoveRelation}
                          title={!onRemoveRelation ? "Relation removal is not available yet" : undefined}
                          onClick={() => onRemoveRelation?.(relation.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Relation types info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Relation Types</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="font-medium">Accessory</dt>
              <dd className="text-muted-foreground">
                Products that complement this product (e.g., cases for phones)
              </dd>
            </div>
            <div>
              <dt className="font-medium">Alternative</dt>
              <dd className="text-muted-foreground">
                Similar products the customer might consider instead
              </dd>
            </div>
            <div>
              <dt className="font-medium">Cross-Sell</dt>
              <dd className="text-muted-foreground">
                Products to suggest during checkout (&quot;Customers also bought&quot;)
              </dd>
            </div>
            <div>
              <dt className="font-medium">Up-Sell</dt>
              <dd className="text-muted-foreground">
                Higher-tier versions of this product
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
