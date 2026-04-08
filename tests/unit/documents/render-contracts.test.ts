import { describe, expect, it } from 'vitest';
import { generateFilename, generateStoragePath } from '@/lib/documents/render';

describe('document render contracts', () => {
  it('supports pro-forma filenames and storage paths', () => {
    const date = new Date('2026-04-08T00:00:00.000Z');

    expect(generateFilename('pro-forma', 'ORD-20260407-0001', date)).toBe(
      'pro-forma-ORD-20260407-0001-2026-04-08.pdf'
    );
    expect(
      generateStoragePath(
        '7efe18a0-cb19-49de-ab45-7bfa82f62e72',
        'pro-forma',
        'pro-forma-ORD-20260407-0001-2026-04-08.pdf'
      )
    ).toBe(
      'documents/7efe18a0-cb19-49de-ab45-7bfa82f62e72/pro-formas/pro-forma-ORD-20260407-0001-2026-04-08.pdf'
    );
  });
});
