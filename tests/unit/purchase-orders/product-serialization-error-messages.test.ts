import { describe, expect, it } from 'vitest';
import {
  PRODUCT_SERIALIZATION_FALLBACK_MESSAGE,
  buildProductSerializationErrorMessages,
  getSerializationErrorMessage,
} from '@/components/domain/purchase-orders/receive/product-serialization-error-messages';
import { normalizeReadQueryError } from '@/lib/read-path-policy';

describe('product serialization error messages', () => {
  it('uses read-path normalized copy for product serialization failures', () => {
    const error = normalizeReadQueryError(
      {
        message: 'database connection failed',
        statusCode: 503,
        code: 'INTERNAL_ERROR',
      },
      {
        contractType: 'detail-not-found',
        fallbackMessage: PRODUCT_SERIALIZATION_FALLBACK_MESSAGE,
        notFoundMessage: 'A product on this purchase order could not be found.',
      }
    );

    expect(getSerializationErrorMessage(error, PRODUCT_SERIALIZATION_FALLBACK_MESSAGE)).toBe(
      PRODUCT_SERIALIZATION_FALLBACK_MESSAGE
    );
  });

  it('does not surface raw non-read product serialization errors', () => {
    expect(
      getSerializationErrorMessage(
        new Error('duplicate key value violates unique constraint products_pkey'),
        PRODUCT_SERIALIZATION_FALLBACK_MESSAGE
      )
    ).toBe(PRODUCT_SERIALIZATION_FALLBACK_MESSAGE);

    expect(
      buildProductSerializationErrorMessages(
        [
          {
            productId: 'product-1',
            error: new Error('duplicate key value violates unique constraint products_pkey'),
          },
        ],
        new Map([['product-1', 'RENOZ LFP Module']])
      )
    ).toEqual([
      `RENOZ LFP Module: ${PRODUCT_SERIALIZATION_FALLBACK_MESSAGE}`,
    ]);
  });

  it('keeps normalized not-found copy for missing products', () => {
    const error = normalizeReadQueryError(
      {
        message: 'Product not found',
        statusCode: 404,
        code: 'NOT_FOUND',
      },
      {
        contractType: 'detail-not-found',
        fallbackMessage: PRODUCT_SERIALIZATION_FALLBACK_MESSAGE,
        notFoundMessage: 'A product on this purchase order could not be found.',
      }
    );

    expect(
      buildProductSerializationErrorMessages(
        [{ productId: 'product-1', error }],
        new Map([['product-1', 'RENOZ LFP Module']])
      )
    ).toEqual(['RENOZ LFP Module: A product on this purchase order could not be found.']);
  });
});
