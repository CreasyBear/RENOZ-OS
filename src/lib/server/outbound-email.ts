import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { emailSignatures, emailTemplates } from "../../../drizzle/schema";
import { substituteTemplateVariables } from "@/lib/email/sanitize";
import { getSampleTemplateData } from "@/lib/server/email-templates";
import { ServerError } from "@/lib/server/errors";
import { z } from "zod";

type TemplateVariables = Record<string, unknown>;

type TemplatePriority = "low" | "normal" | "high";

type LegacyTemplateType =
  | "welcome"
  | "follow_up"
  | "quote"
  | "order_confirmation"
  | "shipping_notification"
  | "reminder"
  | "newsletter"
  | "promotion"
  | "announcement"
  | "custom";

interface LegacyTemplateDefinition {
  subject: string;
  bodyHtml: string;
}

interface DirectTemplateDefinition {
  id?: string | null;
  version?: number | null;
  subject: string;
  bodyHtml: string;
}

interface OutboundTemplateData {
  templateId?: string;
  templateVersion?: number;
  variables?: TemplateVariables;
  subjectOverride?: string;
  bodyOverride?: string;
  previewText?: string;
  replyToOverride?: string;
  priority?: TemplatePriority;
  signatureId?: string;
  signatureContent?: string;
  trackOpens?: boolean;
  trackClicks?: boolean;
}

const outboundTemplateFieldSchemas = {
  templateId: z.string().min(1),
  templateVersion: z.number().int(),
  variables: z.record(z.string(), z.unknown()),
  subjectOverride: z.string(),
  bodyOverride: z.string(),
  previewText: z.string(),
  replyToOverride: z.string(),
  priority: z.enum(["low", "normal", "high"]),
  signatureId: z.string(),
  signatureContent: z.string(),
  trackOpens: z.boolean(),
  trackClicks: z.boolean(),
} as const;

export class TemplateUnresolvedError extends ServerError {
  public readonly templateId: string;

  constructor(templateId: string) {
    super(
      "The selected saved template could not be resolved. Choose another template or detach the saved template before sending.",
      400,
      "TEMPLATE_UNRESOLVED"
    );
    this.name = "TemplateUnresolvedError";
    this.templateId = templateId;
  }
}

export interface RenderOutboundEmailInput {
  organizationId: string;
  templateType?: string | null;
  templateData?: Record<string, unknown> | null;
  variables?: TemplateVariables;
  userId?: string | null;
  directTemplate?: DirectTemplateDefinition;
  testPrefix?: string | null;
  subject?: string | null;
  bodyOverride?: string | null;
}

export interface RenderOutboundEmailResult {
  subject: string;
  bodyHtml: string;
  bodyText: string;
  previewText: string | null;
  replyTo: string | null;
  priority: TemplatePriority | null;
  templateId: string | null;
  templateVersion: number | null;
  trackOpens: boolean;
  trackClicks: boolean;
}

const LEGACY_TEMPLATES: Record<LegacyTemplateType, LegacyTemplateDefinition> = {
  welcome: {
    subject: "Welcome to {{company_name}}, {{first_name}}!",
    bodyHtml: `<html><body>
      <h1>Welcome, {{first_name}}!</h1>
      <p>Thank you for joining {{company_name}}. We're excited to have you!</p>
      <p>If you have any questions, don't hesitate to reach out.</p>
      <p>Best regards,<br>The {{company_name}} Team</p>
    </body></html>`,
  },
  follow_up: {
    subject: "Following up on {{subject_context}}",
    bodyHtml: `<html><body>
      <p>Hi {{first_name}},</p>
      <p>I wanted to follow up on {{subject_context}}.</p>
      <p>Please let me know if you have any questions.</p>
      <p>Best regards,<br>{{sender_name}}</p>
    </body></html>`,
  },
  quote: {
    subject: "Your Quote {{quote_number}} Is Ready",
    bodyHtml: `<html><body>
      <p>Hi {{first_name}},</p>
      <p>Your quote {{quote_number}} is ready for review.</p>
      <p><a href="{{quote_url}}">View Your Quote</a></p>
      <p>The quote is valid until {{expiry_date}}.</p>
      <p>Best regards,<br>{{sender_name}}</p>
    </body></html>`,
  },
  order_confirmation: {
    subject: "Order Confirmation - {{order_number}}",
    bodyHtml: `<html><body>
      <h1>Order Confirmed</h1>
      <p>Hi {{first_name}},</p>
      <p>Thank you for your order {{order_number}}.</p>
      <p>Order Total: {{order_total}}</p>
      <p>We'll notify you when your order ships.</p>
      <p>Best regards,<br>The {{company_name}} Team</p>
    </body></html>`,
  },
  shipping_notification: {
    subject: "Your Order {{order_number}} Has Shipped",
    bodyHtml: `<html><body>
      <h1>Your Order Is On Its Way</h1>
      <p>Hi {{first_name}},</p>
      <p>Great news. Your order {{order_number}} has shipped.</p>
      <p>Tracking Number: {{tracking_number}}</p>
      <p><a href="{{tracking_url}}">Track Your Order</a></p>
      <p>Best regards,<br>The {{company_name}} Team</p>
    </body></html>`,
  },
  reminder: {
    subject: "Reminder: {{reminder_subject}}",
    bodyHtml: `<html><body>
      <p>Hi {{first_name}},</p>
      <p>This is a friendly reminder about {{reminder_subject}}.</p>
      <p>{{reminder_details}}</p>
      <p>Best regards,<br>{{sender_name}}</p>
    </body></html>`,
  },
  newsletter: {
    subject: "{{newsletter_title}}",
    bodyHtml: `<html><body>
      <h1>{{newsletter_title}}</h1>
      <p>{{newsletter_content}}</p>
      <p>Best regards,<br>The {{company_name}} Team</p>
      <p><small><a href="{{unsubscribe_url}}">Unsubscribe</a></small></p>
    </body></html>`,
  },
  promotion: {
    subject: "{{promotion_title}} - {{discount_amount}} Off",
    bodyHtml: `<html><body>
      <h1>{{promotion_title}}</h1>
      <p>Hi {{first_name}},</p>
      <p>Don't miss out on our special offer: {{discount_amount}} off.</p>
      <p>{{promotion_details}}</p>
      <p><a href="{{promotion_url}}">Shop Now</a></p>
      <p>Offer valid until {{expiry_date}}.</p>
      <p>Best regards,<br>The {{company_name}} Team</p>
      <p><small><a href="{{unsubscribe_url}}">Unsubscribe</a></small></p>
    </body></html>`,
  },
  announcement: {
    subject: "Important Announcement: {{announcement_title}}",
    bodyHtml: `<html><body>
      <h1>{{announcement_title}}</h1>
      <p>Hi {{first_name}},</p>
      <p>{{announcement_content}}</p>
      <p>Best regards,<br>The {{company_name}} Team</p>
      <p><small><a href="{{unsubscribe_url}}">Unsubscribe</a></small></p>
    </body></html>`,
  },
  custom: {
    subject: "{{subject}}",
    bodyHtml: "{{body}}",
  },
};

