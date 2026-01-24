/**
 * Jobs View Model
 *
 * Single normalized shape used by Jobs containers. View adapters derive
 * calendar events, timeline items, and weekly tasks from this model.
 */

import type { TimelineSpan } from '@/lib/schemas/jobs/job-timeline';

export type JobViewModel = {
  assignmentId: string;
  jobNumber: string;
  title: string;
  description?: string | null;

  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
  jobType: 'installation' | 'service' | 'warranty' | 'inspection' | 'commissioning';
  priority?: 'low' | 'medium' | 'high';

  startDate: Date;
  endDate: Date;
  durationMinutes: number;

  installer: { id: string; name?: string | null; email?: string | null };
  customer: { id: string; name?: string | null };

  // Optional, view-specific metadata
  allDay?: boolean;
  estimatedDuration?: number | null;
  timelineSpan?: TimelineSpan;
};
