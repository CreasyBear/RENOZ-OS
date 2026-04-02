import { describe, expect, it } from 'vitest';
import tsrConfig from '../../../tsr.config.json';

describe('route ignore pattern', () => {
  const routeIgnorePattern = new RegExp(tsrConfig.routeFileIgnorePattern);

  it('ignores sorting helpers under src/routes', () => {
    expect(routeIgnorePattern.test('user-sorting.ts')).toBe(true);
  });

  it('ignores non-Route API handler basenames that trigger build noise', () => {
    expect(routeIgnorePattern.test('chat.ts')).toBe(true);
    expect(routeIgnorePattern.test('approvals.$approvalId.ts')).toBe(true);
  });

  it('does not ignore real index routes by basename', () => {
    expect(routeIgnorePattern.test('index.ts')).toBe(false);
  });
});
