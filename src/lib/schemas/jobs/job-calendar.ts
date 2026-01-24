/**
 * Job Calendar Zod Schemas
 *
 * Validation schemas for job calendar operations.
 * Used by server functions in src/server/functions/job-calendar.ts
 *
 * @see drizzle/schema/job-assignments.ts for database schema
 * @see _Initiation/_prd/2-domains/jobs/jobs.prd.json - DOM-JOBS-005a
 */

import { z } from 'zod';

// ============================================================================
// LIST CALENDAR JOBS
// ============================================================================

/**
 * Schema for listing jobs in a date range for calendar view.
 */
export const listCalendarJobsSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  installerIds: z.array(z.string().uuid()).optional(),
  statuses: z
    .array(z.enum(['scheduled', 'in_progress', 'completed', 'cancelled', 'on_hold']))
    .optional(),
  includeUnscheduled: z.boolean().optional(),
});

export type ListCalendarJobsInput = z.infer<typeof listCalendarJobsSchema>;

// ============================================================================
// RESCHEDULE JOB
// ============================================================================

/**
 * Schema for rescheduling a job to a new date.
 */
export const rescheduleJobSchema = z.object({
  jobId: z.string().uuid('Invalid job ID format'),
  newDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  newTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM')
    .optional()
    .nullable(),
});

export type RescheduleJobInput = z.infer<typeof rescheduleJobSchema>;

// ============================================================================
// GET UNSCHEDULED JOBS
// ============================================================================

/**
 * Schema for listing unscheduled jobs (for sidebar).
 */
export const listUnscheduledJobsSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

export type ListUnscheduledJobsInput = z.infer<typeof listUnscheduledJobsSchema>;

// ============================================================================
// RESPONSE TYPES
// ============================================================================

/**
 * Calendar job event response.
 */
export interface CalendarJobEvent {
  id: string;
  title: string;
  jobNumber: string;
  start: Date;
  end: Date;
  allDay: boolean;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
  jobType: 'installation' | 'service' | 'warranty' | 'inspection' | 'commissioning';
  installer: {
    id: string;
    name: string | null;
    email: string;
  };
  customer: {
    id: string;
    name: string;
  };
  /** Estimated duration in minutes */
  estimatedDuration: number | null;
}

/**
 * List calendar jobs response.
 */
export interface ListCalendarJobsResponse {
  events: CalendarJobEvent[];
  /** Total count for pagination */
  total: number;
}

/**
 * Unscheduled job response (for sidebar).
 */
export interface UnscheduledJob {
  id: string;
  jobNumber: string;
  title: string;
  jobType: 'installation' | 'service' | 'warranty' | 'inspection' | 'commissioning';
  customer: {
    id: string;
    name: string;
  };
  estimatedDuration: number | null;
  createdAt: Date;
}

/**
 * List unscheduled jobs response.
 */
export interface ListUnscheduledJobsResponse {
  jobs: UnscheduledJob[];
  total: number;
  hasMore: boolean;
}

/**
 * Reschedule job response.
 */
export interface RescheduleJobResponse {
  success: boolean;
  event: CalendarJobEvent;
}

/**
 * Technician/installer for filter.
 */
export interface CalendarInstaller {
  id: string;
  name: string | null;
  email: string;
  /** Number of jobs assigned in the current view */
  jobCount?: number;
}

// ============================================================================
// CALENDAR KANBAN TASKS (Weekly View)
// ============================================================================

/**
 * Calendar kanban task for weekly view.
 */
export interface CalendarKanbanTask {
  id: string;
  jobNumber: string;
  title: string;
  description: string | null;
  startTime: Date;
  endTime: Date;
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
  createdAt: Date;
  updatedAt: Date;
}

/**
 * List calendar tasks for kanban response.
 */
export interface ListCalendarTasksForKanbanResponse {
  tasks: CalendarKanbanTask[];
  /** Total count for pagination */
  total: number;
}
