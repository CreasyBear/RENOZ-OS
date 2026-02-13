/**
 * Past-Due Sidebar
 *
 * Shows visits scheduled before today that need rescheduling.
 * Each item is draggable to the calendar (requires parent DndContext).
 *
 * @source getPastDueSiteVisits via usePastDueSiteVisits
 */
import { format } from 'date-fns';
import { AlertCircle, GripVertical } from 'lucide-react';
import { usePastDueSiteVisits } from '@/hooks/jobs';
import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { VISIT_TYPE_CONFIG } from '@/lib/constants/site-visits';
import type { ScheduleVisit } from '@/lib/schemas/jobs';

function PastDueVisitItem({
  visit,
  onClick,
}: {
  visit: ScheduleVisit;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: visit.id,
    data: {
      type: 'visit',
      visitId: visit.id,
      projectId: visit.projectId,
      scheduledTime: visit.scheduledTime ?? '09:00',
    },
  });

  const visitType = VISIT_TYPE_CONFIG[visit.visitType];

  return (
    <Card
      ref={setNodeRef}
      className={cn(
        'cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow',
        isDragging && 'opacity-50'
      )}
    >
      <CardContent
        className="p-3 flex items-start gap-2"
        onClick={onClick}
      >
        <div
          {...listeners}
          {...attributes}
          className="shrink-0 touch-manipulation p-1 -m-1 rounded hover:bg-muted"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{visit.visitNumber}</p>
          <p className="text-xs text-muted-foreground truncate">{visit.projectTitle}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {format(new Date(visit.scheduledDate), 'MMM d')} · {visitType.label}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export interface PastDueSidebarProps {
  onVisitClick: (projectId: string, visitId: string) => void;
  className?: string;
}

export function PastDueSidebar({ onVisitClick, className }: PastDueSidebarProps) {
  const { data, isLoading } = usePastDueSiteVisits();
  const visits = data?.items ?? [];

  return (
    <div className={cn('w-60 shrink-0 flex flex-col', className)}>
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle className="h-5 w-5 text-amber-600" />
        <h3 className="font-semibold text-sm">Past due</h3>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : visits.length === 0 ? (
        <p className="text-sm text-muted-foreground">No past-due visits</p>
      ) : (
        <div className="space-y-2 overflow-y-auto flex-1">
          {visits.map((visit) => (
            <PastDueVisitItem
              key={visit.id}
              visit={visit}
              onClick={() => onVisitClick(visit.projectId, visit.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
