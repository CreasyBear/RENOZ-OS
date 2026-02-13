/**
 * SLA Report Table Component
 *
 * Displays SLA metrics by issue type in a table format.
 *
 * @see src/server/functions/sla.ts - getSlaReportByIssueType
 */

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { SlaReportRow } from '@/lib/schemas/support/sla';

export type { SlaReportRow };

interface SlaReportTableProps {
  data: SlaReportRow[] | null;
  isLoading?: boolean;
  className?: string;
}

/**
 * Format issue type enum to human-readable label
 */
function formatIssueType(type: string): string {
  const labels: Record<string, string> = {
    hardware_fault: 'Hardware Fault',
    software_firmware: 'Software/Firmware',
    installation_defect: 'Installation Defect',
    performance_degradation: 'Performance Issue',
    connectivity: 'Connectivity',
    other: 'Other',
  };
  return labels[type] ?? type;
}

/**
 * Format seconds into human-readable duration
 */
function formatDuration(seconds: number | null): string {
  if (seconds === null) return '—';

  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  const d = Math.floor(seconds / 86400);
  return `${d}d`;
}

/**
 * Breach rate indicator with progress bar
 */
function BreachRateCell({ rate }: { rate: number }) {
  const color = rate > 20 ? 'bg-red-500' : rate > 10 ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <div className="flex items-center gap-2">
      <div className="relative w-16">
        <Progress value={Math.min(rate, 100)} className="h-2" />
        <div
          className={cn('absolute top-0 left-0 h-2 rounded-full', color)}
          style={{ width: `${Math.min(rate, 100)}%` }}
        />
      </div>
      <span className="text-sm tabular-nums">{rate}%</span>
    </div>
  );
}

export function SlaReportTable({ data, isLoading, className }: SlaReportTableProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>SLA by Issue Type</CardTitle>
          <CardDescription>Loading report...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="bg-muted h-10 rounded" />
            <div className="bg-muted h-10 rounded" />
            <div className="bg-muted h-10 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>SLA by Issue Type</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Calculate totals
  const totals = data.reduce(
    (acc, row) => ({
      total: acc.total + row.total,
      responseBreached: acc.responseBreached + row.responseBreached,
      resolutionBreached: acc.resolutionBreached + row.resolutionBreached,
      resolved: acc.resolved + row.resolved,
    }),
    { total: 0, responseBreached: 0, resolutionBreached: 0, resolved: 0 }
  );

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>SLA by Issue Type</CardTitle>
        <CardDescription>Performance metrics broken down by issue category</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Issue Type</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Resolved</TableHead>
              <TableHead>Response Breach</TableHead>
              <TableHead>Resolution Breach</TableHead>
              <TableHead className="text-right">Avg Response</TableHead>
              <TableHead className="text-right">Avg Resolution</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.issueType}>
                <TableCell className="font-medium">{formatIssueType(row.issueType)}</TableCell>
                <TableCell className="text-right">{row.total}</TableCell>
                <TableCell className="text-right">{row.resolved}</TableCell>
                <TableCell>
                  <BreachRateCell rate={row.responseBreachRate} />
                </TableCell>
                <TableCell>
                  <BreachRateCell rate={row.resolutionBreachRate} />
                </TableCell>
                <TableCell className="text-right">
                  {formatDuration(row.avgResponseTimeSeconds)}
                </TableCell>
                <TableCell className="text-right">
                  {formatDuration(row.avgResolutionTimeSeconds)}
                </TableCell>
              </TableRow>
            ))}

            {/* Totals row */}
            <TableRow className="bg-muted/50 font-medium">
              <TableCell>Total</TableCell>
              <TableCell className="text-right">{totals.total}</TableCell>
              <TableCell className="text-right">{totals.resolved}</TableCell>
              <TableCell>
                <BreachRateCell
                  rate={
                    totals.total > 0
                      ? Math.round((totals.responseBreached / totals.total) * 1000) / 10
                      : 0
                  }
                />
              </TableCell>
              <TableCell>
                <BreachRateCell
                  rate={
                    totals.total > 0
                      ? Math.round((totals.resolutionBreached / totals.total) * 1000) / 10
                      : 0
                  }
                />
              </TableCell>
              <TableCell className="text-right">—</TableCell>
              <TableCell className="text-right">—</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
