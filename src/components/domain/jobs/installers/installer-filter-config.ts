/**
 * Installer Filter Configuration
 *
 * Config-driven filter definition for installers domain.
 * Used with DomainFilterBar component.
 *
 * @see docs/design-system/FILTER-STANDARDS.md
 */

import { CheckCircle, AlertTriangle, Ban, PauseCircle, UserX } from "lucide-react";
import type { FilterBarConfig, FilterOption } from "@/components/shared/filters";
import type { InstallerStatus } from "@/lib/schemas/jobs/installers";

export type { InstallerStatus };

export interface InstallerFiltersState extends Record<string, unknown> {
  search: string;
  status: InstallerStatus[];
}

export const DEFAULT_INSTALLER_FILTERS: InstallerFiltersState = {
  search: "",
  status: [],
};

export const INSTALLER_STATUS_OPTIONS: FilterOption<InstallerStatus>[] = [
  { value: "active", label: "Active", icon: CheckCircle },
  { value: "busy", label: "Busy", icon: AlertTriangle },
  { value: "away", label: "Away", icon: PauseCircle },
  { value: "suspended", label: "Suspended", icon: Ban },
  { value: "inactive", label: "Inactive", icon: UserX },
];

export const INSTALLER_FILTER_CONFIG: FilterBarConfig<InstallerFiltersState> = {
  search: {
    placeholder: "Search installers by name or email...",
    fields: ["name", "email"],
  },
  filters: [
    {
      key: "status",
      label: "Status",
      type: "multi-select",
      options: INSTALLER_STATUS_OPTIONS,
      primary: true,
    },
  ],
  presets: [
    {
      id: "active",
      label: "Active",
      icon: CheckCircle,
      filters: { status: ["active"] },
    },
    {
      id: "busy",
      label: "Busy",
      icon: AlertTriangle,
      filters: { status: ["busy"] },
    },
  ],
  labels: {
    status: "Installer Status",
  },
};
