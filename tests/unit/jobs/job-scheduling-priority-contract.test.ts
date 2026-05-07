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

describe('job scheduling priority contract', () => {
  it('does not expose invented priority values for job scheduling DTOs', () => {
    const timelineServer = read('src/server/functions/jobs/job-timeline.ts');
    const calendarServer = read('src/server/functions/jobs/job-calendar.ts');
    const timelineSchema = read('src/lib/schemas/jobs/job-timeline.ts');
    const calendarSchema = read('src/lib/schemas/jobs/job-calendar.ts');
    const viewModelMappers = read('src/lib/jobs/job-view-model-mappers.ts');
    const combinedSchedulingSource = `${timelineServer}\n${calendarServer}\n${viewModelMappers}`;

    expect(combinedSchedulingSource).not.toContain("priority: 'medium'");
    expect(combinedSchedulingSource).not.toContain("priority: model.priority ?? 'medium'");
    expect(combinedSchedulingSource).not.toContain('priority field to jobAssignments');
    expect(combinedSchedulingSource).not.toContain("field doesn't exist on jobAssignments");
    expect(compact(timelineSchema)).not.toContain("priority:'low'|'medium'|'high'");
    expect(compact(calendarSchema)).not.toContain("priority:'low'|'medium'|'high'");
  });
});
