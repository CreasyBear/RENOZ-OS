import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EscalationDialog } from '@/components/domain/support/escalation/escalation-dialog';
import { toast } from '@/hooks';

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: { open?: boolean; children: React.ReactNode }) =>
    open === false ? null : <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div role="dialog">{children}</div>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    disabled,
    onClick,
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
  }) => (
    <button type="button" disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: React.ComponentProps<'textarea'>) => <textarea {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: (props: React.ComponentProps<'label'>) => <label {...props} />,
}));

vi.mock('@/components/ui/dialog-pending-guards', () => ({
  createPendingDialogInteractionGuards: () => ({
    onEscapeKeyDown: vi.fn(),
    onInteractOutside: vi.fn(),
  }),
}));

vi.mock('@/hooks', () => ({
  toast: { error: vi.fn() },
}));

describe('EscalationDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('routes controlled de-escalation through onDeEscalate', async () => {
    const onEscalate = vi.fn();
    const onDeEscalate = vi.fn().mockResolvedValue(undefined);

    render(
      <EscalationDialog
        open
        onOpenChange={vi.fn()}
        isEscalated
        onEscalate={onEscalate}
        onDeEscalate={onDeEscalate}
      />
    );

    expect(screen.getByRole('heading', { name: 'De-escalate Issue' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('De-escalation Reason'), {
      target: { value: 'Back in normal support queue' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'De-escalate' }));

    await waitFor(() =>
      expect(onDeEscalate).toHaveBeenCalledWith('Back in normal support queue')
    );
    expect(onEscalate).not.toHaveBeenCalled();
  });

  it('keeps controlled failure feedback with the submit caller', async () => {
    const onEscalate = vi
      .fn()
      .mockRejectedValue(new Error('duplicate key value violates unique constraint'));
    const onOpenChange = vi.fn();

    render(
      <EscalationDialog
        open
        onOpenChange={onOpenChange}
        isEscalated={false}
        onEscalate={onEscalate}
      />
    );

    const reasonInput = screen.getByLabelText('Escalation Reason');
    fireEvent.change(reasonInput, {
      target: { value: 'Customer shipment is blocked' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Escalate' }));

    await waitFor(() => expect(onEscalate).toHaveBeenCalledWith('Customer shipment is blocked'));
    expect(toast.error).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(reasonInput).toHaveValue('Customer shipment is blocked');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
