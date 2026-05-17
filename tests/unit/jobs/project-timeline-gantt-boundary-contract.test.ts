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
    const mobileCards = read('src/components/domain/jobs/projects/project-timeline-gantt-mobile-cards.tsx');
    const taskBar = read('src/components/domain/jobs/projects/project-timeline-gantt-task-bar.tsx');

    expect(gantt).toContain("from './project-timeline-gantt-config';");
    expect(gantt).toContain("from './project-timeline-gantt-mobile-cards';");
    expect(gantt).toContain("from './project-timeline-gantt-task-bar';");
    expect(gantt).toContain('<ProjectTimelineGanttMobileCards');
    expect(gantt).toContain('<ProjectTimelineGanttTaskBar');
    expect(gantt).toContain('TIMELINE_STATUS_CONFIG[task.status]');
    expect(gantt).toContain('getTimelineDates(viewStart, viewMode)');
    expect(gantt).toContain('formatTimelineTaskDates(task.startDate, task.endDate)');
    expect(gantt).not.toContain('function MobileGanttCardList');
    expect(gantt).not.toContain('differenceInDays');
    expect(gantt).not.toContain('function TaskBar');
    expect(gantt).not.toContain('handlePointerDown');
    expect(gantt).not.toContain('dragKind');
    expect(gantt).not.toContain('differenceInCalendarDays');
    expect(gantt).not.toContain('const VIEW_MODE_CONFIG');
    expect(gantt).not.toContain('const STATUS_CONFIG');
    expect(gantt).not.toContain('function getDates');
    expect(gantt).not.toContain('function formatTaskDates');
    expect(gantt).not.toContain('const NAME_COLUMN_WIDTH');
    expect(gantt).not.toContain('const ROW_HEIGHT');

    expect(taskBar).toContain('export interface ProjectTimelineGanttTaskBarProps');
    expect(taskBar).toContain('export function ProjectTimelineGanttTaskBar');
    expect(taskBar).toContain('handlePointerDown');
    expect(taskBar).toContain("setDragKind(kind)");
    expect(taskBar).toContain('differenceInCalendarDays(task.startDate, viewStart)');
    expect(taskBar).toContain('TIMELINE_STATUS_CONFIG[task.status]');
    expect(taskBar).not.toContain('VIEW_MODE_CONFIG');
    expect(taskBar).not.toContain('MobileGanttCardList');

    expect(mobileCards).toContain('export interface ProjectTimelineGanttMobileCardsProps');
    expect(mobileCards).toContain('export function ProjectTimelineGanttMobileCards');
    expect(mobileCards).toContain('differenceInDays(task.endDate, task.startDate) + 1');
    expect(mobileCards).toContain('TIMELINE_STATUS_CONFIG[task.status]');
    expect(mobileCards).not.toContain('ProjectTimelineGanttTaskBar');
    expect(mobileCards).not.toContain('VIEW_MODE_CONFIG');

    expect(config).toContain('export type TimelineTask');
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
