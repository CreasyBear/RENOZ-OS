import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import tsrConfig from '../../../tsr.config.json';

describe('route ignore pattern', () => {
  const routeIgnorePattern = new RegExp(tsrConfig.routeFileIgnorePattern);
  const appConfig = readFileSync(join(process.cwd(), 'app.config.ts'), 'utf8');

  it('ignores sorting helpers under src/routes', () => {
    expect(routeIgnorePattern.test('user-sorting.ts')).toBe(true);
  });

  it('ignores route-local error and action helper files', () => {
    expect(routeIgnorePattern.test('alert-error-messages.ts')).toBe(true);
    expect(routeIgnorePattern.test('inventory-browser-error-messages.ts')).toBe(true);
    expect(routeIgnorePattern.test('mobile-warehouse-action-errors.ts')).toBe(true);
  });

  it('keeps React Start route config aligned with helper suffixes', () => {
    expect(appConfig).toContain('error-messages|action-errors');
  });

  it('ignores non-Route API handler basenames that trigger build noise', () => {
    expect(routeIgnorePattern.test('chat.ts')).toBe(true);
    expect(routeIgnorePattern.test('approvals.$approvalId.ts')).toBe(true);
  });

  it('does not ignore real index routes by basename', () => {
    expect(routeIgnorePattern.test('index.ts')).toBe(false);
  });
});
