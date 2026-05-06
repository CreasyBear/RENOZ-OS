import { describe, expect, it } from 'vitest';
import { queryKeys } from '@/lib/query-keys';

describe('oauth query key contract', () => {
  it('keeps pending tenant selections under the oauth pending-selection root', () => {
    const root = queryKeys.oauth.pendingSelections();
    const selection = queryKeys.oauth.pendingSelection('state-1');
    const otherSelection = queryKeys.oauth.pendingSelection('state-2');
    const connections = queryKeys.oauth.connections('org-1');

    expect(selection.slice(0, root.length)).toEqual(root);
    expect(otherSelection.slice(0, root.length)).toEqual(root);
    expect(selection).not.toEqual(otherSelection);
    expect(connections.slice(0, root.length)).not.toEqual(root);
  });
});
