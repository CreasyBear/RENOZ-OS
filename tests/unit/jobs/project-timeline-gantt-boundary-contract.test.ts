import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('project timeline gantt boundary contract', () => {
  it('keeps timeline config and date helpers out of the presenter', () => {
    const gantt = read('src/components/domain/jobs/projects/project-timeline-gantt.tsx');
    const config = read('src/components/domain/jobs/projects/project-timeline-gantt-config.ts');

    expect(gantt).toContain("from './project-timeline-gantt-config';");
    expect(gantt).toContain('TIMELINE_STATUS_CONFIG[task.status]');
    expect(gantt).toContain('getTimelineDates(viewStart, viewMode)');
    expect(gantt).toContain('formatTimelineTaskDates(task.startDate, task.endDate)');
    expect(gantt).not.toContain('const VIEW_MODE_CONFIG');
    expect(gantt).not.toContain('const STATUS_CONFIG');
    expect(gantt).not.toContain('function getDates');
    expect(gantt).not.toContain('function formatTaskDates');
    expect(gantt).not.toContain('const NAME_COLUMN_WIDTH');
    expect(gantt).not.toContain('const ROW_HEIGHT');

    expect(config).toContain('export type TimelineStatus');
    expect(config).toContain('export type ViewMode');
    expect(config).toContain('export const VIEW_MODE_CONFIG');
    expect(config).toContain('export const TIMELINE_STATUS_CONFIG');
    expect(config).toContain('export const NAME_COLUMN_WIDTH');
    expect(config).toContain('export const ROW_HEIGHT');
    expect(config).toContain('export function getTimelineDates');
    expect(config).toContain('export function formatTimelineTaskDates');
  });
});
