import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckboxField,
  FormField,
  NumberField,
  SelectField,
  TextareaField,
  TextField,
} from '@/components/shared/forms';
import type { TanStackFormApi } from '@/hooks/_shared/use-tanstack-form';
import type { ShipOrderFormData } from '@/lib/schemas/orders/ship-order-form';
import { cn } from '@/lib/utils';
import {
  getShipOrderCarrierServices,
  SHIP_ORDER_CARRIERS,
  SHIP_ORDER_SELECT_PLACEHOLDER_VALUE,
} from './ship-order-carrier-workflow';

export type ShipOrderCarrierForm = TanStackFormApi<ShipOrderFormData>;

export interface ShipOrderCarrierSectionProps {
  form: ShipOrderCarrierForm;
  resolvedCarrier: string;
}

export function ShipOrderCarrierSection({
  form,
  resolvedCarrier,
}: ShipOrderCarrierSectionProps) {
  const carrier = form.state.values.carrier ?? '';
  const services = getShipOrderCarrierServices(carrier);

  return (
    <div className="space-y-4">
      <Label className="text-base">Carrier Details</Label>

      <div
        className={cn(
          'grid gap-4',
          carrier === 'other' ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-2'
        )}
      >
        <form.Field name="carrier">
          {(field) => (
            <FormField
              label="Carrier"
              name={field.name}
              error={
                field.state.meta.isTouched && field.state.meta.errors[0]
                  ? String(field.state.meta.errors[0])
                  : undefined
              }
            >
              <Select
                value={field.state.value || SHIP_ORDER_SELECT_PLACEHOLDER_VALUE}
                onValueChange={(value) => {
                  if (value === SHIP_ORDER_SELECT_PLACEHOLDER_VALUE) return;
                  field.handleChange(value);
                  if (value !== 'other') {
                    form.setFieldValue('customCarrier', '');
                  }
                  form.setFieldValue('carrierService', '');
                }}
              >
                <SelectTrigger id="carrier">
                  <SelectValue placeholder="Select carrier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SHIP_ORDER_SELECT_PLACEHOLDER_VALUE} disabled>
                    Select carrier
                  </SelectItem>
                  {SHIP_ORDER_CARRIERS.map((carrierOption) => (
                    <SelectItem key={carrierOption.value} value={carrierOption.value}>
                      {carrierOption.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          )}
        </form.Field>

        {carrier === 'other' && (
          <form.Field name="customCarrier">
            {(field) => (
              <TextField field={field} label="Carrier Name" placeholder="Enter carrier name" />
            )}
          </form.Field>
        )}

        <form.Field name="carrierService">
          {(field) => (
            <SelectField
              field={field}
              label="Service"
              options={services.map((service) => ({ value: service, label: service }))}
              placeholder={carrier === 'other' ? 'No preset services' : 'Select service'}
              disabled={!carrier || carrier === 'other' || services.length === 0}
            />
          )}
        </form.Field>
      </div>

      <form.Field name="trackingNumber">
        {(field) => (
          <TextField field={field} label="Tracking Number" placeholder="Enter tracking number" />
        )}
      </form.Field>

      <form.Field name="shippingCost">
        {(field) => (
          <NumberField
            field={field}
            label="Actual Shipping Cost ($)"
            placeholder="0.00"
            min={0}
            step={0.01}
            description="Record the actual cost charged by the carrier (optional)"
          />
        )}
      </form.Field>

      <form.Field name="notes">
        {(field) => (
          <TextareaField
            field={field}
            label="Notes (Optional)"
            placeholder="Internal shipping notes..."
            rows={2}
          />
        )}
      </form.Field>

      <form.Field name="shipNow">
        {(field) => (
          <CheckboxField
            field={field}
            label="Mark as shipped immediately"
            description="If unchecked, shipment will be created in pending status"
          />
        )}
      </form.Field>

      {form.state.values.shipNow && !resolvedCarrier && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Please select a carrier to mark as shipped</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
