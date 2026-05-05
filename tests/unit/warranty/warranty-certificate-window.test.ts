import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  formatWarrantyCertificateWindowError,
  openCertificateWindow,
  WARRANTY_CERTIFICATE_OPEN_FAILED_MESSAGE,
  WARRANTY_CERTIFICATE_POPUP_BLOCKED_MESSAGE,
} from '@/lib/warranty/certificate-utils';
import { toast } from '@/lib/toast';

vi.mock('@/lib/toast', () => ({
  toast: {
    error: vi.fn(),
  },
}));

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('openCertificateWindow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reports popup blocking once and calls the error callback once', () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);
    const onError = vi.fn();

    expect(() =>
      openCertificateWindow('/certificates/warranty-1.pdf', {
        onError,
      })
    ).toThrow(WARRANTY_CERTIFICATE_POPUP_BLOCKED_MESSAGE);

    expect(openSpy).toHaveBeenCalledWith(
      '/certificates/warranty-1.pdf',
      '_blank',
      'noopener,noreferrer'
    );
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith(WARRANTY_CERTIFICATE_OPEN_FAILED_MESSAGE, {
      description: WARRANTY_CERTIFICATE_POPUP_BLOCKED_MESSAGE,
    });
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0]?.[0].message).toBe(WARRANTY_CERTIFICATE_POPUP_BLOCKED_MESSAGE);
  });

  it('hides non-popup browser errors behind safe certificate copy', () => {
    vi.spyOn(window, 'open').mockImplementation(() => {
      throw new Error('SecurityError: blocked by browser policy at certificate-render stack');
    });

    expect(() => openCertificateWindow('/certificates/warranty-1.pdf')).toThrow(
      WARRANTY_CERTIFICATE_OPEN_FAILED_MESSAGE
    );

    expect(toast.error).toHaveBeenCalledWith(WARRANTY_CERTIFICATE_OPEN_FAILED_MESSAGE, {
      description: WARRANTY_CERTIFICATE_OPEN_FAILED_MESSAGE,
    });
  });

  it('formats certificate window failures without exposing raw system messages', () => {
    expect(
      formatWarrantyCertificateWindowError(
        new Error('SecurityError: blocked by browser policy at certificate-render stack')
      )
    ).toBe(WARRANTY_CERTIFICATE_OPEN_FAILED_MESSAGE);

    expect(formatWarrantyCertificateWindowError(new Error('Popup blocked by browser'))).toBe(
      WARRANTY_CERTIFICATE_POPUP_BLOCKED_MESSAGE
    );
  });

  it('keeps warranty certificate callers on the safe window utility contract', () => {
    const utility = read('src/lib/warranty/certificate-utils.ts');
    const container = read('src/components/domain/warranty/containers/warranty-detail-container.tsx');
    const button = read('src/components/domain/warranty/widgets/warranty-certificate-button.tsx');

    expect(utility).not.toContain('errorMessage?: string');
    expect(container).toContain('formatWarrantyCertificateWindowError(error)');

    for (const source of [container, button]) {
      expect(source).not.toContain("errorMessage: 'Failed to open certificate'");
      expect(source).not.toContain("'Failed to open certificate'");
      expect(source).not.toContain('error instanceof Error ? error.message');
    }
  });
});
