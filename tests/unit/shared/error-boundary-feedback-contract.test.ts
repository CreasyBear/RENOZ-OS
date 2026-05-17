import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { formatErrorBoundaryFeedback } from '@/lib/error-boundary-feedback';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

const boundaryFiles = [
  'src/components/auth/auth-error-boundary.tsx',
  'src/components/shared/kanban/kanban-error-boundary.tsx',
  'src/components/domain/communications/communications-error-boundary.tsx',
  'src/components/domain/users/profile-error-boundary.tsx',
  'src/components/domain/orders/fulfillment/fulfillment-error-boundary.tsx',
  'src/components/error/supplier-error-boundary.tsx',
] as const;

describe('error boundary feedback contract', () => {
  it('sanitizes unsafe boundary diagnostics before rendering them', () => {
    expect(
      formatErrorBoundaryFeedback(
        new Error('duplicate key violates supplier_pkey postgres stack at render()'),
        'This screen failed to render. Retry or check the application logs.'
      )
    ).toBe('This screen failed to render. Retry or check the application logs.');
  });

  it('routes shared/domain error boundaries through the feedback formatter', () => {
    for (const file of boundaryFiles) {
      const source = read(file);

      expect(source).toContain('formatErrorBoundaryFeedback');
      expect(source).not.toContain('this.state.error.message');
    }
  });
});
