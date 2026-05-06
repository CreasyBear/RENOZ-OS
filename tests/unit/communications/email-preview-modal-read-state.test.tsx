import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mockUseEmailPreview = vi.fn();
const mockUseSendTestEmail = vi.fn();

vi.mock('@/hooks/communications/use-email-preview', () => ({
  useEmailPreview: (...args: unknown[]) => mockUseEmailPreview(...args),
  useSendTestEmail: (...args: unknown[]) => mockUseSendTestEmail(...args),
}));

describe('email preview modal read states', () => {
  it('uses operator-safe copy for email preview failures', async () => {
    mockUseEmailPreview.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('resend render failed with provider payload'),
      refetch: vi.fn(),
    });
    mockUseSendTestEmail.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    const { EmailPreviewModal } = await import(
      '@/components/domain/communications/templates/email-preview-modal'
    );

    render(
      <EmailPreviewModal
        open
        onOpenChange={vi.fn()}
        templateId="template-1"
        templateName="Warranty Reminder"
      />
    );

    expect(
      screen.getByText('Email preview is temporarily unavailable. Please refresh and try again.')
    ).toBeInTheDocument();
    expect(screen.queryByText('resend render failed with provider payload')).not.toBeInTheDocument();
  });
});
