/**
 * ProductsStep Component
 *
 * Step 2: Add products to the order using enhanced line items management.
 */

import { memo } from 'react';
import { OrderLineItems } from '../order-line-items';
import type { StepProps } from '../types';

export const ProductsStep = memo(function ProductsStep({
  state: _state,
  setState: _setState,
}: StepProps) {
  return (
    <div className="space-y-6">
      <OrderLineItems />
    </div>
  );
});
