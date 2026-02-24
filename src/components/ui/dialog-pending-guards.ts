type OpenChangeHandler = (open: boolean) => void;

export function createPendingDialogOpenChangeHandler(
  isPending: boolean,
  onOpenChange: OpenChangeHandler
): OpenChangeHandler {
  return (nextOpen: boolean) => {
    if (!nextOpen && isPending) return;
    onOpenChange(nextOpen);
  };
}

export function createPendingDialogInteractionGuards(isPending: boolean) {
  return {
    onEscapeKeyDown: (event: Event) => {
      if (isPending) event.preventDefault();
    },
    onInteractOutside: (event: Event) => {
      if (isPending) event.preventDefault();
    },
  };
}
