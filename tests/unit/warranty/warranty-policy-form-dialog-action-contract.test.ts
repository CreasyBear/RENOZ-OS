import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('warranty policy form dialog action contract', () => {
  it('keeps policy save mutation toasts owned by policy hooks', () => {
    const dialog = read('src/components/domain/warranty/dialogs/warranty-policy-form-dialog.tsx');
    const container = read(
      'src/components/domain/warranty/containers/warranty-policy-settings-container.tsx'
    );
    const hook = read('src/hooks/warranty/policies/use-warranty-policies.ts');

    expect(dialog).not.toContain("import { toast } from 'sonner'");
    expect(dialog).not.toContain("toast.error('Failed to save policy. Please try again.')");
    expect(dialog).toContain('await onSubmit({ policyId: policy.id, ...payload })');
    expect(dialog).toContain('await onSubmit(payload)');
    expect(dialog).toContain('onOpenChange(false)');
    expect(container).toContain('useCreateWarrantyPolicy()');
    expect(container).toContain('useUpdateWarrantyPolicy()');
    expect(container).toContain('await updateMutation.mutateAsync({');
    expect(container).toContain('await createMutation.mutateAsync(dataToSave)');
    expect(hook).toContain("toast.error(formatWarrantyMutationError(error, 'Failed to create policy'))");
    expect(hook).toContain("toast.error(formatWarrantyMutationError(error, 'Failed to update policy'))");
  });
});
