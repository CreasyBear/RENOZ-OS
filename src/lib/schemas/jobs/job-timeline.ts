/**
 * Job Timeline Zod Schemas
 *
 * Validation schemas for job timeline operations.
 * Used by server functions in src/server/functions/job-timeline.ts
 */

import { z } from 'zod';

// ============================================================================
// TIMELINE JOBS
// ============================================================================

/**
 * Schema for listing jobs in timeline view.
 */
export const listTimelineJobsSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  installerIds: z.array(z.string().uuid()).optional(),
  statuses: z
    .array(z.enum(['scheduled', 'in_progress', 'completed', 'cancelled', 'on_hold']))
    .optional(),
});

export type ListTimelineJobsInput = z.infer<typeof listTimelineJobsSchema>;

// ============================================================================
// TIMELINE TYPES
// ============================================================================

/**
 * Timeline span information for positioning.
 */
export interface TimelineSpan {
  startIndex: number; // Day index within week (0-6)
  endIndex: number; // Day index within week (0-6)
  spanDays: number; // Total days spanned
  isPartial: boolean; // True if job extends beyond week boundaries
}

/**
 * Timeline job item for timeline visualization.
 */
export interface TimelineJobItem {
  id: string;
  jobNumber: string;
  title: string;
  description: string | null;
  startDate: Date;
  endDate: Date;
  duration: number; // in minutes
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
  jobType: 'installation' | 'service' | 'warranty' | 'inspection' | 'commissioning';
  priority: 'low' | 'medium' | 'high';
  installer: {
    id: string;
    name: string | null;
    email: string;
  };
  customer: {
    id: string;
    name: string;
  };
  timelineSpan: TimelineSpan;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * List timeline jobs response.
 */
export interface ListTimelineJobsResponse {
  items: TimelineJobItem[];
  total: number;
  weekStart: string;
  weekEnd: string;
}

/**
 * Timeline statistics.
 */
export interface TimelineStats {
  stats: Array<{
    status: string;
    count: number;
    totalHours: number;
  }>;
}
