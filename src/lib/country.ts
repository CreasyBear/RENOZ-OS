/**
 * Shared country utilities for address forms.
 * API expects 2-char ISO codes; customer addresses may store full names.
 */

export const DEFAULT_COUNTRY = "AU";

export interface CountryOption {
  value: string;
  label: string;
}

/** ISO country codes for address dropdowns. API expects 2-char codes. */
export const COUNTRY_OPTIONS: CountryOption[] = [
  { value: "AU", label: "Australia" },
  { value: "NZ", label: "New Zealand" },
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
  { value: "SG", label: "Singapore" },
  { value: "MY", label: "Malaysia" },
  { value: "ID", label: "Indonesia" },
  { value: "JP", label: "Japan" },
  { value: "CN", label: "China" },
  { value: "HK", label: "Hong Kong" },
  { value: "IN", label: "India" },
  { value: "PH", label: "Philippines" },
  { value: "TH", label: "Thailand" },
  { value: "VN", label: "Vietnam" },
  { value: "KR", label: "South Korea" },
  { value: "CA", label: "Canada" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "IE", label: "Ireland" },
  { value: "FJ", label: "Fiji" },
  { value: "PG", label: "Papua New Guinea" },
];

const BY_NAME: Record<string, string> = {
  australia: "AU",
  "new zealand": "NZ",
  "united states": "US",
  "united kingdom": "GB",
  uk: "GB",
  singapore: "SG",
  malaysia: "MY",
  indonesia: "ID",
  japan: "JP",
  china: "CN",
  "hong kong": "HK",
  india: "IN",
  philippines: "PH",
  thailand: "TH",
  vietnam: "VN",
  "south korea": "KR",
  canada: "CA",
  germany: "DE",
  france: "FR",
  ireland: "IE",
  fiji: "FJ",
  "papua new guinea": "PG",
};

const BY_CODE = new Map(COUNTRY_OPTIONS.map((o) => [o.value, o.label]));

/**
 * Normalize country to ISO code (API expects 2 chars).
 * Handles full names from customer addresses.
 */
export function toCountryCode(value: string | undefined | null): string {
  if (!value?.trim()) return DEFAULT_COUNTRY;
  const v = value.trim();
  if (v.length === 2) return v.toUpperCase();
  return BY_NAME[v.toLowerCase()] ?? DEFAULT_COUNTRY;
}

/** Get display label for an ISO code (e.g. "AU" → "Australia"). */
export function getCountryLabel(code: string | undefined | null): string {
  if (!code?.trim()) return COUNTRY_OPTIONS[0]!.label;
  const c = code.trim().toUpperCase();
  return BY_CODE.get(c) ?? c;
}
