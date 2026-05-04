import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockListProducts = vi.fn();
const mockGetProduct = vi.fn();
const mockQuickSearchProducts = vi.fn();
const mockListCategories = vi.fn();
const mockGetCategoryTree = vi.fn();
const mockSearchProducts = vi.fn();
const mockGetSearchSuggestions = vi.fn();
const mockGetSearchFacets = vi.fn();
const mockResolvePrice = vi.fn();
const mockListPriceTiers = vi.fn();
const mockListCustomerPrices = vi.fn();
const mockGetPriceHistory = vi.fn();
const mockListProductImages = vi.fn();
const mockGetImageStats = vi.fn();
const mockGetPrimaryImage = vi.fn();
const mockGetBundleComponents = vi.fn();
const mockCalculateBundlePrice = vi.fn();
const mockValidateBundle = vi.fn();
const mockExpandBundle = vi.fn();
const mockFindBundlesContaining = vi.fn();

vi.mock('@/server/functions/products', () => ({
  listProducts: (...args: unknown[]) => mockListProducts(...args),
  getProduct: (...args: unknown[]) => mockGetProduct(...args),
  quickSearchProducts: (...args: unknown[]) => mockQuickSearchProducts(...args),
  listCategories: (...args: unknown[]) => mockListCategories(...args),
  getCategoryTree: (...args: unknown[]) => mockGetCategoryTree(...args),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
  duplicateProduct: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
  parseImportFile: vi.fn(),
  importProducts: vi.fn(),
}));

vi.mock('@/server/functions/products/product-search', () => ({
  searchProducts: (...args: unknown[]) => mockSearchProducts(...args),
  getSearchSuggestions: (...args: unknown[]) => mockGetSearchSuggestions(...args),
  getSearchFacets: (...args: unknown[]) => mockGetSearchFacets(...args),
  recordSearchEvent: vi.fn(),
}));

vi.mock('@/server/functions/products/product-pricing', () => ({
  resolvePrice: (...args: unknown[]) => mockResolvePrice(...args),
  listPriceTiers: (...args: unknown[]) => mockListPriceTiers(...args),
  createPriceTier: vi.fn(),
  updatePriceTier: vi.fn(),
  deletePriceTier: vi.fn(),
  setPriceTiers: vi.fn(),
  listCustomerPrices: (...args: unknown[]) => mockListCustomerPrices(...args),
  setCustomerPrice: vi.fn(),
  deleteCustomerPrice: vi.fn(),
  getPriceHistory: (...args: unknown[]) => mockGetPriceHistory(...args),
  bulkUpdatePrices: vi.fn(),
  applyPriceAdjustment: vi.fn(),
}));

vi.mock('@/server/functions/products/product-images', () => ({
  listProductImages: (...args: unknown[]) => mockListProductImages(...args),
  getImageStats: (...args: unknown[]) => mockGetImageStats(...args),
  getPrimaryImage: (...args: unknown[]) => mockGetPrimaryImage(...args),
  addProductImage: vi.fn(),
  updateProductImage: vi.fn(),
  deleteProductImage: vi.fn(),
  setPrimaryImage: vi.fn(),
  reorderProductImages: vi.fn(),
  bulkDeleteImages: vi.fn(),
  bulkUpdateAltText: vi.fn(),
}));

vi.mock('@/server/functions/products/product-bundles', () => ({
  getBundleComponents: (...args: unknown[]) => mockGetBundleComponents(...args),
  addBundleComponent: vi.fn(),
  updateBundleComponent: vi.fn(),
  removeBundleComponent: vi.fn(),
  calculateBundlePrice: (...args: unknown[]) => mockCalculateBundlePrice(...args),
  validateBundle: (...args: unknown[]) => mockValidateBundle(...args),
  setBundleComponents: vi.fn(),
  expandBundle: (...args: unknown[]) => mockExpandBundle(...args),
  findBundlesContaining: (...args: unknown[]) => mockFindBundlesContaining(...args),
}));

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'ProductsQueryNormalizationWave5BWrapper';
  return Wrapper;
}

