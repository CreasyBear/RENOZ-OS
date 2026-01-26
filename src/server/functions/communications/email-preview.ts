/**
 * Email Preview Server Functions
 *
 * Provides template preview rendering and test email functionality.
 * Templates are rendered with sample data or real customer data.
 *
 * @see INT-RES-006
 */

import { createServerFn } from "@tanstack/react-start";
import { eq, and } from "drizzle-orm";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { emailTemplates } from "../../../../drizzle/schema";
import { withAuth } from "@/lib/server/protected";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  renderPreviewSchema,
  sendTestEmailSchema,
  type RenderPreviewResult,
  type SendTestEmailResult,
} from "@/lib/schemas/communications/email-preview";
import {
  substituteTemplateVariables,
  getSampleTemplateData,
} from "@/lib/server/email-templates";
import { NotFoundError } from "@/lib/server/errors";

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Convert HTML to plain text for email.
 */
function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Find missing variables in template content.
 */
function findMissingVariables(
  content: string,
  providedVariables: Record<string, unknown>
): string[] {
  const variablePattern = /\{\{([^}]+)\}\}/g;
  const missing: string[] = [];
  let match;

  while ((match = variablePattern.exec(content)) !== null) {
    const path = match[1].trim();
    const keys = path.split(".");

    let value: unknown = providedVariables;
    let found = true;

    for (const key of keys) {
      if (value && typeof value === "object" && key in value) {
        value = (value as Record<string, unknown>)[key];
      } else {
        found = false;
        break;
      }
    }

    if (!found && !missing.includes(path)) {
      missing.push(path);
    }
  }

  return missing;
}

// ============================================================================
// SERVER FUNCTIONS
// ============================================================================

/**
 * Render email template with provided or sample data.
 * Returns HTML, plain text, subject, and list of missing variables.
 */
export const renderEmailPreview = createServerFn({ method: "POST" })
  .inputValidator(renderPreviewSchema)
  .handler(async ({ data }): Promise<RenderPreviewResult> => {
    const ctx = await withAuth({ permission: PERMISSIONS.organization.read });

    // Fetch the template
    const [template] = await db
      .select()
      .from(emailTemplates)
      .where(
        and(
          eq(emailTemplates.id, data.templateId),
          eq(emailTemplates.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!template) {
      throw new NotFoundError("Template not found", "emailTemplate");
    }

    // Build variables: start with sample data, overlay provided variables
    let variables = getSampleTemplateData();

    // TODO: If sampleCustomerId is provided, fetch real customer data
    // This would require importing customer functions

    // Overlay any provided variables
    if (data.variables) {
      variables = { ...variables, ...data.variables };
    }

    // Render subject and body with variable substitution
    // Note: substituteTemplateVariables now sanitizes values to prevent XSS
    const renderedSubject = substituteTemplateVariables(
      template.subject,
      variables
    );
    const renderedHtml = substituteTemplateVariables(
      template.bodyHtml,
      variables
    );
    const renderedText = htmlToText(renderedHtml);

    // Find any missing variables in the rendered content
    const missingInSubject = findMissingVariables(
      template.subject,
      variables
    );
    const missingInBody = findMissingVariables(
      template.bodyHtml,
      variables
    );
    const missingVariables = [...new Set([...missingInSubject, ...missingInBody])];

    return {
      html: renderedHtml,
      text: renderedText,
      subject: renderedSubject,
      missingVariables,
    };
  });

/**
 * Send a test email using Resend.
 * Includes [TEST] prefix in subject and uses current user's email as default recipient.
 */
export const sendTestEmail = createServerFn({ method: "POST" })
  .inputValidator(sendTestEmailSchema)
  .handler(async ({ data }): Promise<SendTestEmailResult> => {
    const ctx = await withAuth({ permission: PERMISSIONS.organization.update });

    // Fetch the template
    const [template] = await db
      .select()
      .from(emailTemplates)
      .where(
        and(
          eq(emailTemplates.id, data.templateId),
          eq(emailTemplates.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!template) {
      throw new NotFoundError("Template not found", "emailTemplate");
    }

    // Validate Resend API key is configured
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return {
        success: false,
        error: "RESEND_API_KEY is not configured. Please add it to your environment variables.",
      };
    }

    // Build variables from sample data and provided overrides
    let variables = getSampleTemplateData();
    if (data.variables) {
      variables = { ...variables, ...data.variables };
    }

    // Render subject and body
    // Note: substituteTemplateVariables now sanitizes values to prevent XSS
    const baseSubject = data.subject || template.subject;
    const renderedSubject = `[TEST] ${substituteTemplateVariables(baseSubject, variables)}`;
    const renderedHtml = substituteTemplateVariables(
      template.bodyHtml,
      variables
    );
    const renderedText = htmlToText(renderedHtml);

    // Use current user's email as default, or the provided recipient
    const recipientEmail = data.recipientEmail || ctx.user.email;

    // Get sender email from environment or use a default
    const fromEmail = process.env.EMAIL_FROM || "noreply@resend.dev";
    const fromName = process.env.EMAIL_FROM_NAME || "Renoz CRM";

    try {
      const resend = new Resend(resendApiKey);

      const { data: sendResult, error } = await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: [recipientEmail],
        subject: renderedSubject,
        html: renderedHtml,
        text: renderedText,
      });

      if (error) {
        return {
          success: false,
          error: error.message || "Failed to send test email",
        };
      }

      return {
        success: true,
        messageId: sendResult?.id,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      return {
        success: false,
        error: errorMessage,
      };
    }
  });
