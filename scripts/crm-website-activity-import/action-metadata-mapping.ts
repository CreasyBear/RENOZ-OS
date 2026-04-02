/**
 * CRM `lead_activities.type` → renoz-website `activities.action` + comms metadata shape.
 *
 * Use when building rows for `activities` (import pipeline or tests).
 * Product rule: prefer `note_added` / `call_logged` + `metadata.logType` so customer
 * timelines match manually logged comms; avoid `email_sent` unless UI explicitly supports it.
 *
 * @see drizzle/schema/_shared/enums.ts — activity_action, activity_entity_type
 * @see drizzle/schema/activities/activities.ts — ActivityMetadata
 */

import type {
  ActivityAction,
  ActivityEntityType,
  ActivitySource,
} from "drizzle/schema/activities/activities";

export type CrmLeadActivityType = "NOTE" | "CALL" | "EMAIL" | "MEETING" | string;

export type CommsLogType = "call" | "meeting" | "email" | "note";

/** Maps CRM enum (case-insensitive) to website activity_action. */
export function mapCrmTypeToWebsiteAction(crmType: string): ActivityAction {
  const t = crmType.toUpperCase();
  if (t === "CALL") return "call_logged";
  return "note_added";
}

/** Maps CRM type to metadata.logType for customer comms feeds. */
export function mapCrmTypeToLogType(crmType: string): CommsLogType {
  const t = crmType.toUpperCase();
  if (t === "CALL") return "call";
  if (t === "MEETING") return "meeting";
  if (t === "EMAIL") return "email";
  return "note";
}

export interface CrmImportPayload {
  leadActivityId: string;
  leadId: string;
  crmOrganizationId: string;
  outcome: string | null;
  version: number;
  crmCreatedAt: string;
  crmUpdatedAt: string;
  crmUpdatedByUserId: string | null;
  crmCreatedByUserId: string;
}

export interface BuildImportedActivityInput {
  websiteOrganizationId: string;
  websiteCustomerId: string;
  websiteCustomerName: string;
  websiteUserId: string;
  crm: {
    type: string;
    activityDate: Date;
    subject: string | null;
    details: string | null;
  };
  crmImport: CrmImportPayload;
}

export function buildFullNotes(subject: string | null, details: string | null): string {
  const s = subject?.trim() ?? "";
  const d = details?.trim() ?? "";
  if (s && d) return `${s}\n${d}`;
  return s || d || "";
}

/** Short line for activities.description (feeds / lists). */
export function buildDescriptionLine(
  crmType: string,
  subject: string | null,
  details: string | null,
  maxLen = 500
): string {
  const logType = mapCrmTypeToLogType(crmType);
  const prefix =
    logType === "call"
      ? "Call: "
      : logType === "meeting"
        ? "Meeting: "
        : logType === "email"
          ? "Email: "
          : "Note: ";
  const body = buildFullNotes(subject, details).replace(/\s+/g, " ").trim();
  const line = `${prefix}${body}`;
  return line.length <= maxLen ? line : `${line.slice(0, maxLen - 3)}...`;
}

/** Metadata fragment for `activities.metadata` (merge with app-specific fields if needed). */
export function buildImportMetadata(input: BuildImportedActivityInput): Record<string, unknown> {
  const action = mapCrmTypeToWebsiteAction(input.crm.type);
  const logType = mapCrmTypeToLogType(input.crm.type);
  const fullNotes = buildFullNotes(input.crm.subject, input.crm.details);

  return {
    fullNotes,
    logType,
    subject: input.crm.subject ?? undefined,
    customerId: input.websiteCustomerId,
    crmImport: input.crmImport,
    ...(action === "call_logged"
      ? { notes: fullNotes.slice(0, 500) }
      : { reason: "import" }),
  };
}

export const importActivityDefaults = {
  entityType: "customer" as ActivityEntityType,
  source: "import" as ActivitySource,
};
