import type { OrderAddress } from 'drizzle/schema/orders/orders';
import type { ServiceOwnerAddress } from 'drizzle/schema/service/service-owners';
import type { ServiceSystemAddress } from 'drizzle/schema/service/service-systems';
export type { ServiceOwnerAddress } from 'drizzle/schema/service/service-owners';
export type { ServiceSystemAddress } from 'drizzle/schema/service/service-systems';

export interface NormalizedOwnerInput {
  fullName: string;
  normalizedFullName: string;
  email: string | null;
  normalizedEmail: string | null;
  phone: string | null;
  normalizedPhone: string | null;
  address: ServiceOwnerAddress | null;
  notes: string | null;
}

export function normalizeWhitespace(value: string | null | undefined): string | null {
  const normalized = value?.trim().replace(/\s+/g, ' ') ?? '';
  return normalized ? normalized : null;
}

export function normalizeLowercase(value: string | null | undefined): string | null {
  return normalizeWhitespace(value)?.toLowerCase() ?? null;
}

export function normalizePhone(value: string | null | undefined): string | null {
  const digits = value?.replace(/[^\d+]/g, '').trim() ?? '';
  return digits ? digits : null;
}

export function normalizeOwnerInput(input: {
  fullName: string;
  email?: string | null;
  phone?: string | null;
  address?: ServiceOwnerAddress | null;
  notes?: string | null;
}): NormalizedOwnerInput {
  const fullName = normalizeWhitespace(input.fullName) ?? 'Unknown Owner';
  return {
    fullName,
    normalizedFullName: fullName.toLowerCase(),
    email: normalizeWhitespace(input.email),
    normalizedEmail: normalizeLowercase(input.email),
    phone: normalizeWhitespace(input.phone),
    normalizedPhone: normalizePhone(input.phone),
    address: input.address ?? null,
    notes: normalizeWhitespace(input.notes),
  };
}

export function toServiceSystemAddress(
  address: OrderAddress | ServiceOwnerAddress | null | undefined
): ServiceSystemAddress | null {
  if (!address?.street1 || !address.city || !address.state || !address.postalCode || !address.country) {
    return null;
  }

  return {
    street1: address.street1.trim(),
    street2: address.street2?.trim() || undefined,
    city: address.city.trim(),
    state: address.state.trim(),
    postalCode: address.postalCode.trim(),
    country: address.country.trim(),
  };
}

export function buildAddressKey(address: ServiceSystemAddress | null | undefined): string | null {
  if (!address) return null;
  const values = [
    address.street1,
    address.street2 ?? '',
    address.city,
    address.state,
    address.postalCode,
    address.country,
  ]
    .map((value) => normalizeLowercase(value) ?? '')
    .filter(Boolean);

  return values.length > 0 ? values.join('|') : null;
}

export function formatAddressLabel(address: ServiceSystemAddress | null | undefined): string | null {
  if (!address) return null;
  return [address.street1, address.city, address.state, address.postalCode, address.country]
    .filter(Boolean)
    .join(', ');
}

export function ownerMatchesExactly(
  existing: {
    normalizedEmail?: string | null;
    normalizedPhone?: string | null;
    normalizedFullName?: string | null;
  } | null | undefined,
  input: NormalizedOwnerInput
): boolean {
  if (!existing) return false;
  if (input.normalizedEmail && existing.normalizedEmail) {
    return input.normalizedEmail === existing.normalizedEmail;
  }

  if (input.normalizedPhone && existing.normalizedPhone) {
    return (
      input.normalizedPhone === existing.normalizedPhone &&
      input.normalizedFullName === existing.normalizedFullName
    );
  }

  return false;
}

export function ownerConflicts(
  existing: {
    normalizedEmail?: string | null;
    normalizedPhone?: string | null;
    normalizedFullName?: string | null;
  } | null | undefined,
  input: NormalizedOwnerInput
): boolean {
  if (!existing) return false;

  if (input.normalizedEmail && existing.normalizedEmail) {
    return input.normalizedEmail !== existing.normalizedEmail;
  }

  if (input.normalizedPhone && existing.normalizedPhone && input.normalizedFullName) {
    return (
      input.normalizedPhone !== existing.normalizedPhone ||
      input.normalizedFullName !== existing.normalizedFullName
    );
  }

  return false;
}
