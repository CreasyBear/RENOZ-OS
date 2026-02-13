import type { StatusConfigItem } from "@/components/shared/status-badge";

/**
 * Installer status badge configuration.
 *
 * Statuses match the database enum: active, busy, away, suspended, inactive.
 * @see drizzle/schema/jobs/installers.ts installerStatusEnum
 * @see src/lib/schemas/jobs/installers.ts installerStatusSchema
 */
export const INSTALLER_STATUS_CONFIG: Record<string, StatusConfigItem> = {
  active: { variant: "success", label: "Active" },
  busy: { variant: "warning", label: "Busy" },
  away: { variant: "info", label: "Away" },
  suspended: { variant: "error", label: "Suspended" },
  inactive: { variant: "neutral", label: "Inactive" },
};
