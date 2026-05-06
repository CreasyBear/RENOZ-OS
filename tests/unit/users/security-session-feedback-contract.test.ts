import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('security session feedback contract', () => {
  it('keeps session mutation feedback owned by the users hooks', () => {
    const route = read('src/routes/_authenticated/settings/security.tsx');
    const hook = read('src/hooks/users/use-sessions.ts');
    const server = read('src/server/functions/users/sessions.ts');
    const queryKeys = read('src/lib/query-keys.ts');

    expect(route).toContain('useTerminateSession');
    expect(route).toContain('useTerminateAllOtherSessions');
    expect(route).toContain('onSettled: () => {');
    expect(route).not.toContain("toast.success('Session terminated')");
    expect(route).not.toContain("toast.error('Failed to terminate session')");
    expect(route).not.toContain("toast.success('Other sessions terminated')");
    expect(route).not.toContain("toast.error('Failed to terminate sessions')");
    expect(route).not.toContain("import { toast } from '@/hooks'");

    expect(hook).toContain("toast.error(formatUserMutationError(error, 'terminateSession'))");
    expect(hook).toContain("toast.error(formatUserMutationError(error, 'terminateOtherSessions'))");
    expect(hook).toContain("queryClient.invalidateQueries({ queryKey: queryKeys.users.sessions.all() })");

    expect(queryKeys).toContain('sessions: {');
    expect(server).toContain('export const terminateSession');
    expect(server).toContain('export const terminateAllOtherSessions');
    expect(server).toContain('eq(userSessions.userId, ctx.user.id)');
  });
});
