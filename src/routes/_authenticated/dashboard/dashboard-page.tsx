/**
 * Dashboard Page Component
 *
 * Tabbed Dashboard with Overview, Business Metrics, and Activity.
 *
 * Three tabs:
 * - Overview: Square UI inspired dashboard with stats, chart, and tables
 * - Business Overview: Comprehensive business metrics dashboard
 * - Activity: Organization-wide activity feed
 *
 * Tab selection is persisted in URL via search params (?tab=overview|business|activity).
 *
 * @source dashboard data from DashboardProvider context
 * @source date range from ConnectedDateRangeSelector
 *
 * @see src/routes/_authenticated/dashboard/index.tsx - Route definition
 * @see docs/design-system/DASHBOARD-STANDARDS.md
 */
import { useNavigate } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { PageLayout } from '@/components/layout';
import {
  DashboardProvider,
  ConnectedDateRangeSelector,
  MobileDashboardContainer,
  WelcomeChecklistContainer,
} from '@/components/domain/dashboard';
import { OverviewContainer } from '@/components/domain/dashboard/overview';
import { ActivityFeed } from '@/components/shared/activity';
import { BusinessOverviewSkeleton } from '@/components/skeletons/dashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutDashboard, BarChart3, Activity } from 'lucide-react';
import type { SearchParams } from './index';

// PERFORMANCE: Lazy load heavy dashboard containers to reduce initial bundle size
// and prevent unnecessary data fetching for inactive tabs
const BusinessOverviewContainer = lazy(() => 
  import('@/components/domain/dashboard/business-overview').then(m => ({ 
    default: m.BusinessOverviewContainer 
  }))
);

interface DashboardPageProps {
  search: SearchParams;
}

export default function DashboardPage({ search }: DashboardPageProps) {
  const navigate = useNavigate();
  const { tab } = search;

  const handleTabChange = (value: string) => {
    navigate({
      to: '/dashboard',
      search: { tab: value as 'overview' | 'business' | 'activity' },
      replace: true,
    });
  };

  return (
    <PageLayout variant="full-width">
      <PageLayout.Content>
        <DashboardProvider>
          {/* Onboarding checklist for new users */}
          <WelcomeChecklistContainer className="mb-6" />

          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-medium text-muted-foreground">Date range</h2>
              <p className="text-xs text-muted-foreground">
                Filters KPI widgets and dashboard metrics
              </p>
            </div>
            <ConnectedDateRangeSelector className="sm:min-w-[420px]" />
          </div>

          <div className="md:hidden">
            <MobileDashboardContainer />
          </div>

          {/* Tabbed Dashboard (Desktop) */}
          <div className="hidden md:block">
            <Tabs value={tab} onValueChange={handleTabChange} className="space-y-6">
              <TabsList>
                <TabsTrigger value="overview" className="gap-2">
                  <LayoutDashboard className="size-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="business" className="gap-2">
                  <BarChart3 className="size-4" />
                  Business
                </TabsTrigger>
                <TabsTrigger value="activity" className="gap-2">
                  <Activity className="size-4" />
                  Activity
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                {/* Overview Dashboard - Square UI inspired
                    Always rendered as it's the default tab */}
                <OverviewContainer />
              </TabsContent>

              <TabsContent value="business" className="space-y-6">
                {/* Business Overview Dashboard
                    PERFORMANCE: Only render when tab is active + lazy loaded
                    Suspense shows skeleton while heavy components load */}
                <Suspense fallback={<BusinessOverviewSkeleton />}>
                  <BusinessOverviewContainer />
                </Suspense>
              </TabsContent>

              <TabsContent value="activity" className="h-[calc(100vh-14rem)]">
                {/* Organization-wide Activity Feed
                    PERFORMANCE: Conditional rendering prevents data fetching on inactive tab */}
                {tab === 'activity' && (
                  <ActivityFeed
                    showFilters
                    className="h-full"
                  />
                )}
              </TabsContent>
            </Tabs>
          </div>
        </DashboardProvider>
      </PageLayout.Content>
    </PageLayout>
  );
}
