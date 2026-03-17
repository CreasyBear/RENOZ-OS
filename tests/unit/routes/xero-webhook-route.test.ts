import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockVerifySignature = vi.fn();
const mockApplyXeroPaymentWebhookEvent = vi.fn();
const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
};

vi.mock('@/server/functions/financial/xero-webhook-signature', () => ({
  verifyXeroWebhookSignature: (...args: unknown[]) => mockVerifySignature(...args),
}));

vi.mock('@/server/functions/financial/xero-invoice-sync', () => ({
  applyXeroPaymentWebhookEvent: (...args: unknown[]) => mockApplyXeroPaymentWebhookEvent(...args),
}));

vi.mock('@/lib/logger', () => ({
  logger: mockLogger,
}));

describe('xero webhook route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('XERO_WEBHOOK_SECRET', 'secret');
    vi.stubEnv('XERO_WEBHOOKS_ENABLED', 'true');
  });

  it('rejects invalid signatures', async () => {
    mockVerifySignature.mockReturnValue(false);
    const { POST } = await import('@/routes/api/webhooks/xero');

    const response = await POST({
      request: new Request('https://example.com/api/webhooks/xero', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-xero-signature': 'bad-signature',
        },
        body: JSON.stringify({
          events: [
            {
              id: 'evt-1',
              eventCategory: 'PAYMENT',
              eventType: 'CREATE',
              tenantId: 'tenant-1',
              resourceId: 'payment-1',
            },
          ],
        }),
      }),
    });

    expect(response.status).toBe(401);
    expect(mockApplyXeroPaymentWebhookEvent).not.toHaveBeenCalled();
  });

  it('verifies the exact raw body and applies parsed Xero events once', async () => {
    mockVerifySignature.mockReturnValue(true);
    mockApplyXeroPaymentWebhookEvent.mockResolvedValue({
      success: true,
      duplicate: false,
      orderId: 'order-1',
      resultState: 'applied',
    });

    const rawBody = JSON.stringify({
      events: [
        {
          id: 'evt-1',
          eventCategory: 'PAYMENT',
          eventType: 'CREATE',
          tenantId: 'tenant-1',
          resourceId: 'payment-1',
          resourceUrl: 'https://api.xero.com/api.xro/2.0/Payments/payment-1',
        },
      ],
    });

    const { POST } = await import('@/routes/api/webhooks/xero');

    const response = await POST({
      request: new Request('https://example.com/api/webhooks/xero', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-xero-signature': 'good-signature',
        },
        body: rawBody,
      }),
    });

    expect(response.status).toBe(200);
    expect(mockVerifySignature).toHaveBeenCalledWith(rawBody, 'good-signature', 'secret');
    expect(mockApplyXeroPaymentWebhookEvent).toHaveBeenCalledTimes(1);
    expect(mockApplyXeroPaymentWebhookEvent).toHaveBeenCalledWith({
      id: 'evt-1',
      eventCategory: 'PAYMENT',
      eventType: 'CREATE',
      tenantId: 'tenant-1',
      resourceId: 'payment-1',
      resourceUrl: 'https://api.xero.com/api.xro/2.0/Payments/payment-1',
    });
  });

  it('returns 200 when a verified payment references an unknown invoice', async () => {
    mockVerifySignature.mockReturnValue(true);
    mockApplyXeroPaymentWebhookEvent.mockResolvedValue({
      success: false,
      retryable: false,
      resultState: 'unknown_invoice',
      error: 'Order not found for Xero invoice: inv-missing',
    });

    const { POST } = await import('@/routes/api/webhooks/xero');

    const response = await POST({
      request: new Request('https://example.com/api/webhooks/xero', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-xero-signature': 'good-signature',
        },
        body: JSON.stringify({
          events: [
            {
              id: 'evt-1',
              eventCategory: 'PAYMENT',
              eventType: 'CREATE',
              tenantId: 'tenant-1',
              resourceId: 'payment-1',
            },
          ],
        }),
      }),
    });

    expect(response.status).toBe(200);
  });

  it('returns 503 for retryable delivery failures', async () => {
    mockVerifySignature.mockReturnValue(true);
    mockApplyXeroPaymentWebhookEvent.mockResolvedValue({
      success: false,
      retryable: true,
      resultState: 'processing',
      error: 'Xero rate limit exceeded',
    });

    const { POST } = await import('@/routes/api/webhooks/xero');

    const response = await POST({
      request: new Request('https://example.com/api/webhooks/xero', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-xero-signature': 'good-signature',
        },
        body: JSON.stringify({
          events: [
            {
              id: 'evt-2',
              eventCategory: 'PAYMENT',
              eventType: 'CREATE',
              tenantId: 'tenant-1',
              resourceId: 'payment-2',
            },
          ],
        }),
      }),
    });

    expect(response.status).toBe(503);
  });
});
