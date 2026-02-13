/* eslint-disable react-refresh/only-export-components -- Context file exports provider + hook */
/**
 * Confirmation Context
 *
 * Provides shared state for useConfirmation and ConfirmationDialog.
 * Ensures all confirmation dialogs use the same state so confirm()
 * calls correctly trigger the dialog.
 *
 * Use ConfirmationProvider in the layout root (e.g. _authenticated).
 * useConfirmation() reads from context; ConfirmationDialog renders the UI.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// Types (avoid circular import - use-confirmation re-exports these)
export interface ConfirmationOptions {
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  requireReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  onConfirm?: (reason?: string) => Promise<void> | void;
}

export interface ConfirmationState extends ConfirmationOptions {
  isOpen: boolean;
  isConfirming?: boolean;
  resolve?: (result: { confirmed: boolean; reason?: string }) => void;
}

export interface ConfirmationContextValue {
  isOpen: boolean;
  isConfirming: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  variant: "default" | "destructive";
  requireReason: boolean;
  reasonLabel: string;
  reasonPlaceholder: string;
  confirm: (options?: ConfirmationOptions) => Promise<{ confirmed: boolean; reason?: string }>;
  handleConfirm: (reason?: string) => Promise<boolean>;
  handleCancel: () => void;
  close: () => void;
}

const ConfirmationContext = createContext<ConfirmationContextValue | null>(null);

export function ConfirmationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmationState>({
    isOpen: false,
  });

  const confirm = useCallback(
    (options: ConfirmationOptions = {}): Promise<{ confirmed: boolean; reason?: string }> => {
      return new Promise((resolve) => {
        setState({
          ...options,
          isOpen: true,
          isConfirming: false,
          resolve,
        });
      });
    },
    []
  );

  const handleConfirm = useCallback(
    async (reason?: string): Promise<boolean> => {
      if (state.onConfirm) {
        setState((prev) => ({ ...prev, isConfirming: true }));
        try {
          await state.onConfirm(reason);
        } catch {
          setState((prev) => ({ ...prev, isConfirming: false }));
          state.resolve?.({ confirmed: false });
          return false;
        }
      }
      state.resolve?.({ confirmed: true, reason });
      setState({ isOpen: false });
      return true;
    },
    [state]
  );

  const handleCancel = useCallback(() => {
    state.resolve?.({ confirmed: false });
    setState({ isOpen: false });
  }, [state]);

  const close = useCallback(() => {
    state.resolve?.({ confirmed: false });
    setState({ isOpen: false });
  }, [state]);

  const value = useMemo<ConfirmationContextValue>(
    () => ({
      isOpen: state.isOpen,
      isConfirming: state.isConfirming || false,
      title: state.title || "Confirm Action",
      description: state.description || "Are you sure you want to proceed?",
      confirmLabel: state.confirmLabel || "Confirm",
      cancelLabel: state.cancelLabel || "Cancel",
      variant: state.variant || "default",
      requireReason: state.requireReason || false,
      reasonLabel: state.reasonLabel || "Reason",
      reasonPlaceholder: state.reasonPlaceholder || "Please provide a reason...",
      confirm,
      handleConfirm,
      handleCancel,
      close,
    }),
    [state, confirm, handleConfirm, handleCancel, close]
  );

  return (
    <ConfirmationContext.Provider value={value}>
      {children}
    </ConfirmationContext.Provider>
  );
}

export function useConfirmationContext(): ConfirmationContextValue {
  const ctx = useContext(ConfirmationContext);
  if (!ctx) {
    throw new Error(
      "useConfirmation must be used within ConfirmationProvider. Wrap your app with <ConfirmationProvider>."
    );
  }
  return ctx;
}
