import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  getOrderXeroAlertMessage,
  ORDER_XERO_ALERT_FALLBACK_MESSAGE,
} from '@/hooks/orders/order-xero-alert-messages';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('order Xero alert feedback contract', () => {
  it('maps Xero issue categories to operator-safe order detail copy', () => {
    expect(
      getOrderXeroAlertMessage({
        code: 'missing_contact_mapping',
        title: 'Customer mapping required',
        message: 'duplicate key value violates xero_contact_map constraint',
        nextAction: 'map_customer_contact',
        nextActionLabel: 'Map Customer Contact',
      })
    ).toBe('Customer needs a trusted Xero contact mapping before this invoice can sync.');

    expect(
      getOrderXeroAlertMessage({
        code: 'auth_failed',
        title: 'Reconnect Xero',
        message: 'refresh token leaked in provider stack trace',
        nextAction: 'reconnect_xero',
        nextActionLabel: 'Reconnect Xero',
      })
    ).toBe('Xero connection needs attention before this invoice can sync.');

    expect(
      getOrderXeroAlertMessage({
        code: 'missing_revenue_accounts',
        title: 'Finish Xero account setup',
        message: 'sql account lookup failed for revenue recognition settings',
        nextAction: 'open_org_settings',
        nextActionLabel: 'Open Org Settings',
      })
    ).toBe('Xero account settings need attention before this invoice can sync.');

    expect(
      getOrderXeroAlertMessage({
        code: 'validation_failed',
        title: 'Review invoice data',
        message: 'postgres validation exception exposed from Xero adapter',
        nextAction: 'review_validation',
        nextActionLabel: 'Review Data',
      })
    ).toBe('Invoice data needs review before this order can sync to Xero.');
  });

  it('falls back without exposing stored raw sync errors', () => {
    expect(getOrderXeroAlertMessage(null)).toBe(ORDER_XERO_ALERT_FALLBACK_MESSAGE);
    expect(
      getOrderXeroAlertMessage({
        code: 'unknown_provider_error',
        title: 'Unknown',
        message: 'database stack leaked from xeroSyncError column',
        nextAction: null,
        nextActionLabel: null,
      })
    ).toBe(ORDER_XERO_ALERT_FALLBACK_MESSAGE);
  });

  it('keeps order detail Xero alerts behind the alert formatter', () => {
    const source = read('src/hooks/orders/use-order-detail-data-alerts.ts');

    expect(source).toContain('getOrderXeroAlertMessage(xeroIssue)');
    expect(source).not.toContain('message: xeroIssue.message');
    expect(source).not.toContain('message: xeroIssue?.message ?? order.xeroSyncError');
    expect(source).not.toContain('order.xeroSyncError ??');
  });
});
