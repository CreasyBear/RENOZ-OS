import { z } from "zod";

/**
 * URL search params for schedule calendar/timeline views.
 * Enables deep linking and shareable URLs.
 */
export const scheduleSearchSchema = z.object({
  view: z
    .enum(["calendar", "week", "timeline"])
    .optional()
    .default("calendar"),
  weekStart: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD")
    .optional(),
  /** Project ID for deep linking from project detail (filters visits to that project) */
  projectId: z.string().optional(),
  /** Visit status filter (scheduled, in_progress, completed, cancelled, no_show, rescheduled) */
  status: z.string().optional(),
  /** Installer ID filter; use "unassigned" for unassigned visits */
  installerId: z.string().optional(),
  /** Visit type filter (assessment, installation, commissioning, service, warranty, inspection, maintenance) */
  visitType: z.string().optional(),
});

export type ScheduleSearch = z.infer<typeof scheduleSearchSchema>;
