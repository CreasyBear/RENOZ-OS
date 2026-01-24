/**
 * CustomerStep Component
 *
 * Step 1: Select a customer for the order.
 */

import { memo } from 'react';
import { CustomerSelector } from '../../customer-selector';
import type { StepProps } from '../types';

export const CustomerStep = memo(function CustomerStep({ state, setState }: StepProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Select Customer</h3>
        <p className="text-muted-foreground text-sm">Choose the customer for this order</p>
      </div>
      <CustomerSelector
        selectedCustomerId={state.customer?.id ?? null}
        onSelect={(customer) => setState((s) => ({ ...s, customer }))}
      />
    </div>
  );
});
