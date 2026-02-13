/**
 * Scheduled Reports Mobile Cards Component
 *
 * Mobile-optimized card layout for scheduled reports list.
 */

import { memo, useCallback } from 'react';
import { Mail } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { StatusCell } from '@/components/shared/data-table';
import type { ScheduledReport } from '@/lib/schemas/reports/scheduled-reports';
import {
  SCHEDULED_REPORT_STATUS_CONFIG,
  getScheduledReportStatus,
} from './scheduled-reports-status-config';
import { formatDistanceToNow } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Biweekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
};

const FORMAT_LABELS: Record<string, string> = {
  pdf: 'PDF',
  csv: 'CSV',
  xlsx: 'XLSX',
  html: 'HTML',
};

export interface ScheduledReportsMobileCardsProps {
  reports: ScheduledReport[];
  selectedIds: Set<string>;
  onSelect: (id: string, checked: boolean) => void;
  onEdit: (report: ScheduledReport) => void;
  className?: string;
}

export const ScheduledReportsMobileCards = memo(function ScheduledReportsMobileCards({
  reports,
  selectedIds,
  onSelect,
  onEdit,
  className,
}: ScheduledReportsMobileCardsProps) {
  const handleCardClick = useCallback(
    (report: ScheduledReport) => {
      onEdit(report);
    },
    [onEdit]
  );

  const handleCardKeyDown = useCallback(
    (e: React.KeyboardEvent, report: ScheduledReport) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onEdit(report);
      }
    },
    [onEdit]
  );

  return (
    <div className={cn('space-y-3', className)}>
      {reports.map((report) => {
        const isSelected = selectedIds.has(report.id);
        const nextRun = report.nextRunAt
          ? formatDistanceToNow(new Date(report.nextRunAt), { addSuffix: true })
          : '—';

        return (
          <Card
            key={report.id}
            tabIndex={0}
            role="button"
            aria-label={`Edit report ${report.name}`}
            className={cn(
              'cursor-pointer hover:bg-muted/50 transition-colors',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              isSelected && 'bg-muted/50 ring-1 ring-primary'
            )}
            onClick={() => handleCardClick(report)}
            onKeyDown={(e) => handleCardKeyDown(e, report)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) => onSelect(report.id, checked as boolean)}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Select ${report.name}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="font-medium">{report.name}</p>
                      {report.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {report.description}
                        </p>
                      )}
                    </div>
                    <StatusCell
                      status={getScheduledReportStatus(report)}
                      statusConfig={SCHEDULED_REPORT_STATUS_CONFIG}
                      showIcon
                    />
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>{FREQUENCY_LABELS[report.frequency] ?? report.frequency}</span>
                    <span>·</span>
                    <span>{FORMAT_LABELS[report.format] ?? report.format}</span>
                    <span>·</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {report.recipients?.emails?.length ?? 0}
                        </TooltipTrigger>
                        <TooltipContent>
                          {report.recipients?.emails?.length > 0 ? (
                            <ul className="text-xs">
                              {report.recipients.emails.map((email: string) => (
                                <li key={email}>{email}</li>
                              ))}
                            </ul>
                          ) : (
                            <p>No recipients</p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Next: {nextRun}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
});

ScheduledReportsMobileCards.displayName = 'ScheduledReportsMobileCards';
