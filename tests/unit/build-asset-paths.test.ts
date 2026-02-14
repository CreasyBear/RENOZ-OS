import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Sanity check: Vite base must be '/' so asset URLs are absolute and resolvable
 * from any route (e.g. /login). Prevents chunk 404s when HTML references
 * relative paths that resolve incorrectly.
 */
describe('build asset path config', () => {
  it('vite config has base set to /', () => {
    const configPath = join(process.cwd(), 'vite.config.ts');
    const content = readFileSync(configPath, 'utf-8');
    expect(content).toMatch(/base:\s*['"]\/['"]/);
  });
});
