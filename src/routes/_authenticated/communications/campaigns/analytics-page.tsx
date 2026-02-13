/**
 * Campaign Analytics Page Component
 *
 * Comprehensive campaign analytics and reporting dashboard.
 * Shows campaign performance metrics, trends, and insights.
 *
 * @source campaigns from useCampaigns hook
 * @source email metrics from useEmailMetrics hook
 *
 * @see src/routes/_authenticated/communications/campaigns/analytics.tsx - Route definition
 * @see docs/design-system/DOMAIN-LANDING-STANDARDS.md
 */
import { useMemo, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useCampaigns } from "@/hooks/communications/use-campaigns";
import { useEmailMetrics } from "@/hooks/communications/use-email-analytics";
import { MetricCard } from "@/components/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mail,
  Send,
  Eye,
  MousePointerClick,
  TrendingUp,
  BarChart3,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import type { Campaign } from "@/lib/schemas/communications/email-campaigns";
import { calculatePercentage } from "@/lib/communications/campaign-utils";

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d">("30d");

  // Calculate date range for filtering campaigns
  const dateRangeFilter = useMemo(() => {
    const now = new Date();
    const days = dateRange === "7d" ? 7 : dateRange === "90d" ? 90 : 30;
    const dateFrom = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return { dateFrom, dateTo: now };
  }, [dateRange]);

  // Fetch campaigns filtered by date range for analytics
  const { data: campaignsData, isLoading: campaignsLoading } = useCampaigns({
    dateFrom: dateRangeFilter.dateFrom,
    dateTo: dateRangeFilter.dateTo,
    limit: 1000, // Get all campaigns in date range for analytics
  });

  // Fetch email metrics
  const { data: emailMetricsData, isLoading: metricsLoading } = useEmailMetrics({
    period: dateRange,
  });

  const isLoading = campaignsLoading || metricsLoading;

  // Calculate campaign analytics
  const analytics = useMemo(() => {
    const items = (campaignsData as { items?: Campaign[] } | undefined)?.items;
    if (!items) {
      return null;
    }

    const campaigns: Campaign[] = items;
    const totalCampaigns = campaigns.length;
    const sentCampaigns = campaigns.filter((c: Campaign) => c.status === "sent").length;
    const activeCampaigns = campaigns.filter((c: Campaign) =>
      c.status === "sending" || c.status === "scheduled"
    ).length;

    // Aggregate stats from all campaigns
    const totalSent = campaigns.reduce((sum: number, c: Campaign) => sum + (c.sentCount || 0), 0);
    const totalOpened = campaigns.reduce((sum: number, c: Campaign) => sum + (c.openCount || 0), 0);
    const totalClicked = campaigns.reduce((sum: number, c: Campaign) => sum + (c.clickCount || 0), 0);
    const totalBounced = campaigns.reduce((sum: number, c: Campaign) => sum + (c.bounceCount || 0), 0);
    const totalRecipients = campaigns.reduce((sum: number, c: Campaign) => sum + (c.recipientCount || 0), 0);

    const openRate = totalSent > 0 ? calculatePercentage(totalOpened, totalSent) : 0;
    const clickRate = totalSent > 0 ? calculatePercentage(totalClicked, totalSent) : 0;
    const bounceRate = totalSent > 0 ? calculatePercentage(totalBounced, totalSent) : 0;

    // Status distribution
    const statusDistribution = campaigns.reduce((acc: Record<string, number>, c: Campaign) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Top performing campaigns (by open rate)
    const topCampaigns = campaigns
      .filter((c: Campaign) => c.status === "sent" && c.sentCount > 0)
      .map((c: Campaign) => ({
        id: c.id,
        name: c.name,
        sentCount: c.sentCount || 0,
        openCount: c.openCount || 0,
        clickCount: c.clickCount || 0,
        openRate: calculatePercentage(c.openCount || 0, c.sentCount || 0),
        clickRate: calculatePercentage(c.clickCount || 0, c.sentCount || 0),
      }))
      .sort((a: { openRate: number }, b: { openRate: number }) => b.openRate - a.openRate)
      .slice(0, 5);

    return {
      totalCampaigns,
      sentCampaigns,
      activeCampaigns,
      totalSent,
      totalOpened,
      totalClicked,
      totalBounced,
      totalRecipients,
      openRate,
      clickRate,
      bounceRate,
      statusDistribution,
      topCampaigns,
    };
  }, [campaignsData]);

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold">Campaign Analytics</h2>
          <p className="text-sm text-muted-foreground">Track campaign performance and email metrics</p>
        </div>
        <Select value={dateRange} onValueChange={(v) => setDateRange(v as "7d" | "30d" | "90d")}>
          <SelectTrigger className="w-[160px]">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <ErrorBoundary
          fallback={
            <Card className="border-destructive/50">
              <CardContent className="py-8 text-center">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-destructive" />
                <p className="text-sm text-muted-foreground mb-4">
                  Failed to load analytics data
                </p>
              </CardContent>
            </Card>
          }
        >
          <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {isLoading ? (
              <>
                <MetricCard title="" value="" isLoading />
                <MetricCard title="" value="" isLoading />
                <MetricCard title="" value="" isLoading />
                <MetricCard title="" value="" isLoading />
              </>
            ) : analytics ? (
              <>
                <MetricCard
                  title="Total Campaigns"
                  value={analytics.totalCampaigns.toLocaleString()}
                  icon={Mail}
                />
                <MetricCard
                  title="Sent Campaigns"
                  value={analytics.sentCampaigns.toLocaleString()}
                  icon={Send}
                />
                <MetricCard
                  title="Open Rate"
                  value={`${analytics.openRate.toFixed(1)}%`}
                  subtitle={`${analytics.totalOpened.toLocaleString()} opens`}
                  icon={Eye}
                />
                <MetricCard
                  title="Click Rate"
                  value={`${analytics.clickRate.toFixed(1)}%`}
                  subtitle={`${analytics.totalClicked.toLocaleString()} clicks`}
                  icon={MousePointerClick}
                />
              </>
            ) : (
              <div className="col-span-4 text-center py-8 text-muted-foreground">
                No campaign data available
              </div>
            )}
          </div>

          {/* Secondary Metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
              <>
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
              </>
            ) : analytics ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.totalSent.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {analytics.totalRecipients.toLocaleString()} recipients
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Bounce Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.bounceRate.toFixed(1)}%</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {analytics.totalBounced.toLocaleString()} bounced
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.activeCampaigns}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Currently sending or scheduled
                    </p>
                  </CardContent>
                </Card>
              </>
            ) : null}
          </div>

          {/* Top Performing Campaigns */}
          {analytics && analytics.topCampaigns.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Top Performing Campaigns
                </CardTitle>
                <CardDescription>
                  Campaigns ranked by open rate
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.topCampaigns.map((campaign, index) => (
                    <div
                      key={campaign.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{campaign.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {campaign.sentCount.toLocaleString()} sent
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="text-right">
                          <p className="font-medium">{campaign.openRate.toFixed(1)}%</p>
                          <p className="text-xs text-muted-foreground">Open rate</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{campaign.clickRate.toFixed(1)}%</p>
                          <p className="text-xs text-muted-foreground">Click rate</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status Distribution */}
          {analytics && Object.keys(analytics.statusDistribution).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Campaign Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(analytics.statusDistribution).map(([status, count]) => {
                    const numCount = Number(count);
                    const percentage = analytics.totalCampaigns > 0
                      ? calculatePercentage(numCount, analytics.totalCampaigns)
                      : 0;
                    return (
                      <div key={status} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="capitalize">{status}</span>
                          <span className="font-medium">
                            {numCount} ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Email Metrics (from email-analytics) */}
          {emailMetricsData?.metrics && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Overall Email Metrics
                </CardTitle>
                <CardDescription>
                  All email activity for the selected period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Delivery Rate</p>
                    <p className="text-2xl font-bold">
                      {emailMetricsData.metrics.deliveryRate.toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {emailMetricsData.metrics.delivered.toLocaleString()} delivered
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Open Rate</p>
                    <p className="text-2xl font-bold">
                      {emailMetricsData.metrics.openRate.toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {emailMetricsData.metrics.opened.toLocaleString()} opened
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Click Rate</p>
                    <p className="text-2xl font-bold">
                      {emailMetricsData.metrics.clickRate.toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {emailMetricsData.metrics.clicked.toLocaleString()} clicked
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          </div>
        </ErrorBoundary>
      </div>
    </>
  );
}
