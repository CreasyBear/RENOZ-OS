import type { ActivityMetadata, LogEntityActivityInput } from '@/lib/schemas/activities';

const NOTE_PREVIEW_LIMIT = 160;
const ACTIVITY_PREVIEW_LIMIT = 100;

function cleanText(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function truncateText(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}

function formatActivityTypeLabel(activityType: LogEntityActivityInput['activityType']): string {
  if (activityType === 'follow_up') return 'Follow-up';
  return activityType.charAt(0).toUpperCase() + activityType.slice(1).replace('_', ' ');
}

export interface ManualActivityLogPresentation {
  action: 'call_logged' | 'note_added';
  description: string;
  metadata: ActivityMetadata;
}

export function buildManualActivityLogPresentation(
  input: Pick<
    LogEntityActivityInput,
    'activityType' | 'description' | 'title' | 'body' | 'category' | 'importance' | 'outcome' | 'scheduledAt' | 'isFollowUp'
  >
): ManualActivityLogPresentation {
  const activityType = input.activityType;
  const title = cleanText(input.title);
  const description = cleanText(input.description) ?? '';
  const body = cleanText(input.body);
  const content = body ?? description;
  const contentPreview = truncateText(content, NOTE_PREVIEW_LIMIT);

  const metadata: ActivityMetadata = {
    logType: activityType === 'note' ? cleanText(input.category) ?? 'note' : activityType,
    fullNotes: content,
  };

  if (activityType === 'note') {
    metadata.contentPreview = contentPreview;
  }

  if (activityType === 'note' && title) {
    metadata.noteTitle = title;
    metadata.customFields = {
      ...(metadata.customFields ?? {}),
      noteTitle: title,
    };
  }

  const importance = cleanText(input.importance);
  if (activityType === 'note' && importance) {
    metadata.noteImportance = importance;
    metadata.customFields = {
      ...(metadata.customFields ?? {}),
      noteImportance: importance,
    };
  }

  const outcome = cleanText(input.outcome);
  if (outcome) {
    metadata.notes = outcome;
  }

  if (input.scheduledAt) {
    metadata.scheduledDate = input.scheduledAt.toISOString();
  }

  if (input.isFollowUp) {
    metadata.reason = 'follow_up';
  }

  if (activityType === 'note') {
    return {
      action: 'note_added',
      description: contentPreview,
      metadata,
    };
  }

  return {
    action: activityType === 'call' ? 'call_logged' : 'note_added',
    description: `${formatActivityTypeLabel(activityType)}: ${truncateText(content, ACTIVITY_PREVIEW_LIMIT)}`,
    metadata,
  };
}
