/**
 * Supplier Detail View (Presenter)
 *
 * Full-width layout following Project Management reference patterns.
 * Maximizes schema field presentation with specialized section components.
 *
 * @see STANDARDS.md - Container/Presenter pattern
 * @see _reference/project-management-reference/components/projects/ProjectDetailsPage.tsx
 */

import { memo, useMemo, type ReactNode } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Star,
  Clock,
  Package,
  DollarSign,
  TrendingUp,
  Percent,
  AlertCircle,
  Link2,
  PanelRight,
  Calendar,
  Hash,
  User,
  CreditCard,
  CheckCircle,
  X,
  Plus,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { formatAmount } from '@/lib/currency';
import { FormatAmount, MetricCard, EntityHeader } from '@/components/shared';
import { StatusCell } from '@/components/shared/data-table';
import { UnifiedActivityTimeline } from '@/components/shared/activity';
import { SUPPLIER_STATUS_CONFIG, SUPPLIER_TYPE_CONFIG, SUPPLIER_STATUS_CONFIG_FOR_ENTITY_HEADER, formatLeadTime } from '../supplier-status-config';
import { PO_STATUS_CONFIG } from '../../purchase-orders/po-status-config';
import type { SupplierStatus, SupplierType, SupplierAddress } from '@/lib/schemas/suppliers';
import type { PurchaseOrderStatus } from '@/lib/schemas/purchase-orders';
import type { UnifiedActivity } from '@/lib/schemas/unified-activity';
import { useAlertDismissals, generateAlertIdWithValue } from '@/hooks/_shared/use-alert-dismissals';

// ============================================================================
// TYPES
// ============================================================================

interface PerformanceMetric {
  metricMonth: string;
  totalOrdersDelivered: number | null;
  onTimeDeliveries: number | null;
  lateDeliveries: number | null;
  averageDeliveryDays: number | null;
  totalItemsReceived: number | null;
  acceptedItems: number | null;
  rejectedItems: number | null;
  defectRate: number | null;
  totalSpend: number | null;
  deliveryScore: number | null;
  qualityScore: number | null;
  overallScore: number | null;
}

interface PurchaseOrderSummary {
  id: string;
  poNumber: string;
  status: PurchaseOrderStatus;
  totalAmount: number;
  currency?: string;
  createdAt: Date | string;
}

interface PriceAgreement {
  id: string;
  productName: string;
  productSku?: string;
  agreedPrice: number;
  validFrom: Date | string;
  validTo: Date | string;
}

export interface SupplierData {
  id: string;
  supplierCode: string;
  name: string;
  legalName?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  status: SupplierStatus;
  supplierType?: SupplierType | null;
  taxId?: string | null;
  registrationNumber?: string | null;
  primaryContactName?: string | null;
  primaryContactEmail?: string | null;
  primaryContactPhone?: string | null;
  billingAddress?: SupplierAddress | null;
  shippingAddress?: SupplierAddress | null;
  paymentTerms?: 'net_15' | 'net_30' | 'net_45' | 'net_60' | 'cod' | 'prepaid' | null;
  currency: string;
  leadTimeDays?: number | null;
  minimumOrderValue?: number | null;
  maximumOrderValue?: number | null;
  overallRating?: number | null;
  qualityRating?: number | null;
  deliveryRating?: number | null;
  communicationRating?: number | null;
  totalPurchaseOrders?: number | null;
  totalPurchaseValue?: number | null;
  averageOrderValue?: number | null;
  firstOrderDate?: Date | string | null;
  lastOrderDate?: Date | string | null;
  tags?: string[] | null;
  notes?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy?: string | null;
  version?: number;
  performanceMetrics?: PerformanceMetric[];
}

/** Header config for EntityHeader (matches EntityHeaderAction) */
export interface SupplierDetailHeaderConfig {
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
    disabled?: boolean;
  };
  secondaryActions?: Array<{
    label: string;
    onClick: () => void;
    icon?: ReactNode;
    destructive?: boolean;
    disabled?: boolean;
  }>;
  onEdit?: () => void;
  onDelete?: () => void;
}

