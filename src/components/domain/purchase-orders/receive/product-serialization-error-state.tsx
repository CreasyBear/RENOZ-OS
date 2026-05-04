import { ErrorState } from '@/components/shared/error-state';
import type { ProductSerializationError } from '@/hooks/purchase-orders/use-product-serialization';
import {
  PRODUCT_SERIALIZATION_ERROR_TITLE,
  PRODUCT_SERIALIZATION_FALLBACK_MESSAGE,
  buildProductSerializationErrorMessages,
} from './product-serialization-error-messages';

interface ProductSerializationErrorStateProps {
  errors: ProductSerializationError[];
  productLabels: Map<string, string>;
  onRetry: () => void;
  retryLabel?: string;
}

export function ProductSerializationErrorState({
  errors,
  productLabels,
  onRetry,
  retryLabel = 'Retry',
}: ProductSerializationErrorStateProps) {
  const errorMessages = buildProductSerializationErrorMessages(errors, productLabels);

  return (
    <ErrorState
      title={PRODUCT_SERIALIZATION_ERROR_TITLE}
      message={
        errorMessages.length > 0
          ? errorMessages.join('; ')
          : PRODUCT_SERIALIZATION_FALLBACK_MESSAGE
      }
      onRetry={onRetry}
      retryLabel={retryLabel}
    />
  );
}
