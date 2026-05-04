'use client';

import { useEffect, useRef, useState } from 'react';

export type ShipIntentBlockedReason = 'status' | 'reserved_in_draft' | 'unavailable' | null;

interface UseOrderDetailRouteIntentsOptions {
  orderStatus?: string;
  shipChecksReady: boolean;
  canShip: boolean;
  shipBlockedReason: Exclude<ShipIntentBlockedReason, null>;
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
  const {
    orderStatus,
    shipChecksReady,
    canShip,
    shipBlockedReason,
    dialogOpen,
    editFromSearch,
    pickFromSearch,
    shipFromSearch,
    paymentFromSearch,
    clearSearch,
    openPick,
    openEdit,
    openShip,
    openPayment,
  } = options;

  const blockedShipSearchHandledRef = useRef(false);
  const [shipIntentBlockedReason, setShipIntentBlockedReason] = useState<ShipIntentBlockedReason>(null);

  useEffect(() => {
    if (pickFromSearch) {
      openPick();
    }
  }, [pickFromSearch, openPick]);

  useEffect(() => {
    if (
      shipFromSearch &&
      shipChecksReady &&
      canShip &&
      dialogOpen !== 'ship'
    ) {
      blockedShipSearchHandledRef.current = false;
      globalThis.queueMicrotask(() => setShipIntentBlockedReason(null));
      openShip();
    }
  }, [canShip, dialogOpen, openShip, shipChecksReady, shipFromSearch]);

  useEffect(() => {
    if (!shipFromSearch) {
      blockedShipSearchHandledRef.current = false;
      globalThis.queueMicrotask(() => setShipIntentBlockedReason(null));
      return;
    }
    if (!orderStatus || !shipChecksReady) return;

    if (canShip) {
      blockedShipSearchHandledRef.current = false;
      globalThis.queueMicrotask(() => setShipIntentBlockedReason(null));
      return;
    }
    if (blockedShipSearchHandledRef.current) return;

    blockedShipSearchHandledRef.current = true;
    globalThis.queueMicrotask(() => setShipIntentBlockedReason(shipBlockedReason));
    clearSearch();
  }, [
    canShip,
    clearSearch,
    orderStatus,
    shipBlockedReason,
    shipChecksReady,
    shipFromSearch,
  ]);

  useEffect(() => {
    if (paymentFromSearch && dialogOpen !== 'payment') {
      openPayment();
    }
  }, [dialogOpen, openPayment, paymentFromSearch]);

  useEffect(() => {
    if (editFromSearch && dialogOpen !== 'edit') {
      openEdit();
    }
  }, [dialogOpen, editFromSearch, openEdit]);

  return {
    shipIntentBlockedReason,
  };
}
