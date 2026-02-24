/**
 * Product Detail Container
 *
 * Handles data fetching, mutations, and state management for product detail view.
 * Implements render props pattern for flexible header/action composition.
 *
 * @source product from useProduct hook
 * @source inventorySummary from useProductInventorySummary hook
 * @source activities from useUnifiedActivities hook
 *
 * @see STANDARDS.md - Container/Presenter pattern
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 */

import { useState, useCallback } from 'react';
import {
  Edit,
  Copy,
  Printer,
  MoreHorizontal,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ErrorState } from '@/components/shared/error-state';
import { EntityActivityLogger } from '@/components/shared/activity';
import { useEntityActivityLogging } from '@/hooks/activities/use-entity-activity-logging';
import { toastSuccess, toastError } from '@/hooks';
import { useProduct, useDeleteProduct, useDuplicateProduct, useUpdateProduct, useProductInventorySummary, useCustomerPrices } from '@/hooks/products';
import { useUnifiedActivities } from '@/hooks/activities';
import { useTrackView } from '@/hooks/search';
import { isGetProductResponse, type GetProductResponse } from '@/lib/schemas/products';
import { ProductDetailView } from '../views/product-detail-view';

// ============================================================================
// TYPES
// ============================================================================

export interface ProductDetailContainerRenderProps {
  /** Header action buttons (Edit, More menu) */
  headerActions: React.ReactNode;
  /** Main content (ProductDetailView) */
  content: React.ReactNode;
}

