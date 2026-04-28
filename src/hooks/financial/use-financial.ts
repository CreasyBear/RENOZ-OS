/**
 * Financial hooks compatibility shim.
 *
 * New code should import from the focused hook modules or @/hooks/financial.
 * This file remains to preserve existing direct imports while the domain is split.
 */
export * from './use-financial-dashboard';
export * from './use-ar-aging';
export * from './use-payment-reminders';
export * from './use-revenue-recognition';
export * from './use-xero-sync';
export * from './use-credit-notes';
export * from './use-payment-schedules';
export * from './use-statements';
