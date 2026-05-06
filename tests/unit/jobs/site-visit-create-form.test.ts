import { describe, expect, it } from 'vitest';
import {
  buildCreateSiteVisitInput,
  createProjectSiteVisitFormDefaults,
  createScheduleSiteVisitFormDefaults,
} from '@/components/domain/jobs/site-visits/site-visit-create-form';

describe('site visit create form helpers', () => {
  it('keeps project and schedule defaults aligned around current-user assignment', () => {
    const scheduledDate = new Date(2026, 4, 6, 10, 30);

    expect(createProjectSiteVisitFormDefaults()).toMatchObject({
      visitType: 'installation',
      scheduledTime: '',
      estimatedDuration: 120,
      installerId: 'current-user',
      notes: '',
    });

    expect(
      createScheduleSiteVisitFormDefaults({
        projectId: 'project-1',
        scheduledDate,
        scheduledTime: '09:30',
      })
    ).toEqual({
      projectId: 'project-1',
      visitType: 'installation',
      scheduledDate,
      scheduledTime: '09:30',
      estimatedDuration: 120,
      installerId: 'current-user',
      notes: '',
    });
  });

  it('builds the server create payload without leaking form-only fallback values', () => {
    const scheduledDate = new Date(2026, 4, 6, 10, 30);

    expect(
      buildCreateSiteVisitInput('project-1', {
        visitType: 'installation',
        scheduledDate,
        scheduledTime: '',
        estimatedDuration: null,
        installerId: 'current-user',
        notes: '',
      })
    ).toEqual({
      projectId: 'project-1',
      visitType: 'installation',
      scheduledDate: '2026-05-06',
      scheduledTime: undefined,
      estimatedDuration: undefined,
      installerId: undefined,
      notes: '',
    });

    expect(
      buildCreateSiteVisitInput('project-1', {
        visitType: 'service',
        scheduledDate,
        scheduledTime: '14:45',
        estimatedDuration: 180,
        installerId: '550e8400-e29b-41d4-a716-446655440000',
        notes: 'Bring commissioning notes.',
      })
    ).toMatchObject({
      scheduledTime: '14:45',
      estimatedDuration: 180,
      installerId: '550e8400-e29b-41d4-a716-446655440000',
      notes: 'Bring commissioning notes.',
    });
  });
});
