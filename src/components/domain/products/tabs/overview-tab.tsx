/**
 * ProductOverviewTab Component
 *
 * Displays product overview information including description,
 * specifications, metadata, and bundle components.
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
  barcode: string | null;
  weight: number | null;
  dimensions: { length?: number | null; width?: number | null; height?: number | null; unit?: string | null } | null;
  specifications: Record<string, unknown> | null;
  tags: string[] | null;
  seoTitle: string | null;
  seoDescription: string | null;
  xeroItemId: string | null;
  isActive: boolean;
  isSellable: boolean;
  isPurchasable: boolean;
  isSerialized: boolean;
  trackInventory: boolean;
  reorderPoint: number;
  reorderQty: number;
  createdAt: Date;
  updatedAt: Date;
  // Additional fields from Drizzle schema
  deletedAt?: Date | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  organizationId?: string;
  categoryId?: string | null;
  basePrice?: number | null;
  costPrice?: number | null;
  unitOfMeasure?: string | null;
  leadTimeDays?: number | null;
  warrantyMonths?: number | null;
  lowStockThreshold?: number | null;
}

interface Category {
  id: string;
  name: string;
  description: string | null;
}

interface ProductImage {
  id: string;
  imageUrl: string;
  altText: string | null;
  isPrimary: boolean;
}

interface BundleComponent {
  id: string;
  componentProductId: string;
  quantity: number;
  isOptional: boolean;
}

interface ProductOverviewTabProps {
  product: Product;
  category: Category | null;
  images: ProductImage[];
  bundleComponents?: BundleComponent[];
}

export function ProductOverviewTab({
  product,
  category,
  images,
  bundleComponents,
}: ProductOverviewTabProps) {
  const primaryImage = images.find((img) => img.isPrimary) ?? images[0];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Main info column */}
      <div className="lg:col-span-2 space-y-6">
        {/* Description */}
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            {product.description ? (
              <p className="whitespace-pre-wrap">{product.description}</p>
            ) : (
              <p className="text-muted-foreground italic">No description provided</p>
            )}
          </CardContent>
        </Card>

        {/* Specifications */}
        {product.specifications && Object.keys(product.specifications).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Specifications</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4">
                {Object.entries(product.specifications).map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-sm text-muted-foreground capitalize">
                      {key.replace(/_/g, " ")}
                    </dt>
                    <dd className="font-medium">{String(value)}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        )}

        {/* Bundle Components (if bundle type) */}
        {product.type === "bundle" && bundleComponents && bundleComponents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Bundle Components</CardTitle>
              <CardDescription>
                Products included in this bundle
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {bundleComponents.map((component) => (
                  <li
                    key={component.id}
                    className="flex items-center justify-between p-2 border rounded"
                  >
                    <span>Component: {component.componentProductId}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Qty: {component.quantity}</Badge>
                      {component.isOptional && (
                        <Badge variant="secondary">Optional</Badge>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* SEO */}
        {(product.seoTitle || product.seoDescription) && (
          <Card>
            <CardHeader>
              <CardTitle>SEO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {product.seoTitle && (
                <div>
                  <p className="text-sm text-muted-foreground">Title</p>
                  <p className="font-medium">{product.seoTitle}</p>
                </div>
              )}
              {product.seoDescription && (
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p>{product.seoDescription}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sidebar column */}
      <div className="space-y-6">
        {/* Primary image */}
        {primaryImage && (
          <Card>
            <CardContent className="pt-6">
              <img
                src={primaryImage.imageUrl}
                alt={primaryImage.altText ?? product.name}
                className="w-full h-48 object-cover rounded-lg"
              />
            </CardContent>
          </Card>
        )}

        {/* Details */}
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {category && (
              <div>
                <p className="text-sm text-muted-foreground">Category</p>
                <p className="font-medium">{category.name}</p>
              </div>
            )}

            {product.barcode && (
              <div>
                <p className="text-sm text-muted-foreground">Barcode</p>
                <p className="font-mono">{product.barcode}</p>
              </div>
            )}

            {product.weight && (
              <div>
                <p className="text-sm text-muted-foreground">Weight</p>
                <p>{product.weight} kg</p>
              </div>
            )}

            {product.dimensions && Object.keys(product.dimensions).length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground">Dimensions</p>
                <p>
                  {Object.entries(product.dimensions)
                    .filter(([k]) => ["length", "width", "height"].includes(k))
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(" x ")}
                </p>
              </div>
            )}

            {product.xeroItemId && (
              <div>
                <p className="text-sm text-muted-foreground">Xero Item ID</p>
                <p className="font-mono text-sm">{product.xeroItemId}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tags */}
        {product.tags && product.tags.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {product.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Track Inventory</span>
              <Badge variant={product.trackInventory ? "default" : "secondary"}>
                {product.trackInventory ? "Yes" : "No"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Serialized</span>
              <Badge variant={product.isSerialized ? "default" : "secondary"}>
                {product.isSerialized ? "Yes" : "No"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Sellable</span>
              <Badge variant={product.isSellable ? "default" : "secondary"}>
                {product.isSellable ? "Yes" : "No"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Purchasable</span>
              <Badge variant={product.isPurchasable ? "default" : "secondary"}>
                {product.isPurchasable ? "Yes" : "No"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Timestamps */}
        <Card>
          <CardContent className="pt-6 space-y-2 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Created</span>
              <span>{new Date(product.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Updated</span>
              <span>{new Date(product.updatedAt).toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
