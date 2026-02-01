/**
 * Product Detail View (Presenter)
 *
 * Full-width layout following Order Detail View gold standard.
 * Maximizes schema field presentation with specialized section components.
 *
 * @see STANDARDS.md - Container/Presenter pattern
 * @see src/components/domain/orders/views/order-detail-view.tsx - Gold standard reference
 */

import { memo, useMemo, type ReactNode } from 'react';
import { format } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Package,
  Tag,
  Hash,
  Barcode,
  Scale,
  Ruler,
  Building2,
  ChevronRight,
  Link2,
  PanelRight,
  DollarSign,
  Percent,
  TrendingUp,
  Boxes,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { FormatAmount } from '@/components/shared/format';
import { UnifiedActivityTimeline } from '@/components/shared/activity';
import type { UnifiedActivity } from '@/lib/schemas/unified-activity';
import { PRODUCT_STATUS_CONFIG, PRODUCT_TYPE_CONFIG, calculateMargin } from '../product-status-config';
import type { ProductStatus, ProductType } from '../product-status-config';

// ============================================================================
// TYPES
// ============================================================================

export interface ProductWithRelations {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  barcode: string | null;
  categoryId: string | null;
  type: string;
  status: string;
  isSerialized: boolean;
  trackInventory: boolean;
  basePrice: number | null;
  costPrice: number | null;
  taxType: string;
  weight: number | null;
  dimensions: { length?: number; width?: number; height?: number; unit?: string } | null;
  specifications: Record<string, unknown> | null;
  seoTitle: string | null;
  seoDescription: string | null;
  tags: string[] | null;
  xeroItemId: string | null;
  metadata: Record<string, unknown> | null;
  reorderPoint: number | null;
  reorderQty: number | null;
  isActive: boolean;
  isSellable: boolean;
  isPurchasable: boolean;
  warrantyPolicyId: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy: string | null;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
}

export interface PriceTier {
  id: string;
  minQuantity: number;
  maxQuantity: number | null;
  price: number;
  discountPercent: number | null;
  isActive: boolean;
}

export interface ProductImage {
  id: string;
  imageUrl: string;
  altText: string | null;
  isPrimary: boolean;
  sortOrder: number;
}

