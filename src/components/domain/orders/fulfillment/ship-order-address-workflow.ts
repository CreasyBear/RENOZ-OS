import { useCallback, useMemo, useState } from 'react';
import type { AddressOption } from '@/components/shared';
import type { TanStackFormApi } from '@/hooks/_shared/use-tanstack-form';
import type { OrderWithCustomer } from '@/hooks/orders/use-order-detail';
import { toCountryCode } from '@/lib/country';
import type { ShipOrderFormData } from '@/lib/schemas/orders/ship-order-form';

const FALLBACK_RECIPIENT_NAME = 'Recipient';

export type ShipOrderAddressForm = TanStackFormApi<ShipOrderFormData>;

export function hasAnyShipOrderAddress(
  values: Pick<
    ShipOrderFormData,
    'addressStreet1' | 'addressCity' | 'addressState' | 'addressPostcode'
  >
): boolean {
  return !!(
    values.addressStreet1?.trim() ||
    values.addressCity?.trim() ||
    values.addressState?.trim() ||
    values.addressPostcode?.trim()
  );
}

export function isShipOrderAddressIncomplete(values: ShipOrderFormData): boolean {
  return (
    hasAnyShipOrderAddress(values) &&
    !(
      values.addressName?.trim() &&
      values.addressStreet1?.trim() &&
      values.addressCity?.trim() &&
      values.addressState?.trim() &&
      values.addressPostcode?.trim()
    )
  );
}

export function buildShipOrderAddressOptions(
  order: OrderWithCustomer | null | undefined
): AddressOption[] {
  const options: AddressOption[] = [];
  const seen = new Set<string>();

  const orderAddress = order?.shippingAddress;
  if (orderAddress?.street1) {
    const key = `order-${orderAddress.street1}-${orderAddress.city}-${orderAddress.postalCode}`;
    if (!seen.has(key)) {
      seen.add(key);
      options.push({
        id: 'order-shipping',
        type: 'shipping',
        street1: orderAddress.street1,
        street2: orderAddress.street2 ?? null,
        city: orderAddress.city,
        state: orderAddress.state ?? null,
        postalCode: orderAddress.postalCode,
        country: orderAddress.country ?? null,
        contactName: orderAddress.contactName ?? null,
        contactPhone: orderAddress.contactPhone ?? null,
      });
    }
  }

  for (const address of order?.customer?.addresses ?? []) {
    if (!address.street1) continue;

    const key = `${address.id}-${address.street1}-${address.city}`;
    if (seen.has(key)) continue;

    seen.add(key);
    options.push({
      id: address.id,
      type: address.type as AddressOption['type'],
      street1: address.street1,
      street2: address.street2 ?? null,
      city: address.city,
      state: address.state ?? null,
      postcode: address.postcode ?? null,
      country: address.country ?? null,
    });
  }

  return options;
}

export function buildShipOrderShippingAddress(values: ShipOrderFormData) {
  if (!hasAnyShipOrderAddress(values)) return undefined;

  return {
    name: values.addressName?.trim() || FALLBACK_RECIPIENT_NAME,
    street1: values.addressStreet1!.trim(),
    street2: values.addressStreet2?.trim() || undefined,
    city: values.addressCity!.trim(),
    state: values.addressState!.trim(),
    postcode: values.addressPostcode!.trim(),
    country: toCountryCode(values.addressCountry),
    phone: values.addressPhone?.trim() || undefined,
  };
}

export function resolveShipOrderAddressSource({
  selectedAddress,
  shippingAddress,
}: {
  selectedAddress: AddressOption | null;
  shippingAddress: ReturnType<typeof buildShipOrderShippingAddress>;
}): 'order' | 'customer' | 'custom' {
  if (selectedAddress?.id === 'order-shipping') return 'order';
  if (selectedAddress) return 'customer';
  if (shippingAddress) return 'custom';
  return 'order';
}

export function getShipOrderCustomerAddressId(
  selectedAddress: AddressOption | null
): string | undefined {
  return selectedAddress && selectedAddress.id !== 'order-shipping'
    ? selectedAddress.id
    : undefined;
}

function applyAddressToForm({
  form,
  address,
  customerName,
}: {
  form: ShipOrderAddressForm;
  address: AddressOption | null;
  customerName?: string | null;
}) {
  if (!address) {
    form.setFieldValue('addressStreet1', '');
    form.setFieldValue('addressStreet2', '');
    form.setFieldValue('addressCity', '');
    form.setFieldValue('addressState', '');
    form.setFieldValue('addressPostcode', '');
    return;
  }

  form.setFieldValue('addressStreet1', address.street1 ?? '');
  form.setFieldValue('addressStreet2', address.street2 ?? '');
  form.setFieldValue('addressCity', address.city ?? '');
  form.setFieldValue('addressState', address.state?.trim() || 'N/A');
  form.setFieldValue('addressPostcode', address.postcode ?? address.postalCode ?? '');
  form.setFieldValue('addressCountry', toCountryCode(address.country));

  if (address.contactName) {
    form.setFieldValue('addressName', address.contactName);
  } else if (customerName) {
    form.setFieldValue('addressName', customerName);
  }

  if (address.contactPhone) {
    form.setFieldValue('addressPhone', address.contactPhone);
  }
}

export function useShipOrderAddressWorkflow({
  form,
  order,
}: {
  form: ShipOrderAddressForm;
  order: OrderWithCustomer | null | undefined;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<AddressOption | null>(null);
  const [saveToOrder, setSaveToOrder] = useState(false);

  const addressOptions = useMemo(() => buildShipOrderAddressOptions(order), [order]);
  const shippingAddress = buildShipOrderShippingAddress(form.state.values);
  const addressSource = resolveShipOrderAddressSource({ selectedAddress, shippingAddress });
  const customerAddressId =
    addressSource === 'customer' ? getShipOrderCustomerAddressId(selectedAddress) : undefined;
  const hasAddressForDisplay = hasAnyShipOrderAddress(form.state.values);

  const reset = useCallback(() => {
    setSelectedAddress(null);
    setIsExpanded(false);
    setSaveToOrder(false);
  }, []);

  const handleAddressSelect = useCallback(
    (address: AddressOption | null) => {
      setSelectedAddress(address);
      applyAddressToForm({
        form,
        address,
        customerName: order?.customer?.name,
      });
      setIsExpanded(true);
    },
    [form, order?.customer?.name]
  );

  return {
    addressOptions,
    addressSource,
    customerAddressId,
    handleAddressSelect,
    hasAddressForDisplay,
    isExpanded,
    reset,
    saveToOrder,
    selectedAddress,
    setIsExpanded,
    setSaveToOrder,
    shippingAddress,
  };
}
