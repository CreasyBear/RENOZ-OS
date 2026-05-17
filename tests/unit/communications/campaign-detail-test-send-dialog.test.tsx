import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { CampaignDetailTestSendDialog } from '@/components/domain/communications/campaigns/campaign-detail-test-send-dialog';
import type { CampaignDetailActionResult } from '@/components/domain/communications/campaigns/campaign-detail-actions';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function makeSendResult(status: CampaignDetailActionResult['status']): CampaignDetailActionResult {
  return { status, feedback: [] };
}

function renderDialog(
  overrides: Partial<{
    open: boolean;
    isPending: boolean;
    onOpenChange: (open: boolean) => void;
    onSendTestEmail: (testEmail: string) => Promise<CampaignDetailActionResult>;
  }> = {}
) {
  const props = {
    open: true,
    isPending: false,
    onOpenChange: vi.fn(),
    onSendTestEmail: vi.fn<(testEmail: string) => Promise<CampaignDetailActionResult>>(
      async () => makeSendResult('success')
    ),
    ...overrides,
  };

  render(<CampaignDetailTestSendDialog {...props} />);
  return props;
}

describe('CampaignDetailTestSendDialog', () => {
  it('submits a test email and resets on success', async () => {
    const props = renderDialog();
    const input = screen.getByLabelText('Test Email Address') as HTMLInputElement;

    fireEvent.change(input, { target: { value: 'qa@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send Test Email' }));

    await waitFor(() => {
      expect(props.onSendTestEmail).toHaveBeenCalledWith('qa@example.com');
    });

    expect(props.onOpenChange).toHaveBeenCalledWith(false);
    expect(input.value).toBe('');
  });

  it('keeps the dialog open and preserves the email when send is blocked', async () => {
    const props = renderDialog({
      onSendTestEmail: vi.fn(async () => makeSendResult('blocked')),
    });
    const input = screen.getByLabelText('Test Email Address') as HTMLInputElement;

    fireEvent.change(input, { target: { value: 'blocked@example.com' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(props.onSendTestEmail).toHaveBeenCalledWith('blocked@example.com');
    });

    expect(props.onOpenChange).not.toHaveBeenCalled();
    expect(input.value).toBe('blocked@example.com');
  });

  it('guards pending submissions and resets on cancel', () => {
    const props = renderDialog({ isPending: true });
    const input = screen.getByLabelText('Test Email Address') as HTMLInputElement;

    fireEvent.change(input, { target: { value: 'pending@example.com' } });

    const submit = screen.getByRole('button', { name: 'Sending...' });
    expect(submit).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(props.onSendTestEmail).not.toHaveBeenCalled();
    expect(props.onOpenChange).toHaveBeenCalledWith(false);
    expect(input.value).toBe('');
  });

  it('keeps test-send dialog rendering outside the campaign detail panel', () => {
    const detailPanel = read(
      'src/components/domain/communications/campaigns/campaign-detail-panel.tsx'
    );
    const loadedState = read(
      'src/components/domain/communications/campaigns/campaign-detail-loaded-state.tsx'
    );
    const testSendDialog = read(
      'src/components/domain/communications/campaigns/campaign-detail-test-send-dialog.tsx'
    );

    expect(detailPanel).toContain('<CampaignDetailLoadedState');
    expect(detailPanel).not.toContain('<CampaignDetailTestSendDialog');
    expect(loadedState).toContain('<CampaignDetailTestSendDialog');
    expect(detailPanel).not.toContain('Test Email Address');
    expect(detailPanel).not.toContain('createPendingDialogInteractionGuards');
    expect(testSendDialog).toContain('Test Email Address');
    expect(testSendDialog).toContain('createPendingDialogInteractionGuards');
  });
});
