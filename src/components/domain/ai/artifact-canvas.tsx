/**
 * AI Artifact Canvas Component
 *
 * Side panel for displaying streaming artifacts from AI agents.
 * Renders different visualizations based on artifact type.
 *
 * ARCHITECTURE: Container Component - Uses hooks, composes presenters.
 *
 * @see _Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json (AI-INFRA-016)
 */

import { memo, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Users,
  DollarSign,
  Package,
  Loader2,
  AlertCircle,
  X,
} from 'lucide-react';
import { logger } from '@/lib/logger';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  useAllArtifacts,
  type ArtifactData,
} from '@/hooks/ai';
import type {
  ArtifactType,
  RevenueChartData,
  OrdersPipelineData,
  CustomerSummaryData,
  MetricsCardData,
  TopCustomersData,
} from '@/lib/ai/artifacts';

// ============================================================================
// TYPES
// ============================================================================

export interface ArtifactCanvasProps {
  /** Whether the canvas is visible */
  isOpen?: boolean;
  /** Callback when canvas should close */
  onClose?: () => void;
  /** Optional className */
  className?: string;
  /** Width of the canvas panel */
  width?: string;
}

// ============================================================================
// FORMATTERS
// ============================================================================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

// ============================================================================
// ARTIFACT RENDERERS
// ============================================================================

/** Loading state for artifacts */
const ArtifactLoading = memo(function ArtifactLoading({
  title,
  progress,
}: {
  title: string;
  progress?: number;
}) {
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {progress !== undefined && (
          <Progress value={progress * 100} className="h-1" />
        )}
        <p className="text-xs text-muted-foreground mt-2">Loading data...</p>
      </CardContent>
    </Card>
  );
});

/** Error state for artifacts */
const ArtifactError = memo(function ArtifactError({
  title,
  error,
}: {
  title: string;
  error: string;
}) {
  return (
    <Card className="w-full border-destructive">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-destructive">{error}</p>
      </CardContent>
    </Card>
  );
});

