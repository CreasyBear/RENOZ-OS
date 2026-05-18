import type { InventoryListQuery, QuickSearchInventoryInput } from '@/lib/schemas/inventory';

export type InventoryFilters = Partial<InventoryListQuery>

type InventorySearchOptions = Pick<Partial<QuickSearchInventoryInput>, 'limit'>;

const all = ['inventory'] as const;
const lists = () => [...all, 'list'] as const;
const list = (filters?: InventoryFilters) =>
  [...lists(), filters ?? {}] as const;
const details = () => [...all, 'detail'] as const;
const detail = (id: string) => [...details(), id] as const;
const lowStock = () => [...all, 'lowStock'] as const;
const search = (query: string, options?: InventorySearchOptions) =>
  [...all, 'search', query, options ?? {}] as const;
const items = (filters?: { organizationId?: string }) =>
  [...all, 'items', filters ?? {}] as const;
const movements = (filters?: Record<string, unknown>) =>
  [...all, 'movements', filters ?? {}] as const;
const movementsAll = () => [...all, 'movements'] as const;

const alertsAll = () => [...all, 'alerts'] as const;
const alerts = (filters?: Record<string, unknown>) =>
  [...alertsAll(), 'list', filters ?? {}] as const;
const alert = (id: string) =>
  [...alertsAll(), 'detail', id] as const;
const triggeredAlerts = () =>
  [...alertsAll(), 'triggered'] as const;
const alertAnalytics = () =>
  [...alertsAll(), 'analytics'] as const;

const dashboard = () => [...all, 'dashboard'] as const;

const availabilityAll = () => [...all, 'availability'] as const;
const availability = (productId: string, locationId?: string) =>
  [...availabilityAll(), productId, locationId ?? ''] as const;

const availableSerialsAll = () => [...all, 'availableSerials'] as const;
const availableSerials = (productId: string, locationId?: string) =>
  [...availableSerialsAll(), productId, locationId ?? ''] as const;

const serializedAll = () => [...all, 'serializedItems'] as const;
const serializedList = (filters?: Record<string, unknown>) =>
  [...serializedAll(), 'list', filters ?? {}] as const;
const serializedDetail = (id: string) =>
  [...serializedAll(), 'detail', id] as const;

const wmsAll = () => [...all, 'wms'] as const;
const wmsDashboard = () => wmsAll();
const stockByCategory = () => [...wmsAll(), 'byCategory'] as const;
const stockByLocation = () => [...wmsAll(), 'byLocation'] as const;
const recentMovementsTimeline = (limit?: number) =>
  [...wmsAll(), 'movements', limit ?? 10] as const;

const forecastingAll = () => [...all, 'forecasting'] as const;
const reorderRecommendations = (filters?: Record<string, unknown>) =>
  [...forecastingAll(), 'reorder', filters ?? {}] as const;
const productForecast = (productId: string, filters?: Record<string, unknown>) =>
  [...forecastingAll(), 'product', productId, filters ?? {}] as const;
const forecastAccuracy = (productId?: string) =>
  [...forecastingAll(), 'accuracy', productId ?? ''] as const;
const safetyStock = (productId: string, options?: { serviceLevel?: number; leadTimeDays?: number }) =>
  [...forecastingAll(), 'safetyStock', productId, options ?? {}] as const;

const valuationAll = () => [...all, 'valuation'] as const;
const valuation = (filters?: Record<string, unknown>) =>
  [...valuationAll(), 'report', filters ?? {}] as const;
const aging = (filters?: Record<string, unknown>) =>
  [...valuationAll(), 'aging', filters ?? {}] as const;
const turnover = (filters?: Record<string, unknown>) =>
  [...valuationAll(), 'turnover', filters ?? {}] as const;
const costLayers = (filters?: Record<string, unknown>) =>
  [...valuationAll(), 'costLayers', filters ?? {}] as const;
const costLayersDetail = (inventoryId: string) =>
  [...valuationAll(), 'costLayers', inventoryId] as const;
const cogs = (inventoryId: string, quantity?: number) =>
  [...valuationAll(), 'cogs', inventoryId, quantity ?? 0] as const;
const financeIntegrity = (filters?: Record<string, unknown>) =>
  [...valuationAll(), 'financeIntegrity', filters ?? {}] as const;

const stockCountsAll = () => [...all, 'stockCounts'] as const;
const stockCounts = (filters?: Record<string, unknown>) =>
  [...stockCountsAll(), 'list', filters ?? {}] as const;
const stockCount = (id: string) =>
  [...stockCountsAll(), 'detail', id] as const;
const stockCountItems = (countId: string) =>
  [...stockCountsAll(), 'items', countId] as const;
const stockCountVariances = (countId: string) =>
  [...stockCountsAll(), 'variances', countId] as const;
const stockCountsHistory = (options?: Record<string, unknown>) =>
  [...stockCountsAll(), 'history', options ?? {}] as const;

const qualityAll = () => [...all, 'quality'] as const;
const qualityInspections = (inventoryId: string) =>
  [...qualityAll(), 'inspections', inventoryId] as const;

export const inventoryQueryKeys = {
  all,
  lists,
  list,
  details,
  detail,
  lowStock,
  search,
  items,
  movements,
  movementsAll,
  alertsAll,
  alerts,
  alert,
  triggeredAlerts,
  alertAnalytics,
  dashboard,
  availabilityAll,
  availability,
  availableSerialsAll,
  availableSerials,
  serializedAll,
  serializedList,
  serializedDetail,
  wmsAll,
  wmsDashboard,
  stockByCategory,
  stockByLocation,
  recentMovementsTimeline,
  forecastingAll,
  reorderRecommendations,
  productForecast,
  forecastAccuracy,
  safetyStock,
  valuationAll,
  valuation,
  aging,
  turnover,
  costLayers,
  costLayersDetail,
  cogs,
  financeIntegrity,
  stockCountsAll,
  stockCounts,
  stockCount,
  stockCountItems,
  stockCountVariances,
  stockCountsHistory,
  qualityAll,
  qualityInspections,
};