export interface ProductDetailViewProps {
  product: ProductWithRelations;
  category: Category | null;
  images: ProductImage[];
  priceTiers: PriceTier[];
  inventorySummary?: {
    totalOnHand: number;
    totalAvailable: number;
    totalAllocated: number;
    locationCount: number;
    totalValue: number;
  } | null;
  activeTab: string;
  onTabChange: (tab: string) => void;
  showMetaPanel: boolean;
  onToggleMetaPanel: () => void;
  activities?: UnifiedActivity[];
  activitiesLoading?: boolean;
  activitiesError?: Error | null;
  className?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

function formatDimensions(dimensions: ProductWithRelations['dimensions']): string {
  if (!dimensions) return '-';
  const parts: string[] = [];
  if (dimensions.length) parts.push(`L: ${dimensions.length}`);
  if (dimensions.width) parts.push(`W: ${dimensions.width}`);
  if (dimensions.height) parts.push(`H: ${dimensions.height}`);
  if (parts.length === 0) return '-';
  return `${parts.join(' x ')} ${dimensions.unit || 'cm'}`;
}

// ============================================================================
// META CHIPS ROW (Project Management pattern)
// ============================================================================

interface MetaChip {
  label: string;
  value: string | ReactNode;
  icon?: ReactNode;
}

function MetaChipsRow({ items }: { items: MetaChip[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {items.map((item, idx) => (
        <div key={`${item.label}-${idx}`} className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            {item.icon && <span className="text-muted-foreground">{item.icon}</span>}
            {item.label && <span className="text-muted-foreground">{item.label}:</span>}
            <span className="text-foreground font-medium">{item.value}</span>
          </div>
          {idx < items.length - 1 && <Separator orientation="vertical" className="h-4" />}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// PRODUCT HEADER
// ============================================================================

interface ProductHeaderProps {
  product: ProductWithRelations;
  category: Category | null;
}

function ProductHeader({ product, category }: ProductHeaderProps) {
  const statusConfig = PRODUCT_STATUS_CONFIG[product.status as ProductStatus];
  const typeConfig = PRODUCT_TYPE_CONFIG[product.type as ProductType];
  const StatusIcon = statusConfig?.icon || Package;
  const TypeIcon = typeConfig?.icon || Package;

  const metaItems: MetaChip[] = [
    { label: 'SKU', value: product.sku, icon: <Hash className="h-3.5 w-3.5" /> },
    { label: 'Type', value: typeConfig?.label || product.type, icon: <TypeIcon className="h-3.5 w-3.5" /> },
    ...(category ? [{ label: 'Category', value: category.name, icon: <Tag className="h-3.5 w-3.5" /> }] : []),
    ...(product.barcode ? [{ label: 'Barcode', value: product.barcode, icon: <Barcode className="h-3.5 w-3.5" /> }] : []),
  ];

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-semibold text-foreground leading-tight">{product.name}</h1>
          <div className="flex items-center gap-2">
            {statusConfig && (
              <Badge className={cn('gap-1 text-[11px]', `bg-${statusConfig.color}/10 text-${statusConfig.color}-foreground`)}>
                <StatusIcon className="h-3 w-3" />
                {statusConfig.label}
              </Badge>
            )}
            {!product.isActive && (
              <Badge variant="secondary" className="text-[11px]">
                <XCircle className="h-3 w-3 mr-1" />
                Inactive
              </Badge>
            )}
          </div>
        </div>
      </div>

      <MetaChipsRow items={metaItems} />
    </section>
  );
}

// ============================================================================
// PRICING BREAKDOWN SECTION
// ============================================================================

interface PricingBreakdownProps {
  product: ProductWithRelations;
  priceTiers: PriceTier[];
}

function PricingBreakdown({ product, priceTiers }: PricingBreakdownProps) {
  const basePrice = product.basePrice ?? 0;
  const costPrice = product.costPrice ?? 0;
  const margin = calculateMargin(basePrice, costPrice);
  const markup = costPrice > 0 ? ((basePrice - costPrice) / costPrice) * 100 : null;
  const profit = basePrice - costPrice;

  const marginColor = margin === null ? 'text-muted-foreground' :
    margin < 0 ? 'text-destructive' :
    margin < 20 ? 'text-amber-600' : 'text-green-600';

  return (
    <section>
      <h2 className="text-base font-semibold text-foreground mb-4">Pricing</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Price Breakdown */}
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Sell Price
            </span>
            <span className="font-medium tabular-nums text-lg">
              <FormatAmount amount={basePrice} />
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Cost Price
            </span>
            <span className="font-medium tabular-nums">
              {costPrice > 0 ? <FormatAmount amount={costPrice} /> : '-'}
            </span>
          </div>
          <Separator />
          <div className="flex justify-between text-sm font-semibold">
            <span className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Profit
            </span>
            <span className={cn('tabular-nums', profit > 0 ? 'text-green-600' : profit < 0 ? 'text-destructive' : '')}>
              {costPrice > 0 ? <FormatAmount amount={profit} /> : '-'}
            </span>
          </div>
        </div>

        {/* Margin & Markup */}
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-2">
              <Percent className="h-4 w-4" /> Gross Margin
            </span>
            <span className={cn('font-medium tabular-nums', marginColor)}>
              {margin !== null ? `${margin.toFixed(1)}%` : '-'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Markup
            </span>
            <span className="font-medium tabular-nums">
              {markup !== null ? `${markup.toFixed(1)}%` : '-'}
            </span>
          </div>
          {margin !== null && (
            <>
              <Separator />
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Margin Health</span>
                <span className="text-xs text-muted-foreground">
                  {margin >= 30 ? 'Excellent' : margin >= 20 ? 'Good' : margin >= 10 ? 'Low' : 'Critical'}
                </span>
              </div>
              <Progress
                value={Math.min(margin, 50) * 2}
                className="h-2"
              />
            </>
          )}
        </div>
      </div>

      {/* Price Tiers Summary */}
      {priceTiers.length > 0 && (
        <div className="mt-6 pt-4 border-t">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Volume Pricing Tiers</span>
            <Badge variant="secondary">{priceTiers.length} tiers</Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {priceTiers.slice(0, 4).map((tier) => (
              <div key={tier.id} className="p-3 border rounded-md bg-muted/30">
                <div className="text-xs text-muted-foreground mb-1">
                  {tier.minQuantity}+ units
                </div>
                <div className="font-medium text-sm">
                  <FormatAmount amount={tier.price} />
                </div>
                {tier.discountPercent && (
                  <div className="text-xs text-green-600 mt-1">
                    {tier.discountPercent}% off
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

// ============================================================================
// INVENTORY SUMMARY SECTION
// ============================================================================

interface InventorySummaryProps {
  product: ProductWithRelations;
  inventorySummary?: {
    totalOnHand: number;
    totalAvailable: number;
    totalAllocated: number;
    locationCount: number;
    totalValue: number;
  } | null;
}

function InventorySummary({ product, inventorySummary }: InventorySummaryProps) {
  if (!product.trackInventory) {
    return (
      <section>
        <h2 className="text-base font-semibold text-foreground mb-4">Inventory</h2>
        <div className="p-4 border rounded-lg bg-muted/30">
          <div className="flex items-center gap-2 text-muted-foreground">
            <XCircle className="h-4 w-4" />
            <span className="text-sm">Inventory tracking is disabled for this product</span>
          </div>
        </div>
      </section>
    );
  }

  const summary = inventorySummary ?? { totalOnHand: 0, totalAvailable: 0, totalAllocated: 0, locationCount: 0, totalValue: 0 };
  const isLowStock = product.reorderPoint !== null && summary.totalOnHand <= product.reorderPoint;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-foreground">Inventory</h2>
        {isLowStock && (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Low Stock
          </Badge>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div>
          <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <Package className="h-3 w-3" /> Total On Hand
          </div>
          <div className="text-lg font-semibold">{summary.totalOnHand}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" /> Available
          </div>
          <div className="text-lg font-semibold text-green-600">{summary.totalAvailable}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <Boxes className="h-3 w-3" /> Allocated
          </div>
          <div className="text-lg font-semibold text-amber-600">{summary.totalAllocated}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <Building2 className="h-3 w-3" /> Locations
          </div>
          <div className="text-lg font-semibold">{summary.locationCount}</div>
        </div>
      </div>

      {/* Reorder Settings */}
      {(product.reorderPoint !== null || product.reorderQty !== null) && (
        <div className="mt-4 pt-4 border-t">
          <div className="grid grid-cols-2 gap-4 text-sm">
            {product.reorderPoint !== null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reorder Point</span>
                <span className="font-medium">{product.reorderPoint} units</span>
              </div>
            )}
            {product.reorderQty !== null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reorder Quantity</span>
                <span className="font-medium">{product.reorderQty} units</span>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

// ============================================================================
// SPECIFICATIONS SECTION
// ============================================================================

interface SpecificationsSectionProps {
  product: ProductWithRelations;
}

function SpecificationsSection({ product }: SpecificationsSectionProps) {
  const hasSpecs = product.specifications && Object.keys(product.specifications).length > 0;
  const hasDimensions = product.dimensions && (product.dimensions.length || product.dimensions.width || product.dimensions.height);
  const hasWeight = product.weight !== null;

  if (!hasSpecs && !hasDimensions && !hasWeight) return null;

  return (
    <section>
      <h2 className="text-base font-semibold text-foreground mb-4">Physical Specifications</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Dimensions & Weight */}
        <div className="space-y-3">
          {hasWeight && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <Scale className="h-4 w-4" /> Weight
              </span>
              <span className="font-medium">{product.weight} kg</span>
            </div>
          )}
          {hasDimensions && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <Ruler className="h-4 w-4" /> Dimensions
              </span>
              <span className="font-medium">{formatDimensions(product.dimensions)}</span>
            </div>
          )}
        </div>

        {/* Custom Specifications */}
        {hasSpecs && (
          <div className="space-y-3">
            {Object.entries(product.specifications!).map(([key, value]) => (
              <div key={key} className="flex justify-between text-sm">
                <span className="text-muted-foreground capitalize">
                  {key.replace(/_/g, ' ')}
                </span>
                <span className="font-medium">{String(value)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ============================================================================
// DESCRIPTION SECTION
// ============================================================================

interface DescriptionSectionProps {
  description: string | null;
}

function DescriptionSection({ description }: DescriptionSectionProps) {
  if (!description) return null;

  return (
    <section>
      <h2 className="text-base font-semibold text-foreground mb-4">Description</h2>
      <p className="text-sm whitespace-pre-wrap bg-muted/50 p-4 rounded-md">{description}</p>
    </section>
  );
}

// ============================================================================
// TAGS SECTION
// ============================================================================

interface TagsSectionProps {
  tags: string[] | null;
}

function TagsSection({ tags }: TagsSectionProps) {
  if (!tags || tags.length === 0) return null;

  return (
    <section>
      <h2 className="text-base font-semibold text-foreground mb-4">Tags</h2>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="text-xs">
            {tag}
          </Badge>
        ))}
      </div>
    </section>
  );
}

// ============================================================================
// SETTINGS FLAGS SECTION
// ============================================================================

interface SettingsFlagsSectionProps {
  product: ProductWithRelations;
}

function SettingsFlagsSection({ product }: SettingsFlagsSectionProps) {
  const flags = [
    { label: 'Track Inventory', value: product.trackInventory, icon: Boxes },
    { label: 'Serialized', value: product.isSerialized, icon: Hash },
    { label: 'Sellable', value: product.isSellable, icon: DollarSign },
    { label: 'Purchasable', value: product.isPurchasable, icon: Package },
    { label: 'Active', value: product.isActive, icon: CheckCircle },
  ];

  return (
    <section>
      <h2 className="text-base font-semibold text-foreground mb-4">Product Settings</h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {flags.map((flag) => {
          const Icon = flag.icon;
          return (
            <div key={flag.label} className="flex items-center gap-2 text-sm">
              <Icon className={cn('h-4 w-4', flag.value ? 'text-green-600' : 'text-muted-foreground')} />
              <span className={cn(flag.value ? 'text-foreground' : 'text-muted-foreground')}>
                {flag.label}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ============================================================================
// RIGHT META PANEL
// ============================================================================

interface RightMetaPanelProps {
  product: ProductWithRelations;
  category: Category | null;
  images: ProductImage[];
}

function RightMetaPanel({ product, category, images }: RightMetaPanelProps) {
  const primaryImage = images.find((img) => img.isPrimary) ?? images[0];
  const metadata = product.metadata as Record<string, string | undefined> | null;

  return (
    <aside className="flex flex-col gap-8 p-4 pt-8 lg:sticky lg:self-start lg:top-4">
      {/* Product Image */}
      {primaryImage && (
        <>
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Product Image</h3>
            <img
              src={primaryImage.imageUrl}
              alt={primaryImage.altText ?? product.name}
              className="w-full h-48 object-cover rounded-lg border"
            />
            {images.length > 1 && (
              <div className="text-xs text-muted-foreground mt-2 text-center">
                +{images.length - 1} more images
              </div>
            )}
          </div>
          <Separator />
        </>
      )}

      {/* Identification */}
      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Identification</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">SKU</span>
            <span className="font-mono">{product.sku}</span>
          </div>
          {product.barcode && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Barcode</span>
              <span className="font-mono text-xs">{product.barcode}</span>
            </div>
          )}
          {product.xeroItemId && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Xero ID</span>
              <span className="font-mono text-xs truncate max-w-[120px]">{product.xeroItemId}</span>
            </div>
          )}
        </div>
      </div>
      <Separator />

      {/* Category */}
      {category && (
        <>
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Category</h3>
            <Badge variant="outline" className="text-sm">
              {category.name}
            </Badge>
            {category.description && (
              <p className="text-xs text-muted-foreground mt-2">{category.description}</p>
            )}
          </div>
          <Separator />
        </>
      )}

      {/* Manufacturer/Brand */}
      {metadata && (metadata.manufacturer || metadata.brand || metadata.model) && (
        <>
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Brand Info</h3>
            <div className="space-y-2 text-sm">
              {metadata.manufacturer && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Manufacturer</span>
                  <span>{metadata.manufacturer}</span>
                </div>
              )}
              {metadata.brand && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Brand</span>
                  <span>{metadata.brand}</span>
                </div>
              )}
              {metadata.model && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Model</span>
                  <span>{metadata.model}</span>
                </div>
              )}
            </div>
          </div>
          <Separator />
        </>
      )}

      {/* Tax Type */}
      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Tax</h3>
        <Badge variant="secondary" className="uppercase text-[10px]">
          {product.taxType}
        </Badge>
      </div>
      <Separator />

      {/* Audit Trail */}
      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Audit Trail</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Created</span>
            <span>{format(new Date(product.createdAt), 'PP')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Updated</span>
            <span>{format(new Date(product.updatedAt), 'PP')}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ProductDetailView = memo(function ProductDetailView({
  product,
  category,
  images,
  priceTiers,
  inventorySummary,
  activeTab,
  onTabChange,
  showMetaPanel,
  onToggleMetaPanel,
  activities = [],
  activitiesLoading = false,
  activitiesError,
  className,
}: ProductDetailViewProps) {
  const priceTierCount = useMemo(() => priceTiers.length, [priceTiers]);

  return (
    <div className={cn('flex flex-1 flex-col min-w-0 m-2 border border-border rounded-lg', className)}>
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-4 px-4 py-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Products</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{product.sku}</span>
        </div>

        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(window.location.href)}>
                  <Link2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy link</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn('h-8 w-8', showMetaPanel && 'bg-muted')}
                  onClick={onToggleMetaPanel}
                >
                  <PanelRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{showMetaPanel ? 'Hide' : 'Show'} details panel</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Main Content - FULL WIDTH */}
      <div className="flex flex-1 flex-col bg-background px-2 rounded-b-lg min-w-0 border-t">
        <div className="px-4">
          <div className={cn(
            'grid grid-cols-1 gap-12',
            showMetaPanel ? 'lg:grid-cols-[minmax(0,2fr)_minmax(0,320px)]' : 'lg:grid-cols-1'
          )}>
            {/* Primary Content */}
            <div className="space-y-6 pt-4 pb-6">
              <ProductHeader product={product} category={category} />

              <Tabs value={activeTab} onValueChange={onTabChange}>
                <TabsList className="w-full gap-6 bg-transparent border-b border-border rounded-none h-auto p-0">
                  <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3">
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="pricing" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3">
                    Pricing {priceTierCount > 0 && `(${priceTierCount})`}
                  </TabsTrigger>
                  <TabsTrigger value="inventory" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3">
                    Inventory
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3">
                    Activity
                  </TabsTrigger>
                </TabsList>

                {/* Overview Tab - space-y-10 for generous spacing */}
                <TabsContent value="overview" className="mt-0 pt-6">
                  <div className="space-y-10">
                    <PricingBreakdown product={product} priceTiers={priceTiers} />
                    <InventorySummary product={product} inventorySummary={inventorySummary} />
                    <SpecificationsSection product={product} />
                    <DescriptionSection description={product.description} />
                    <TagsSection tags={product.tags} />
                    <SettingsFlagsSection product={product} />
                  </div>
                </TabsContent>

                {/* Pricing Tab - delegates to existing tab component via container */}
                <TabsContent value="pricing" className="mt-0 pt-6">
                  <div className="text-sm text-muted-foreground">
                    {/* Pricing content is delegated to the container which uses ProductPricingTab */}
                    <PricingBreakdown product={product} priceTiers={priceTiers} />
                  </div>
                </TabsContent>

                {/* Inventory Tab */}
                <TabsContent value="inventory" className="mt-0 pt-6">
                  <InventorySummary product={product} inventorySummary={inventorySummary} />
                </TabsContent>

                {/* Activity Tab */}
                <TabsContent value="activity" className="mt-0 pt-6">
                  <UnifiedActivityTimeline
                    activities={activities}
                    isLoading={activitiesLoading}
                    hasError={!!activitiesError}
                    error={activitiesError || undefined}
                    title="Activity Timeline"
                    description="Complete history of product changes and updates"
                    showFilters={true}
                    emptyMessage="No activity recorded yet"
                    emptyDescription="Product activities will appear here when changes are made."
                  />
                </TabsContent>
              </Tabs>
            </div>

            {/* Animated Side Meta Panel */}
            <AnimatePresence initial={false}>
              {showMetaPanel && (
                <motion.div
                  key="meta-panel"
                  initial={{ x: 80, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 80, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                  className="lg:border-l lg:border-border"
                >
                  <RightMetaPanel product={product} category={category} images={images} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <Separator className="mt-auto" />
      </div>
    </div>
  );
});

export default ProductDetailView;
