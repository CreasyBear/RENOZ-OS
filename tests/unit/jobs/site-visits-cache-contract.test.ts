import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function compact(source: string): string {
  return source.replace(/\s+/g, '');
}

describe('site visits cache contract', () => {
  it('keeps site visit mutation refreshes inside narrow query-key families', () => {
    const queryKeys = read('src/lib/query-keys.ts');
    const hooks = read('src/hooks/jobs/use-site-visits.ts');
    const scheduleContainer = read(
      'src/components/domain/jobs/schedule/schedule-calendar-container.tsx'
    );

    const compactQueryKeys = compact(queryKeys);
    const compactHooks = compact(hooks);
    const compactScheduleContainer = compact(scheduleContainer);

    expect(compactQueryKeys).toContain(
      "byInstallers:()=>[...queryKeys.siteVisits.all,'byInstaller']asconst"
    );
    expect(compactQueryKeys).toContain(
      "schedules:()=>[...queryKeys.siteVisits.all,'schedule']asconst"
    );
    expect(compactHooks).toContain('queryKeys.siteVisits.byInstallers()');
    expect(compactHooks).toContain('queryKeys.siteVisits.schedules()');
    expect(compactHooks).toContain('queryKeys.siteVisits.pastDue()');
    expect(compactHooks).toContain('queryKeys.siteVisits.myVisits()');

    expect(hooks).not.toContain('queryKey: queryKeys.siteVisits.all');
    expect(scheduleContainer).not.toContain('queryKeys.siteVisits.all');
    expect(compactScheduleContainer).toContain(
      'queryKeys.siteVisits.schedule(dateFrom,dateTo)'
    );
    expect(compactScheduleContainer).toContain('queryKeys.siteVisits.pastDue()');
  });
});
