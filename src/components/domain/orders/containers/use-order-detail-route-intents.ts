'use client';

import { useEffect, useRef, useState } from 'react';
import { toastError } from '@/hooks';

interface UseOrderDetailRouteIntentsOptions {
  orderStatus?: string;
  dialogOpen: string | null;
  editFromSearch: boolean;
  pickFromSearch: boolean;
  shipFromSearch: boolean;
  paymentFromSearch: boolean;
  clearSearch: () => void;
  openPick: () => void;
  openEdit: () => void;
  openShip: () => void;
  openPayment: () => void;
  closeDialog: () => void;
}

export function useOrderDetailRouteIntents(options: UseOrderDetailRouteIntentsOptions) {
  const blockedEditSearchHandledRef = useRef(false);
  const blockedShipSearchHandledRef = useRef(false);
  const [shipIntentBlocked, setShipIntentBlocked] = useState(false);

  useEffect(() => {
    if (options.pickFromSearch) {
      options.openPick();
    }
  }, [options.pickFromSearch, options.openPick]);

  useEffect(() => {
    if (
      options.shipFromSearch &&
      (options.orderStatus === 'picked' || options.orderStatus === 'partially_shipped') &&
      options.dialogOpen !== 'ship'
    ) {
      blockedShipSearchHandledRef.current = false;
      globalThis.queueMicrotask(() => setShipIntentBlocked(false));
      options.openShip();
    }
  }, [options.dialogOpen, options.openShip, options.orderStatus, options.shipFromSearch]);

  useEffect(() => {
    if (!options.shipFromSearch) {
      blockedShipSearchHandledRef.current = false;
      globalThis.queueMicrotask(() => setShipIntentBlocked(false));
      return;
    }
    if (!options.orderStatus) return;

    const canShip =
      options.orderStatus === 'picked' || options.orderStatus === 'partially_shipped';
    if (canShip) {
      blockedShipSearchHandledRef.current = false;
      globalThis.queueMicrotask(() => setShipIntentBlocked(false));
      return;
    }
    if (blockedShipSearchHandledRef.current) return;

    blockedShipSearchHandledRef.current = true;
    globalThis.queueMicrotask(() => setShipIntentBlocked(true));
    options.clearSearch();
  }, [options.clearSearch, options.orderStatus, options.shipFromSearch]);

  useEffect(() => {
    if (options.paymentFromSearch && options.dialogOpen !== 'payment') {
      options.openPayment();
    }
  }, [options.dialogOpen, options.openPayment, options.paymentFromSearch]);

  useEffect(() => {
    if (!options.editFromSearch) {
      blockedEditSearchHandledRef.current = false;
      return;
    }
    if (!options.orderStatus) return;

    if (options.orderStatus === 'draft') {
      blockedEditSearchHandledRef.current = false;
      if (options.dialogOpen !== 'edit') {
        options.openEdit();
      }
      return;
    }
    if (blockedEditSearchHandledRef.current) return;

    blockedEditSearchHandledRef.current = true;
    if (options.dialogOpen === 'edit') {
      options.closeDialog();
    }
    toastError('Only draft orders can be edited');
    options.clearSearch();
  }, [
    options.clearSearch,
    options.closeDialog,
    options.dialogOpen,
    options.editFromSearch,
    options.openEdit,
    options.orderStatus,
  ]);

  return {
    shipIntentBlocked,
  };
}
