import { formatRelativeTime } from '@/lib/formatters';
import { readAuditNote } from '@/lib/activities/read-audit-note';
import {
  getActivityTypeConfig,
  type ActivityChanges,
  type ActivityMetadata,
  type UnifiedActivity,
} from '@/lib/schemas/unified-activity';

type DetailFact = { label: string; value: string };

export interface PresentedActivityFactChip {
  label?: string;
  value: string;
}

export type PresentedActivityDetailSection =
  | { type: 'note'; label: string; body: string }
  | { type: 'list'; label: string; items: string[] }
  | { type: 'facts'; label: string; items: DetailFact[] };

export interface PresentedActivity {
  id: string;
  kindLabel: string;
  sourceLabel?: string;
  title: string;
  summary?: string;
  factChips: PresentedActivityFactChip[];
  detailSections: PresentedActivityDetailSection[];
  status?: 'done' | 'overdue' | 'scheduled';
  iconKey: string;
  timestampLabel: string;
  actorLabel?: string;
}

function formatTitleCase(value: string): string {
  return value
    .replace(/[-_]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function cleanText(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function truncateText(value: string, maxLength = 140): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}

function formatFileSize(bytes?: number): string | undefined {
  if (typeof bytes !== 'number' || Number.isNaN(bytes) || bytes <= 0) return undefined;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatFieldLabel(field: string): string {
  return formatTitleCase(field);
}

function formatValue(value: unknown): string {
  if (value == null) return 'Empty';
  if (Array.isArray(value)) return value.map((item) => formatValue(item)).join(', ');
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function getMetadata(activity: UnifiedActivity): ActivityMetadata | undefined {
  return activity.metadata ?? undefined;
}

function getPrimaryBody(activity: UnifiedActivity, metadata: ActivityMetadata | undefined): string | undefined {
  return cleanText(metadata?.fullNotes) ?? cleanText(activity.description) ?? cleanText(metadata?.contentPreview);
}

function getChangeLines(changes?: ActivityChanges | null): string[] {
  if (!changes?.fields?.length) return [];

  return changes.fields.map((field) => {
    const beforeValue = changes.before?.[field];
    const afterValue = changes.after?.[field];
    if (beforeValue !== undefined || afterValue !== undefined) {
      return `${formatFieldLabel(field)}: ${formatValue(beforeValue)} -> ${formatValue(afterValue)}`;
    }
    return formatFieldLabel(field);
  });
}

function getUpdateNarrative(activity: UnifiedActivity, metadata: ActivityMetadata | undefined) {
  const changes = activity.changes;
  const changedFields = changes?.fields ?? metadata?.changedFields ?? [];
  if (changedFields.length === 0) {
    return {
      title: `${formatTitleCase(activity.entityType)} updated`,
      summary: cleanText(activity.description),
      detailSections: [] as PresentedActivityDetailSection[],
    };
  }

  const field = changedFields[0];
  const beforeValue = changes?.before?.[field];
  const afterValue = changes?.after?.[field];
  const detailSections: PresentedActivityDetailSection[] = [];
  const changeLines = getChangeLines(changes);
  if (changeLines.length > 0) {
    detailSections.push({ type: 'list', label: 'Changes', items: changeLines });
  } else if (changedFields.length > 0) {
    detailSections.push({
      type: 'list',
      label: 'Changed fields',
      items: changedFields.map(formatFieldLabel),
    });
  }

  if (field && changedFields.length === 1 && (beforeValue !== undefined || afterValue !== undefined)) {
    const title = field === 'status' ? 'Status changed' : `${formatFieldLabel(field)} updated`;
    return {
      title,
      summary: `${formatValue(beforeValue)} -> ${formatValue(afterValue)}`,
      detailSections,
    };
  }

  return {
    title: `${formatTitleCase(activity.entityType)} updated`,
    summary: `Changed ${changedFields.slice(0, 3).map(formatFieldLabel).join(', ')}${changedFields.length > 3 ? ` and ${changedFields.length - 3} more` : ''}`,
    detailSections,
  };
}

function presentDocumentExport(activity: UnifiedActivity, metadata: ActivityMetadata): PresentedActivity {
  const config = getActivityTypeConfig(activity.type);
  const documentLabel = formatTitleCase(metadata.documentType ?? 'document');
  const isRegeneration = metadata.isRegeneration === true;
  const title = `${documentLabel} ${isRegeneration ? 'regenerated' : 'generated'}`;
  const factChips: PresentedActivityFactChip[] = [];
  const fileSize = formatFileSize(metadata.fileSize);
  if (fileSize) factChips.push({ value: fileSize });
  if (metadata.isRegeneration) factChips.push({ value: 'Regeneration' });

  const detailItems: DetailFact[] = [];
  if (metadata.filename) detailItems.push({ label: 'Filename', value: metadata.filename });
  if (metadata.documentType) detailItems.push({ label: 'Document type', value: documentLabel });
  if (fileSize) detailItems.push({ label: 'File size', value: fileSize });
  if (metadata.regenerationCount && metadata.regenerationCount > 0) {
    detailItems.push({ label: 'Versions', value: String(metadata.regenerationCount + 1) });
  }

  return {
    id: activity.id,
    kindLabel: config.label,
    sourceLabel: activity.source === 'audit' ? 'System' : 'Planned',
    title,
    summary: cleanText(metadata.filename) ?? cleanText(activity.description),
    factChips,
    detailSections: detailItems.length > 0 ? [{ type: 'facts', label: 'Document details', items: detailItems }] : [],
    status: activity.isOverdue ? 'overdue' : activity.isCompleted ? 'done' : activity.scheduledAt ? 'scheduled' : undefined,
    iconKey: config.icon,
    timestampLabel: formatRelativeTime(activity.createdAt),
    actorLabel: cleanText(activity.userName) ?? cleanText(activity.userEmail),
  };
}

export function presentActivity(activity: UnifiedActivity): PresentedActivity {
  const config = getActivityTypeConfig(activity.type);
  const metadata = getMetadata(activity);
  const factChips: PresentedActivityFactChip[] = [];
  const detailSections: PresentedActivityDetailSection[] = [];
  const timestampLabel = formatRelativeTime(activity.createdAt);
  const actorLabel = cleanText(activity.userName) ?? cleanText(activity.userEmail);

  if (activity.direction) {
    factChips.push({ value: formatTitleCase(activity.direction) });
  }
  if (activity.duration) {
    factChips.push({ value: `${activity.duration} min` });
  }
  if (metadata?.logType && metadata.logType !== 'note') {
    factChips.push({ value: formatTitleCase(metadata.logType) });
  }
  if (metadata?.noteImportance && metadata.noteImportance !== 'normal') {
    factChips.push({ value: formatTitleCase(metadata.noteImportance) });
  }

  if (activity.type === 'exported' && metadata && (metadata.documentType || metadata.filename)) {
    return presentDocumentExport(activity, metadata);
  }

  let title = cleanText(activity.subject) ?? cleanText(activity.description) ?? config.label;
  let summary =
    cleanText(activity.subject) && activity.description !== activity.subject
      ? cleanText(activity.description)
      : cleanText(metadata?.contentPreview) ?? cleanText(activity.description);

  if (activity.type === 'created') {
    title = `${formatTitleCase(activity.entityType)} created`;
    summary =
      cleanText(metadata?.orderNumber) ??
      cleanText(metadata?.customerName) ??
      cleanText(activity.description);
  } else if (activity.type === 'updated') {
    const updateNarrative = getUpdateNarrative(activity, metadata);
    title = updateNarrative.title;
    summary = updateNarrative.summary;
    detailSections.push(...updateNarrative.detailSections);
  } else if (activity.type === 'note_added') {
    const note = readAuditNote(activity);
    title = note?.title ?? 'Note added';
    summary = note?.preview ?? cleanText(activity.description);
    if (note?.fullBody && (note.title || note.fullBody.length > 140)) {
      detailSections.push({ type: 'note', label: 'Full note', body: note.fullBody });
    }
  } else if (activity.type === 'call_logged') {
    title = 'Call logged';
    summary = truncateText(getPrimaryBody(activity, metadata) ?? activity.description);
    if (metadata?.notes) {
      detailSections.push({ type: 'note', label: 'Outcome', body: metadata.notes });
    }
  } else if (activity.type === 'call' || activity.type === 'meeting' || activity.type === 'follow_up') {
    title = activity.type === 'follow_up' ? 'Follow-up scheduled' : config.label;
    summary = cleanText(activity.subject) ?? cleanText(activity.description);
    if (activity.outcome) {
      detailSections.push({ type: 'note', label: 'Outcome', body: activity.outcome });
    }
  } else if (activity.type === 'email_sent' || activity.type === 'email_opened' || activity.type === 'email_clicked') {
    title = config.label;
    summary =
      cleanText(metadata?.subject) ??
      cleanText(metadata?.recipientEmail) ??
      cleanText(metadata?.clickedUrl) ??
      cleanText(activity.description);
  } else if (activity.type === 'planned' || activity.source === 'planned') {
    title = cleanText(activity.subject) ?? config.label;
    summary = cleanText(activity.description);
  }

  if (activity.outcome && !detailSections.some((section) => section.label === 'Outcome')) {
    detailSections.push({ type: 'note', label: 'Outcome', body: activity.outcome });
  }

  if (detailSections.length === 0 && activity.type !== 'updated') {
    const fullNotes = cleanText(metadata?.fullNotes);
    if (fullNotes && summary && fullNotes !== summary && fullNotes !== activity.description) {
      detailSections.push({ type: 'note', label: 'Details', body: fullNotes });
    }
  }

  if (activity.type !== 'updated') {
    const changeLines = getChangeLines(activity.changes);
    if (changeLines.length > 0) {
      detailSections.push({ type: 'list', label: 'Changes', items: changeLines });
    }
  }

  if (metadata?.scheduledDate && !activity.isCompleted) {
    factChips.push({ value: `Scheduled ${formatRelativeTime(metadata.scheduledDate)}` });
  } else if (activity.scheduledAt && !activity.isCompleted) {
    factChips.push({ value: `Scheduled ${formatRelativeTime(activity.scheduledAt)}` });
  }

  return {
    id: activity.id,
    kindLabel: config.label,
    sourceLabel: activity.source === 'audit' ? 'System' : 'Planned',
    title,
    summary,
    factChips,
    detailSections,
    status: activity.isOverdue ? 'overdue' : activity.isCompleted ? 'done' : activity.scheduledAt ? 'scheduled' : undefined,
    iconKey: config.icon,
    timestampLabel,
    actorLabel,
  };
}
