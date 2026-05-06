import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatProjectMutationError } from '@/hooks/jobs/_mutation-errors';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function compact(source: string): string {
  return source.replace(/\s+/g, '');
}

describe('project member mutation contract', () => {
  it('formats project member mutation failures without leaking unsafe internals', () => {
    expect(
      formatProjectMutationError(
        new Error('duplicate key violates idx_project_members_project_user postgres stack'),
        'addMember'
      )
    ).toBe('Project member assignment is temporarily unavailable. Please refresh and try again.');

    expect(
      formatProjectMutationError(
        { statusCode: 403, code: 'PERMISSION_DENIED', message: 'raw auth detail' },
        'removeMember'
      )
    ).toBe('You do not have permission to manage projects.');

    expect(
      formatProjectMutationError(
        {
          statusCode: 404,
          code: 'NOT_FOUND',
          message: 'raw missing user detail',
        },
        'addMember'
      )
    ).toBe('The project or team member could not be found. Refresh and try again.');
  });

  it('keeps project member mutations tenant-scoped, cache-safe, and operator-safe', () => {
    const server = read('src/server/functions/projects.ts');
    const hooks = read('src/hooks/jobs/use-projects.ts');
    const jobsIndex = read('src/hooks/jobs/index.ts');
    const compactServer = compact(server);
    const compactHooks = compact(hooks);
    const addMemberHook = compactHooks.slice(
      compactHooks.indexOf('exportfunctionuseAddProjectMember'),
      compactHooks.indexOf('/**Removeamemberfromaproject*/')
    );
    const removeMemberHook = compactHooks.slice(
      compactHooks.indexOf('exportfunctionuseRemoveProjectMember'),
      compactHooks.indexOf('/**Completeaprojectwithfinalcostsandcustomerfeedback*/')
    );

    expect(jobsIndex).toContain('ProjectMutationAction');
    expect(server).toContain('projectMembers');
    expect(server).toContain('users');
    expect(server).toContain('async function getActiveProjectForMemberMutation');
    expect(server).toContain('async function assertUserBelongsToOrganization');
    expect(compactServer).toContain(
      'eq(projects.id,projectId),eq(projects.organizationId,organizationId),isNull(projects.deletedAt)'
    );
    expect(compactServer).toContain(
      'eq(users.id,userId),eq(users.organizationId,organizationId),isNull(users.deletedAt)'
    );
    expect(compactServer).toContain(
      'awaitassertUserBelongsToOrganization(data.userId,ctx.organizationId);'
    );
    expect(compactServer).toContain(
      '.onConflictDoUpdate({target:[projectMembers.projectId,projectMembers.userId],set:{organizationId:ctx.organizationId,role:data.role,updatedAt:newDate(),},})'
    );
    expect(compactServer).toContain(
      'const[deletedMember]=awaitdb.delete(projectMembers).where(and(eq(projectMembers.projectId,data.projectId),eq(projectMembers.userId,data.userId),eq(projectMembers.organizationId,ctx.organizationId))).returning({id:projectMembers.id});if(!deletedMember){thrownewNotFoundError("Projectmembernotfound","projectMember");}'
    );
    expect(compactServer).not.toContain('thrownewError("Projectnotfound")');

    expect(addMemberHook).toContain('queryKeys.projects.members(variables.projectId)');
    expect(addMemberHook).toContain('queryKeys.projects.detail(variables.projectId)');
    expect(removeMemberHook).toContain('queryKeys.projects.members(variables.projectId)');
    expect(removeMemberHook).toContain('queryKeys.projects.detail(variables.projectId)');
  });
});