export interface ProductDetailContainerProps {
  /** Product ID to display */
  productId: string;
  /** Pre-loaded product data (from route loader); same shape as getProduct return */
  loaderData?: GetProductResponse;
  /** Callback when user navigates back */
  onBack?: () => void;
  /** Callback after successful duplication */
  onDuplicate?: (newProductId: string) => void;
  /** Callback when user chooses to edit the product */
  onEdit?: (productId: string) => void;
  /** Render props pattern for layout composition */
  children?: (props: ProductDetailContainerRenderProps) => React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function ProductDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-[400px] w-full" />
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ProductDetailContainer({
  productId,
  loaderData,
  onBack,
  onDuplicate,
  onEdit,
  children,
  className,
}: ProductDetailContainerProps) {
  // ─────────────────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('overview');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [showMetaPanel, setShowMetaPanel] = useState(true);

  // ─────────────────────────────────────────────────────────────────────────
  // Panel Toggle Handler
  // ─────────────────────────────────────────────────────────────────────────
  const handleToggleMetaPanel = useCallback(() => {
    setShowMetaPanel((prev) => !prev);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Data Fetching (use loader data if available, otherwise fetch)
  // ─────────────────────────────────────────────────────────────────────────
  const {
    data: fetchedData,
    isLoading,
    error,
    refetch,
  } = useProduct(productId, !loaderData);

  // Prefer loader data over fetched data (both typed as GetProductResponse)
  const productData: GetProductResponse | undefined = loaderData ?? fetchedData;

  const { onLogActivity, loggerProps } = useEntityActivityLogging({
    entityType: 'product',
    entityId: productId,
    entityLabel: `Product: ${productData?.product?.name ?? productId}`,
  });

  useTrackView('product', productData?.product?.id, productData?.product?.name, productData?.product?.sku ?? undefined, `/products/${productId}`);

  // Fetch inventory summary using TanStack Query hook
  const { summary: inventorySummary } = useProductInventorySummary({
    productId,
    enabled: productData?.product?.trackInventory ?? false,
  });

  // Fetch customer-specific prices for pricing tab
  const { data: customerPricesData } = useCustomerPrices({
    productId,
    enabled: !!productData?.product,
  });

  const {
    activities,
    isLoading: activitiesLoading,
    error: activitiesError,
  } = useUnifiedActivities({
    entityType: 'product',
    entityId: productId,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Mutations
  // ─────────────────────────────────────────────────────────────────────────
  const deleteMutation = useDeleteProduct();
  const duplicateMutation = useDuplicateProduct();
  const updateMutation = useUpdateProduct();

  // ─────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────
  const handleDuplicate = useCallback(async () => {
    try {
      const result = await duplicateMutation.mutateAsync(productId);
      toastSuccess(`Product duplicated as ${result.name}`);
      onDuplicate?.(result.id);
    } catch {
      toastError('Failed to duplicate product');
    }
  }, [duplicateMutation, productId, onDuplicate]);

  const handleDelete = useCallback(async () => {
    try {
      await deleteMutation.mutateAsync(productId);
      toastSuccess('Product deleted');
      setDeleteDialogOpen(false);
      onBack?.();
    } catch {
      toastError('Failed to delete product');
    }
  }, [deleteMutation, productId, onBack]);

  const handlePriceUpdate = useCallback(async (newPrice: number) => {
    await updateMutation.mutateAsync({
      id: productId,
      data: { basePrice: newPrice },
    });
    toastSuccess(`Price updated to ${new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(newPrice)}`);
  }, [updateMutation, productId]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Loading
  // ─────────────────────────────────────────────────────────────────────────
  if (!loaderData && isLoading) {
    const loadingContent = <ProductDetailSkeleton />;
    if (children) {
      return (
        <>
          {children({
            headerActions: <Skeleton className="h-10 w-32" />,
            content: loadingContent,
          })}
        </>
      );
    }
    return loadingContent;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Error
  // ─────────────────────────────────────────────────────────────────────────
  if (error || !productData || !isGetProductResponse(productData)) {
    const errorContent = (
      <ErrorState
        title="Product not found"
        message="The product you're looking for doesn't exist or has been deleted."
        onRetry={() => refetch()}
        retryLabel="Try Again"
      />
    );
    if (children) {
      return (
        <>
          {children({
            headerActions: null,
            content: errorContent,
          })}
        </>
      );
    }
    return errorContent;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Destructure product data (getProduct returns schema-validated data)
  // ─────────────────────────────────────────────────────────────────────────
  const { product, category, images, priceTiers } = productData;

  const customerPrices = (customerPricesData ?? []).map((price) => ({
    ...price,
    discountPercent: price.discountPercent ?? null,
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Header Elements
  // ─────────────────────────────────────────────────────────────────────────
  // Entity identity (name, status) is displayed by ProductHeader in the view
  // No headerTitle needed - follows single-responsibility principle
  // @see docs/design-system/DETAIL-VIEW-STANDARDS.md

  const headerActions = (
    <div className="flex items-center gap-2">
      {/* Edit Action */}
      <Button variant="outline" onClick={() => onEdit?.(productId)}>
        <Edit className="h-4 w-4 mr-2" />
        Edit
      </Button>

      {/* More Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">More actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={handleDuplicate}
            disabled={duplicateMutation.isPending}
          >
            <Copy className="h-4 w-4 mr-2" />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setDeleteDialogOpen(true)}
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Main Content
  // ─────────────────────────────────────────────────────────────────────────
  const content = (
    <>
      <ProductDetailView
        product={product}
        category={category}
        images={images}
        priceTiers={priceTiers}
        customerPrices={customerPrices}
        inventorySummary={inventorySummary}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        showMetaPanel={showMetaPanel}
        onToggleMetaPanel={handleToggleMetaPanel}
        activities={activities}
        activitiesLoading={activitiesLoading}
        activitiesError={activitiesError}
        onLogActivity={onLogActivity}
        onPriceUpdate={handlePriceUpdate}
        className={className}
      />

      <EntityActivityLogger {...loggerProps} />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{product.name}&quot;? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Render: With Render Props or Default
  // ─────────────────────────────────────────────────────────────────────────
  if (children) {
    return <>{children({ headerActions, content })}</>;
  }

  // Default rendering (standalone usage)
  return (
    <div className={className}>
      {headerActions && (
        <div className="flex items-center justify-end mb-4">
          {headerActions}
        </div>
      )}
      {content}
    </div>
  );
}

export default ProductDetailContainer;
