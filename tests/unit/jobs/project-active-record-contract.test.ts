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

function sliceBetween(source: string, start: string, end: string): string {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);

  expect(startIndex).toBeGreaterThanOrEqual(0);
  expect(endIndex).toBeGreaterThan(startIndex);

  return source.slice(startIndex, endIndex);
}

describe('project active-record contract', () => {
  it('keeps normal project reads and non-delete writes scoped to non-deleted projects', () => {
    const server = read('src/server/functions/projects.ts');

    const getProjectsBlock = compact(
      sliceBetween(server, 'export const getProjects =', 'export const getProjectsCursor =')
    );
    const getProjectsCursorBlock = compact(
      sliceBetween(server, 'export const getProjectsCursor =', 'export const getProject =')
    );
    const getProjectBlock = compact(
      sliceBetween(server, 'export const getProject =', 'export const createProject =')
    );
    const updateProjectBlock = compact(
      sliceBetween(server, 'export const updateProject =', 'export const deleteProject =')
    );
    const completeProjectBlock = compact(
      sliceBetween(server, 'export const completeProject =', '// ============================================================================\n// UTILITIES')
    );

    expect(getProjectsBlock).toContain(
      'constconditions=[eq(projects.organizationId,ctx.organizationId),isNull(projects.deletedAt),];'
    );
    expect(getProjectsCursorBlock).toContain(
      'constconditions=[eq(projects.organizationId,ctx.organizationId),isNull(projects.deletedAt),];'
    );
    expect(getProjectBlock).toContain(
      'where:and(eq(projects.id,data.projectId),eq(projects.organizationId,ctx.organizationId),isNull(projects.deletedAt)),'
    );
    expect(updateProjectBlock).toContain(
      'where:and(eq(projects.id,projectId),eq(projects.organizationId,ctx.organizationId),isNull(projects.deletedAt)),'
    );
    expect(updateProjectBlock).toContain(
      '.where(and(eq(projects.id,projectId),eq(projects.organizationId,ctx.organizationId),isNull(projects.deletedAt)))'
    );
    expect(completeProjectBlock).toContain(
      'where:and(eq(projects.id,data.projectId),eq(projects.organizationId,ctx.organizationId),isNull(projects.deletedAt)),'
    );
    expect(completeProjectBlock).toContain(
      '.where(and(eq(projects.id,data.projectId),eq(projects.organizationId,ctx.organizationId),isNull(projects.deletedAt)))'
    );

    expect(getProjectsBlock).not.toContain(
      'constconditions=[eq(projects.organizationId,ctx.organizationId)];'
    );
    expect(getProjectsCursorBlock).not.toContain(
      'constconditions=[eq(projects.organizationId,ctx.organizationId)];'
    );
  });
});
