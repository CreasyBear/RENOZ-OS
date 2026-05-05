import { beforeEach, describe, expect, it, vi } from 'vitest';
import { openCertificateWindow } from '@/lib/warranty/certificate-utils';
import { toast } from '@/lib/toast';

vi.mock('@/lib/toast', () => ({
  toast: {
    error: vi.fn(),
  },
}));

describe('openCertificateWindow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reports popup blocking once and calls the error callback once', () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);
    const onError = vi.fn();

    expect(() =>
      openCertificateWindow('/certificates/warranty-1.pdf', {
        errorMessage: 'Failed to open certificate',
        onError,
      })
    ).toThrow('Popup blocked. Please allow popups for this site.');

    expect(openSpy).toHaveBeenCalledWith(
      '/certificates/warranty-1.pdf',
      '_blank',
      'noopener,noreferrer'
    );
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
