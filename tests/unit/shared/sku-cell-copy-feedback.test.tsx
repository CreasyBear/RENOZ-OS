import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SkuCell } from '@/components/shared/data-table/cells/sku-cell';

const loggerMock = vi.hoisted(() => ({
  warn: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: loggerMock.warn,
    error: vi.fn(),
    child: vi.fn(),
  },
}));

const root = process.cwd();
const writeTextMock = vi.fn();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('SkuCell copy feedback', () => {
  beforeEach(() => {
    loggerMock.warn.mockClear();
    writeTextMock.mockReset();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: writeTextMock,
      },
    });
  });

  it('shows copied feedback after a successful SKU copy', async () => {
    writeTextMock.mockResolvedValue(undefined);

    render(<SkuCell value="BAT-100" copyable />);

    fireEvent.click(screen.getByRole('button', { name: 'Copy SKU' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'SKU copied' })).toBeInTheDocument();
    });

    expect(writeTextMock).toHaveBeenCalledWith('BAT-100');
    expect(loggerMock.warn).not.toHaveBeenCalled();
  });

  it('shows copy failure feedback and logs bounded context', async () => {
    const copyError = new Error('clipboard blocked');
    writeTextMock.mockRejectedValue(copyError);

    render(<SkuCell value="BAT-100" copyable />);

    fireEvent.click(screen.getByRole('button', { name: 'Copy SKU' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Copy failed' })).toBeInTheDocument();
    });

    expect(writeTextMock).toHaveBeenCalledWith('BAT-100');
    expect(loggerMock.warn).toHaveBeenCalledWith('Failed to copy SKU to clipboard', {
      component: 'SkuCell',
      valueLength: 7,
      error: 'clipboard blocked',
    });
  });

  it('keeps raw console errors out of the SKU cell', () => {
    const source = read('src/components/shared/data-table/cells/sku-cell.tsx');

    expect(source).toContain('logger.warn("Failed to copy SKU to clipboard"');
    expect(source).toContain('aria-label={copyLabel}');
    expect(source).not.toContain('console.error');
    expect(source).not.toContain('Failed to copy:');
  });
});
