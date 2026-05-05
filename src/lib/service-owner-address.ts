export interface ServiceOwnerAddressFormValues {
  street1: string;
  street2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface ServiceOwnerAddressInput {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export const OPTIONAL_SERVICE_OWNER_ADDRESS_ERROR =
  'Complete the owner address or clear all address fields.';

function hasAddressContent(values: ServiceOwnerAddressFormValues): boolean {
  return Boolean(
    values.street1.trim() ||
      values.street2.trim() ||
      values.city.trim() ||
      values.state.trim() ||
      values.postalCode.trim()
  );
}

export function getOptionalServiceOwnerAddressError(
  values: ServiceOwnerAddressFormValues
): string | null {
  if (!hasAddressContent(values)) {
    return null;
  }

  if (
    !values.street1.trim() ||
    !values.city.trim() ||
    !values.state.trim() ||
    !values.postalCode.trim() ||
    !values.country.trim()
  ) {
    return OPTIONAL_SERVICE_OWNER_ADDRESS_ERROR;
  }

  return null;
}

export function buildOptionalServiceOwnerAddress(
  values: ServiceOwnerAddressFormValues
): ServiceOwnerAddressInput | undefined {
  if (!hasAddressContent(values)) {
    return undefined;
  }

  return {
    street1: values.street1.trim(),
    street2: values.street2.trim() || undefined,
    city: values.city.trim(),
    state: values.state.trim(),
    postalCode: values.postalCode.trim(),
    country: values.country.trim().toUpperCase() || 'AU',
  };
}
