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

describe('project create relation scope contract', () => {
  it('validates customer and order tenant scope before inserting a project', () => {
    const server = read('src/server/functions/projects.ts');
    const compactServer = compact(server);
    const createProjectBlock = compact(
      sliceBetween(server, 'export const createProject =', 'export const updateProject =')
    );

    expect(server).toContain('customers');
    expect(server).toContain('orders');
    expect(server).toContain('ValidationError');
    expect(server).toContain('async function assertProjectCustomerScope');
    expect(server).toContain('async function assertProjectOrderScope');

    expect(compactServer).toContain(
      'select({id:customers.id}).from(customers).where(and(eq(customers.id,customerId),eq(customers.organizationId,organizationId),isNull(customers.deletedAt))).limit(1)'
    );
    expect(compactServer).toContain(
      'thrownewValidationError("Customernotfound",{customerId:["Customerdoesnotexistorisnotaccessible"],})'
    );
    expect(compactServer).toContain(
      'select({id:orders.id}).from(orders).where(and(eq(orders.id,orderId),eq(orders.customerId,customerId),eq(orders.organizationId,organizationId),isNull(orders.deletedAt))).limit(1)'
    );
    expect(compactServer).toContain(
      'thrownewValidationError("Ordernotfound",{orderId:["Orderdoesnotexistforthiscustomerorisnotaccessible"],})'
    );

    expect(createProjectBlock).toContain(
      'awaitassertProjectCustomerScope(data.customerId,ctx.organizationId);'
    );
    expect(createProjectBlock).toContain(
      'if(data.orderId){awaitassertProjectOrderScope(data.orderId,data.customerId,ctx.organizationId);}'
    );
    expect(createProjectBlock.indexOf('awaitassertProjectCustomerScope')).toBeLessThan(
      createProjectBlock.indexOf('constprojectNumber=awaitgenerateProjectNumber')
    );
    expect(createProjectBlock.indexOf('awaitassertProjectCustomerScope')).toBeLessThan(
      createProjectBlock.indexOf('insert(projects)')
    );
  });
});
