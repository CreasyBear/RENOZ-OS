/**
 * Installer Performance Tab (Container)
 *
 * Fetches site visit data and computes performance metrics:
 * - Total completed visits
 * - Average customer rating
 * - On-time completion rate
 * - Monthly visit trend chart
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSiteVisitsByInstaller, type SiteVisitItem } from '@/hooks/jobs';

export function PerformanceTab({ installerId }: { installerId: string }) {
  const { data: siteVisitsData, isLoading } = useSiteVisitsByInstaller(installerId);
  const siteVisits: SiteVisitItem[] = siteVisitsData?.items ?? [];

  const completedVisits = siteVisits.filter((v) => v.status === 'completed');
  const totalCompleted = completedVisits.length;

  const onTimeVisits = completedVisits.filter((v) => {
    if (!v.actualEndTime || !v.scheduledDate) return false;
    const scheduled = new Date(v.scheduledDate);
    const actual = new Date(v.actualEndTime);
    return actual <= scheduled;
  });
  const onTimeRate = totalCompleted > 0 ? Math.round((onTimeVisits.length / totalCompleted) * 100) : 0;

  const visitsWithRatings = completedVisits.filter((v) => v.customerRating);
  const avgRating = visitsWithRatings.length > 0
    ? (visitsWithRatings.reduce((sum, v) => sum + (v.customerRating || 0), 0) / visitsWithRatings.length).toFixed(1)
    : 'N/A';

  const visitsByMonth = completedVisits.reduce<Record<string, number>>((acc, v) => {
    const date = new Date(v.scheduledDate);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    acc[monthKey] = (acc[monthKey] || 0) + 1;
    return acc;
  }, {});

  const sortedMonths: [string, number][] = Object.entries(visitsByMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, count]) => [month, count] as [string, number]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              {isLoading ? (
                <div className="h-10 animate-pulse bg-muted rounded mx-auto w-16" />
              ) : (
                <p className="text-3xl font-bold">{totalCompleted}</p>
              )}
              <p className="text-sm text-muted-foreground">Visits Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              {isLoading ? (
                <div className="h-10 animate-pulse bg-muted rounded mx-auto w-16" />
              ) : (
                <p className="text-3xl font-bold">{avgRating}</p>
              )}
              <p className="text-sm text-muted-foreground">Avg Customer Rating</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              {isLoading ? (
                <div className="h-10 animate-pulse bg-muted rounded mx-auto w-16" />
              ) : (
                <p className="text-3xl font-bold">{onTimeRate}%</p>
              )}
              <p className="text-sm text-muted-foreground">On-Time Completion</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Completed Visits by Month</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-[200px] animate-pulse bg-muted rounded" />
          ) : sortedMonths.length > 0 ? (
            <div className="h-[200px] flex items-end gap-4">
              {sortedMonths.map(([month, count]) => {
                const maxCount = Math.max(...sortedMonths.map(([, c]) => c));
                const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
                const [year, monthNum] = month.split('-');
                const monthLabel = new Date(Number(year), Number(monthNum) - 1).toLocaleDateString('en-US', { month: 'short' });

                return (
                  <div key={month} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full relative" style={{ height: '160px' }}>
                      <div
                        className="absolute bottom-0 w-full bg-primary/20 rounded-t transition-all hover:bg-primary/30"
                        style={{ height: `${height}%`, minHeight: count > 0 ? '4px' : '0' }}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold">{count}</p>
                      <p className="text-xs text-muted-foreground">{monthLabel}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center bg-muted/50 rounded-lg">
              <p className="text-muted-foreground">No completed visits yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
