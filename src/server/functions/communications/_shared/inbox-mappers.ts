import { LIMITS } from "@/lib/constants";
import type { InboxEmailItem, InboxListQuery } from "@/lib/schemas/communications/inbox";

export type InboxRow = InboxEmailItem & { sortDate: Date };

function trimPreview(value: string | null | undefined): string {
  const text = value?.trim();
  return text ? text.slice(0, LIMITS.EMAIL_PREVIEW_LENGTH) : "No preview available";
}

function displayName(name: string | null | undefined, email: string): string {
  return name?.trim() || email;
}

function getMetadata(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export function toHistoryInboxItem(item: {
  id: string;
  subject: string | null;
  bodyText: string | null;
  bodyHtml: string | null;
  fromAddress: string;
  toAddress: string;
  status: string;
  sentAt: Date | null;
  createdAt: Date;
  customerId: string | null;
  campaignId: string | null;
  templateId: string | null;
  metadata: unknown;
  customerName: string | null;
  customerEmail: string | null;
  senderName: string | null;
  campaignName: string | null;
}): InboxRow {
  const metadata = getMetadata(item.metadata);
  const fromName =
    typeof metadata.fromName === "string" ? metadata.fromName : item.senderName;

  return {
    id: item.id,
    type: "history",
    subject: item.subject || "(No subject)",
    preview: trimPreview(item.bodyText),
    bodyHtml: item.bodyHtml,
    bodyText: item.bodyText,
    from: {
      name: displayName(fromName, item.fromAddress),
      email: item.fromAddress,
      avatar: null,
    },
    to: {
      name: displayName(item.customerName, item.toAddress),
      email: item.toAddress,
    },
    status: item.status,
    read: metadata.read === true,
    starred: metadata.starred === true,
    sentAt: item.sentAt,
    createdAt: item.createdAt,
    sortDate: item.sentAt ?? item.createdAt,
    customerId: item.customerId,
    campaignId: item.campaignId,
    templateId: item.templateId,
    customer: item.customerId
      ? { id: item.customerId, name: item.customerName, email: item.customerEmail }
      : null,
    campaign: item.campaignId ? { id: item.campaignId, name: item.campaignName } : null,
    scheduledEmail: null,
    metadata: item.metadata ? (metadata as InboxEmailItem["metadata"]) : null,
  };
}

export function toScheduledInboxItem(item: {
  id: string;
  subject: string;
  recipientEmail: string;
  recipientName: string | null;
  status: string;
  scheduledAt: Date;
  createdAt: Date;
  customerId: string | null;
  templateData: unknown;
  customerName: string | null;
  customerEmail: string | null;
  senderName: string | null;
}): InboxRow {
  const templateData = getMetadata(item.templateData);
  const preview =
    typeof templateData.validationError === "string"
      ? templateData.validationError
      : typeof templateData.previewText === "string"
        ? templateData.previewText
        : `Scheduled for ${item.scheduledAt.toLocaleDateString()}`;
  const senderEmail =
    typeof templateData.replyToOverride === "string" && templateData.replyToOverride
      ? templateData.replyToOverride
      : "noreply@renoz.local";

  return {
    id: item.id,
    type: "scheduled",
    subject: item.subject,
    preview: preview.slice(0, LIMITS.EMAIL_PREVIEW_LENGTH),
    from: {
      name: displayName(item.senderName, senderEmail),
      email: senderEmail,
      avatar: null,
    },
    to: {
      name: displayName(item.recipientName || item.customerName, item.recipientEmail),
      email: item.recipientEmail,
    },
    status: item.status,
    read: false,
    starred: false,
    sentAt: item.status === "sent" ? item.scheduledAt : null,
    createdAt: item.createdAt,
    sortDate: item.status === "sent" ? item.scheduledAt : item.createdAt,
    customerId: item.customerId,
    campaignId: null,
    templateId: typeof templateData.templateId === "string" ? templateData.templateId : null,
    customer: item.customerId
      ? { id: item.customerId, name: item.customerName, email: item.customerEmail }
      : null,
    campaign: null,
    scheduledEmail: { id: item.id, scheduledAt: item.scheduledAt },
    metadata: templateData as InboxEmailItem["metadata"],
  };
}

export function applyTabFilter(items: InboxRow[], tab: InboxListQuery["tab"]): InboxRow[] {
  return items.filter((item) => {
    if (tab === "unread") return !item.read;
    if (tab === "sent") return item.type === "history" && item.status === "sent";
    if (tab === "scheduled") return item.type === "scheduled";
    if (tab === "failed") return item.status === "failed" || item.status === "bounced";
    return true;
  });
}
