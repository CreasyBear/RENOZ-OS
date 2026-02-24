/**
 * Address formatting utilities for PDF documents
 *
 * Ensures addresses render without "undefined" and handle partial/international formats.
 * @see docs/DOCUMENT_DESIGN_SYSTEM.md - Edge cases
 */

export interface AddressInput {
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
}

/**
 * Format address into an array of non-empty lines for rendering.
 * City/state/postcode joined with ", " — never renders "undefined".
 *
 * @example
 * formatAddressLines({ addressLine1: "123 Main St", city: "Sydney", state: "NSW", postalCode: "2000" })
 * // => ["123 Main St", "Sydney, NSW 2000"]
 */
export function formatAddressLines(address: AddressInput | null | undefined): string[] {
  if (!address) return [];

  const lines: string[] = [];

  if (address.addressLine1) {
    const line1 = address.addressLine2
      ? `${address.addressLine1}, ${address.addressLine2}`
      : address.addressLine1;
    lines.push(line1);
  } else if (address.addressLine2) {
    lines.push(address.addressLine2);
  }

  const cityLine = [address.city, address.state, address.postalCode]
    .filter(Boolean)
    .join(" ");
  if (cityLine) lines.push(cityLine);

  if (address.country) lines.push(address.country);

  return lines;
}
