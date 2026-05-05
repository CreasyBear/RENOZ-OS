/**
 * Report Favorite Button
 *
 * Star button to toggle favorite status for a report.
 * Uses report favorites server functions.
 *
 * @see DOM-RPT-006c
 */
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useReportFavorites, useCreateReportFavorite, useDeleteReportFavorite } from '@/hooks/reports';
import type { PrebuiltReportType } from '@/lib/schemas/reports/report-favorites';
import { formatReportFavoritesReadError } from './report-favorite-read-errors';

export interface ReportFavoriteButtonProps {
  reportType: PrebuiltReportType;
  reportId?: string | null;
  name?: string;
  filters?: Record<string, unknown>;
  className?: string;
}

/**
 * Star button that toggles report favorite status.
 */
export function ReportFavoriteButton({
  reportType,
  reportId = null,
  className,
}: ReportFavoriteButtonProps) {
  const { data, isLoading, error } = useReportFavorites({ reportType });
  const createFavorite = useCreateReportFavorite();
  const deleteFavorite = useDeleteReportFavorite();

  const isFavorited = Boolean(data?.items?.some(
    (f) => f.reportType === reportType && (reportId ? f.reportId === reportId : !f.reportId)
  ));

  const isPending = createFavorite.isPending || deleteFavorite.isPending;
  const hasReadError = Boolean(error);
  const buttonDisabled = isLoading || isPending || hasReadError;
  const unavailableMessage = hasReadError ? formatReportFavoritesReadError(error) : null;
  const actionLabel = isFavorited ? 'Remove from favorites' : 'Add to favorites';
  const tooltipLabel = unavailableMessage ?? (isLoading ? 'Loading favorites...' : actionLabel);
  const ariaLabel = unavailableMessage
    ? 'Report favorites unavailable'
    : isLoading
      ? 'Loading favorites'
      : actionLabel;

  const handleToggle = async () => {
    if (buttonDisabled) {
      return;
    }

    if (isFavorited) {
      await deleteFavorite.mutateAsync({
        reportType,
        reportId: reportId ?? undefined,
      });
    } else {
      await createFavorite.mutateAsync({
        reportType,
        reportId: reportId ?? undefined,
      });
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex" title={tooltipLabel}>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggle}
              disabled={buttonDisabled}
              className={className}
              aria-label={ariaLabel}
            >
              <Star
                className={`h-4 w-4 ${isFavorited ? 'fill-amber-400 text-amber-500' : ''}`}
              />
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>{tooltipLabel}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
