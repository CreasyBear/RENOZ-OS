import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { IssueStatusChangeDialog } from '@/components/domain/support/issues/issue-status-change-dialog';
import type { StatusChangeResult } from '@/lib/schemas/support/issues';

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({
    open,
    children,
  }: {
    open: boolean;
    children: React.ReactNode;
  }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock('@/components/ui/dialog-pending-guards', () => ({
  createPendingDialogInteractionGuards: () => ({
    onEscapeKeyDown: () => undefined,
    onInteractOutside: () => undefined,
  }),
  createPendingDialogOpenChangeHandler:
    (_isPending: boolean, onOpenChange: (open: boolean) => void) =>
    (nextOpen: boolean) =>
      onOpenChange(nextOpen),
}));

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({
    id,
    checked,
    onCheckedChange,
  }: {
    id?: string;
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <input
      id={id}
      type="checkbox"
      checked={checked}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
}));

vi.mock('@/components/ui/select', async () => {
  const ReactModule = await import('react');

  interface SelectContextValue {
    value?: string;
    onValueChange?: (value: string) => void;
    items: Array<{ value: string; label: string }>;
  }

  const SelectContext = ReactModule.createContext<SelectContextValue>({
    value: '',
    items: [],
  });

  function flattenItems(
    children: React.ReactNode,
    SelectItem: React.ComponentType<{ value: string; children: React.ReactNode }>
  ): Array<{ value: string; label: string }> {
    const items: Array<{ value: string; label: string }> = [];

    ReactModule.Children.forEach(children, (child) => {
      if (!ReactModule.isValidElement(child)) return;

      const element = child as React.ReactElement<{
        value?: string;
        children?: React.ReactNode;
      }>;

      if (element.type === SelectItem && element.props.value) {
        items.push({
          value: element.props.value,
          label: String(element.props.children),
        });
        return;
      }

      if (element.props?.children) {
        items.push(...flattenItems(element.props.children, SelectItem));
      }
    });

    return items;
  }

  const SelectItem = ({
    children,
  }: {
    value: string;
    children: React.ReactNode;
  }) => <>{children}</>;

  return {
    Select: ({
      value,
      onValueChange,
      children,
    }: {
      value?: string;
      onValueChange?: (value: string) => void;
      children: React.ReactNode;
    }) => {
      const items = flattenItems(children, SelectItem);
      return (
        <SelectContext.Provider value={{ value, onValueChange, items }}>
          <div>{children}</div>
        </SelectContext.Provider>
      );
    },
    SelectTrigger: ({
      id,
      children,
    }: {
      id?: string;
      children: React.ReactNode;
    }) => {
      const context = ReactModule.useContext(SelectContext);
      return (
        <select
          aria-label={id}
          value={context.value ?? ''}
          onChange={(event) => context.onValueChange?.(event.target.value)}
        >
          <option value="">Select</option>
          {context.items.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
          {children}
        </select>
      );
    },
    SelectValue: () => null,
    SelectContent: () => null,
    SelectItem,
  };
});

function IssueStatusChangeHarness({
  onConfirm,
}: {
  onConfirm: (result: StatusChangeResult) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Reopen
      </button>
      <IssueStatusChangeDialog
        open={open}
        onOpenChange={setOpen}
        issueTitle="Array inverter fault"
        fromStatus="in_progress"
        toStatus="resolved"
        onConfirm={(result) => {
          onConfirm(result);
          setOpen(false);
        }}
      />
    </div>
  );
}

describe('IssueStatusChangeDialog', () => {
  it('resets resolve fields after cancel and reopen', async () => {
    const onConfirm = vi.fn();

    render(<IssueStatusChangeHarness onConfirm={onConfirm} />);

    fireEvent.change(screen.getByLabelText('Resolution summary (required)'), {
      target: { value: 'Replaced the failed inverter' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'resolution-category' }), {
      target: { value: 'hardware_fault' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'next-action-type' }), {
      target: { value: 'monitor' },
    });
    fireEvent.change(screen.getByLabelText('Diagnosis notes (optional)'), {
      target: { value: 'Fan seized after thermal event' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith({
        confirmed: false,
        note: '',
        skipPromptForSession: false,
      });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Reopen' }));

    expect(
      (screen.getByLabelText('Resolution summary (required)') as HTMLTextAreaElement).value
    ).toBe('');
    expect(
      (screen.getByRole('combobox', { name: 'resolution-category' }) as HTMLSelectElement).value
    ).toBe('');
    expect(
      (screen.getByRole('combobox', { name: 'next-action-type' }) as HTMLSelectElement).value
    ).toBe('');
    expect(
      (screen.getByLabelText('Diagnosis notes (optional)') as HTMLTextAreaElement).value
    ).toBe('');
  });
});
