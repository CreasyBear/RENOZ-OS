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

describe('project numbering contract', () => {
  it('retries generated project number conflicts without changing project create semantics', () => {
    const server = read('src/server/functions/projects.ts');
    const compactServer = compact(server);
    const createHandlerBlock = compact(
      sliceBetween(server, 'export const createProject =', 'async function createProjectWithUniqueNumber')
    );
    const uniqueNumberBlock = compact(
      sliceBetween(server, 'async function createProjectWithUniqueNumber', '/**\n * Update a project')
    );
    const numberingBlock = compact(
      sliceBetween(server, 'async function generateProjectNumber', 'return `${prefix}-${nextSeq.toString().padStart(4, "0")}`;')
    );

    expect(server).toContain('ConflictError');
    expect(server).toContain('const MAX_PROJECT_NUMBER_RETRIES = 5');
    expect(server).toContain('function isUniqueViolation');
    expect(compactServer).toContain('(erroras{code?:unknown}).code==="23505"');

    expect(createHandlerBlock).toContain('awaitassertProjectCustomerScope');
    expect(createHandlerBlock).toContain('constproject=awaitcreateProjectWithUniqueNumber(data,ctx);');
    expect(createHandlerBlock).not.toContain('db.transaction(async(tx)');

    expect(uniqueNumberBlock).toContain(
      'for(letattempt=0;attempt<MAX_PROJECT_NUMBER_RETRIES;attempt++){constprojectNumber=awaitgenerateProjectNumber(ctx.organizationId,attempt);'
    );
    expect(uniqueNumberBlock).toContain('returnawaitdb.transaction(async(tx)=>');
    expect(uniqueNumberBlock).toContain('insert(projects)');
    expect(uniqueNumberBlock).toContain('insert(projectMembers)');
    expect(uniqueNumberBlock).toContain('if(isUniqueViolation(error)){continue;}');
    expect(uniqueNumberBlock).toContain(
      'thrownewConflictError("Projectnumberalreadyexists.Pleaseretryprojectcreation.");'
    );

    expect(numberingBlock).toContain('attemptOffset=0');
    expect(numberingBlock).toContain('constnextSeq=lastSeq+1+attemptOffset;');
  });
});
