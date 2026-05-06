import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  formatCustomerMutationError,
  formatCustomerSavedFilterMutationError,
} from '@/hooks/customers/_mutation-errors';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('customer mutation error formatting', () => {
  it('maps known customer mutation codes and validation fields', () => {
    expect(
      formatCustomerMutationError(
        { statusCode: 404, code: 'NOT_FOUND' },
        'Unable to update customer.'
      )
    ).toBe('The customer could not be found. Refresh and try again.');

    expect(
      formatCustomerMutationError(
        {
          statusCode: 400,
          errors: {
            email: ['Email is already in use.'],
          },
        },
        'Unable to update customer.'
      )
    ).toBe('Email is already in use.');
  });

  it('keeps safe customer validation messages without leaking infrastructure details', () => {
    expect(
      formatCustomerMutationError(
        new Error('A customer with this email already exists. Use a different email.'),
        'Unable to update customer.'
      )
    ).toBe('A customer with this email already exists. Use a different email.');

    expect(
      formatCustomerMutationError(
        new Error('duplicate key value violates unique constraint customers_email_unique'),
        'Unable to update customer.'
      )
    ).toBe('Unable to update customer.');
  });

  it('uses saved-filter-specific fallbacks and code copy', () => {
    expect(
      formatCustomerSavedFilterMutationError(
        { statusCode: 404, code: 'NOT_FOUND' },
        'update'
      )
    ).toBe('The saved customer filter could not be found. Refresh and try again.');

    expect(
      formatCustomerSavedFilterMutationError(
        new Error('duplicate key value violates unique constraint user_preferences_key_unique'),
        'save'
      )
    ).toBe('Unable to save customer filter.');

    expect(
      formatCustomerSavedFilterMutationError(
        new Error('A saved filter named "Active Dealers" already exists'),
        'save'
      )
    ).toBe('A saved filter named "Active Dealers" already exists');
  });

  it('keeps customer list mutation feedback on the formatter contract', () => {
    const list = read('src/components/domain/customers/customers-list-container.tsx');
    const detail = read('src/hooks/customers/use-customer-detail.ts');
    const hierarchy = read('src/components/domain/customers/containers/customer-hierarchy-container.tsx');
    const savedFilters = read('src/hooks/customers/use-saved-filters.ts');
    const index = read('src/hooks/customers/index.ts');

    expect(index).toContain("export { formatCustomerMutationError } from './_mutation-errors';");
    expect(list).toContain('formatCustomerMutationError(error, "Unable to delete customer.")');
    expect(list).toContain('formatCustomerMutationError(error, "Unable to update customer status.")');
    expect(list).toContain('formatCustomerMutationError(error, "Unable to assign customer tags.")');
    expect(list).toContain('formatCustomerMutationError(error, "Unable to update customer health score.")');
    expect(list).toContain('formatCustomerMutationError(error, "Unable to delete selected customers.")');

    expect(list).not.toContain('error instanceof Error && error.message');
    expect(list).not.toContain('error instanceof Error ? error.message : "Failed to update status"');
    expect(list).not.toContain('error instanceof Error ? error.message : "Failed to assign tags"');
    expect(list).not.toContain('error instanceof Error ? error.message : "Failed to update health score"');
    expect(list).not.toContain('error instanceof Error ? error.message : "Failed to delete customers"');

    expect(detail).toContain("formatCustomerMutationError(error, 'Unable to delete customer.')");
    expect(detail).not.toContain('error instanceof Error && error.message');
    expect(detail).not.toContain("'Failed to delete customer'");

    expect(hierarchy).toContain('formatCustomerMutationError(');
    expect(hierarchy).toContain("'Unable to set customer parent.'");
    expect(hierarchy).toContain("'Unable to remove customer parent.'");
    expect(hierarchy).not.toContain('error instanceof Error ? error.message');
    expect(hierarchy).not.toContain('Failed to ${action}');

    expect(savedFilters).toContain("formatCustomerSavedFilterMutationError(error, 'save')");
    expect(savedFilters).toContain("formatCustomerSavedFilterMutationError(error, 'update')");
    expect(savedFilters).toContain("formatCustomerSavedFilterMutationError(error, 'delete')");
    expect(savedFilters).not.toContain('error.message ||');
    expect(savedFilters).not.toContain("'Failed to save filter'");
    expect(savedFilters).not.toContain("'Failed to update filter'");
    expect(savedFilters).not.toContain("'Failed to delete filter'");
  });
});
