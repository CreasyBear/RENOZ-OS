import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('jobs component barrel boundary', () => {
  it('keeps active routes on explicit jobs component modules', () => {
    const myTasksPage = read('src/routes/_authenticated/my-tasks/my-tasks-page.tsx');
    const scheduleIndex = read('src/routes/_authenticated/schedule/index.tsx');
    const scheduleCalendar = read('src/routes/_authenticated/schedule/calendar.tsx');
    const scheduleTimeline = read('src/routes/_authenticated/schedule/timeline.tsx');

    expect(existsSync(join(root, 'src/components/domain/jobs/index.ts'))).toBe(false);

    expect(myTasksPage).toContain("from '@/components/domain/jobs/technician'");
    expect(scheduleIndex).toContain("from '@/components/domain/jobs/schedule'");
    expect(scheduleCalendar).toContain("from '@/components/domain/jobs/schedule'");
    expect(scheduleTimeline).toContain("from '@/components/domain/jobs/schedule'");

    for (const source of [myTasksPage, scheduleIndex, scheduleCalendar, scheduleTimeline]) {
      expect(source).not.toContain("from '@/components/domain/jobs';");
      expect(source).not.toContain('from "@/components/domain/jobs";');
    }
  });
});
