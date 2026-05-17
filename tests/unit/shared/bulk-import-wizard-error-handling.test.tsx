import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  BulkImportWizard,
  type BulkImportConfig,
} from '@/components/shared/bulk-import-wizard';

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

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

const baseConfig: BulkImportConfig = {
  entityName: 'Product',
  entityNamePlural: 'Products',
  showFieldMapping: false,
  fields: [
    {
      key: 'sku',
      label: 'SKU',
      required: true,
      autoMatchPatterns: ['sku'],
    },
  ],
  previewColumns: [{ key: 'sku', label: 'SKU' }],
};

function uploadCsv(container: HTMLElement, file: File) {
  const input = container.querySelector('input[type="file"]');

  if (!(input instanceof HTMLInputElement)) {
    throw new Error('CSV upload input not found');
  }

  fireEvent.change(input, {
    target: {
      files: [file],
    },
  });
}

describe('BulkImportWizard error handling', () => {
  beforeEach(() => {
    loggerMock.warn.mockClear();
  });

  it('keeps file parsing failures visible and logs bounded context', async () => {
    const parseError = new Error('CSV parser unavailable');
    const parseFile = vi.fn().mockRejectedValue(parseError);
    const file = new File(['sku\nBAT-100'], 'products.csv', { type: 'text/csv' });

    const { container } = render(
      <BulkImportWizard
        config={{ ...baseConfig, parseFile }}
        onImport={vi.fn()}
        onClose={vi.fn()}
      />
    );

    uploadCsv(container, file);

    await waitFor(() => {
      expect(screen.getByText('CSV parser unavailable')).toBeInTheDocument();
    });

    expect(parseFile).toHaveBeenCalledWith(file);
    expect(loggerMock.warn).toHaveBeenCalledWith('Bulk import file parsing failed', {
      component: 'BulkImportWizard',
      entityNamePlural: 'Products',
      fileSize: file.size,
      fileType: 'text/csv',
      error: 'CSV parser unavailable',
    });
  });

  it('keeps import operation failures visible on the validation step', async () => {
    const importError = new Error('Importer unavailable');
    const onImport = vi.fn().mockRejectedValue(importError);
    const file = new File(['sku\nBAT-100'], 'products.csv', { type: 'text/csv' });

    const { container } = render(
      <BulkImportWizard
        config={{
          ...baseConfig,
          parseFile: vi.fn().mockResolvedValue({
            headers: ['sku'],
            rows: [['BAT-100']],
          }),
        }}
        onImport={onImport}
        onClose={vi.fn()}
      />
    );

    uploadCsv(container, file);

    const importButton = await screen.findByRole('button', { name: 'Import 1 Products' });
    fireEvent.click(importButton);

    await waitFor(() => {
      expect(screen.getByText('Importer unavailable')).toBeInTheDocument();
    });

    expect(onImport).toHaveBeenCalledWith([{ sku: 'BAT-100' }], undefined);
    expect(loggerMock.warn).toHaveBeenCalledWith('Bulk import operation failed', {
      component: 'BulkImportWizard',
      entityNamePlural: 'Products',
      rowCount: 1,
      importMode: 'default',
      error: 'Importer unavailable',
    });
  });

  it('keeps raw console errors out of the shared import wizard', () => {
    const source = read('src/components/shared/bulk-import-wizard.tsx');

    expect(source).toContain("logger.warn('Bulk import file parsing failed'");
    expect(source).toContain("logger.warn('Bulk import operation failed'");
    expect(source).toContain("<AlertTitle>Import issue</AlertTitle>");
    expect(source).not.toContain('console.error');
    expect(source).not.toContain('Failed to parse file:');
    expect(source).not.toContain('Import failed:');
  });
});