export function renderHtmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>.*?<\/style>/gis, "")
    .replace(/<script[^>]*>.*?<\/script>/gis, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/td>/gi, " | ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function appendSignature(bodyHtml: string, signatureHtml: string): string {
  const trimmedSignature = signatureHtml.trim();
  if (!trimmedSignature) return bodyHtml;

  const signatureBlock = `<div data-email-signature="true">${trimmedSignature}</div>`;
  if (bodyHtml.includes("</body>")) {
    return bodyHtml.replace("</body>", `${signatureBlock}</body>`);
  }

  return `${bodyHtml}${signatureBlock}`;
}

function normalizeTemplateData(
  templateData: Record<string, unknown> | null | undefined
): OutboundTemplateData {
  if (!templateData || typeof templateData !== "object") return {};

  const getParsedField = <T extends z.ZodTypeAny>(
    schema: T,
    value: unknown
  ): z.infer<T> | undefined => {
    const parsed = schema.safeParse(value);
    return parsed.success ? parsed.data : undefined;
  };

  return {
    templateId: getParsedField(outboundTemplateFieldSchemas.templateId, templateData.templateId),
    templateVersion: getParsedField(
      outboundTemplateFieldSchemas.templateVersion,
      templateData.templateVersion
    ),
    variables: getParsedField(outboundTemplateFieldSchemas.variables, templateData.variables),
    subjectOverride: getParsedField(
      outboundTemplateFieldSchemas.subjectOverride,
      templateData.subjectOverride
    ),
    bodyOverride: getParsedField(
      outboundTemplateFieldSchemas.bodyOverride,
      templateData.bodyOverride
    ),
    previewText: getParsedField(
      outboundTemplateFieldSchemas.previewText,
      templateData.previewText
    ),
    replyToOverride: getParsedField(
      outboundTemplateFieldSchemas.replyToOverride,
      templateData.replyToOverride
    ),
    priority: getParsedField(outboundTemplateFieldSchemas.priority, templateData.priority),
    signatureId: getParsedField(outboundTemplateFieldSchemas.signatureId, templateData.signatureId),
    signatureContent: getParsedField(
      outboundTemplateFieldSchemas.signatureContent,
      templateData.signatureContent
    ),
    trackOpens: getParsedField(outboundTemplateFieldSchemas.trackOpens, templateData.trackOpens),
    trackClicks: getParsedField(outboundTemplateFieldSchemas.trackClicks, templateData.trackClicks),
  };
}

async function resolveStoredTemplate(
  organizationId: string,
  templateId: string
): Promise<DirectTemplateDefinition | null> {
  const [template] = await db
    .select({
      id: emailTemplates.id,
      version: emailTemplates.version,
      subject: emailTemplates.subject,
      bodyHtml: emailTemplates.bodyHtml,
    })
    .from(emailTemplates)
    .where(
      and(eq(emailTemplates.organizationId, organizationId), eq(emailTemplates.id, templateId))
    )
    .limit(1);

  if (!template) return null;

  return {
    id: template.id,
    version: template.version,
    subject: template.subject,
    bodyHtml: template.bodyHtml,
  };
}

