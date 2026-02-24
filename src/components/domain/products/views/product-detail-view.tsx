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
  Link2,
  PanelRight,
  DollarSign,
  Percent,
  TrendingUp,
  Boxes,
  CheckCircle,
  XCircle,
  Plus,
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
import { getActivitiesFeedSearch } from '@/lib/activities';
import type { UnifiedActivity } from '@/lib/schemas/unified-activity';
import { PRODUCT_STATUS_CONFIG, PRODUCT_TYPE_CONFIG, calculateMargin } from '../product-status-config';
import type { ProductStatus, ProductType } from '@/lib/schemas/products';
import { ProductInventoryTab } from '../tabs/inventory-tab';
import { ProductImagesTab } from '../tabs/images-tab';
import { ProductAttributesTab } from '../tabs/attributes-tab';
import { PriceTiers } from '../pricing/price-tiers';
import { CustomerPricing } from '../pricing/customer-pricing';
import { PricingEngineContainer } from '../pricing/pricing-engine-container';
import type {
  ProductWithRelations,
  Category,
  PriceTier,
  ProductImage,
  CustomerPrice,
  ProductMetadata,
} from '@/lib/schemas/products';
import { productStatusValues, productTypeValues } from '@/lib/schemas/products';

// ============================================================================
// TYPES
// ============================================================================
// All data types moved to schemas/products.ts - imported above

export interface ProductDetailViewProps {
  product: ProductWithRelations;
  category: Category | null;
  images: ProductImage[];
  priceTiers: PriceTier[];
  customerPrices?: CustomerPrice[];
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
  /** Handler to open activity logging dialog */
  onLogActivity?: () => void;
  onPriceUpdate?: (newPrice: number) => void;
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
  inventorySummary?: ProductDetailViewProps['inventorySummary'];
}

// Type guard for ProductStatus
function isValidProductStatus(status: string): status is ProductStatus {
  return (productStatusValues as readonly string[]).includes(status);
}

// Type guard for ProductType
function isValidProductType(type: string): type is ProductType {
  return (productTypeValues as readonly string[]).includes(type);
}

