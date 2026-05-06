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

describe('jobs checklist server tenant scope contract', () => {
  it('keeps final checklist writes and read-model joins inside the organization boundary', () => {
    const server = read('src/server/functions/jobs/checklists.ts');
    const hooks = read('src/hooks/jobs/use-job-templates-config.ts');
    const queryKeys = read('src/lib/query-keys.ts');
    const source = compact(server);
    const compactHooks = compact(hooks);
    const compactQueryKeys = compact(queryKeys);

    expect(source).toContain(
      'update(checklistTemplates).set(updateData).where(and(eq(checklistTemplates.id,data.templateId),eq(checklistTemplates.organizationId,ctx.organizationId))).returning()'
    );
    expect(source).toContain(
      'update(checklistTemplates).set({isActive:false,updatedAt:newDate(),updatedBy:ctx.user.id,version:sql`${checklistTemplates.version}+1`,}).where(and(eq(checklistTemplates.id,data.templateId),eq(checklistTemplates.organizationId,ctx.organizationId)))'
    );
    expect(source).toContain(
      'update(jobChecklistItems).set(updateData).where(and(eq(jobChecklistItems.id,data.itemId),eq(jobChecklistItems.organizationId,ctx.organizationId))).returning()'
    );
    expect(source).toContain(
      'where(and(eq(users.id,updated.completedBy),eq(users.organizationId,ctx.organizationId)))'
    );
    expect(source).toContain(
      'leftJoin(users,and(eq(jobChecklistItems.completedBy,users.id),eq(users.organizationId,organizationId)))'
    );
    expect(source).toContain(
      'where(and(eq(jobChecklistItems.checklistId,checklistId),eq(jobChecklistItems.organizationId,organizationId)))'
    );
    expect(source).toContain(
      'leftJoin(users,and(eq(jobChecklistItems.completedBy,users.id),eq(users.organizationId,ctx.organizationId)))'
    );

    expect(source).not.toContain(
      'update(checklistTemplates).set(updateData).where(eq(checklistTemplates.id,data.templateId)).returning()'
    );
    expect(source).not.toContain(
      'update(jobChecklistItems).set(updateData).where(eq(jobChecklistItems.id,data.itemId)).returning()'
    );
    expect(source).not.toContain('where(eq(jobChecklistItems.checklistId,checklistId))');
    expect(source).not.toContain('leftJoin(users,eq(jobChecklistItems.completedBy,users.id))');

    expect(compactHooks).toContain('queryKey:queryKeys.checklists.jobChecklist(input.jobId)');
    expect(compactHooks).toContain('queryKey:queryKeys.checklists.item(input.itemId)');
    expect(compactHooks).toContain('queryKey:queryKeys.checklists.jobChecklist(jobId)');
    expect(compactHooks).toContain('queryKey:queryKeys.checklists.item(variables.itemId)');
    expect(compactQueryKeys).toContain(
      "jobChecklist:(jobId:string)=>[...queryKeys.checklists.all,'job',jobId]"
    );
    expect(compactQueryKeys).toContain(
      "item:(itemId:string)=>[...queryKeys.checklists.all,'item',itemId]"
    );
  });
});
