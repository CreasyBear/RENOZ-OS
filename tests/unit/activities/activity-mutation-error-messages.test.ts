import { describe, expect, it } from 'vitest';
import {
  ACTIVITY_MUTATION_MESSAGES,
  formatActivityMutationError,
} from '@/lib/activities/mutation-error-messages';

describe('activity mutation error messages', () => {
  it('uses operator-safe field validation messages', () => {
    expect(
      formatActivityMutationError(
        {
          statusCode: 400,
          errors: {
            description: ['Activity description is required.'],
          },
        },
        'logEntity'
      )
    ).toBe('Activity description is required.');
  });

  it('maps known activity authorization and not-found codes', () => {
    expect(
      formatActivityMutationError({ statusCode: 404, code: 'NOT_FOUND' }, 'logEntity')
    ).toBe('Activity target could not be found. Refresh and try again.');

    expect(
      formatActivityMutationError(
        { statusCode: 403, code: 'PERMISSION_DENIED' },
        'logEntity'
      )
    ).toBe('You do not have permission to log activity for this record.');
  });

  it('suppresses unsafe infrastructure messages', () => {
    expect(
      formatActivityMutationError(
        new Error('duplicate key value violates unique constraint activity_audit_pkey'),
        'logEntity'
      )
    ).toBe(ACTIVITY_MUTATION_MESSAGES.logEntity);
  });
});
