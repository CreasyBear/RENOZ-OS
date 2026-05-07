import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('product image upload errors', () => {
  it('keeps upload failures behind image formatter and only completes successful batches', () => {
    const uploader = read('src/components/domain/products/images/image-uploader.tsx');

    expect(uploader).toContain('formatProductImageMutationError(error, "add")');
    expect(uploader).toContain('const errorMessage = formatProductImageMutationError(error, "add");');
    expect(uploader).toContain('error: errorMessage');
    expect(uploader).not.toContain('error instanceof Error ? error.message : "Upload failed"');

    expect(uploader).toContain('let allSucceeded = true;');
    expect(uploader).toContain('const didSucceed = await uploadFile(file);');
    expect(uploader).toContain('allSucceeded = false;');
    expect(uploader).not.toContain('const allSucceeded = files.every(');
  });

  it('uploads through the product image file server contract instead of registering preview URLs', () => {
    const uploader = read('src/components/domain/products/images/image-uploader.tsx');
    const hook = read('src/hooks/products/use-product-images.ts');
    const server = read('src/server/functions/products/product-images.ts');

    expect(uploader).toContain('useUploadProductImageFile');
    expect(uploader).toContain('readFileAsBase64Content(uploadFile.file)');
    expect(uploader).toContain('base64Content,');
    expect(uploader).not.toContain('const imageUrl = uploadFile.preview');
    expect(uploader).not.toContain('mock URL');
    expect(uploader).not.toContain('demo purposes');

    expect(hook).toContain('uploadProductImageFile({ data: input })');
    expect(server).toContain('export const uploadProductImageFile');
    expect(server).toContain("PRODUCT_IMAGE_STORAGE_BUCKET = 'public'");
    expect(server).toContain('createProductImageRecord({');
  });
});