export interface SupplierDetailViewProps {
  supplier: SupplierData;
  activeTab: string;
  onTabChange: (tab: string) => void;
  showMetaPanel: boolean;
  onToggleMetaPanel: () => void;
  /** EntityHeader config - when provided, uses EntityHeader instead of custom header */
  headerConfig?: SupplierDetailHeaderConfig;
  purchaseOrders?: PurchaseOrderSummary[];
  purchaseOrdersLoading?: boolean;
  priceAgreements?: PriceAgreement[];
  priceAgreementsLoading?: boolean;
  activities?: UnifiedActivity[];
  activitiesLoading?: boolean;
  activitiesError?: Error | null;
  /** Handler to open activity logging dialog */
  onLogActivity?: () => void;
  className?: string;
}

// ============================================================================
// LOCAL CONFIGURATIONS
// ============================================================================

type CurrencyCode = 'AUD' | 'USD' | 'EUR' | 'GBP';

function toCurrency(value: string | null | undefined): CurrencyCode {
  const upper = (value ?? 'AUD').toUpperCase();
  if (upper === 'AUD' || upper === 'USD' || upper === 'EUR' || upper === 'GBP') {
    return upper;
  }
  return 'AUD';
}

const PAYMENT_TERMS_LABELS: Record<string, string> = {
  net_15: 'Net 15',
  net_30: 'Net 30',
  net_45: 'Net 45',
  net_60: 'Net 60',
  cod: 'Cash on Delivery',
  prepaid: 'Prepaid',
};

const SUPPLIER_STATUS_CLASSES: Record<SupplierStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200',
  inactive: 'bg-muted text-muted-foreground',
  suspended: 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200',
  blacklisted: 'bg-destructive/10 text-destructive',
};

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
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
// RATING VISUALIZATION
// ============================================================================

const RatingStars = memo(function RatingStars({ rating, showValue = true }: { rating: number | null | undefined; showValue?: boolean }) {
  if (rating === null || rating === undefined) {
    return <span className="text-muted-foreground text-sm">No rating</span>;
  }

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            'h-4 w-4',
            star <= Math.round(rating)
              ? 'fill-yellow-400 text-yellow-400'
              : 'fill-muted text-muted'
          )}
        />
      ))}
      {showValue && <span className="ml-1 text-sm text-muted-foreground">({rating.toFixed(1)})</span>}
    </div>
  );
});

const RatingBar = memo(function RatingBar({
  label,
  rating,
  maxRating = 5
}: {
  label: string;
  rating: number | null | undefined;
  maxRating?: number;
}) {
  const percentage = rating !== null && rating !== undefined ? (rating / maxRating) * 100 : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{rating?.toFixed(1) ?? '---'}</span>
      </div>
      <Progress
        value={percentage}
        className={cn(
          'h-2',
          percentage >= 80 && '[&>div]:bg-green-500',
          percentage >= 60 && percentage < 80 && '[&>div]:bg-amber-500',
          percentage < 60 && '[&>div]:bg-destructive'
        )}
      />
    </div>
  );
});

// ============================================================================
// SUPPLIER HEADER (EntityHeader per DETAIL-VIEW-STANDARDS)
// ============================================================================

interface SupplierHeaderSectionProps {
  supplier: SupplierData;
  showMetaPanel: boolean;
  onToggleMetaPanel: () => void;
  headerConfig?: SupplierDetailHeaderConfig;
}

