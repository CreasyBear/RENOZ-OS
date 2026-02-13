/**
 * Email Domain Verification Server Functions
 *
 * Checks domain verification status via Resend API.
 *
 * @see INT-RES-005
 */

import { createServerFn } from "@tanstack/react-start";
import { withAuth } from "@/lib/server/protected";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { Resend } from "resend";
import {
  type DomainVerificationResult,
  type DnsRecord,
  type DomainStatus,
} from "@/lib/schemas/communications/email-domain";
import { getResendApiKey, getResendDomainId } from "@/lib/email/config";
import { logger } from "@/lib/logger";

// ============================================================================
// RESEND CLIENT
// ============================================================================

function getResendClient(): Resend | null {
  try {
    const apiKey = getResendApiKey();
    return new Resend(apiKey);
  } catch (error) {
    logger.warn("Resend API key not configured", { error });
    return null;
  }
}

// ============================================================================
// GET DOMAIN VERIFICATION STATUS
// ============================================================================

/**
 * Get domain verification status from Resend.
 * Returns SPF, DKIM, DMARC record status.
 */
export const getDomainVerificationStatus = createServerFn({ method: "GET" })
  .handler(async (): Promise<DomainVerificationResult> => {
    await withAuth({ permission: PERMISSIONS.settings.read });

    const domainId = getResendDomainId();

    // Check if Resend is configured
    if (!domainId) {
      return {
        configured: false,
        domain: null,
        error: "RESEND_DOMAIN_ID not configured",
      };
    }

    const resend = getResendClient();
    if (!resend) {
      return {
        configured: false,
        domain: null,
        error: "RESEND_API_KEY not configured",
      };
    }

    try {
      const { data, error } = await resend.domains.get(domainId);

      if (error) {
        logger.error("Resend domain fetch error", new Error(error.message || "Failed to fetch domain status"), {
          domain: "communications",
          domainId,
        });
        return {
          configured: true,
          domain: null,
          error: error.message || "Failed to fetch domain status",
        };
      }

      if (!data) {
        return {
          configured: true,
          domain: null,
          error: "Domain not found",
        };
      }

      // Map Resend records to our schema
      const records: DnsRecord[] = [];

      // SPF record
      if (data.records) {
        for (const record of data.records) {
          const recordType = record.record?.toUpperCase();
          if (
            recordType === "SPF" ||
            recordType === "DKIM" ||
            recordType === "DMARC" ||
            recordType === "MX"
          ) {
            records.push({
              type: recordType as "SPF" | "DKIM" | "DMARC" | "MX",
              name: record.name ?? "",
              value: record.value ?? "",
              status: mapResendStatus(record.status),
              lastChecked: new Date().toISOString(),
            });
          }
        }
      }

      // Map overall status
      const overallStatus: DomainStatus = mapResendDomainStatus(data.status);

      return {
        configured: true,
        domain: {
          domain: data.name ?? domainId,
          status: overallStatus,
          records,
          createdAt: data.created_at,
          lastVerifiedAt: new Date().toISOString(),
        },
      };
    } catch (err) {
      logger.error("Failed to fetch domain verification status", err instanceof Error ? err : new Error(String(err)), {
        domain: "communications",
        domainId,
      });
      return {
        configured: true,
        domain: null,
        error:
          err instanceof Error ? err.message : "Failed to fetch domain status",
      };
    }
  });

/**
 * Map Resend record status to our schema status.
 */
function mapResendStatus(
  status: string | undefined | null
): "verified" | "pending" | "failed" | "not_started" {
  if (!status) return "not_started";

  const normalized = status.toLowerCase();
  if (normalized === "verified" || normalized === "success") return "verified";
  if (normalized === "pending" || normalized === "not_started")
    return "pending";
  if (normalized === "failed" || normalized === "error") return "failed";
  return "pending";
}

/**
 * Map Resend domain status to our schema status.
 */
function mapResendDomainStatus(
  status: string | undefined | null
): DomainStatus {
  if (!status) return "not_configured";

  const normalized = status.toLowerCase();
  if (normalized === "verified") return "verified";
  if (normalized === "pending") return "pending";
  if (normalized === "failed") return "failed";
  return "not_configured";
}
