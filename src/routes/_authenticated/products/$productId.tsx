/**
 * Product Detail Route
 *
 * Complete product management interface with tabbed sections.
 *
 * LAYOUT: full-width (data-rich detail view)
 *
 * @see UI_UX_STANDARDIZATION_PRD.md
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Copy,
  MoreHorizontal,
  Package,
  DollarSign,
  Image,
  Tags,
  Link2,
  Boxes,
} from "lucide-react";

import { PageLayout, RouteErrorFallback } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { ProductDetailSkeleton } from "@/components/skeletons/products/detail-skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { getProduct } from "@/server/functions/products/products";
import { useDeleteProduct, useDuplicateProduct } from "@/hooks/products";
import { useConfirmation } from "@/hooks";
import { ProductOverviewTab } from "@/components/domain/products/tabs/overview-tab";
import { ProductPricingTab } from "@/components/domain/products/tabs/pricing-tab";
import { ProductInventoryTab } from "@/components/domain/products/tabs/inventory-tab";
import { ProductImagesTab } from "@/components/domain/products/tabs/images-tab";
import { ProductAttributesTab } from "@/components/domain/products/tabs/attributes-tab";
import { ProductRelationsTab } from "@/components/domain/products/tabs/relations-tab";
import { FormatAmount } from "@/components/shared";

export const Route = createFileRoute("/_authenticated/products/$productId")({
  loader: async ({ params }) => {
    const productData = await getProduct({ data: { id: params.productId } });
    return productData;
  },
  component: ProductDetailPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/products" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header title="Loading..." />
      <PageLayout.Content>
        <ProductDetailSkeleton tabCount={6} />
      </PageLayout.Content>
    </PageLayout>
  ),
});

// Status badge styling
const statusStyles: Record<string, { variant: "default" | "secondary" | "destructive"; label: string }> = {
  active: { variant: "default", label: "Active" },
  inactive: { variant: "secondary", label: "Inactive" },
  discontinued: { variant: "destructive", label: "Discontinued" },
};

// Type badge styling
const typeLabels: Record<string, string> = {
  physical: "Physical",
  service: "Service",
  digital: "Digital",
  bundle: "Bundle",
};

function ProductDetailPage() {
  const navigate = useNavigate();
  const confirm = useConfirmation();
  const loaderData = Route.useLoaderData();
  const { product, category, images, priceTiers, attributeValues: _attributeValues, relations, bundleComponents } = loaderData;

  const [activeTab, setActiveTab] = useState("overview");

  const deleteMutation = useDeleteProduct();
  const duplicateMutation = useDuplicateProduct();

  const handleDelete = useCallback(async () => {
    const result = await confirm.confirm({
      title: "Delete Product",
      description: `Are you sure you want to delete "${product.name}"? This action cannot be undone.`,
      confirmLabel: "Delete",
      variant: "destructive",
    });

    if (result.confirmed) {
      deleteMutation.mutate(product.id, {
        onSuccess: () => {
          navigate({ to: "/products" });
        },
      });
    }
  }, [confirm, deleteMutation, navigate, product.id, product.name]);

  const handleDuplicate = useCallback(async () => {
    duplicateMutation.mutate(product.id, {
      onSuccess: (newProduct) => {
        navigate({ to: "/products/$productId", params: { productId: newProduct.id } });
      },
    });
  }, [duplicateMutation, navigate, product.id]);

  const statusStyle = statusStyles[product.status] ?? statusStyles.active;

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title={
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ to: "/products" as string })}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <span>{product.name}</span>
                <Badge variant={statusStyle.variant}>{statusStyle.label}</Badge>
                <Badge variant="outline">{typeLabels[product.type]}</Badge>
              </div>
              <p className="text-sm text-muted-foreground font-normal">
                SKU: {product.sku}
                {category && ` \u2022 ${category.name}`}
              </p>
            </div>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigate({ to: `/products/${product.id}/edit` as string })}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={handleDuplicate}>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate Product
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={handleDelete}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Product
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      <PageLayout.Content>
        {/* Price summary card */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Base Price</p>
                <FormatAmount amount={product.basePrice ?? 0} cents={true} size="2xl" />
              </div>
              {product.costPrice && (
                <div>
                  <p className="text-sm text-muted-foreground">Cost Price</p>
                  <FormatAmount amount={product.costPrice} cents={true} size="xl" />
                </div>
              )}
              {product.costPrice && product.basePrice && (
                <div>
                  <p className="text-sm text-muted-foreground">Margin</p>
                  <p className="text-xl">
                    {(((product.basePrice - product.costPrice) / product.basePrice) * 100).toFixed(1)}%
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Price Tiers</p>
                <p className="text-xl">{priceTiers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabbed interface */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview" className="gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="pricing" className="gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Pricing</span>
            </TabsTrigger>
            <TabsTrigger value="inventory" className="gap-2">
              <Boxes className="h-4 w-4" />
              <span className="hidden sm:inline">Inventory</span>
            </TabsTrigger>
            <TabsTrigger value="images" className="gap-2">
              <Image className="h-4 w-4" />
              <span className="hidden sm:inline">Images</span>
            </TabsTrigger>
            <TabsTrigger value="attributes" className="gap-2">
              <Tags className="h-4 w-4" />
              <span className="hidden sm:inline">Attributes</span>
            </TabsTrigger>
            <TabsTrigger value="relations" className="gap-2">
              <Link2 className="h-4 w-4" />
              <span className="hidden sm:inline">Relations</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <ProductOverviewTab
              product={product}
              category={category}
              images={images}
              bundleComponents={bundleComponents}
            />
          </TabsContent>

          <TabsContent value="pricing" className="mt-6">
            <ProductPricingTab
              productId={product.id}
              basePrice={product.basePrice ?? 0}
              priceTiers={priceTiers}
            />
          </TabsContent>

          <TabsContent value="inventory" className="mt-6">
            <ProductInventoryTab
              productId={product.id}
              trackInventory={product.trackInventory ?? false}
              isSerialized={product.isSerialized ?? false}
            />
          </TabsContent>

          <TabsContent value="images" className="mt-6">
            <ProductImagesTab productId={product.id} images={images} />
          </TabsContent>

          <TabsContent value="attributes" className="mt-6">
            <ProductAttributesTab productId={product.id} />
          </TabsContent>

          <TabsContent value="relations" className="mt-6">
            <ProductRelationsTab
              productId={product.id}
              relations={relations}
              productType={product.type}
              bundleComponents={bundleComponents}
            />
          </TabsContent>
        </Tabs>
      </PageLayout.Content>
    </PageLayout>
  );
}
