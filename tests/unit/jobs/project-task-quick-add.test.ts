import { describe, expect, it } from 'vitest';

import { getDefaultProjectTaskSiteVisitId } from '@/components/domain/jobs/projects/project-task-quick-add-default';

describe('project task quick add helpers', () => {
  it('selects the only site visit as the quick-add default', () => {
    expect(getDefaultProjectTaskSiteVisitId([{ id: 'visit-1' }])).toBe('visit-1');
  });

  it('keeps the existing first-visit fallback when multiple site visits exist', () => {
    expect(
      getDefaultProjectTaskSiteVisitId([
        { id: 'visit-1' },
        { id: 'visit-2' },
      ])
    ).toBe('visit-1');
  });

  it('returns undefined when no site visit can back quick-add creation', () => {
    expect(getDefaultProjectTaskSiteVisitId([])).toBeUndefined();
  });
});
