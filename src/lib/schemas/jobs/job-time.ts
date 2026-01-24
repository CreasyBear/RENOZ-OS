/**
 * Job Time Entries Zod Schemas
 *
 * Validation schemas for job time tracking operations.
 * Used by server functions in src/server/functions/job-time.ts
 *
 * @see drizzle/schema/job-time-entries.ts for database schema
 * @see _Initiation/_prd/2-domains/jobs/jobs.prd.json - DOM-JOBS-003b
 */

import { z } from 'zod';

// ============================================================================
// HELPERS
// ============================================================================

/**
 * ISO date string or Date object, coerced to Date.
 */
const dateTime = z.coerce.date();

// ============================================================================
// START TIMER
// ============================================================================

/**
 * Schema for starting a timer on a job.
 * Creates an entry with startTime, no endTime.
 */
export const startTimerSchema = z.object({
  jobId: z.string().uuid('Invalid job ID format'),
  description: z.string().max(2000).optional(),
  isBillable: z.boolean().default(true),
});

export type StartTimerInput = z.infer<typeof startTimerSchema>;

// ============================================================================
// STOP TIMER
// ============================================================================

/**
 * Schema for stopping a running timer.
 * Sets the endTime on an existing entry.
 */
export const stopTimerSchema = z.object({
  entryId: z.string().uuid('Invalid entry ID format'),
});

export type StopTimerInput = z.infer<typeof stopTimerSchema>;

// ============================================================================
// CREATE MANUAL ENTRY
// ============================================================================

/**
 * Schema for creating a manual time entry.
 * Both start and end times are provided at creation.
 */
export const createManualEntrySchema = z
  .object({
    jobId: z.string().uuid('Invalid job ID format'),
    startTime: dateTime,
    endTime: dateTime,
    description: z.string().max(2000).optional(),
    isBillable: z.boolean().default(true),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: 'End time must be after start time',
    path: ['endTime'],
  });

export type CreateManualEntryInput = z.infer<typeof createManualEntrySchema>;

// ============================================================================
// UPDATE TIME ENTRY
// ============================================================================

/**
 * Schema for updating a time entry.
 * Can update description, billable flag, or times.
 */
export const updateTimeEntrySchema = z.object({
  entryId: z.string().uuid('Invalid entry ID format'),
  startTime: dateTime.optional(),
  endTime: dateTime.optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  isBillable: z.boolean().optional(),
});

export type UpdateTimeEntryInput = z.infer<typeof updateTimeEntrySchema>;

// ============================================================================
// DELETE TIME ENTRY
// ============================================================================

/**
 * Schema for deleting a time entry.
 */
export const deleteTimeEntrySchema = z.object({
  entryId: z.string().uuid('Invalid entry ID format'),
});

export type DeleteTimeEntryInput = z.infer<typeof deleteTimeEntrySchema>;

// ============================================================================
// GET JOB TIME ENTRIES
// ============================================================================

/**
 * Schema for listing time entries for a job.
 */
export const getJobTimeEntriesSchema = z.object({
  jobId: z.string().uuid('Invalid job ID format'),
});

export type GetJobTimeEntriesInput = z.infer<typeof getJobTimeEntriesSchema>;

// ============================================================================
// CALCULATE JOB LABOR COST
// ============================================================================

/**
 * Schema for calculating job labor cost.
 * Requires hourly rate to compute total cost.
 */
export const calculateJobLaborCostSchema = z.object({
  jobId: z.string().uuid('Invalid job ID format'),
  hourlyRate: z.number().min(0, 'Hourly rate must be 0 or greater'),
});

export type CalculateJobLaborCostInput = z.infer<typeof calculateJobLaborCostSchema>;

// ============================================================================
// GET TIME ENTRY
// ============================================================================

/**
 * Schema for getting a single time entry.
 */
export const getTimeEntrySchema = z.object({
  entryId: z.string().uuid('Invalid entry ID format'),
});

export type GetTimeEntryInput = z.infer<typeof getTimeEntrySchema>;

// ============================================================================
// RESPONSE TYPES
// ============================================================================

/**
 * Time entry response with user details.
 */
export interface TimeEntryResponse {
  id: string;
  jobId: string;
  userId: string;
  startTime: Date;
  endTime: Date | null;
  description: string | null;
  isBillable: boolean;
  /** Duration in minutes, null if timer is running */
  durationMinutes: number | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  user: {
    id: string;
    fullName: string | null;
    email: string;
  };
}

/**
 * Summary of time entries for a job.
 */
export interface JobTimeSummary {
  totalMinutes: number;
  billableMinutes: number;
  nonBillableMinutes: number;
  activeTimers: number;
  entries: TimeEntryResponse[];
}

/**
 * Labor cost calculation result.
 */
export interface JobLaborCostSummary {
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  hourlyRate: number;
  totalCost: number;
  billableCost: number;
}