function ProductHeader({ product, category, inventorySummary }: ProductHeaderProps) {
  const statusConfig = isValidProductStatus(product.status)
    ? PRODUCT_STATUS_CONFIG[product.status]
    : undefined;
  const typeConfig = isValidProductType(product.type)
    ? PRODUCT_TYPE_CONFIG[product.type]
    : undefined;
  const StatusIcon = statusConfig?.icon || Package;
  const TypeIcon = typeConfig?.icon || Package;

  const metaItems: MetaChip[] = [
    { label: 'SKU', value: product.sku, icon: <Hash className="h-3.5 w-3.5" /> },
    { label: 'Type', value: typeConfig?.label || product.type, icon: <TypeIcon className="h-3.5 w-3.5" /> },
    ...(category ? [{ label: 'Category', value: category.name, icon: <Tag className="h-3.5 w-3.5" /> }] : []),
    ...(product.barcode ? [{ label: 'Barcode', value: product.barcode, icon: <Barcode className="h-3.5 w-3.5" /> }] : []),
  ];

  const basePrice = product.basePrice ?? 0;
  const costPrice = product.costPrice ?? 0;
  const margin = calculateMargin(basePrice, costPrice);
  const marginColor = margin === null ? 'text-muted-foreground' :
    margin >= 30 ? 'text-green-600' :
    margin >= 10 ? 'text-amber-600' : 'text-red-600';

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

        {/* Key Metrics - hidden on small screens, shown in KeyNumbersSummary instead */}
        <div className="hidden md:flex items-center gap-4 shrink-0">
          <div className="text-center px-3 py-1.5 border rounded-md bg-muted/30">
            <div className="text-lg font-semibold tabular-nums">
              <FormatAmount amount={basePrice} />
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Sell Price</div>
          </div>
          <div className="text-center px-3 py-1.5 border rounded-md bg-muted/30">
            <div className="text-lg font-semibold tabular-nums">
              {product.trackInventory
                ? (inventorySummary?.totalAvailable ?? 0)
                : 'N/A'}
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Stock</div>
          </div>
          <div className="text-center px-3 py-1.5 border rounded-md bg-muted/30">
            <div className={cn('text-lg font-semibold tabular-nums', marginColor)}>
              {margin !== null ? `${margin.toFixed(0)}%` : '—'}
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Margin</div>
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
      <h2 className="text-base font-semibold text-foreground mb-3">Pricing</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              <DollarSign className="h-4 w-4" /> Landed Cost
              <span className="text-[10px] text-muted-foreground/70">(weighted avg)</span>
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
                  {tier.price !== null ? <FormatAmount amount={tier.price} /> : `${tier.discountPercent ?? 0}% off`}
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
// KEY NUMBERS SUMMARY (compact overview card)
// ============================================================================

interface KeyNumbersSummaryProps {
  product: ProductWithRelations;
  inventorySummary?: ProductDetailViewProps['inventorySummary'];
}

function KeyNumbersSummary({ product, inventorySummary }: KeyNumbersSummaryProps) {
  const basePrice = product.basePrice ?? 0;
  const costPrice = product.costPrice ?? 0;
  const margin = calculateMargin(basePrice, costPrice);

  const marginColor = margin === null ? 'text-muted-foreground' :
    margin >= 30 ? 'text-green-600' :
    margin >= 10 ? 'text-amber-600' : 'text-red-600';

  const summary = inventorySummary ?? { totalOnHand: 0, totalAvailable: 0, totalAllocated: 0, locationCount: 0, totalValue: 0 };

  return (
    <section>
      <h2 className="text-base font-semibold text-foreground mb-4">Key Numbers</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="p-3 border rounded-lg bg-muted/30">
          <div className="text-xs text-muted-foreground mb-1">Sell Price</div>
          <div className="text-lg font-semibold tabular-nums">
            <FormatAmount amount={basePrice} />
          </div>
        </div>
        <div className="p-3 border rounded-lg bg-muted/30">
          <div className="text-xs text-muted-foreground mb-1">Cost Price</div>
          <div className="text-lg font-semibold tabular-nums">
            {costPrice > 0 ? <FormatAmount amount={costPrice} /> : '—'}
          </div>
        </div>
        <div className="p-3 border rounded-lg bg-muted/30">
          <div className="text-xs text-muted-foreground mb-1">Margin</div>
          <div className={cn('text-lg font-semibold tabular-nums', marginColor)}>
            {margin !== null ? `${margin.toFixed(1)}%` : '—'}
          </div>
        </div>
        {product.trackInventory ? (
          <>
            <div className="p-3 border rounded-lg bg-muted/30">
              <div className="text-xs text-muted-foreground mb-1">On Hand</div>
              <div className="text-lg font-semibold tabular-nums">{summary.totalOnHand}</div>
            </div>
            <div className="p-3 border rounded-lg bg-muted/30">
              <div className="text-xs text-muted-foreground mb-1">Available</div>
              <div className="text-lg font-semibold tabular-nums text-green-600">{summary.totalAvailable}</div>
            </div>
            <div className="p-3 border rounded-lg bg-muted/30">
              <div className="text-xs text-muted-foreground mb-1">Allocated</div>
              <div className="text-lg font-semibold tabular-nums text-amber-600">{summary.totalAllocated}</div>
            </div>
          </>
        ) : (
          <div className="p-3 border rounded-lg bg-muted/30 col-span-3">
            <div className="text-xs text-muted-foreground mb-1">Inventory</div>
            <div className="text-sm text-muted-foreground">Not tracked</div>
          </div>
        )}
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
  const metadata = product.metadata as ProductMetadata | null;

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
  customerPrices = [],
  inventorySummary,
  activeTab,
  onTabChange,
  showMetaPanel,
  onToggleMetaPanel,
  activities = [],
  activitiesLoading = false,
  activitiesError,
  onLogActivity,
  onPriceUpdate,
  className,
}: ProductDetailViewProps) {
  const priceTierCount = useMemo(() => priceTiers.length, [priceTiers]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Entity Header with panel toggle */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <ProductHeader product={product} category={category} inventorySummary={inventorySummary} />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0" onClick={() => copyToClipboard(window.location.href)} aria-label="Copy link">
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
                  className={cn('h-8 w-8 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0', showMetaPanel && 'bg-muted')}
                  onClick={onToggleMetaPanel}
                  aria-label={showMetaPanel ? 'Hide details panel' : 'Show details panel'}
                >
                  <PanelRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{showMetaPanel ? 'Hide' : 'Show'} details panel</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className={cn(
        'grid grid-cols-1 gap-8',
        showMetaPanel ? 'lg:grid-cols-[minmax(0,1fr)_320px]' : 'lg:grid-cols-1'
      )}>
        {/* Primary Content */}
        <div className="space-y-6 min-w-0">

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
                  <TabsTrigger value="images" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3">
                    Images {images.length > 0 && `(${images.length})`}
                  </TabsTrigger>
                  <TabsTrigger value="attributes" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3">
                    Attributes
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3">
                    Activity
                  </TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="mt-0 pt-6">
                  <div className="space-y-6">
                    <KeyNumbersSummary product={product} inventorySummary={inventorySummary} />
                    <DescriptionSection description={product.description} />
                    <SpecificationsSection product={product} />
                    <SettingsFlagsSection product={product} />
                    <TagsSection tags={product.tags} />
                  </div>
                </TabsContent>

                {/* Pricing Tab - full CRUD with PricingEngine, PriceTiers and CustomerPricing */}
                <TabsContent value="pricing" className="mt-0 pt-6">
                  <div className="space-y-6 max-w-2xl">
                    <PricingBreakdown product={product} priceTiers={priceTiers} />
                    <PricingEngineContainer
                      productId={product.id}
                      sku={product.sku}
                      name={product.name}
                      basePrice={product.basePrice ?? 0}
                      costPrice={product.costPrice ?? null}
                      onPriceUpdate={onPriceUpdate}
                    />
                    <PriceTiers
                      productId={product.id}
                      basePrice={product.basePrice ?? 0}
                      tiers={priceTiers}
                    />
                    <CustomerPricing
                      productId={product.id}
                      basePrice={product.basePrice ?? 0}
                      customerPrices={customerPrices}
                    />
                  </div>
                </TabsContent>

                {/* Inventory Tab */}
                <TabsContent value="inventory" className="mt-0 pt-6">
                  <ProductInventoryTab
                    productId={product.id}
                    trackInventory={product.trackInventory}
                    isSerialized={product.isSerialized}
                  />
                </TabsContent>

                {/* Images Tab */}
                <TabsContent value="images" className="mt-0 pt-6">
                  <ProductImagesTab productId={product.id} />
                </TabsContent>

                {/* Attributes Tab */}
                <TabsContent value="attributes" className="mt-0 pt-6">
                  <ProductAttributesTab productId={product.id} />
                </TabsContent>

                {/* Activity Tab */}
                <TabsContent value="activity" className="mt-0 pt-6">
                  <div className="space-y-4">
                    {onLogActivity && (
                      <div className="flex items-center justify-end">
                        <Button size="sm" onClick={onLogActivity}>
                          <Plus className="h-4 w-4 mr-2" />
                          Log Activity
                        </Button>
                      </div>
                    )}
                    <UnifiedActivityTimeline
                      activities={activities}
                      isLoading={activitiesLoading}
                      hasError={!!activitiesError}
                      error={activitiesError || undefined}
                      title="Activity Timeline"
                      description="Complete history of product changes and updates"
                      showFilters={true}
                      viewAllSearch={getActivitiesFeedSearch('product')}
                      emptyMessage="No activity recorded yet"
                      emptyDescription="Product activities will appear here when changes are made."
                    />
                  </div>
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
              className="border-l border-border pl-6"
            >
              <RightMetaPanel product={product} category={category} images={images} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});

export default ProductDetailView;
