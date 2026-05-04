import { AlertCircle, ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import { AddressPicker, type AddressOption } from '@/components/shared';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { SelectField, TextField } from '@/components/shared/forms';
import {
  isShipOrderAddressIncomplete,
  type ShipOrderAddressForm,
} from './ship-order-address-workflow';

const AU_STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];

export interface ShipOrderAddressSectionProps {
  form: ShipOrderAddressForm;
  addressOptions: AddressOption[];
  selectedAddress: AddressOption | null;
  onAddressSelect: (address: AddressOption | null) => void;
  isExpanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  saveToOrder: boolean;
  onSaveToOrderChange: (saveToOrder: boolean) => void;
}

export function ShipOrderAddressSection({
  form,
  addressOptions,
  selectedAddress,
  onAddressSelect,
  isExpanded,
  onExpandedChange,
  saveToOrder,
  onSaveToOrderChange,
}: ShipOrderAddressSectionProps) {
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => onExpandedChange(!isExpanded)}
        className="flex w-full cursor-pointer items-center justify-between rounded-md text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <Label className="cursor-pointer text-base">Shipping Address</Label>
          {!isExpanded &&
            (form.state.values.addressStreet1 ? (
              <span className="text-sm text-muted-foreground">
                - {form.state.values.addressStreet1}, {form.state.values.addressCity}{' '}
                {form.state.values.addressState} {form.state.values.addressPostcode}
              </span>
            ) : addressOptions.length > 0 ? (
              <span className="text-sm text-muted-foreground">
                - Choose address or enter manually
              </span>
            ) : null)}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="space-y-4 rounded-lg border p-4">
          {isShipOrderAddressIncomplete(form.state.values) && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Address incomplete. Fill in all required fields to include a shipping address.
              </AlertDescription>
            </Alert>
          )}

          {addressOptions.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Choose address</Label>
              <AddressPicker
                addresses={addressOptions}
                selectedAddress={selectedAddress}
                onSelect={onAddressSelect}
                placeholder="Choose shipping address"
              />
              <p className="text-xs text-muted-foreground">
                Choose the order default, a saved customer address, or enter a one-off shipment address below
              </p>
            </div>
          )}

          <form.Field name="addressName">
            {(field) => (
              <TextField field={field} label="Recipient Name" placeholder="Recipient name" />
            )}
          </form.Field>

          <div className="grid grid-cols-2 gap-4">
            <form.Field name="addressStreet1">
              {(field) => <TextField field={field} label="Street" placeholder="Street address" />}
            </form.Field>
            <form.Field name="addressStreet2">
              {(field) => (
                <TextField field={field} label="Unit / Suite" placeholder="Unit, suite, etc." />
              )}
            </form.Field>
          </div>

          <div className="grid grid-cols-[1fr_auto_auto] gap-4">
            <form.Field name="addressCity">
              {(field) => <TextField field={field} label="City" placeholder="City" />}
            </form.Field>
            <form.Field name="addressState">
              {(field) => (
                <SelectField
                  field={field}
                  label="State"
                  options={AU_STATES.map((state) => ({ value: state, label: state }))}
                  placeholder="State"
                />
              )}
            </form.Field>
            <form.Field name="addressPostcode">
              {(field) => (
                <TextField
                  field={field}
                  label="Postcode"
                  placeholder="0000"
                  className="w-[100px]"
                />
              )}
            </form.Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <form.Field name="addressCountry">
              {(field) => (
                <TextField
                  field={field}
                  label="Country"
                  placeholder="AU"
                  className="w-[80px]"
                />
              )}
            </form.Field>
            <form.Field name="addressPhone">
              {(field) => (
                <TextField
                  field={field}
                  label="Phone"
                  placeholder="Phone number"
                  type="tel"
                />
              )}
            </form.Field>
          </div>

          {(form.state.values.addressStreet1 || form.state.values.addressCity) && (
            <div className="rounded-md border border-dashed p-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="save-shipment-address"
                  checked={saveToOrder}
                  onCheckedChange={(checked) => onSaveToOrderChange(checked === true)}
                />
                <div className="space-y-1">
                  <Label htmlFor="save-shipment-address" className="text-sm font-medium">
                    Save this as the order shipping address
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Leave this off to keep the shipment destination as a one-off override.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
