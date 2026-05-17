import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EntityCombobox } from '@/components/shared/entity-combobox';

const loggerMock = vi.hoisted(() => ({
  error: vi.fn(),
}));

vi.mock('~/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: loggerMock.error,
    child: vi.fn(),
  },
}));

vi.stubGlobal(
  'ResizeObserver',
  vi.fn(() => ({
    disconnect: vi.fn(),
    observe: vi.fn(),
    unobserve: vi.fn(),
  }))
);

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('EntityCombobox error handling', () => {
  beforeEach(() => {
    loggerMock.error.mockClear();
  });

  it('shows an honest search failure state instead of an empty result', async () => {
    const searchError = new Error('search backend unavailable');
    const searchFn = vi.fn<() => Promise<Array<{ id: string; name: string }>>>().mockRejectedValue(searchError);

    render(
      <EntityCombobox
        value={null}
        onSelect={vi.fn()}
        searchFn={searchFn}
        getDisplayValue={(customer) => customer.name}
        getKey={(customer) => customer.id}
        placeholder="Select customer"
        searchPlaceholder="Search customers"
        emptyMessage="No customers found."
        searchErrorMessage="Search is temporarily unavailable."
        debounceMs={0}
      />
    );

    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.change(screen.getByPlaceholderText('Search customers'), {
      target: { value: 'acme' },
    });

    await waitFor(() => {
      expect(screen.getByText('Search is temporarily unavailable.')).toBeInTheDocument();
    });

    expect(searchFn).toHaveBeenCalledWith('acme');
    expect(screen.queryByText('No customers found.')).not.toBeInTheDocument();
    expect(loggerMock.error).toHaveBeenCalledWith(
      'Entity combobox search failed',
      searchError,
      {
        component: 'EntityCombobox',
        queryLength: 4,
      }
    );
  });

  it('keeps raw console errors out of the shared combobox', () => {
    const source = read('src/components/shared/entity-combobox.tsx');

    expect(source).toContain('logger.error("Entity combobox search failed"');
    expect(source).toContain('searchErrorMessage = "Search failed. Try again."');
    expect(source).not.toContain('console.error');
    expect(source).not.toContain('Search error:');
  });
});
