/**
 * Email Configuration
 *
 * Centralized configuration for email-related functionality.
 * Validates environment variables and provides type-safe access.
 */

import { z } from "zod";
import { ServerError } from "@/lib/server/errors";
import { logger } from "@/lib/logger";

// ============================================================================
// ENVIRONMENT VARIABLE SCHEMA
// ============================================================================

const emailEnvSchema = z.object({
  // Resend API Configuration
  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_DOMAIN_ID: z.string().min(1).optional(),

  // Email From Configuration
  EMAIL_FROM: z.string().email().optional(),
  EMAIL_FROM_NAME: z.string().min(1).optional(),

  // App URL for OAuth redirects
  APP_URL: z.string().url().optional(),
});

type EmailEnv = z.infer<typeof emailEnvSchema>;

// ============================================================================
// VALIDATION & CONFIG
// ============================================================================

function getEmailConfig(): EmailEnv {
  const parsed = emailEnvSchema.safeParse({
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_DOMAIN_ID: process.env.RESEND_DOMAIN_ID,
    EMAIL_FROM: process.env.EMAIL_FROM,
    EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME,
    APP_URL: process.env.APP_URL || process.env.VITE_APP_URL,
  });

  if (!parsed.success) {
    // Log validation errors but don't throw (some vars are optional)
    // Note: Using console.warn here is acceptable as this runs at module load time
    // and is not in a hot path. Structured logging would require async initialization.
    if (process.env.NODE_ENV === "development") {
      logger.warn("[Email Config] Invalid environment variables", { errors: parsed.error.flatten().fieldErrors });
    }
  }

  return parsed.success ? parsed.data : {};
}

export const emailConfig = getEmailConfig();

// ============================================================================
// VALIDATED GETTERS
// ============================================================================

/**
 * Get Resend API key with validation.
 * Throws ServerError if not configured (required for email sending).
 */
export function getResendApiKey(): string {
  const apiKey = emailConfig.RESEND_API_KEY;
  if (!apiKey) {
    throw new ServerError(
      "RESEND_API_KEY is not configured. Please add it to your environment variables.",
      500,
      "email_config"
    );
  }
  return apiKey;
}

/**
 * Get Resend domain ID with validation.
 * Returns null if not configured (optional for domain verification).
 */
export function getResendDomainId(): string | null {
  return emailConfig.RESEND_DOMAIN_ID || null;
}

/**
 * Get email from address with fallback.
 */
export function getEmailFrom(): string {
  return emailConfig.EMAIL_FROM || "noreply@renoz.com";
}

/**
 * Get email from name with fallback.
 */
export function getEmailFromName(): string {
  return emailConfig.EMAIL_FROM_NAME || "Renoz CRM";
}

/**
 * Get app URL for OAuth redirects with validation.
 */
export function getAppUrl(): string {
  const url = emailConfig.APP_URL;
  if (!url) {
    throw new ServerError(
      "APP_URL or VITE_APP_URL is not configured. Please add it to your environment variables.",
      500,
      "email_config"
    );
  }
  return url;
}
