/**
 * Email Preview Schemas
 *
 * Zod validation schemas for email preview and test send operations.
 *
 * @see INT-RES-006
 */

import { z } from "zod";

// ============================================================================
// RENDER PREVIEW
// ============================================================================

export const renderPreviewSchema = z.object({
  templateId: z.string().uuid("Invalid template ID"),
  variables: z.record(z.string(), z.unknown()).optional(),
  sampleCustomerId: z.string().uuid().optional(),
});
export type RenderPreviewInput = z.infer<typeof renderPreviewSchema>;

export const renderPreviewResultSchema = z.object({
  html: z.string(),
  text: z.string(),
  subject: z.string(),
  missingVariables: z.array(z.string()),
});
export type RenderPreviewResult = z.infer<typeof renderPreviewResultSchema>;

// ============================================================================
// SEND TEST EMAIL
// ============================================================================

export const sendTestEmailSchema = z.object({
  templateId: z.string().uuid("Invalid template ID"),
  recipientEmail: z.string().email("Invalid email address"),
  variables: z.record(z.string(), z.unknown()).optional(),
  subject: z.string().optional(),
});
export type SendTestEmailInput = z.infer<typeof sendTestEmailSchema>;

export const sendTestEmailResultSchema = z.object({
  success: z.boolean(),
  messageId: z.string().optional(),
  error: z.string().optional(),
});
export type SendTestEmailResult = z.infer<typeof sendTestEmailResultSchema>;
