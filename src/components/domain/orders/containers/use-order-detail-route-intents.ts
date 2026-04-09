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
  const blockedShipSearchHandledRef = useRef(false);
  const [shipIntentBlockedReason, setShipIntentBlockedReason] = useState<ShipIntentBlockedReason>(null);

  useEffect(() => {
    if (options.pickFromSearch) {
      options.openPick();
    }
  }, [options.pickFromSearch, options.openPick]);

  useEffect(() => {
    if (
      options.shipFromSearch &&
      options.shipChecksReady &&
      options.canShip &&
      options.dialogOpen !== 'ship'
    ) {
      blockedShipSearchHandledRef.current = false;
      globalThis.queueMicrotask(() => setShipIntentBlockedReason(null));
      options.openShip();
    }
  }, [options.canShip, options.dialogOpen, options.openShip, options.shipChecksReady, options.shipFromSearch]);

  useEffect(() => {
    if (!options.shipFromSearch) {
      blockedShipSearchHandledRef.current = false;
      globalThis.queueMicrotask(() => setShipIntentBlockedReason(null));
      return;
    }
    if (!options.orderStatus || !options.shipChecksReady) return;

    if (options.canShip) {
      blockedShipSearchHandledRef.current = false;
      globalThis.queueMicrotask(() => setShipIntentBlockedReason(null));
      return;
    }
    if (blockedShipSearchHandledRef.current) return;

    blockedShipSearchHandledRef.current = true;
    globalThis.queueMicrotask(() => setShipIntentBlockedReason(options.shipBlockedReason));
    options.clearSearch();
  }, [
    options.canShip,
    options.clearSearch,
    options.orderStatus,
    options.shipBlockedReason,
    options.shipChecksReady,
    options.shipFromSearch,
  ]);

  useEffect(() => {
    if (options.paymentFromSearch && options.dialogOpen !== 'payment') {
      options.openPayment();
    }
  }, [options.dialogOpen, options.openPayment, options.paymentFromSearch]);

  useEffect(() => {
    if (options.editFromSearch && options.dialogOpen !== 'edit') {
      options.openEdit();
    }
  }, [
    options.dialogOpen,
    options.editFromSearch,
    options.openEdit,
  ]);

  return {
    shipIntentBlockedReason,
  };
}
