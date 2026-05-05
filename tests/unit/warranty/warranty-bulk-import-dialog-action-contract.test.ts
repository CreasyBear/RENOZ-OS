import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('warranty bulk import dialog action contract', () => {
  it('keeps preview and register mutation toasts owned by bulk import hooks', () => {
    const dialog = read('src/components/domain/warranty/dialogs/bulk-warranty-import-dialog.tsx');
    const container = read(
      'src/components/domain/warranty/containers/warranty-import-settings-container.tsx'
    );
    const hook = read('src/hooks/warranty/bulk-import/use-warranty-bulk-import.ts');

    expect(dialog).not.toContain("import { toast } from 'sonner'");
    expect(dialog).not.toContain(
      "toast.error('Failed to preview CSV. Please check the file format and try again.')"
    );
    expect(dialog).not.toContain(
      "toast.error('Import failed. Please try again or contact support.')"
    );
    expect(dialog).toContain("setFileError('Could not read CSV file. Please choose the file again.')");
    expect(dialog).toContain('const result = await onPreview({ csvContent: content })');
    expect(dialog).toContain('const result = await onRegister({');
    expect(dialog).toContain("setStep('preview')");
    expect(container).toContain('usePreviewWarrantyImport()');
    expect(container).toContain('useBulkRegisterWarranties()');
    expect(container).toContain('previewMutation.mutateAsync(payload)');
    expect(container).toContain('registerMutation.mutateAsync(payload)');
    expect(hook).toContain(
      "toast.error(formatWarrantyBulkImportMutationError(error, 'preview'))"
    );
    expect(hook).toContain(
      "toast.error(formatWarrantyBulkImportMutationError(error, 'register'))"
    );
  });
});
