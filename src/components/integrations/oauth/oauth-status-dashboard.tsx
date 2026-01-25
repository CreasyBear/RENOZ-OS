/**
 * OAuth Status Dashboard Component
 *
 * Comprehensive dashboard showing OAuth integration health, sync status, and metrics.
 * Provides real-time monitoring and alerting for all connected services.
 */

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';

// Mock data interfaces (would be replaced with real API calls)
interface DashboardMetrics {
  totalConnections: number;
  healthyConnections: number;
  unhealthyConnections: number;
  totalSyncsToday: number;
  averageResponseTime: number;
  errorRate: number;
}

interface RecentActivity {
  id: string;
  timestamp: Date;
  type: 'sync' | 'error' | 'connection' | 'health_check';
  service: 'calendar' | 'email' | 'contacts';
  provider: 'google_workspace' | 'microsoft_365';
  status: 'success' | 'error' | 'warning';
  description: string;
  details?: Record<string, any>;
}

interface OAuthStatusDashboardProps {
  organizationId: string;
  refreshInterval?: number; // in milliseconds
}

export function OAuthStatusDashboard({
  organizationId,
  refreshInterval = 30000,
}: OAuthStatusDashboardProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const refetchInterval = refreshInterval || 60000;

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.oauth.dashboard(organizationId, selectedTimeframe),
    queryFn: async () => {
      const response = await fetch('/api/oauth/dashboard');
      if (!response.ok) {
        throw new Error('Failed to load OAuth dashboard');
      }
      const data = (await response.json()) as {
        metrics: DashboardMetrics;
        recentActivity: RecentActivity[];
      };
      return {
        ...data,
        recentActivity: data.recentActivity.map((activity) => ({
          ...activity,
          timestamp: new Date(activity.timestamp),
        })),
      };
    },
    staleTime: refreshInterval,
    refetchInterval,
  });

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'success':
      case 'healthy':
        return 'text-green-600';
      case 'error':
      case 'unhealthy':
        return 'text-red-600';
      case 'warning':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  }, []);

  const getStatusIcon = useCallback((status: string) => {
    switch (status) {
      case 'success':
      case 'healthy':
        return <CheckCircle className="h-4 w-4" aria-label="Success" />;
      case 'error':
      case 'unhealthy':
        return <AlertTriangle className="h-4 w-4" aria-label="Error" />;
      case 'warning':
        return <Clock className="h-4 w-4" aria-label="Warning" />;
      default:
        return <Activity className="h-4 w-4" aria-label="Activity" />;
    }
  }, []);

  const formatActivityDescription = useCallback((activity: RecentActivity) => {
    const timeAgo = Math.floor((Date.now() - activity.timestamp.getTime()) / (1000 * 60));
    const timeString = timeAgo < 60 ? `${timeAgo}m ago` : `${Math.floor(timeAgo / 60)}h ago`;

    return `${activity.description} (${timeString})`;
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/4 rounded bg-gray-200"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 rounded bg-gray-200"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">OAuth Integration Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor the health and performance of your OAuth integrations.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium">Time Range:</span>
        <div className="flex space-x-1">
          {[
            { value: '1h', label: '1H' },
            { value: '24h', label: '24H' },
            { value: '7d', label: '7D' },
            { value: '30d', label: '30D' },
          ].map((option) => (
            <Button
              key={option.value}
              variant={selectedTimeframe === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTimeframe(option.value as any)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Connections</CardTitle>
            <Database className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.metrics.totalConnections || 0}</div>
            <p className="text-muted-foreground text-xs">
              {data?.metrics.healthyConnections || 0} healthy,{' '}
              {data?.metrics.unhealthyConnections || 0}{' '}
              issues
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Syncs Today</CardTitle>
            <RefreshCw className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.metrics.totalSyncsToday || 0}</div>
            <p className="text-muted-foreground text-xs">
              Average {data?.metrics.averageResponseTime || 0}s response time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertTriangle className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((data?.metrics.errorRate || 0) * 100).toFixed(1)}%
            </div>
            <Progress
              value={(data?.metrics.errorRate || 0) * 100}
              className="mt-2"
              aria-label={`Error rate: ${((data?.metrics.errorRate || 0) * 100).toFixed(1)}%`}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Health Score</CardTitle>
            <TrendingUp className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.metrics
                ? Math.round(
                    (data.metrics.healthyConnections / data.metrics.totalConnections) * 100
                  )
                : 0}
              %
            </div>
            <Progress
              value={
                data?.metrics
                  ? (data.metrics.healthyConnections / data.metrics.totalConnections) * 100
                  : 0
              }
              className="mt-2"
              aria-label={`Health score: ${data?.metrics ? Math.round((data.metrics.healthyConnections / data.metrics.totalConnections) * 100) : 0}%`}
            />
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="mr-2 h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>
            Latest OAuth integration activities and sync operations.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex animate-pulse items-center space-x-3">
                  <div className="h-8 w-8 rounded bg-gray-200"></div>
                  <div className="flex-1 space-y-1">
                    <div className="h-4 w-3/4 rounded bg-gray-200"></div>
                    <div className="h-3 w-1/2 rounded bg-gray-200"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {data?.recentActivity?.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3 rounded-lg border p-3">
                  <div className={`mt-1 ${getStatusColor(activity.status)}`}>
                    {getStatusIcon(activity.status)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        {activity.service}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {activity.provider.replace('_', ' ')}
                      </Badge>
                      <span className="text-muted-foreground text-xs">
                        {formatActivityDescription(activity)}
                      </span>
                    </div>

                    <p className="mt-1 text-sm">{activity.description}</p>

                    {activity.details && (
                      <div className="text-muted-foreground mt-2 text-xs">
                        {Object.entries(activity.details)
                          .slice(0, 3)
                          .map(([key, value]) => (
                            <span key={key} className="mr-3">
                              {key}: {String(value)}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              )) || (
                <div className="text-muted-foreground py-6 text-center">No recent activity</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
