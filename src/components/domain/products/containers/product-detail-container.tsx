/**
 * Product Detail Container
 *
 * Handles data fetching, mutations, and state management for product detail view.
 * Implements render props pattern for flexible header/action composition.
 *
 * @source product from useProduct hook
 * @source activities from useUnifiedActivities hook
 *
 * @see STANDARDS.md - Container/Presenter pattern
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Edit,
  Copy,
  Printer,
  MoreHorizontal,
  Trash2,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { cn } from '@/lib/utils';
import { toastSuccess, toastError } from '@/hooks';
import { useProduct, useDeleteProduct, useDuplicateProduct } from '@/hooks/products';
import { useUnifiedActivities } from '@/hooks/activities';
import { getProductInventory, getInventoryStats } from '@/server/functions/products/product-inventory';
import { ProductDetailView, type ProductWithRelations, type Category, type PriceTier, type ProductImage } from '../views/product-detail-view';
import { PRODUCT_STATUS_CONFIG, type ProductStatus } from '../product-status-config';

// ============================================================================
// TYPES
// ============================================================================

export interface ProductDetailContainerRenderProps {
  /** Header title element */
  headerTitle: React.ReactNode;
  /** Header action buttons */
  headerActions: React.ReactNode;
  /** Main content */
  content: React.ReactNode;
}

export interface ProductDetailContainerProps {
  /** Product ID to display */
  productId: string;
  /** Pre-loaded product data (from route loader) */
  loaderData?: {
    product: ProductWithRelations;
    category: Category | null;
    images: ProductImage[];
    priceTiers: PriceTier[];
    attributeValues: unknown[];
    relations: unknown[];
    bundleComponents?: unknown[];
  };
  /** Callback when user navigates back */
  onBack?: () => void;
  /** Callback when user clicks edit */
  onEdit?: () => void;
  /** Callback after successful duplication */
  onDuplicate?: (newProductId: string) => void;
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
// INVENTORY SUMMARY HOOK
// ============================================================================

interface InventorySummary {
  totalOnHand: number;
  totalAvailable: number;
  totalAllocated: number;
  locationCount: number;
  totalValue: number;
}

function useInventorySummary(productId: string, trackInventory: boolean) {
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!trackInventory) {
      setSummary(null);
      return;
    }

    async function fetchInventory() {
      setLoading(true);
      try {
        const [inventoryData, statsData] = await Promise.all([
          getProductInventory({ data: { productId } }),
          getInventoryStats({ data: { productId } }),
        ]);

        setSummary({
          totalOnHand: inventoryData?.totalOnHand ?? 0,
          totalAvailable: inventoryData?.totalAvailable ?? 0,
          totalAllocated: inventoryData?.totalAllocated ?? 0,
          locationCount: inventoryData?.locationCount ?? 0,
          totalValue: statsData?.totalValue ?? 0,
        });
      } catch (error) {
        console.error('Failed to fetch inventory:', error);
        setSummary(null);
      } finally {
        setLoading(false);
      }
    }

    fetchInventory();
  }, [productId, trackInventory]);

  return { summary, loading };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ProductDetailContainer({
  productId,
  loaderData,
  onBack,
  onEdit,
  onDuplicate,
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

  // Prefer loader data over fetched data
  const productData = loaderData ?? fetchedData;

  // Fetch inventory summary
  const { summary: inventorySummary } = useInventorySummary(
    productId,
    productData?.product?.trackInventory ?? false
  );

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

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Derived State
  // ─────────────────────────────────────────────────────────────────────────
  const statusConfig = useMemo(() => {
    if (!productData?.product) return null;
    return PRODUCT_STATUS_CONFIG[productData.product.status as ProductStatus] ?? PRODUCT_STATUS_CONFIG.active;
  }, [productData?.product]);

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Loading
  // ─────────────────────────────────────────────────────────────────────────
  if (!loaderData && isLoading) {
    const loadingContent = <ProductDetailSkeleton />;
    if (children) {
      return (
        <>
          {children({
            headerTitle: <Skeleton className="h-8 w-48" />,
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
  if (error || !productData?.product) {
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
            headerTitle: 'Product Not Found',
            headerActions: null,
            content: errorContent,
          })}
        </>
      );
    }
    return errorContent;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Destructure product data
  // ─────────────────────────────────────────────────────────────────────────
  const { product, category, images, priceTiers } = productData;

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Header Elements
  // ─────────────────────────────────────────────────────────────────────────
  const StatusIcon = statusConfig?.icon ?? Package;

  const headerTitle = (
    <div className="flex items-center gap-3">
      <span className="text-xl font-semibold">{product.name}</span>
      {statusConfig && (
        <Badge className={cn('gap-1', `bg-${statusConfig.color}/10`)}>
          <StatusIcon className="h-3 w-3" />
          {statusConfig.label}
        </Badge>
      )}
    </div>
  );

  const headerActions = (
    <div className="flex items-center gap-2">
      {/* Edit Action */}
      {onEdit && (
        <Button variant="outline" onClick={onEdit}>
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
      )}

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
        inventorySummary={inventorySummary}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        showMetaPanel={showMetaPanel}
        onToggleMetaPanel={handleToggleMetaPanel}
        activities={activities}
        activitiesLoading={activitiesLoading}
        activitiesError={activitiesError}
        className={className}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{product.name}"? This
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
    return <>{children({ headerTitle, headerActions, content })}</>;
  }

  // Default rendering (standalone usage)
  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        {headerTitle}
        {headerActions}
      </div>
      {content}
    </div>
  );
}

export default ProductDetailContainer;
