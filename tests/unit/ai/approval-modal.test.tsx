import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AIApproval } from '@/hooks/ai';
import { ApprovalModal } from '@/components/domain/ai/approval-modal';

function buildApproval(): AIApproval {
  const customerId = '11111111-1111-4111-8111-111111111111';
  return {
    id: 'approval-1',
    action: 'send_email',
    agent: 'customer',
    actionData: {
      actionType: 'send_email',
      availableActions: ['approve', 'edit', 'discard'],
      draft: {
        customerId,
        to: 'customer@example.com',
        subject: 'Original subject',
        body: 'Original body',
      },
    },
    version: 3,
    status: 'pending',
    createdAt: '2026-03-16T00:00:00.000Z',
    expiresAt: '2026-03-17T00:00:00.000Z',
  };
}

function buildUpdatedApproval(): AIApproval {
  return {
    ...buildApproval(),
    id: 'approval-2',
    version: 5,
    actionData: {
      actionType: 'send_email',
      availableActions: ['approve', 'edit', 'discard'],
      draft: {
        customerId: '22222222-2222-4222-8222-222222222222',
        to: 'updated@example.com',
        subject: 'Fresh subject',
        body: 'Fresh body',
      },
    },
  };
}

describe('ApprovalModal', () => {
  it('persists edited email drafts before approving send_email actions', async () => {
    const onApprove = vi.fn().mockResolvedValue(undefined);
    const onUpdateDraft = vi.fn().mockResolvedValue({
      approval: {
        version: 4,
        actionData: {
          actionType: 'send_email',
          availableActions: ['approve', 'edit', 'discard'],
          draft: {
            customerId: '11111111-1111-4111-8111-111111111111',
            to: 'customer@example.com',
            subject: 'Updated subject',
            body: 'Updated body',
          },
        },
      },
    });

    render(
      <ApprovalModal
        open
        onOpenChange={vi.fn()}
        approval={buildApproval()}
        onApprove={onApprove}
        onReject={vi.fn()}
        onUpdateDraft={onUpdateDraft}
      />
    );

    fireEvent.change(screen.getByLabelText(/subject/i), {
      target: { value: 'Updated subject' },
    });
    fireEvent.change(screen.getByLabelText(/body/i), {
      target: { value: 'Updated body' },
    });

    fireEvent.click(screen.getByRole('button', { name: /approve & send/i }));

    await waitFor(() => {
      expect(onUpdateDraft).toHaveBeenCalledWith('approval-1', {
        draft: {
          customerId: '11111111-1111-4111-8111-111111111111',
          to: 'customer@example.com',
          subject: 'Updated subject',
          body: 'Updated body',
        },
        expectedVersion: 3,
      });
    });

    await waitFor(() => {
      expect(onApprove).toHaveBeenCalledWith('approval-1', {
        expectedVersion: 4,
        draft: {
          customerId: '11111111-1111-4111-8111-111111111111',
          to: 'customer@example.com',
          subject: 'Updated subject',
          body: 'Updated body',
        },
      });
    });
  });

  it('resets editable draft state when a different approval is loaded', async () => {
    const { rerender } = render(
      <ApprovalModal
        open
        onOpenChange={vi.fn()}
        approval={buildApproval()}
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onUpdateDraft={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText(/subject/i), {
      target: { value: 'Unsaved local change' },
    });
    expect(screen.getByLabelText(/subject/i)).toHaveValue('Unsaved local change');

    rerender(
      <ApprovalModal
        open
        onOpenChange={vi.fn()}
        approval={buildUpdatedApproval()}
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onUpdateDraft={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/subject/i)).toHaveValue('Fresh subject');
    });
  });
});
