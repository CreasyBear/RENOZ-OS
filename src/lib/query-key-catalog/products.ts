export interface ProductListFilters {
  search?: string
  categoryId?: string
  status?: string
}

export interface ProductStockAlertFilters {
  locationId?: string
  reorderPoint?: number
  criticalThreshold?: number
}

const all = ['products'] as const;
const lists = () => [...all, 'list'] as const;
const list = (filters?: ProductListFilters) =>
  [...lists(), filters ?? {}] as const;
const details = () => [...all, 'detail'] as const;
const detail = (id: string) => [...details(), id] as const;
const stock = () => [...all, 'stock'] as const;
const jobMaterials = (jobId: string, filters?: Record<string, unknown>) =>
  [...all, 'jobMaterials', jobId, filters ?? {}] as const;

const inventories = () => [...all, 'inventory'] as const;
const inventory = (productId: string) =>
  [...inventories(), productId] as const;
const inventoryStatsAll = () => [...all, 'inventoryStats'] as const;
const inventoryStats = (productId: string) =>
  [...inventoryStatsAll(), productId] as const;

const searches = () => [...all, 'search'] as const;
const search = (query: string, options?: Record<string, unknown>) =>
  [...searches(), query, options ?? {}] as const;
const facets = () => [...all, 'facets'] as const;

const attributesAll = ['products', 'attributes'] as const;
const attributes = {
  all: attributesAll,
  definitions: (filters?: { activeOnly?: boolean; categoryId?: string }) =>
    [...attributesAll, 'definitions', filters ?? {}] as const,
  definition: (id: string) =>
    [...attributesAll, 'definition', id] as const,
  values: (productId: string) =>
    [...attributesAll, 'values', productId] as const,
  validation: (productId: string) =>
    [...attributesAll, 'validation', productId] as const,
  filterable: (categoryId?: string) =>
    [...attributesAll, 'filterable', categoryId ?? 'all'] as const,
};

const imagesAll = ['products', 'images'] as const;
const images = {
  all: imagesAll,
  list: (productId: string) =>
    [...imagesAll, 'list', productId] as const,
  stats: (productId: string) =>
    [...imagesAll, 'stats', productId] as const,
  primary: (productId: string) =>
    [...imagesAll, 'primary', productId] as const,
};

const pricingAll = ['products', 'pricing'] as const;
const pricing = {
  all: pricingAll,
  tiers: (productId: string) =>
    [...pricingAll, 'tiers', productId] as const,
  customer: (productId: string, customerId?: string) =>
    [...pricingAll, 'customer', productId, customerId ?? ''] as const,
  history: (productId: string) =>
    [...pricingAll, 'history', productId] as const,
  resolve: (productId: string, context?: Record<string, unknown>) =>
    [...pricingAll, 'resolve', productId, context ?? {}] as const,
};

const bundlesAll = ['products', 'bundles'] as const;
const bundles = {
  all: bundlesAll,
  components: (productId: string) =>
    [...bundlesAll, 'components', productId] as const,
  price: (productId: string) =>
    [...bundlesAll, 'price', productId] as const,
  validation: (productId: string) =>
    [...bundlesAll, 'validation', productId] as const,
  expanded: (productId: string) =>
    [...bundlesAll, 'expanded', productId] as const,
  containing: (productId: string) =>
    [...bundlesAll, 'containing', productId] as const,
};

const bulkAll = ['products', 'bulk'] as const;
const bulk = {
  all: bulkAll,
  template: () => [...bulkAll, 'template'] as const,
};

const advancedSearchAll = ['products', 'advancedSearch'] as const;
const advancedSearch = {
  all: advancedSearchAll,
  results: (query: Record<string, unknown>) =>
    [...advancedSearchAll, 'results', query] as const,
  saved: () => [...advancedSearchAll, 'saved'] as const,
};

const stockLevelsAll = () => [...all, 'stockLevels'] as const;
const stockLevels = (productId: string) =>
  [...stockLevelsAll(), productId] as const;
const stockAlertsAll = () => [...all, 'stockAlerts'] as const;
const stockAlerts = (filters?: ProductStockAlertFilters) =>
  [...stockAlertsAll(), filters ?? {}] as const;
const movementsAll = () => [...all, 'movements'] as const;
const movementsForProduct = (productId: string) =>
  [...movementsAll(), productId] as const;
const movements = (productId: string, filters?: Record<string, unknown>) =>
  [...movementsForProduct(productId), filters ?? {}] as const;
const movementsAggregatedForProduct = (productId: string) =>
  [...movementsAll(), 'aggregated', productId] as const;
const movementsAggregated = (productId: string, filters?: Record<string, unknown>) =>
  [...movementsAggregatedForProduct(productId), filters ?? {}] as const;
const locations = () => [...all, 'locations'] as const;

export const productQueryKeys = {
  all,
  lists,
  list,
  details,
  detail,
  stock,
  jobMaterials,
  inventories,
  inventory,
  inventoryStatsAll,
  inventoryStats,
  searches,
  search,
  facets,
  attributes,
  images,
  pricing,
  bundles,
  bulk,
  advancedSearch,
  stockLevelsAll,
  stockLevels,
  stockAlertsAll,
  stockAlerts,
  movementsAll,
  movementsForProduct,
  movements,
  movementsAggregatedForProduct,
  movementsAggregated,
  locations,
};
