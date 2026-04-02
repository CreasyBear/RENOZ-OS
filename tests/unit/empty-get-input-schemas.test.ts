import { beforeAll, describe, expect, it } from 'vitest';

beforeAll(() => {
  process.env.RESEND_API_KEY ??= 're_test_key';
});

describe('empty GET input schemas', () => {
  it('treat omitted customer analytics input as an empty object', async () => {
    const { emptyAnalyticsInputSchema } = await import('@/server/functions/customers/customer-analytics');
    expect(emptyAnalyticsInputSchema.parse(undefined)).toEqual({});
  });

  it('defaults omitted customer analytics date range input', async () => {
    const { dateRangeSchema } = await import('@/server/functions/customers/customer-analytics');
    expect(dateRangeSchema.parse(undefined)).toEqual({ range: '30d' });
  });

  it('defaults omitted customer analytics value range input', async () => {
    const { valueRangeSchema } = await import('@/server/functions/customers/customer-analytics');
    expect(valueRangeSchema.parse(undefined)).toEqual({ range: '6m' });
  });

  it('defaults omitted customer analytics lifecycle range input', async () => {
    const { lifecycleRangeSchema } = await import('@/server/functions/customers/customer-analytics');
    expect(lifecycleRangeSchema.parse(undefined)).toEqual({ range: '6m' });
  });

  it('treat omitted quote validity stats input as an empty object', async () => {
    const { getQuoteValidityStatsSchema } = await import('@/server/functions/pipeline/quote-versions');
    expect(getQuoteValidityStatsSchema.parse(undefined)).toEqual({});
  });

  it('treat omitted product import template input as an empty object', async () => {
    const { getImportTemplateSchema } = await import('@/server/functions/products/product-bulk-ops');
    expect(getImportTemplateSchema.parse(undefined)).toEqual({});
  });

  it('treat omitted default location input as an empty object', async () => {
    const { getDefaultLocationSchema } = await import('@/server/functions/products/product-inventory');
    expect(getDefaultLocationSchema.parse(undefined)).toEqual({});
  });

  it('treat omitted escalation summary input as an empty object', async () => {
    const { getEscalationSummarySchema } = await import('@/server/functions/support/escalation');
    expect(getEscalationSummarySchema.parse(undefined)).toEqual({});
  });

  it('treat omitted onboarding progress input as an empty object', async () => {
    const { emptyOnboardingProgressInputSchema } = await import('@/server/functions/users/onboarding');
    expect(emptyOnboardingProgressInputSchema.parse(undefined)).toEqual({});
  });

  it('treat omitted session list input as an empty object', async () => {
    const { emptySessionListInputSchema } = await import('@/server/functions/users/sessions');
    expect(emptySessionListInputSchema.parse(undefined)).toEqual({});
  });

  it('treat omitted session mutation input as an empty object', async () => {
    const { emptySessionMutationInputSchema } = await import('@/server/functions/users/sessions');
    expect(emptySessionMutationInputSchema.parse(undefined)).toEqual({});
  });

  it('treat omitted onboarding mutation input as an empty object', async () => {
    const { emptyOnboardingMutationInputSchema } = await import('@/server/functions/users/onboarding');
    expect(emptyOnboardingMutationInputSchema.parse(undefined)).toEqual({});
  });
});