function SupplierHeaderSection({ supplier, showMetaPanel, onToggleMetaPanel, headerConfig }: SupplierHeaderSectionProps) {
  const typeConfig = supplier.supplierType ? SUPPLIER_TYPE_CONFIG[supplier.supplierType] : null;
  const TypeIcon = typeConfig?.icon;

  const metaItems: MetaChip[] = [
    { label: 'Code', value: supplier.supplierCode, icon: <Hash className="h-3.5 w-3.5" /> },
    ...(supplier.supplierType && typeConfig ? [{
      label: 'Type',
      value: typeConfig.label,
      icon: TypeIcon ? <TypeIcon className="h-3.5 w-3.5" /> : undefined,
    }] : []),
    ...(supplier.leadTimeDays !== null && supplier.leadTimeDays !== undefined ? [{
      label: 'Lead Time',
      value: formatLeadTime(supplier.leadTimeDays),
      icon: <Clock className="h-3.5 w-3.5" />,
    }] : []),
    { label: 'Orders', value: String(supplier.totalPurchaseOrders ?? 0), icon: <Package className="h-3.5 w-3.5" /> },
    ...(supplier.lastOrderDate ? [{
      label: 'Last Order',
      value: formatDistanceToNow(new Date(supplier.lastOrderDate), { addSuffix: true }),
      icon: <Calendar className="h-3.5 w-3.5" />,
    }] : []),
  ];

  const viewSecondaryActions = [
    { label: 'Copy link', onClick: () => copyToClipboard(window.location.href), icon: <Link2 className="h-4 w-4" /> },
    {
      label: showMetaPanel ? 'Hide details panel' : 'Show details panel',
      onClick: onToggleMetaPanel,
      icon: <PanelRight className="h-4 w-4" />,
    },
  ];

  if (headerConfig) {
    return (
      <section className="space-y-4">
        <EntityHeader
          name={supplier.name}
          subtitle={supplier.legalName && supplier.legalName !== supplier.name ? supplier.legalName : undefined}
          avatarFallback="S"
          status={{
            value: supplier.status,
            config: SUPPLIER_STATUS_CONFIG_FOR_ENTITY_HEADER,
          }}
          typeBadge={
            supplier.supplierType && typeConfig ? (
              <Badge variant="outline" className="text-[11px]">
                {typeConfig.label}
              </Badge>
            ) : undefined
          }
          primaryAction={headerConfig.primaryAction}
          secondaryActions={[...viewSecondaryActions, ...(headerConfig.secondaryActions ?? [])]}
          onEdit={headerConfig.onEdit}
          onDelete={headerConfig.onDelete}
        />
        <MetaChipsRow items={metaItems} />
      </section>
    );
  }

  // Fallback: minimal header when no headerConfig (e.g. loading/error)
  const statusConfig = SUPPLIER_STATUS_CONFIG[supplier.status];
  const StatusIcon = statusConfig?.icon ?? CheckCircle;
  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground leading-tight">{supplier.name}</h1>
            {supplier.legalName && supplier.legalName !== supplier.name && (
              <p className="text-sm text-muted-foreground">{supplier.legalName}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge className={cn('gap-1 text-[11px]', SUPPLIER_STATUS_CLASSES[supplier.status])}>
              <StatusIcon className="h-3 w-3" />
              {statusConfig?.label ?? supplier.status}
            </Badge>
            {supplier.supplierType && typeConfig && (
              <Badge variant="outline" className="text-[11px]">
                {typeConfig.label}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
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
                <Button variant="ghost" size="icon" className={cn('h-8 w-8 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0', showMetaPanel && 'bg-muted')} onClick={onToggleMetaPanel} aria-label={showMetaPanel ? 'Hide details panel' : 'Show details panel'}>
                  <PanelRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{showMetaPanel ? 'Hide' : 'Show'} details panel</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      <MetaChipsRow items={metaItems} />
    </section>
  );
}

// ============================================================================
// PERFORMANCE METRICS SECTION
// ============================================================================

interface PerformanceMetricsSectionProps {
  supplier: SupplierData;
}

function PerformanceMetricsSection({ supplier }: PerformanceMetricsSectionProps) {
  const totalSpend = supplier.performanceMetrics?.reduce(
    (sum, m) => sum + (m.totalSpend ?? 0),
    0
  ) ?? supplier.totalPurchaseValue ?? 0;
  const currency = toCurrency(supplier.currency);

  return (
    <section>
      <h2 className="text-base font-semibold text-foreground mb-4">Performance Overview</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          icon={Star}
          title="Overall Rating"
          value={<RatingStars rating={supplier.overallRating} />}
        />
        <MetricCard
          icon={Package}
          title="Total Orders"
          value={supplier.totalPurchaseOrders ?? 0}
          subtitle={supplier.averageOrderValue
            ? `Avg: ${formatAmount({ amount: supplier.averageOrderValue, currency })}`
            : undefined}
        />
        <MetricCard
          icon={Clock}
          title="Lead Time"
          value={formatLeadTime(supplier.leadTimeDays ?? null)}
        />
        <MetricCard
          icon={DollarSign}
          title="Total Spend"
          value={<FormatAmount amount={totalSpend} currency={currency} />}
          subtitle={supplier.firstOrderDate ? `Since ${format(new Date(supplier.firstOrderDate), 'MMM yyyy')}` : undefined}
        />
      </div>
    </section>
  );
}

// ============================================================================
// RATINGS BREAKDOWN SECTION
// ============================================================================

interface RatingsBreakdownSectionProps {
  supplier: SupplierData;
}

function RatingsBreakdownSection({ supplier }: RatingsBreakdownSectionProps) {
  return (
    <section>
      <h2 className="text-base font-semibold text-foreground mb-4">Ratings Breakdown</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <RatingBar label="Quality" rating={supplier.qualityRating} />
        <RatingBar label="Delivery" rating={supplier.deliveryRating} />
        <RatingBar label="Communication" rating={supplier.communicationRating} />
      </div>
    </section>
  );
}

// ============================================================================
// CONTACT INFORMATION SECTION
// ============================================================================

interface ContactInformationSectionProps {
  supplier: SupplierData;
}

function ContactInformationSection({ supplier }: ContactInformationSectionProps) {
  return (
    <section>
      <h2 className="text-base font-semibold text-foreground mb-4">Contact Information</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Main Contact */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Company Contact</h3>
          {supplier.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a href={`mailto:${supplier.email}`} className="hover:underline">
                {supplier.email}
              </a>
            </div>
          )}
          {supplier.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <a href={`tel:${supplier.phone}`} className="hover:underline">
                {supplier.phone}
              </a>
            </div>
          )}
          {supplier.website && (
            <div className="flex items-center gap-2 text-sm">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <a
                href={supplier.website}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                {supplier.website}
              </a>
            </div>
          )}
          {!supplier.email && !supplier.phone && !supplier.website && (
            <p className="text-sm text-muted-foreground">No contact information on file</p>
          )}
        </div>

        {/* Primary Contact */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Primary Contact</h3>
          {supplier.primaryContactName ? (
            <>
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{supplier.primaryContactName}</span>
              </div>
              {supplier.primaryContactEmail && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${supplier.primaryContactEmail}`} className="hover:underline">
                    {supplier.primaryContactEmail}
                  </a>
                </div>
              )}
              {supplier.primaryContactPhone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${supplier.primaryContactPhone}`} className="hover:underline">
                    {supplier.primaryContactPhone}
                  </a>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No primary contact assigned</p>
          )}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// ADDRESSES SECTION
// ============================================================================

interface AddressesSectionProps {
  billingAddress: SupplierAddress | null | undefined;
  shippingAddress: SupplierAddress | null | undefined;
}

function AddressesSection({ billingAddress, shippingAddress }: AddressesSectionProps) {
  const renderAddress = (address: SupplierAddress | null | undefined) => {
    if (!address) return <span className="text-muted-foreground text-sm">Not specified</span>;
    return (
      <div className="text-sm space-y-0.5">
        <div>{address.street1}</div>
        {address.street2 && <div>{address.street2}</div>}
        <div>{address.city}, {address.state} {address.postcode}</div>
        <div className="text-muted-foreground">{address.country}</div>
      </div>
    );
  };

  return (
    <section>
      <h2 className="text-base font-semibold text-foreground mb-4">Addresses</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> Billing Address
          </h3>
          {renderAddress(billingAddress)}
        </div>
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <MapPin className="h-4 w-4" /> Shipping Address
          </h3>
          {renderAddress(shippingAddress)}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// PAYMENT TERMS SECTION
// ============================================================================

interface PaymentTermsSectionProps {
  supplier: SupplierData;
}

function PaymentTermsSection({ supplier }: PaymentTermsSectionProps) {
  const currency = toCurrency(supplier.currency);

  return (
    <section>
      <h2 className="text-base font-semibold text-foreground mb-4">Payment & Order Terms</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div>
          <div className="text-xs text-muted-foreground mb-1">Payment Terms</div>
          <div className="text-sm font-medium">
            {supplier.paymentTerms ? PAYMENT_TERMS_LABELS[supplier.paymentTerms] : 'Not specified'}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">Currency</div>
          <div className="text-sm font-medium">{supplier.currency}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">Minimum Order</div>
          <div className="text-sm font-medium">
            {supplier.minimumOrderValue ? (
              <FormatAmount amount={supplier.minimumOrderValue} currency={currency} />
            ) : (
              'No minimum'
            )}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">Maximum Order</div>
          <div className="text-sm font-medium">
            {supplier.maximumOrderValue ? (
              <FormatAmount amount={supplier.maximumOrderValue} currency={currency} />
            ) : (
              'No limit'
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// NOTES SECTION
// ============================================================================

interface NotesSectionProps {
  notes?: string | null;
  tags?: string[] | null;
}

function NotesSection({ notes, tags }: NotesSectionProps) {
  if (!notes && (!tags || tags.length === 0)) return null;

  return (
    <section>
      <h2 className="text-base font-semibold text-foreground mb-4">Notes & Tags</h2>
      {notes && (
        <p className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-md mb-4">{notes}</p>
      )}
      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </section>
  );
}

// ============================================================================
// RECENT PURCHASE ORDERS SECTION
// ============================================================================

interface RecentPurchaseOrdersSectionProps {
  purchaseOrders: PurchaseOrderSummary[];
  loading?: boolean;
}

function RecentPurchaseOrdersSection({ purchaseOrders, loading }: RecentPurchaseOrdersSectionProps) {
  if (loading) {
    return (
      <section>
        <h2 className="text-base font-semibold text-foreground mb-4">Recent Purchase Orders</h2>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </section>
    );
  }

  const displayOrders = purchaseOrders.slice(0, 5);
  const hasMore = purchaseOrders.length > 5;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-foreground">Recent Purchase Orders</h2>
        <span className="text-sm text-muted-foreground">{purchaseOrders.length} orders</span>
      </div>
      {displayOrders.length > 0 ? (
        <>
          <div className="space-y-2">
            {displayOrders.map((po) => (
              <div key={po.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="min-w-0">
                    <div className="text-sm font-medium font-mono">{po.poNumber}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(po.createdAt), 'PP')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusCell status={po.status} statusConfig={PO_STATUS_CONFIG} />
                  <span className="text-sm font-medium tabular-nums">
                    <FormatAmount amount={po.totalAmount} currency={po.currency} />
                  </span>
                </div>
              </div>
            ))}
          </div>
          {hasMore && (
            <div className="text-sm text-muted-foreground text-center py-2">
              +{purchaseOrders.length - 5} more orders
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No purchase orders yet</p>
        </div>
      )}
    </section>
  );
}

// ============================================================================
// RIGHT META PANEL (Project Management pattern)
// ============================================================================

interface RightMetaPanelProps {
  supplier: SupplierData;
}

function RightMetaPanel({ supplier }: RightMetaPanelProps) {
  const currency = toCurrency(supplier.currency);

  return (
    <aside className="flex flex-col gap-8 p-4 pt-8 lg:sticky lg:self-start lg:top-4">
      {/* Quick Contact */}
      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Quick Contact</h3>
        <div className="space-y-2">
          {supplier.email && (
            <a href={`mailto:${supplier.email}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
              <Mail className="h-4 w-4" />
              Email Supplier
            </a>
          )}
          {supplier.phone && (
            <a href={`tel:${supplier.phone}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
              <Phone className="h-4 w-4" />
              Call {supplier.phone}
            </a>
          )}
          {supplier.website && (
            <a
              href={supplier.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <Globe className="h-4 w-4" />
              Visit Website
            </a>
          )}
        </div>
      </div>
      <Separator />

      {/* Business Info */}
      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Business Info</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Supplier Code</span>
            <span className="font-mono">{supplier.supplierCode}</span>
          </div>
          {supplier.taxId && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax ID (ABN)</span>
              <span className="font-mono">{supplier.taxId}</span>
            </div>
          )}
          {supplier.registrationNumber && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Registration #</span>
              <span className="font-mono">{supplier.registrationNumber}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Currency</span>
            <span>{supplier.currency}</span>
          </div>
          {supplier.paymentTerms && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment Terms</span>
              <span>{PAYMENT_TERMS_LABELS[supplier.paymentTerms]}</span>
            </div>
          )}
        </div>
      </div>
      <Separator />

      {/* Order Limits */}
      {(supplier.minimumOrderValue || supplier.maximumOrderValue) && (
        <>
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Order Limits</h3>
            <div className="space-y-2 text-sm">
              {supplier.minimumOrderValue && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Minimum</span>
                  <span className="font-medium"><FormatAmount amount={supplier.minimumOrderValue} currency={currency} /></span>
                </div>
              )}
              {supplier.maximumOrderValue && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Maximum</span>
                  <span className="font-medium"><FormatAmount amount={supplier.maximumOrderValue} currency={currency} /></span>
                </div>
              )}
            </div>
          </div>
          <Separator />
        </>
      )}

      {/* Audit Trail */}
      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Audit Trail</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Created</span>
            <span>{format(new Date(supplier.createdAt), 'PP')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Updated</span>
            <span>{format(new Date(supplier.updatedAt), 'PP')}</span>
          </div>
          {supplier.createdBy && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created by</span>
              <span className="truncate max-w-[120px]">{supplier.createdBy}</span>
            </div>
          )}
          {supplier.version && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Version</span>
              <span>v{supplier.version}</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

// ============================================================================
// MONTHLY PERFORMANCE TABLE
// ============================================================================

interface MonthlyPerformanceTableProps {
  metrics: PerformanceMetric[];
  currency: CurrencyCode;
}

function MonthlyPerformanceTable({ metrics, currency }: MonthlyPerformanceTableProps) {
  if (!metrics.length) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No performance data available</p>
        <p className="text-sm text-muted-foreground">
          Performance metrics will appear once orders have been placed
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Month</TableHead>
          <TableHead className="text-right">Orders</TableHead>
          <TableHead className="text-right">On-Time</TableHead>
          <TableHead className="text-right">Late</TableHead>
          <TableHead className="text-right">Defect Rate</TableHead>
          <TableHead className="text-right">Spend</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {metrics.map((metric) => {
          const onTimePercent = metric.onTimeDeliveries && metric.totalOrdersDelivered
            ? Math.round((metric.onTimeDeliveries / metric.totalOrdersDelivered) * 100)
            : null;

          return (
            <TableRow key={metric.metricMonth}>
              <TableCell className="font-medium">
                {format(new Date(metric.metricMonth), 'MMM yyyy')}
              </TableCell>
              <TableCell className="text-right tabular-nums">{metric.totalOrdersDelivered ?? 0}</TableCell>
              <TableCell className={cn(
                'text-right tabular-nums',
                onTimePercent !== null && onTimePercent >= 90 && 'text-green-600',
                onTimePercent !== null && onTimePercent < 90 && onTimePercent >= 75 && 'text-amber-600',
                onTimePercent !== null && onTimePercent < 75 && 'text-destructive'
              )}>
                {metric.onTimeDeliveries ?? 0}
                {onTimePercent !== null && <span className="text-muted-foreground ml-1">({onTimePercent}%)</span>}
              </TableCell>
              <TableCell className={cn(
                'text-right tabular-nums',
                (metric.lateDeliveries ?? 0) > 0 && 'text-destructive'
              )}>
                {metric.lateDeliveries ?? 0}
              </TableCell>
              <TableCell className={cn(
                'text-right tabular-nums',
                (metric.defectRate ?? 0) > 5 && 'text-destructive',
                (metric.defectRate ?? 0) > 0 && (metric.defectRate ?? 0) <= 5 && 'text-amber-600'
              )}>
                {metric.defectRate ? `${metric.defectRate.toFixed(1)}%` : '---'}
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums">
                <FormatAmount amount={metric.totalSpend ?? 0} currency={currency} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const SupplierDetailView = memo(function SupplierDetailView({
  supplier,
  activeTab,
  onTabChange,
  showMetaPanel,
  onToggleMetaPanel,
  headerConfig,
  purchaseOrders = [],
  purchaseOrdersLoading = false,
  priceAgreements = [],
  priceAgreementsLoading = false,
  activities = [],
  activitiesLoading = false,
  activitiesError,
  onLogActivity,
  className,
}: SupplierDetailViewProps) {
  const currency = useMemo(() => toCurrency(supplier.currency), [supplier.currency]);
  const poCount = useMemo(() => purchaseOrders.length, [purchaseOrders]);
  const priceCount = useMemo(() => priceAgreements.length, [priceAgreements]);
  const { dismiss, isAlertDismissed } = useAlertDismissals();

  const alerts = useMemo(() => {
    const items: Array<{
      id: string;
      tone: 'warning' | 'critical';
      title: string;
      description: string;
      actionLabel: string;
      onAction: () => void;
    }> = [];

    if (supplier.status === 'suspended') {
      items.push({
        id: generateAlertIdWithValue('supplier', supplier.id, 'suspended', supplier.status),
        tone: 'warning',
        title: 'Supplier suspended',
        description: 'Review their status before placing new orders.',
        actionLabel: 'View performance',
        onAction: () => onTabChange('performance'),
      });
    }

    if (supplier.status === 'blacklisted') {
      items.push({
        id: generateAlertIdWithValue('supplier', supplier.id, 'blacklisted', supplier.status),
        tone: 'critical',
        title: 'Supplier blacklisted',
        description: 'No new orders should be placed with this supplier.',
        actionLabel: 'View performance',
        onAction: () => onTabChange('performance'),
      });
    }

    return items;
  }, [onTabChange, supplier.id, supplier.status]);

  const visibleAlerts = alerts.filter((alert) => !isAlertDismissed(alert.id)).slice(0, 3);

  return (
    <div className={cn('flex flex-1 flex-col min-w-0', className)}>
      {/* Main Content - FULL WIDTH (no max-w-7xl) */}
      <div className="flex flex-1 flex-col bg-background min-w-0">
        <div className="px-4">
          <div className={cn(
            'grid grid-cols-1 gap-12',
            showMetaPanel ? 'lg:grid-cols-[minmax(0,2fr)_minmax(0,320px)]' : 'lg:grid-cols-1'
          )}>
            {/* Primary Content */}
            <div className="space-y-6 pt-4 pb-6">
              <SupplierHeaderSection
                supplier={supplier}
                showMetaPanel={showMetaPanel}
                onToggleMetaPanel={onToggleMetaPanel}
                headerConfig={headerConfig}
              />

              {visibleAlerts.length > 0 && (
                <div className="space-y-2">
                  {visibleAlerts.map((alert) => (
                    <Alert
                      key={alert.id}
                      variant={alert.tone === 'critical' ? 'destructive' : 'default'}
                    >
                      <AlertDescription className="flex flex-wrap items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="text-sm font-medium">{alert.title}</div>
                          <div className="text-sm text-muted-foreground">{alert.description}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={alert.onAction}>
                            {alert.actionLabel}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Dismiss alert"
                            onClick={() => dismiss(alert.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}

              <Tabs value={activeTab} onValueChange={onTabChange}>
                <TabsList className="w-full gap-6 bg-transparent border-b border-border rounded-none h-auto p-0">
                  <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3">
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="performance" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3">
                    Performance
                  </TabsTrigger>
                  <TabsTrigger value="orders" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 gap-2">
                    Orders
                    <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs">
                      {poCount}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="pricing" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 gap-2">
                    Pricing
                    <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs">
                      {priceCount}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3">
                    Activity
                  </TabsTrigger>
                </TabsList>

                {/* Overview Tab - space-y-10 for generous spacing between sections */}
                <TabsContent value="overview" className="mt-0 pt-6">
                  <div className="space-y-10">
                    <PerformanceMetricsSection supplier={supplier} />
                    <RatingsBreakdownSection supplier={supplier} />
                    <ContactInformationSection supplier={supplier} />
                    <AddressesSection billingAddress={supplier.billingAddress} shippingAddress={supplier.shippingAddress} />
                    <PaymentTermsSection supplier={supplier} />
                    <RecentPurchaseOrdersSection
                      purchaseOrders={purchaseOrders}
                      loading={purchaseOrdersLoading}
                    />
                    <NotesSection notes={supplier.notes} tags={supplier.tags} />
                  </div>
                </TabsContent>

                {/* Performance Tab */}
                <TabsContent value="performance" className="mt-0 pt-6">
                  <div className="space-y-6">
                    {supplier.performanceMetrics && supplier.performanceMetrics.length > 0 ? (
                      <>
                        <div className="grid gap-4 md:grid-cols-4">
                          <MetricCard
                            icon={TrendingUp}
                            title="On-Time Delivery"
                            value={(() => {
                              const latest = supplier.performanceMetrics[0];
                              if (latest?.onTimeDeliveries && latest?.totalOrdersDelivered) {
                                return `${Math.round((latest.onTimeDeliveries / latest.totalOrdersDelivered) * 100)}%`;
                              }
                              return 'N/A';
                            })()}
                          />
                          <MetricCard
                            icon={Percent}
                            title="Defect Rate"
                            value={supplier.performanceMetrics[0]?.defectRate
                              ? `${supplier.performanceMetrics[0].defectRate.toFixed(1)}%`
                              : 'N/A'}
                          />
                          <MetricCard
                            icon={Clock}
                            title="Avg Delivery Days"
                            value={supplier.performanceMetrics[0]?.averageDeliveryDays
                              ? `${Math.round(supplier.performanceMetrics[0].averageDeliveryDays)}`
                              : 'N/A'}
                          />
                          <MetricCard
                            icon={Package}
                            title="Items Received"
                            value={supplier.performanceMetrics[0]?.totalItemsReceived ?? 0}
                            subtitle={supplier.performanceMetrics[0]?.rejectedItems
                              ? `${supplier.performanceMetrics[0].rejectedItems} rejected`
                              : undefined}
                          />
                        </div>
                        <MonthlyPerformanceTable metrics={supplier.performanceMetrics} currency={currency} />
                      </>
                    ) : (
                      <div className="text-center py-12">
                        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No performance data available</p>
                        <p className="text-sm text-muted-foreground">
                          Performance metrics will appear once orders have been placed
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Purchase Orders Tab */}
                <TabsContent value="orders" className="mt-0 pt-6">
                  {purchaseOrdersLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                      ))}
                    </div>
                  ) : purchaseOrders.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>PO Number</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {purchaseOrders.map((po) => (
                          <TableRow key={po.id}>
                            <TableCell className="font-mono">{po.poNumber}</TableCell>
                            <TableCell>
                              <StatusCell status={po.status} statusConfig={PO_STATUS_CONFIG} />
                            </TableCell>
                            <TableCell className="text-right font-medium tabular-nums">
                              <FormatAmount amount={po.totalAmount} currency={po.currency} />
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {format(new Date(po.createdAt), 'PP')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-12">
                      <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No purchase orders yet</p>
                      <p className="text-sm text-muted-foreground">
                        Purchase orders for this supplier will appear here
                      </p>
                    </div>
                  )}
                </TabsContent>

                {/* Pricing Tab */}
                <TabsContent value="pricing" className="mt-0 pt-6">
                  {priceAgreementsLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                      ))}
                    </div>
                  ) : priceAgreements.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Agreed Price</TableHead>
                          <TableHead className="text-right">Valid From</TableHead>
                          <TableHead className="text-right">Valid To</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {priceAgreements.map((agreement) => (
                          <TableRow key={agreement.id}>
                            <TableCell>
                              <div className="font-medium">{agreement.productName}</div>
                              {agreement.productSku && (
                                <div className="text-xs text-muted-foreground">SKU: {agreement.productSku}</div>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-medium tabular-nums">
                              <FormatAmount amount={agreement.agreedPrice} currency={currency} />
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {format(new Date(agreement.validFrom), 'PP')}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {format(new Date(agreement.validTo), 'PP')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-12">
                      <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No price agreements</p>
                      <p className="text-sm text-muted-foreground">
                        Negotiated pricing for this supplier will appear here
                      </p>
                    </div>
                  )}
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
                      description="Complete history of supplier changes, orders, and system events"
                      showFilters={true}
                      emptyMessage="No activity recorded yet"
                      emptyDescription="Supplier activities will appear here when changes are made."
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
                  className="lg:border-l lg:border-border"
                >
                  <RightMetaPanel supplier={supplier} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
});

export default SupplierDetailView;
