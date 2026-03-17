import type { ActivityExportRequest, ActivityWithUser } from '@/lib/schemas/activities';

export const MAX_ACTIVITY_EXPORT_ROWS = 10000;
export const MAX_ACTIVITY_PDF_EXPORT_ROWS = 500;

export type ActivityExportFilters = {
  entityType?: ActivityExportRequest['entityType'];
  entityId?: string;
  action?: ActivityExportRequest['action'];
  userId?: string;
  dateFrom?: Date;
  dateTo?: Date;
};

export function escapeCsvCell(value: unknown): string {
  const normalized =
    value == null
      ? ''
      : typeof value === 'string'
        ? value
        : JSON.stringify(value);
  return `"${normalized.replace(/"/g, '""')}"`;
}

export function formatActivityExportFilename(format: 'csv' | 'json' | 'pdf') {
  const datePart = new Date().toISOString().split('T')[0];
  return `activity-export-${datePart}.${format}`;
}

export function buildFilterSummary(filters: ActivityExportFilters): string[] {
  const summary: string[] = [];
  if (filters.entityType) summary.push(`Entity type: ${filters.entityType}`);
  if (filters.entityId) summary.push(`Entity ID: ${filters.entityId}`);
  if (filters.action) summary.push(`Action: ${filters.action}`);
  if (filters.userId) summary.push(`User ID: ${filters.userId}`);
  if (filters.dateFrom) summary.push(`Date from: ${filters.dateFrom.toISOString().split('T')[0]}`);
  if (filters.dateTo) summary.push(`Date to: ${filters.dateTo.toISOString().split('T')[0]}`);
  return summary.length > 0 ? summary : ['No filters applied'];
}

export function buildActivityExportCsv(items: ActivityWithUser[]): string {
  const header = [
    'id',
    'createdAt',
    'entityType',
    'entityId',
    'entityName',
    'action',
    'description',
    'source',
    'userId',
    'userName',
    'userEmail',
    'metadata',
    'changes',
  ];

  const rows = items.map((item) =>
    [
      item.id,
      item.createdAt.toISOString(),
      item.entityType,
      item.entityId,
      item.entityName ?? '',
      item.action,
      item.description ?? '',
      item.source,
      item.user?.id ?? '',
      item.user?.name ?? '',
      item.user?.email ?? '',
      item.metadata ?? null,
      item.changes ?? null,
    ]
      .map(escapeCsvCell)
      .join(',')
  );

  return [header.join(','), ...rows].join('\n');
}

export function bufferToArrayBuffer(buffer: Uint8Array): ArrayBuffer {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}
