type NoteMetadataLike = {
  fullNotes?: unknown;
  contentPreview?: unknown;
  noteTitle?: unknown;
  noteImportance?: unknown;
  logType?: unknown;
  customFields?: Record<string, unknown> | null | undefined;
} | null | undefined;

type AuditNoteLike = {
  action?: string | null;
  type?: string | null;
  description?: string | null;
  metadata?: NoteMetadataLike;
};

export interface AuditNotePresentation {
  title?: string;
  preview?: string;
  fullBody?: string;
  category?: string;
  importance?: string;
}

function cleanText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function truncateText(value: string, maxLength = 160): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}

function getCustomField(metadata: NoteMetadataLike, key: string): string | undefined {
  return cleanText(metadata?.customFields?.[key]);
}

export function readAuditNote(activity: AuditNoteLike): AuditNotePresentation | null {
  const isAuditNote = activity.action === 'note_added' || activity.type === 'note_added';
  if (!isAuditNote) return null;

  const metadata = activity.metadata;
  const title = cleanText(metadata?.noteTitle) ?? getCustomField(metadata, 'noteTitle');
  const fullBody = cleanText(metadata?.fullNotes) ?? cleanText(activity.description);
  const preview =
    cleanText(metadata?.contentPreview) ??
    (fullBody ? truncateText(fullBody) : cleanText(activity.description));
  const category = cleanText(metadata?.logType);
  const importance =
    cleanText(metadata?.noteImportance) ?? getCustomField(metadata, 'noteImportance');

  return {
    title,
    preview,
    fullBody,
    category: category === 'note' ? undefined : category,
    importance,
  };
}
