import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryKeys } from '@/lib/query-keys';

const mockDeleteEscalationRule = vi.fn();
const root = process.cwd();

vi.mock('@/server/functions/support/escalation', () => ({
  deleteEscalationRule: (...args: unknown[]) => mockDeleteEscalationRule(...args),
}));

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'EscalationRuleCacheContractWrapper';
  return Wrapper;
}

describe('support escalation-rule cache contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps escalation-rule deletion out of issue-template hooks', () => {
    const issueTemplatesHook = read('src/hooks/support/use-issue-templates.ts');
    const supportIndex = read('src/hooks/support/index.ts');

    expect(issueTemplatesHook).not.toContain('deleteEscalationRule');
    expect(issueTemplatesHook).not.toContain('useDeleteEscalationRule');
    expect(supportIndex).toContain("export * from './use-escalation-rules';");
  });

  it('refreshes escalation-rule queries without support root invalidation', async () => {
    mockDeleteEscalationRule.mockResolvedValue({ success: true });

    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { useDeleteEscalationRule } = await import(
      '@/hooks/support/use-escalation-rules'
    );

    const { result } = renderHook(() => useDeleteEscalationRule(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync('rule-1');
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.support.escalationRules(),
    });
    expect(invalidateSpy).not.toHaveBeenCalledWith({
      queryKey: queryKeys.support.all,
    });
  });
});