describe('products query normalization wave 5b', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockListProducts.mockResolvedValue({
      products: [],
      total: 0,
      page: 1,
      limit: 20,
      hasMore: false,
    });
    mockGetProduct.mockResolvedValue({
      product: {
        id: 'product-1',
        name: 'Panel Kit',
        sku: 'PK-1',
        description: null,
        type: 'physical',
        status: 'active',
        basePrice: 129,
        costPrice: 70,
        isActive: true,
        trackInventory: true,
        isSerialized: false,
      },
      category: null,
      images: [],
      priceTiers: [],
      attributeValues: [],
      relations: [],
    });
    mockQuickSearchProducts.mockResolvedValue({ products: [], total: 0 });
    mockListCategories.mockResolvedValue([]);
    mockGetCategoryTree.mockResolvedValue([]);
    mockSearchProducts.mockResolvedValue({
      results: [],
      pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
      query: 'panel',
    });
    mockGetSearchSuggestions.mockResolvedValue([]);
    mockGetSearchFacets.mockResolvedValue({
      status: [],
      type: [],
      category: [],
      priceRange: { min: 0, max: 0 },
      attributes: [],
    });
    mockResolvePrice.mockResolvedValue({
      basePrice: 100,
      finalPrice: 100,
      discount: 0,
      discountPercent: 0,
      source: 'base',
    });
    mockListPriceTiers.mockResolvedValue([]);
    mockListCustomerPrices.mockResolvedValue([]);
    mockGetPriceHistory.mockResolvedValue([]);
    mockListProductImages.mockResolvedValue([]);
    mockGetImageStats.mockResolvedValue({
      totalImages: 0,
      totalSize: 0,
      hasPrimary: false,
      missingAltText: 0,
    });
    mockGetPrimaryImage.mockResolvedValue(null);
    mockGetBundleComponents.mockResolvedValue({
      bundleProduct: {
        id: 'bundle-1',
        sku: 'BND-1',
        name: 'Starter Bundle',
        basePrice: 100,
        type: 'bundle',
        status: 'active',
        description: null,
      },
      components: [],
      calculatedPrice: 0,
      componentCount: 0,
    });
    mockCalculateBundlePrice.mockResolvedValue({
      bundlePrice: 100,
      componentTotal: 0,
      savings: 0,
      savingsPercent: 0,
      breakdown: [],
    });
    mockValidateBundle.mockResolvedValue({
      valid: true,
      errors: [],
      warnings: [],
    });
    mockExpandBundle.mockResolvedValue({
      items: [],
      totalItems: 0,
    });
    mockFindBundlesContaining.mockResolvedValue([]);
  });

  it('treats list, search, category, image, and bundle membership reads as shaped empty success', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useProducts, useCategories } = await import('@/hooks/products/use-products');
    const { useSearchSuggestions } = await import('@/hooks/products/use-product-search-advanced');
    const { useProductImages, useProductPrimaryImage } = await import('@/hooks/products/use-product-images');
    const { useBundlesContainingProduct } = await import('@/hooks/products/use-product-bundles');

    const products = renderHook(() => useProducts(), { wrapper: createWrapper(queryClient) });
    const categories = renderHook(() => useCategories(), { wrapper: createWrapper(queryClient) });
    const suggestions = renderHook(() => useSearchSuggestions('pa'), {
      wrapper: createWrapper(queryClient),
    });
    const images = renderHook(() => useProductImages({ productId: 'product-1' }), {
      wrapper: createWrapper(queryClient),
    });
    const primaryImage = renderHook(
      () => useProductPrimaryImage({ productId: 'product-1' }),
      { wrapper: createWrapper(queryClient) }
    );
    const bundlesContaining = renderHook(
      () => useBundlesContainingProduct({ productId: 'product-1' }),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => expect(products.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(categories.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(suggestions.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(images.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(primaryImage.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(bundlesContaining.result.current.isSuccess).toBe(true));

    expect(products.result.current.data?.products).toEqual([]);
    expect(categories.result.current.data).toEqual([]);
    expect(suggestions.result.current.data).toEqual([]);
    expect(images.result.current.data).toEqual([]);
    expect(primaryImage.result.current.data).toBeNull();
    expect(bundlesContaining.result.current.data).toEqual([]);
  });

  it('preserves not-found semantics for product detail reads', async () => {
    mockGetProduct.mockRejectedValueOnce({
      message: 'Product not found',
      code: 'NOT_FOUND',
      statusCode: 404,
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useProduct } = await import('@/hooks/products/use-products');

    const { result } = renderHook(() => useProduct('missing-product'), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error).toMatchObject({
      failureKind: 'not-found',
      contractType: 'detail-not-found',
      message: 'The requested product could not be found.',
    });
  });

  it('keeps product detail visible when refresh fails but loader data exists', async () => {
    vi.resetModules();
    vi.doMock('@/hooks/products', () => ({
      useProduct: () => ({
        data: undefined,
        isLoading: false,
        error: new Error('Product details are temporarily unavailable. Please refresh and try again.'),
        refetch: vi.fn(),
      }),
      useDeleteProduct: () => ({ mutateAsync: vi.fn(), isPending: false }),
      useDuplicateProduct: () => ({ mutateAsync: vi.fn(), isPending: false }),
      useUpdateProduct: () => ({ mutateAsync: vi.fn(), isPending: false }),
      useProductInventorySummary: () => ({ summary: null }),
      useCustomerPrices: () => ({ data: [] }),
    }));
    vi.doMock('@/hooks/activities/use-entity-activity-logging', () => ({
      useEntityActivityLogging: () => ({ onLogActivity: vi.fn(), loggerProps: {} }),
    }));
    vi.doMock('@/hooks/activities', () => ({
      useUnifiedActivities: () => ({
        activities: [],
        isLoading: false,
        error: null,
      }),
    }));
    vi.doMock('@/hooks/search', () => ({
      useTrackView: vi.fn(),
    }));
    vi.doMock('@/components/shared/activity', () => ({
      EntityActivityLogger: () => null,
    }));
    vi.doMock('@/hooks', () => ({
      toastSuccess: vi.fn(),
      toastError: vi.fn(),
    }));
    vi.doMock('@/components/domain/products/views/product-detail-view', () => ({
      ProductDetailView: ({ product }: { product: { name: string } }) => (
        <div>Rendered product: {product.name}</div>
      ),
    }));

    const { ProductDetailContainer } = await import(
      '@/components/domain/products/containers/product-detail-container'
    );

    render(
      <ProductDetailContainer
        productId="product-1"
        loaderData={{
          product: {
            id: 'product-1',
            name: 'Panel Kit',
            sku: 'PK-1',
            description: null,
            type: 'physical',
            status: 'active',
            basePrice: 129,
            costPrice: 70,
            isActive: true,
            trackInventory: true,
            isSerialized: false,
          } as never,
          category: null,
          images: [],
          priceTiers: [],
          attributeValues: [],
          relations: [],
        }}
      />
    );

    expect(screen.getByText('Product details unavailable')).toBeInTheDocument();
    expect(
      screen.getByText('Showing the most recent product details while refresh is temporarily unavailable.')
    ).toBeInTheDocument();
    expect(screen.getByText('Rendered product: Panel Kit')).toBeInTheDocument();
  });

  it('shows unavailable messaging instead of a fake empty state for product image failures', async () => {
    vi.resetModules();
    vi.doMock('@/hooks/products', () => ({
      useProductImages: () => ({
        data: undefined,
        error: new Error('Product images are temporarily unavailable. Please refresh and try again.'),
        refetch: vi.fn(),
      }),
      useProductImageStats: () => ({
        data: undefined,
        error: null,
      }),
      useUpdateProductImage: () => ({
        mutateAsync: vi.fn(),
        isPending: false,
      }),
    }));

    const { ProductImagesTabContainer } = await import(
      '@/components/domain/products/tabs/images-tab-container'
    );

    render(<ProductImagesTabContainer productId="product-1" />);

    expect(screen.getByText('Product images unavailable')).toBeInTheDocument();
    expect(
      screen.getByText('Product images are temporarily unavailable. Please refresh and try again.')
    ).toBeInTheDocument();
    expect(screen.queryByText('No images')).not.toBeInTheDocument();
  });

  it('keeps product selector results visible on refresh failure', async () => {
    vi.resetModules();
    vi.doMock('@/hooks/products', () => ({
      useProducts: () => ({
        data: {
          products: [
            {
              id: 'product-1',
              name: 'Panel Kit',
              sku: 'PK-1',
              description: null,
              basePrice: 129,
              type: 'physical',
              status: 'active',
              trackInventory: true,
              isSerialized: false,
            },
          ],
        },
        isLoading: false,
        error: new Error('Products are temporarily unavailable. Please refresh and try again.'),
      }),
    }));
    vi.doMock('@/hooks/use-org-format', () => ({
      useOrgFormat: () => ({
        formatCurrency: (amount: number) => `$${amount.toFixed(2)}`,
      }),
    }));

    const { ProductSelector } = await import('@/components/domain/orders/creation/product-selector');

    render(
      <ProductSelector
        selectedProducts={[]}
        onProductsChange={vi.fn()}
      />
    );

    expect(screen.getByText('Product search unavailable')).toBeInTheDocument();
    expect(
      screen.getByText('Showing the most recent product results while refresh is unavailable.')
    ).toBeInTheDocument();
    expect(screen.getByText('Panel Kit')).toBeInTheDocument();
  });
});