/** Revenue chart artifact renderer */
const RevenueChartRenderer = memo(function RevenueChartRenderer({
  data,
}: {
  data: RevenueChartData | undefined;
}) {
  if (!data) return null;
  const TrendIcon =
    data.summary?.trend === 'up'
      ? TrendingUp
      : data.summary?.trend === 'down'
        ? TrendingDown
        : Minus;

  const trendColor =
    data.summary?.trend === 'up'
      ? 'text-green-600'
      : data.summary?.trend === 'down'
        ? 'text-red-600'
        : 'text-muted-foreground';

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            {data.title}
          </CardTitle>
          {data.period && (
            <Badge variant="outline" className="text-xs">
              {data.period.label}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary metrics */}
        {data.summary && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Total Revenue</p>
              <p className="text-lg font-semibold">{formatCurrency(data.summary.total)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Change</p>
              <p className={cn('text-lg font-semibold flex items-center gap-1', trendColor)}>
                <TrendIcon className="h-4 w-4" />
                {formatPercent(data.summary.change)}
              </p>
            </div>
          </div>
        )}

        {/* Simple bar chart visualization */}
        {data.data.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Daily Revenue</p>
            <div className="flex items-end gap-1 h-20">
              {data.data.slice(-14).map((point, i) => {
                const maxValue = Math.max(...data.data.map((d) => d.value));
                const height = maxValue > 0 ? (point.value / maxValue) * 100 : 0;
                return (
                  <div
                    key={i}
                    className="flex-1 bg-primary/20 hover:bg-primary/40 transition-colors rounded-t"
                    style={{ height: `${Math.max(height, 4)}%` }}
                    title={`${point.date}: ${formatCurrency(point.value)}`}
                  />
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

/** Orders pipeline artifact renderer */
const OrdersPipelineRenderer = memo(function OrdersPipelineRenderer({
  data,
}: {
  data: OrdersPipelineData | undefined;
}) {
  if (!data) return null;
  const statusColors: Record<string, string> = {
    draft: 'bg-gray-200',
    confirmed: 'bg-blue-200',
    picking: 'bg-amber-200',
    shipped: 'bg-purple-200',
    delivered: 'bg-green-200',
    cancelled: 'bg-red-200',
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Package className="h-4 w-4" />
            {data.title}
          </CardTitle>
          {data.period && (
            <Badge variant="outline" className="text-xs">
              {data.period.label}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        {data.summary && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Total Orders</p>
              <p className="text-lg font-semibold">{data.summary.totalOrders}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Value</p>
              <p className="text-lg font-semibold">{formatCurrency(data.summary.totalValue)}</p>
            </div>
          </div>
        )}

        {/* Pipeline bars */}
        {data.data.length > 0 && (
          <div className="space-y-2">
            {data.data.map((item) => {
              const maxCount = Math.max(...data.data.map((d) => d.count));
              const width = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
              return (
                <div key={item.status} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="capitalize">{item.status}</span>
                    <span className="text-muted-foreground">
                      {item.count} ({formatCurrency(item.value)})
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        statusColors[item.status] || 'bg-primary/30'
                      )}
                      style={{ width: `${Math.max(width, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

/** Customer summary artifact renderer */
const CustomerSummaryRenderer = memo(function CustomerSummaryRenderer({
  data,
}: {
  data: CustomerSummaryData | undefined;
}) {
  if (!data) return null;
  const healthColor =
    data.customer?.healthStatus === 'healthy'
      ? 'text-green-600 bg-green-100'
      : data.customer?.healthStatus === 'at_risk'
        ? 'text-amber-600 bg-amber-100'
        : 'text-red-600 bg-red-100';

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            {data.title}
          </CardTitle>
          {data.customer?.healthStatus && (
            <Badge className={cn('text-xs capitalize', healthColor)}>
              {data.customer.healthStatus}
            </Badge>
          )}
        </div>
        {data.customer?.type && (
          <CardDescription className="text-xs capitalize">{data.customer.type}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        {data.stats && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Total Orders</p>
              <p className="text-lg font-semibold">{data.stats.totalOrders}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Revenue</p>
              <p className="text-lg font-semibold">{formatCurrency(data.stats.totalRevenue)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Order</p>
              <p className="text-lg font-semibold">
                {formatCurrency(data.stats.averageOrderValue)}
              </p>
            </div>
            {data.stats.lastOrderDate && (
              <div>
                <p className="text-xs text-muted-foreground">Last Order</p>
                <p className="text-sm font-medium">{data.stats.lastOrderDate}</p>
              </div>
            )}
          </div>
        )}

        {/* Recent orders */}
        {data.recentOrders.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Recent Orders</p>
            <div className="space-y-1">
              {data.recentOrders.slice(0, 5).map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between text-xs p-2 bg-muted/50 rounded"
                >
                  <div>
                    <span className="font-medium">{order.orderNumber}</span>
                    <span className="text-muted-foreground ml-2">{order.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs capitalize">
                      {order.status}
                    </Badge>
                    <span className="font-medium">{formatCurrency(order.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

/** Metrics card artifact renderer */
const MetricsCardRenderer = memo(function MetricsCardRenderer({
  data,
}: {
  data: MetricsCardData | undefined;
}) {
  if (!data || !data.metric) return null;

  const TrendIcon =
    data.metric.trend === 'up'
      ? TrendingUp
      : data.metric.trend === 'down'
        ? TrendingDown
        : Minus;

  const trendColor =
    data.metric.trend === 'up'
      ? 'text-green-600'
      : data.metric.trend === 'down'
        ? 'text-red-600'
        : 'text-muted-foreground';

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          {data.title}
        </CardTitle>
        {data.metric.period && (
          <CardDescription className="text-xs">{data.metric.period}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold">{data.metric.formatted}</p>
          {data.metric.change !== undefined && (
            <span className={cn('flex items-center gap-1 text-sm', trendColor)}>
              <TrendIcon className="h-3 w-3" />
              {formatPercent(data.metric.change)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

/** Top customers artifact renderer */
const TopCustomersRenderer = memo(function TopCustomersRenderer({
  data,
}: {
  data: TopCustomersData | undefined;
}) {
  if (!data) return null;
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            {data.title}
          </CardTitle>
          {data.period && (
            <Badge variant="outline" className="text-xs">
              {data.period.label}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        {data.summary && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Total Revenue</p>
              <p className="text-lg font-semibold">{formatCurrency(data.summary.totalRevenue)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Customers</p>
              <p className="text-lg font-semibold">{data.summary.customerCount}</p>
            </div>
          </div>
        )}

        {/* Customer list */}
        {data.data.length > 0 && (
          <div className="space-y-2">
            {data.data.map((customer) => (
              <div
                key={customer.customerId}
                className="flex items-center justify-between text-xs p-2 bg-muted/50 rounded"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-muted-foreground w-5">#{customer.rank}</span>
                  <span className="font-medium">{customer.customerName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">{customer.orderCount} orders</span>
                  <span className="font-medium">{formatCurrency(customer.totalRevenue)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

// ============================================================================
// ARTIFACT ROUTER
// ============================================================================

/** Route artifact to appropriate renderer based on type */
const ArtifactRenderer = memo(function ArtifactRenderer({
  artifact,
}: {
  artifact: ArtifactData<unknown>;
}) {
  const { type, status, payload, progress, error } = artifact;

  // Handle loading state
  if (status === 'loading' || status === 'streaming') {
    return <ArtifactLoading title={type} progress={progress} />;
  }

  // Handle error state
  if (status === 'error' && error) {
    return <ArtifactError title={type} error={error} />;
  }

  // Guard: payload may be undefined during streaming/complete transition
  if (payload == null) {
    return <ArtifactLoading title={type} progress={progress} />;
  }

  // Route to specific renderer based on type
  switch (type as ArtifactType) {
    case 'revenue-chart':
      return <RevenueChartRenderer data={payload as RevenueChartData} />;
    case 'orders-pipeline':
      return <OrdersPipelineRenderer data={payload as OrdersPipelineData} />;
    case 'customer-summary':
      return <CustomerSummaryRenderer data={payload as CustomerSummaryData} />;
    case 'metrics-card':
      return <MetricsCardRenderer data={payload as MetricsCardData} />;
    case 'top-customers':
      return <TopCustomersRenderer data={payload as TopCustomersData} />;
    default:
      return (
        <Card className="w-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Unknown Artifact: {type}</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs overflow-auto">{JSON.stringify(payload, null, 2)}</pre>
          </CardContent>
        </Card>
      );
  }
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Artifact Canvas - Side panel for displaying streaming artifacts.
 *
 * Uses useAllArtifacts hook to listen for all artifact types and renders
 * appropriate visualizations based on the artifact type.
 *
 * @example
 * ```tsx
 * function ChatWithCanvas() {
 *   const [canvasOpen, setCanvasOpen] = useState(false);
 *
 *   return (
 *     <div className="flex">
 *       <AIChatPanel />
 *       <ArtifactCanvas
 *         isOpen={canvasOpen}
 *         onClose={() => setCanvasOpen(false)}
 *       />
 *     </div>
 *   );
 * }
 * ```
 */
export const ArtifactCanvas = memo(function ArtifactCanvas({
  isOpen = true,
  onClose,
  className,
  width = '400px',
}: ArtifactCanvasProps) {
  const [{ artifacts, isStreaming }] = useAllArtifacts({
    onData: (type, data) => {
      logger.debug('[ArtifactCanvas] New artifact', { type, status: data.status });
    },
  });

  // Get unique artifacts by type (latest of each)
  const uniqueArtifacts = useMemo(() => {
    const byType = new Map<string, ArtifactData<unknown>>();
    for (const artifact of artifacts) {
      byType.set(artifact.type, artifact);
    }
    return Array.from(byType.values()).reverse();
  }, [artifacts]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex flex-col border-l bg-muted/30 transition-all duration-300',
        className
      )}
      style={{ width, minWidth: width }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          <h3 className="font-medium text-sm">Artifacts</h3>
          {isStreaming && (
            <Badge variant="outline" className="text-xs">
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
              Streaming
            </Badge>
          )}
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {uniqueArtifacts.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No artifacts yet</p>
              <p className="text-xs mt-1">Ask the AI to run a report or analysis</p>
            </div>
          ) : (
            uniqueArtifacts.map((artifact) => (
              <ArtifactRenderer key={artifact.id} artifact={artifact} />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
});

export default ArtifactCanvas;
