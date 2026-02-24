import { useCallback, useReducer } from 'react';

export type DialogType =
  | 'pick'
  | 'edit'
  | 'ship'
  | 'confirmDelivery'
  | 'rma'
  | 'amendment'
  | 'payment'
  | null;

interface DialogState {
  open: DialogType;
  confirmDeliveryShipmentId: string | null;
}

type DialogAction =
  | { type: 'OPEN_PICK' }
  | { type: 'OPEN_EDIT' }
  | { type: 'OPEN_SHIP' }
  | { type: 'OPEN_CONFIRM_DELIVERY'; payload: { shipmentId: string } }
  | { type: 'OPEN_RMA' }
  | { type: 'OPEN_AMENDMENT' }
  | { type: 'OPEN_PAYMENT' }
  | { type: 'CLOSE' };

function dialogReducer(state: DialogState, action: DialogAction): DialogState {
  switch (action.type) {
    case 'OPEN_PICK':
      return { ...state, open: 'pick', confirmDeliveryShipmentId: null };
    case 'OPEN_EDIT':
      return { ...state, open: 'edit', confirmDeliveryShipmentId: null };
    case 'OPEN_SHIP':
      return { ...state, open: 'ship', confirmDeliveryShipmentId: null };
    case 'OPEN_CONFIRM_DELIVERY':
      return { ...state, open: 'confirmDelivery', confirmDeliveryShipmentId: action.payload.shipmentId };
    case 'OPEN_RMA':
      return { ...state, open: 'rma', confirmDeliveryShipmentId: null };
    case 'OPEN_AMENDMENT':
      return { ...state, open: 'amendment', confirmDeliveryShipmentId: null };
    case 'OPEN_PAYMENT':
      return { ...state, open: 'payment', confirmDeliveryShipmentId: null };
    case 'CLOSE':
      return { ...state, open: null, confirmDeliveryShipmentId: null };
    default:
      return state;
  }
}

function getInitialDialogState(pickFromSearch: boolean, editFromSearch: boolean): DialogState {
  return {
    open: pickFromSearch ? 'pick' : editFromSearch ? 'edit' : null,
    confirmDeliveryShipmentId: null,
  };
}

export interface UseOrderDetailDialogStateOptions {
  editFromSearch: boolean;
  pickFromSearch: boolean;
  shipFromSearch: boolean;
  paymentFromSearch: boolean;
  clearSearch: () => void;
}

export function useOrderDetailDialogState({
  editFromSearch,
  pickFromSearch,
  shipFromSearch,
  paymentFromSearch,
  clearSearch,
}: UseOrderDetailDialogStateOptions) {
  const [dialogState, dispatch] = useReducer(
    dialogReducer,
    getInitialDialogState(pickFromSearch, editFromSearch)
  );

  const handlePickDialogOpenChange = useCallback((open: boolean) => {
    if (open) {
      dispatch({ type: 'OPEN_PICK' });
      return;
    }
    dispatch({ type: 'CLOSE' });
    if (pickFromSearch) clearSearch();
  }, [clearSearch, pickFromSearch]);

  const handleShipDialogOpenChange = useCallback((open: boolean) => {
    if (open) {
      dispatch({ type: 'OPEN_SHIP' });
      return;
    }
    dispatch({ type: 'CLOSE' });
    if (shipFromSearch) clearSearch();
  }, [clearSearch, shipFromSearch]);

  const handleEditDialogOpenChange = useCallback((open: boolean) => {
    if (open) {
      dispatch({ type: 'OPEN_EDIT' });
      return;
    }
    dispatch({ type: 'CLOSE' });
    if (editFromSearch) clearSearch();
  }, [clearSearch, editFromSearch]);

  const handlePaymentDialogOpenChange = useCallback((open: boolean) => {
    if (open) {
      dispatch({ type: 'OPEN_PAYMENT' });
      return;
    }
    dispatch({ type: 'CLOSE' });
    if (paymentFromSearch) clearSearch();
  }, [clearSearch, paymentFromSearch]);

  const openPick = useCallback(() => dispatch({ type: 'OPEN_PICK' }), []);
  const openEdit = useCallback(() => dispatch({ type: 'OPEN_EDIT' }), []);
  const openShip = useCallback(() => dispatch({ type: 'OPEN_SHIP' }), []);
  const openConfirmDelivery = useCallback(
    (shipmentId: string) => dispatch({ type: 'OPEN_CONFIRM_DELIVERY', payload: { shipmentId } }),
    []
  );
  const openRma = useCallback(() => dispatch({ type: 'OPEN_RMA' }), []);
  const openAmendment = useCallback(() => dispatch({ type: 'OPEN_AMENDMENT' }), []);
  const openPayment = useCallback(() => dispatch({ type: 'OPEN_PAYMENT' }), []);
  const closeDialog = useCallback(() => dispatch({ type: 'CLOSE' }), []);

  return {
    dialogState,
    isInteractionDialogOpen: dialogState.open !== null,
    openPick,
    openEdit,
    openShip,
    openConfirmDelivery,
    openRma,
    openAmendment,
    openPayment,
    closeDialog,
    handlePickDialogOpenChange,
    handleShipDialogOpenChange,
    handleEditDialogOpenChange,
    handlePaymentDialogOpenChange,
  };
}