async function resolveSignatureHtml(
  organizationId: string,
  userId: string | null | undefined,
  templateData: OutboundTemplateData
): Promise<string | null> {
  if (typeof templateData.signatureContent === "string" && templateData.signatureContent.trim()) {
    return templateData.signatureContent;
  }

  if (typeof templateData.signatureId === "string" && templateData.signatureId.trim()) {
    const [signature] = await db
      .select({ content: emailSignatures.content })
      .from(emailSignatures)
      .where(
        and(
          eq(emailSignatures.organizationId, organizationId),
          eq(emailSignatures.id, templateData.signatureId)
        )
      )
      .limit(1);

    return signature?.content ?? null;
  }

  if (!userId) return null;

  const [defaultSignature] = await db
    .select({ content: emailSignatures.content })
    .from(emailSignatures)
    .where(
      and(
        eq(emailSignatures.organizationId, organizationId),
        eq(emailSignatures.userId, userId),
        eq(emailSignatures.isDefault, true)
      )
    )
    .limit(1);

  return defaultSignature?.content ?? null;
}

async function resolveBaseTemplate(
  input: RenderOutboundEmailInput,
  normalizedTemplateData: OutboundTemplateData
): Promise<DirectTemplateDefinition> {
  if (input.directTemplate) {
    return input.directTemplate;
  }

  if (typeof normalizedTemplateData.templateId === "string") {
    const stored = await resolveStoredTemplate(
      input.organizationId,
      normalizedTemplateData.templateId
    );
    if (stored) return stored;
    throw new TemplateUnresolvedError(normalizedTemplateData.templateId);
  }

  const legacyType = (input.templateType ?? "custom") as LegacyTemplateType;
  const legacyTemplate = LEGACY_TEMPLATES[legacyType] ?? LEGACY_TEMPLATES.custom;
  return {
    id: null,
    version: null,
    subject: legacyTemplate.subject,
    bodyHtml: legacyTemplate.bodyHtml,
  };
}

export async function renderOutboundEmail(
  input: RenderOutboundEmailInput
): Promise<RenderOutboundEmailResult> {
  const normalizedTemplateData = normalizeTemplateData(input.templateData);
  const baseTemplate = await resolveBaseTemplate(input, normalizedTemplateData);

  const variables: TemplateVariables = {
    ...getSampleTemplateData(),
    ...(normalizedTemplateData.variables ?? {}),
    ...(input.variables ?? {}),
  };

  const subjectTemplate =
    typeof input.subject === "string"
      ? input.subject
      : typeof normalizedTemplateData.subjectOverride === "string"
        ? normalizedTemplateData.subjectOverride
      : baseTemplate.subject;
  const bodyTemplate =
    typeof input.bodyOverride === "string"
      ? input.bodyOverride
      : typeof normalizedTemplateData.bodyOverride === "string"
        ? normalizedTemplateData.bodyOverride
      : baseTemplate.bodyHtml;

  const subjectPrefix = input.testPrefix ?? "";
  const renderedSubject = `${subjectPrefix}${substituteTemplateVariables(subjectTemplate, variables)}`;
  let renderedHtml = substituteTemplateVariables(bodyTemplate, variables);

  const signatureHtml = await resolveSignatureHtml(
    input.organizationId,
    input.userId,
    normalizedTemplateData
  );
  if (signatureHtml) {
    renderedHtml = appendSignature(renderedHtml, signatureHtml);
  }

  const previewText =
    typeof normalizedTemplateData.previewText === "string"
      ? normalizedTemplateData.previewText
      : renderHtmlToText(renderedHtml).slice(0, 160) || null;

  return {
    subject: renderedSubject,
    bodyHtml: renderedHtml,
    bodyText: renderHtmlToText(renderedHtml),
    previewText,
    replyTo:
      typeof normalizedTemplateData.replyToOverride === "string"
        ? normalizedTemplateData.replyToOverride
        : null,
    priority: normalizedTemplateData.priority ?? null,
    templateId: baseTemplate.id ?? null,
    templateVersion: baseTemplate.version ?? normalizedTemplateData.templateVersion ?? null,
    trackOpens: normalizedTemplateData.trackOpens ?? true,
    trackClicks: normalizedTemplateData.trackClicks ?? true,
  };
}

export function buildLegacyTemplateOptions(): Array<{ value: LegacyTemplateType; label: string }> {
  return [
    { value: "custom", label: "Custom Email" },
    { value: "welcome", label: "Welcome" },
    { value: "follow_up", label: "Follow Up" },
    { value: "quote", label: "Quote" },
    { value: "order_confirmation", label: "Order Confirmation" },
    { value: "shipping_notification", label: "Shipping Notification" },
    { value: "reminder", label: "Reminder" },
    { value: "newsletter", label: "Newsletter" },
    { value: "promotion", label: "Promotion" },
    { value: "announcement", label: "Announcement" },
  ];
}
