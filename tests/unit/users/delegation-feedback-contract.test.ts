import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatUserMutationError } from '@/hooks/users/user-mutation-error-messages';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('delegation settings feedback contract', () => {
  it('keeps delegation mutation failures behind user-owned copy', () => {
    expect(
      formatUserMutationError(
        new Error('duplicate key violates user_delegations_org_delegate_idx stack'),
        'createDelegation'
      )
    ).toBe('Delegation creation is temporarily unavailable. Please refresh and try again.');

    expect(
      formatUserMutationError(
        {
          statusCode: 409,
          code: 'CONFLICT',
          message: 'You already have an active delegation during this period',
        },
        'createDelegation'
      )
    ).toBe('User administration details conflict with the current account state.');

    expect(
      formatUserMutationError(
        new Error('postgres update user_delegations set is_active=false stack'),
        'cancelDelegation'
      )
    ).toBe('Delegation cancellation is temporarily unavailable. Please refresh and try again.');
  });

  it('keeps the delegation settings route, hooks, and server spine reviewable', () => {
    const route = read('src/routes/_authenticated/settings/delegations.tsx');
    const hook = read('src/hooks/users/use-delegations.ts');
    const server = read('src/server/functions/users/user-delegations.ts');
    const queryKeys = read('src/lib/query-keys.ts');

    expect(route).toContain('formatUserMutationError');
    expect(route).toContain("formatUserMutationError(err, 'createDelegation')");
    expect(route).toContain("formatUserMutationError(err, 'cancelDelegation')");
    expect(route).not.toContain("err instanceof Error ? err.message : 'Failed to create delegation'");
    expect(route).not.toContain("err instanceof Error ? err.message : 'Failed to cancel delegation'");

    expect(hook).toContain('useCreateDelegation');
    expect(hook).toContain('useCancelDelegation');
    expect(hook).toContain('queryKeys.users.delegations.all()');
    expect(queryKeys).toContain('delegations: {');

    expect(server).toContain('export const createDelegation');
    expect(server).toContain('export const cancelDelegation');
    expect(server).toContain('eq(users.organizationId, ctx.organizationId)');
    expect(server).toContain('eq(userDelegations.delegatorId, ctx.user.id)');
  });
});
