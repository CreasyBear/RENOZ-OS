/**
 * Supplier Detail Component
 *
 * Comprehensive supplier view with info, performance metrics, and tabs for
 * purchase orders and price agreements.
 *
 * @see SUPP-SUPPLIER-DETAIL story
 */
import { memo, useState } from 'react';
import {
  Mail,
  Phone,
  Globe,
  Star,
  Clock,
  TrendingUp,
  Package,
  DollarSign,
  Percent,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { FormatAmount, MetricCard } from '@/components/shared';
import { StatusCell } from '@/components/shared/data-table';
import { SUPPLIER_STATUS_CONFIG } from './supplier-status-config';
import { PO_STATUS_CONFIG } from '../purchase-orders/po-status-config';
import type { PurchaseOrderStatus } from '@/lib/schemas/purchase-orders';

// ============================================================================
// HELPERS
// ============================================================================

type CurrencyCode = 'AUD' | 'USD' | 'EUR' | 'GBP';

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function toCurrency(value: string | null | undefined): CurrencyCode {
  const upper = (value ?? 'AUD').toUpperCase();
  if (upper === 'AUD' || upper === 'USD' || upper === 'EUR' || upper === 'GBP') {
    return upper;
  }
  return 'AUD';
}

// ============================================================================
// TYPES
// ============================================================================

interface Address {
  street1: string;
  street2?: string;
  city: string;
  state?: string;
  postcode: string;
  country: string;
}

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

export interface Supplier {
  id: string;
  supplierCode: string;
  name: string;
  legalName?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  status: 'active' | 'inactive' | 'suspended' | 'blacklisted';
  supplierType?: 'manufacturer' | 'distributor' | 'retailer' | 'service' | 'raw_materials' | null;
  taxId?: string | null;
  registrationNumber?: string | null;
  primaryContactName?: string | null;
  primaryContactEmail?: string | null;
  primaryContactPhone?: string | null;
  billingAddress?: Address | null;
  shippingAddress?: Address | null;
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
  lastOrderDate?: Date | string | null;
  tags?: string[] | null;
  notes?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  performanceMetrics?: PerformanceMetric[];
}

export interface SupplierDetailProps {
  /** @source useSupplier(supplierId) in /suppliers/$supplierId.tsx */
  supplier: Supplier;
  /** @source useSupplier loading state */
  isLoading?: boolean;
  /** @source usePurchaseOrders(supplierId) - optional */
  purchaseOrders?: Array<{
    id: string;
    poNumber: string;
    status: PurchaseOrderStatus;
    totalAmount: number;
    createdAt: Date | string;
  }>;
  /** @source usePriceAgreements(supplierId) - optional */
  priceAgreements?: Array<{
    id: string;
    productName: string;
    agreedPrice: number;
    validFrom: Date | string;
    validTo: Date | string;
  }>;
  className?: string;
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================


const TypeBadge = memo(function TypeBadge({
  type,
}: {
  type: Supplier['supplierType'];
}) {
  if (!type) return null;

  const labels: Record<NonNullable<Supplier['supplierType']>, string> = {
    manufacturer: 'Manufacturer',
    distributor: 'Distributor',
    retailer: 'Retailer',
    service: 'Service',
    raw_materials: 'Raw Materials',
  };

  return <Badge variant="outline">{labels[type]}</Badge>;
});

const RatingStars = memo(function RatingStars({ rating }: { rating: number | null | undefined }) {
  if (rating === null || rating === undefined) {
    return <span className="text-muted-foreground text-sm">No rating</span>;
  }

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= rating
              ? 'fill-yellow-400 text-yellow-400'
              : 'fill-muted text-muted'
          }`}
        />
      ))}
      <span className="ml-1 text-sm text-muted-foreground">({rating.toFixed(1)})</span>
    </div>
  );
});

const AddressDisplay = memo(function AddressDisplay({
  address,
  label,
}: {
  address: Address | null | undefined;
  label: string;
}) {
  if (!address) return null;

  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
      <p className="text-sm">
        {address.street1}
        {address.street2 && <>, {address.street2}</>}
        <br />
        {address.city}
        {address.state && `, ${address.state}`} {address.postcode}
        <br />
        {address.country}
      </p>
    </div>
  );
});

// Note: Using shared MetricCard from @/components/shared

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const SupplierDetail = memo(function SupplierDetail({
  supplier,
  isLoading,
  purchaseOrders = [],
  priceAgreements = [],
  className,
}: SupplierDetailProps) {
  const [activeTab, setActiveTab] = useState('overview');

  // ============================================================================
  // LOADING STATE
  // ============================================================================
  if (isLoading) {
    return (
      <div className={className}>
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64 mt-6" />
      </div>
    );
  }

  // Calculate performance summary from metrics
  const latestMetrics = supplier.performanceMetrics?.[0];
  const totalSpend = supplier.performanceMetrics?.reduce(
    (sum, m) => sum + (m.totalSpend ?? 0),
    0
  ) ?? 0;

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div className={className}>
      {/* Performance Metrics Row */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <MetricCard
          icon={Star}
          title="Overall Rating"
          value={<RatingStars rating={supplier.overallRating} />}
        />
        <MetricCard
          icon={Package}
          title="Total Orders"
          value={supplier.totalPurchaseOrders ?? 0}
          subtitle={
            supplier.lastOrderDate
              ? `Last order: ${new Date(supplier.lastOrderDate).toLocaleDateString()}`
              : undefined
          }
        />
        <MetricCard
          icon={Clock}
          title="Lead Time"
          value={supplier.leadTimeDays ? `${supplier.leadTimeDays} days` : 'N/A'}
        />
        <MetricCard
          icon={DollarSign}
          title="Total Spend (12mo)"
          value={<FormatAmount amount={totalSpend} currency={toCurrency(supplier.currency)} />}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="orders">Purchase Orders ({purchaseOrders.length})</TabsTrigger>
          <TabsTrigger value="pricing">Price Agreements ({priceAgreements.length})</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Basic Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {supplier.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${supplier.email}`} className="text-sm hover:underline">
                      {supplier.email}
                    </a>
                  </div>
                )}
                {supplier.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${supplier.phone}`} className="text-sm hover:underline">
                      {supplier.phone}
                    </a>
                  </div>
                )}
                {supplier.website && (
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={supplier.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm hover:underline"
                    >
                      {supplier.website}
                    </a>
                  </div>
                )}
                {supplier.primaryContactName && (
                  <div className="pt-2 border-t">
                    <p className="text-sm font-medium">Primary Contact</p>
                    <p className="text-sm text-muted-foreground">{supplier.primaryContactName}</p>
                    {supplier.primaryContactEmail && (
                      <p className="text-sm text-muted-foreground">{supplier.primaryContactEmail}</p>
                    )}
                    {supplier.primaryContactPhone && (
                      <p className="text-sm text-muted-foreground">{supplier.primaryContactPhone}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Business Details Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Business Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Supplier Code</p>
                    <p className="text-sm font-mono">{supplier.supplierCode}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <StatusCell status={supplier.status} statusConfig={SUPPLIER_STATUS_CONFIG} />
                  </div>
                  {supplier.supplierType && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Type</p>
                      <TypeBadge type={supplier.supplierType} />
                    </div>
                  )}
                  {supplier.paymentTerms && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Payment Terms</p>
                      <p className="text-sm">{supplier.paymentTerms.replace('_', ' ').toUpperCase()}</p>
                    </div>
                  )}
                  {supplier.taxId && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Tax ID</p>
                      <p className="text-sm font-mono">{supplier.taxId}</p>
                    </div>
                  )}
                  {supplier.registrationNumber && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Registration #</p>
                      <p className="text-sm font-mono">{supplier.registrationNumber}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Addresses */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Addresses</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <AddressDisplay address={supplier.billingAddress} label="Billing Address" />
                <AddressDisplay address={supplier.shippingAddress} label="Shipping Address" />
                {!supplier.billingAddress && !supplier.shippingAddress && (
                  <p className="text-sm text-muted-foreground">No addresses on file</p>
                )}
              </CardContent>
            </Card>

            {/* Ratings Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ratings Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Quality</span>
                  <RatingStars rating={supplier.qualityRating} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Delivery</span>
                  <RatingStars rating={supplier.deliveryRating} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Communication</span>
                  <RatingStars rating={supplier.communicationRating} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Notes */}
          {supplier.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{supplier.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Tags */}
          {supplier.tags && supplier.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {supplier.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          {latestMetrics ? (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                <MetricCard
                  icon={TrendingUp}
                  title="On-Time Delivery"
                  value={
                    latestMetrics.onTimeDeliveries && latestMetrics.totalOrdersDelivered
                      ? `${Math.round((latestMetrics.onTimeDeliveries / latestMetrics.totalOrdersDelivered) * 100)}%`
                      : 'N/A'
                  }
                />
                <MetricCard
                  icon={Percent}
                  title="Defect Rate"
                  value={latestMetrics.defectRate ? `${latestMetrics.defectRate.toFixed(1)}%` : 'N/A'}
                />
                <MetricCard
                  icon={Clock}
                  title="Avg Delivery Days"
                  value={latestMetrics.averageDeliveryDays ? `${Math.round(latestMetrics.averageDeliveryDays)}` : 'N/A'}
                />
                <MetricCard
                  icon={Package}
                  title="Items Received"
                  value={latestMetrics.totalItemsReceived ?? 0}
                  subtitle={
                    latestMetrics.rejectedItems
                      ? `${latestMetrics.rejectedItems} rejected`
                      : undefined
                  }
                />
              </div>

              {/* Monthly Performance Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Monthly Performance (Last 12 Months)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Month</th>
                          <th className="text-right py-2">Orders</th>
                          <th className="text-right py-2">On-Time</th>
                          <th className="text-right py-2">Late</th>
                          <th className="text-right py-2">Defect Rate</th>
                          <th className="text-right py-2">Spend</th>
                        </tr>
                      </thead>
                      <tbody>
                        {supplier.performanceMetrics?.map((metric) => (
                          <tr key={metric.metricMonth} className="border-b">
                            <td className="py-2">
                              {new Date(metric.metricMonth).toLocaleDateString('en-AU', {
                                year: 'numeric',
                                month: 'short',
                              })}
                            </td>
                            <td className="text-right py-2">{metric.totalOrdersDelivered ?? 0}</td>
                            <td className="text-right py-2">{metric.onTimeDeliveries ?? 0}</td>
                            <td className="text-right py-2">{metric.lateDeliveries ?? 0}</td>
                            <td className="text-right py-2">
                              {metric.defectRate ? `${metric.defectRate.toFixed(1)}%` : '-'}
                            </td>
                            <td className="text-right py-2">
                              <FormatAmount amount={metric.totalSpend ?? 0} currency={toCurrency(supplier.currency)} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No performance data available</p>
                  <p className="text-sm text-muted-foreground">
                    Performance metrics will appear once orders have been placed
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Purchase Orders Tab */}
        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Purchase Orders</CardTitle>
              <CardDescription>Recent purchase orders with this supplier</CardDescription>
            </CardHeader>
            <CardContent>
              {purchaseOrders.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">PO Number</th>
                        <th className="text-left py-2">Status</th>
                        <th className="text-right py-2">Amount</th>
                        <th className="text-right py-2">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchaseOrders.map((po) => (
                        <tr key={po.id} className="border-b">
                          <td className="py-2 font-mono">{po.poNumber}</td>
                          <td className="py-2">
                            <StatusCell status={po.status} statusConfig={PO_STATUS_CONFIG} />
                          </td>
                          <td className="text-right py-2">
                            <FormatAmount amount={po.totalAmount} currency={toCurrency(supplier.currency)} />
                          </td>
                          <td className="text-right py-2">
                            {formatDate(po.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No purchase orders yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Price Agreements Tab */}
        <TabsContent value="pricing">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Price Agreements</CardTitle>
              <CardDescription>Negotiated pricing for products from this supplier</CardDescription>
            </CardHeader>
            <CardContent>
              {priceAgreements.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Product</th>
                        <th className="text-right py-2">Agreed Price</th>
                        <th className="text-right py-2">Valid From</th>
                        <th className="text-right py-2">Valid To</th>
                      </tr>
                    </thead>
                    <tbody>
                      {priceAgreements.map((agreement) => (
                        <tr key={agreement.id} className="border-b">
                          <td className="py-2">{agreement.productName}</td>
                          <td className="text-right py-2">
                            <FormatAmount amount={agreement.agreedPrice} currency={toCurrency(supplier.currency)} />
                          </td>
                          <td className="text-right py-2">
                            {formatDate(agreement.validFrom)}
                          </td>
                          <td className="text-right py-2">
                            {formatDate(agreement.validTo)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No price agreements</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
});

export default SupplierDetail;
