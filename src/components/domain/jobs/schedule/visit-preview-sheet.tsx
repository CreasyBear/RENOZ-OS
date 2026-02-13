/**
 * Visit Preview Sheet
 *
 * Quick-scan sheet for site visit details. Opens on visit click in schedule.
 * Per DETAIL-VIEW-STANDARDS: Sheet pattern for quick scan vs. deep work.
 * "View full details" navigates to the visit detail page.
 *
 * @source EventSheet from .square-ui-reference
 * @source DETAIL-VIEW-STANDARDS Zone 1 (header) + Zone 5 (main content)
 */

import { format } from 'date-fns';
import { Link } from '@tanstack/react-router';
import { Briefcase, User, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { VISIT_TYPE_CONFIG } from '@/lib/constants/site-visits';
import { useUserLookup } from '@/hooks/users';
import type { ScheduleVisit } from '@/lib/schemas/jobs';

export interface VisitPreviewSheetProps {
  visit: ScheduleVisit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onViewFullDetails?: (projectId: string, visitId: string) => void;
}

function formatStatus(status: string) {
  return status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

export function VisitPreviewSheet({
  visit,
  open,
  onOpenChange,
  onViewFullDetails,
}: VisitPreviewSheetProps) {
  const { getUser } = useUserLookup();

  if (!visit) return null;

  const visitType = VISIT_TYPE_CONFIG[visit.visitType];
  const dateStr = format(new Date(visit.scheduledDate), 'EEEE, MMMM d, yyyy');
  const installerName = visit.installerId ? getUser(visit.installerId)?.name : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[420px] overflow-y-auto"
      >
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="text-xl">{visit.visitNumber}</SheetTitle>
          <SheetDescription className="flex flex-wrap items-center gap-2 text-sm">
            <span>{dateStr}</span>
            <span className="size-1 rounded-full bg-muted-foreground" />
            <span>{visit.scheduledTime ?? 'Time TBD'}</span>
            {visit.estimatedDuration && (
              <>
                <span className="size-1 rounded-full bg-muted-foreground" />
                <span>{visit.estimatedDuration} min</span>
              </>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className={visitType?.color}>
              {visitType?.label ?? visit.visitType}
            </Badge>
            <Badge variant="outline">{formatStatus(visit.status)}</Badge>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Briefcase className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">{visit.projectTitle}</p>
                <p className="text-xs text-muted-foreground">{visit.projectNumber}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground shrink-0" />
              <p className="text-sm">
                {installerName ?? (visit.installerId ? 'Assigned' : 'Unassigned')}
              </p>
            </div>
          </div>

          {visit.notes && (
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-1">Notes</p>
              <p className="text-sm whitespace-pre-wrap">{visit.notes}</p>
            </div>
          )}

          <div className="pt-4">
            <Link
              to="/projects/$projectId/visits/$visitId"
              params={{ projectId: visit.projectId, visitId: visit.id }}
              onClick={() => {
                onOpenChange(false);
                onViewFullDetails?.(visit.projectId, visit.id);
              }}
            >
              <Button variant="outline" className="w-full">
                View full details
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
