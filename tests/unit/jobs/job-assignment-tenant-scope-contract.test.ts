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

describe('job assignment tenant scope contract', () => {
  it('validates create relations and uses tenant-aware relation joins', () => {
    const server = read('src/server/functions/jobs/job-assignments.ts');
    const compactServer = compact(server);
    const createBlock = compact(
      sliceBetween(server, 'export const createJobAssignment =', 'const _getJobAssignmentCached')
    );

    expect(server).toContain('ValidationError');
    expect(server).toContain('isNull');
    expect(server).toContain('function jobInstallerJoinCondition');
    expect(server).toContain('function jobCustomerJoinCondition');
    expect(server).toContain('async function assertJobAssignmentCreateRelations');
    expect(compactServer).toContain(
      'eq(customers.id,customerId),eq(customers.organizationId,organizationId),isNull(customers.deletedAt)'
    );
    expect(compactServer).toContain(
      'eq(users.id,installerId),eq(users.organizationId,organizationId),isNull(users.deletedAt)'
    );
    expect(compactServer).toContain(
      "thrownewValidationError('Customernotfound',{customerId:['Customerdoesnotexistorisnotaccessible'],})"
    );
    expect(compactServer).toContain(
      "thrownewValidationError('Installernotfound',{installerId:['Installerdoesnotexistorisnotaccessible'],})"
    );
    expect(createBlock).toContain(
      'awaitassertJobAssignmentCreateRelations(data.customerId,data.installerId,ctx.organizationId);'
    );
    expect(createBlock.indexOf('awaitassertJobAssignmentCreateRelations')).toBeLessThan(
      createBlock.indexOf('constjobNumber=')
    );
    expect(createBlock.indexOf('awaitassertJobAssignmentCreateRelations')).toBeLessThan(
      createBlock.indexOf('.insert(jobAssignments)')
    );
    expect(compactServer).toContain(
      'eq(users.organizationId,jobAssignments.organizationId),isNull(users.deletedAt)'
    );
    expect(compactServer).toContain(
      'eq(customers.organizationId,jobAssignments.organizationId),isNull(customers.deletedAt)'
    );
    expect(compactServer).toContain('.innerJoin(users,jobInstallerJoinCondition())');
    expect(compactServer).toContain('.innerJoin(customers,jobCustomerJoinCondition())');
  });

  it('does not trust caller organization IDs for assignment mutations or photo writes', () => {
    const server = read('src/server/functions/jobs/job-assignments.ts');
    const compactServer = compact(server);

    expect(compactServer).toContain(
      "if(organizationId!==ctx.organizationId){thrownewNotFoundError('Jobassignmentnotfound','jobAssignment');}"
    );
    expect(compactServer).not.toContain('eq(jobAssignments.organizationId,data.organizationId)');
    expect(compactServer).toContain('eq(jobAssignments.organizationId,ctx.organizationId)');
    expect(compactServer).toContain('organizationId:ctx.organizationId');
    expect(compactServer).not.toContain('organizationId:data.organizationId');
    expect(compactServer).toContain(
      'where(and(eq(jobAssignments.id,data.jobAssignmentId),eq(jobAssignments.organizationId,ctx.organizationId)))'
    );
    expect(compactServer).toContain(
      "if(!jobAssignment){thrownewNotFoundError('Jobassignmentnotfound','jobAssignment');}"
    );
    expect(compactServer).toContain('eq(jobPhotos.organizationId,ctx.organizationId)');
  });
});
