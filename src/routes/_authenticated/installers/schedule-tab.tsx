/**
 * Installer Schedule Tab (Presenter)
 *
 * Displays installer schedule details:
 * - Working hours by day of week
 * - Upcoming blockout dates with type badges
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared';
import { Clock } from 'lucide-react';
import type { InstallerDetail } from '@/lib/schemas/jobs/installers';

export function ScheduleTab({ installer }: { installer: InstallerDetail }) {
  return (
    <div className="space-y-6">
      {/* Working Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Working Hours
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {installer.workingHours &&
              Object.entries(installer.workingHours).map(([day, schedule]) => (
                <div
                  key={day}
                  className={`flex justify-between p-3 rounded-lg ${
                    schedule.working ? 'bg-muted/50' : 'bg-muted/20'
                  }`}
                >
                  <span className="font-medium capitalize">{day}</span>
                  {schedule.working ? (
                    <span className="text-sm text-muted-foreground">
                      {schedule.start} - {schedule.end}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">Off</span>
                  )}
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Blockouts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upcoming Blockouts</CardTitle>
        </CardHeader>
        <CardContent>
          {!installer.blockouts || installer.blockouts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming blockouts</p>
          ) : (
            <div className="space-y-2">
              {installer.blockouts.map((blockout) => (
                <div
                  key={blockout.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-warning/10 border border-warning/30"
                >
                  <div>
                    <p className="font-medium text-sm">
                      {new Date(blockout.startDate).toLocaleDateString()} -{' '}
                      {new Date(blockout.endDate).toLocaleDateString()}
                    </p>
                    {blockout.reason && (
                      <p className="text-xs text-muted-foreground">{blockout.reason}</p>
                    )}
                  </div>
                  <StatusBadge status={blockout.blockoutType || 'blockout'} variant="warning" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
