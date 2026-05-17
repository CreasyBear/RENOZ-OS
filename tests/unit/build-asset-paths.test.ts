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

  it('keeps build warning filtering scoped to known dependency-only noise', () => {
    const configPath = join(process.cwd(), 'vite.config.ts');
    const content = readFileSync(configPath, 'utf-8');

    expect(content).toContain('isKnownDependencyBuildWarning');
    expect(content).toContain("warning.code === 'MODULE_LEVEL_DIRECTIVE'");
    expect(content).toContain('node_modules/');
    expect(content).toContain('imported from external module');
    expect(content).toContain('Generated an empty chunk: "_libs/');
    expect(content.match(/onwarn: warnUnlessKnownDependencyBuildWarning/g)).toHaveLength(2);
    expect(content).toContain('manualChunks: undefined');
    expect(content).not.toContain('chunkSizeWarningLimit');
  });
});
