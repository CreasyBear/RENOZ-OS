import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatJobTemplateMutationError } from '@/hooks/jobs/_mutation-errors';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function compact(source: string): string {
  return source.replace(/\s+/g, '');
}

describe('job template settings contract', () => {
  it('formats job template mutation failures without leaking unsafe internals', () => {
    expect(
      formatJobTemplateMutationError(
        new Error('duplicate key violates job_templates_org_name_idx postgres stack'),
        'create'
      )
    ).toBe('Job template creation is temporarily unavailable. Please refresh and try again.');

    expect(
      formatJobTemplateMutationError(
        { statusCode: 403, code: 'PERMISSION_DENIED', message: 'raw auth detail' },
        'delete'
      )
    ).toBe('You do not have permission to manage job templates.');

    expect(
      formatJobTemplateMutationError(
        {
          statusCode: 400,
          errors: {
            name: ['Job template name is required'],
          },
        },
        'update'
      )
    ).toBe('Job template name is required');
  });

  it('keeps job template settings feedback, tenant writes, and cache spine reviewable', () => {
    const route = read('src/routes/_authenticated/settings/job-templates.tsx');
    const form = read('src/components/domain/jobs/templates/job-template-form-dialog.tsx');
    const list = read('src/components/domain/jobs/templates/job-template-list.tsx');
    const hooks = read('src/hooks/jobs/use-job-templates-config.ts');
    const jobsIndex = read('src/hooks/jobs/index.ts');
    const server = read('src/server/functions/jobs/job-templates.ts');
    const queryKeys = read('src/lib/query-keys.ts');
    const compactServer = compact(server);
    const compactQueryKeys = compact(queryKeys);

    expect(route).toContain("toast.error(formatJobTemplateMutationError(error, 'duplicate'))");
    expect(route).not.toContain('catch {');

    expect(form).toContain(
      "toast.error(formatJobTemplateMutationError(error, isEditMode ? 'update' : 'create'))"
    );
    expect(form).not.toContain('catch {');

    expect(list).toContain("toast.error(formatJobTemplateMutationError(error, 'delete'))");
    expect(list).not.toContain('catch {');

    expect(jobsIndex).toContain("formatJobTemplateMutationError");

    expect(hooks).toContain('queryKeys.jobTemplates.templates()');
    expect(hooks).toContain('queryKeys.jobTemplates.template(variables.templateId)');
    expect(compactQueryKeys).toContain('jobTemplates:{');
    expect(compactQueryKeys).toContain("templates:()=>[...queryKeys.jobTemplates.all,'list']");
    expect(compactQueryKeys).toContain(
      "template:(templateId:string)=>[...queryKeys.jobTemplates.all,'detail',templateId]"
    );

    expect(server).toContain('await verifyTemplateAccess(data.templateId, ctx.organizationId)');
    expect(compactServer).toContain(
      'where(and(eq(jobTemplates.id,data.templateId),eq(jobTemplates.organizationId,ctx.organizationId)))'
    );
    expect(compactServer).not.toContain(
      '.where(eq(jobTemplates.id,data.templateId)).returning()'
    );
    expect(compactServer).not.toContain('.where(eq(jobTemplates.id,data.templateId));');
  });
});
