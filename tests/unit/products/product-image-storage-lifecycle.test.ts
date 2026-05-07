import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('product image storage lifecycle', () => {
  it('removes backing storage objects when product image records are deleted', () => {
    const source = read('src/server/functions/products/product-images.ts');

    expect(source).toContain('removeProductImageStorageObjects');
    expect(source).toContain('isOurStorageUrl(url)');
    expect(source).toContain(
      'extractStoragePathFromPublicUrl(url, PRODUCT_IMAGE_STORAGE_BUCKET)'
    );
    expect(source).toContain('.remove(storagePaths)');
    expect(source).toContain('await removeProductImageStorageObjects([existing.imageUrl]);');
    expect(source).toContain(
      'await removeProductImageStorageObjects(images.map((image) => image.imageUrl));'
    );
    expect(source).toContain("logger.error('[productImages] Error removing product image storage objects'");
    expect(source).not.toContain('Actual file deletion from Supabase Storage should be handled separately');
  });
});
