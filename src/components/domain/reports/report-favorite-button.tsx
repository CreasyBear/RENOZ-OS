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
  const { data, isLoading } = useReportFavorites({ reportType });
  const createFavorite = useCreateReportFavorite();
  const deleteFavorite = useDeleteReportFavorite();

  const isFavorited = data?.items?.some(
    (f) => f.reportType === reportType && (reportId ? f.reportId === reportId : !f.reportId)
  );

  const handleToggle = async () => {
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

  const isPending = createFavorite.isPending || deleteFavorite.isPending;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggle}
            disabled={isLoading || isPending}
            className={className}
            aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Star
              className={`h-4 w-4 ${isFavorited ? 'fill-amber-400 text-amber-500' : ''}`}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {isFavorited ? 'Remove from favorites' : 'Add to favorites'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
