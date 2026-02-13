/**
 * Organization Settings Form Mappers
 *
 * Maps server response shapes to form section shapes for reset-after-mutation.
 * Single source of truth for org/settings → form conversion.
 *
 * @see organization-settings-container.tsx
 * @see settings-dialog.tsx
 */

import type { Organization } from "@/lib/schemas/auth";
import { organizationSettingsSchema } from "@/lib/schemas/auth";
import type {
  GeneralSettingsData,
  AddressSettingsData,
  RegionalSettingsData,
  FinancialSettingsData,
  BrandingSettingsData,
  OrganizationSettingsResponse,
} from "@/lib/schemas/settings";

export type { OrganizationSettingsResponse };

/** Address shape from Organization (server) */
type OrgAddress = { street1?: string; street2?: string; city?: string; state?: string; postalCode?: string; country?: string } | null | undefined;

export function orgToGeneralForm(org: Organization | null | undefined): GeneralSettingsData {
  return {
    name: org?.name ?? "",
    email: org?.email ?? "",
    phone: org?.phone ?? "",
    abn: org?.abn ?? "",
    website: org?.website ?? "",
  };
}

export function orgToAddressForm(org: Organization | null | undefined): AddressSettingsData {
  const addr = org?.address as OrgAddress | undefined;
  return {
    addressLine1: addr?.street1 ?? "",
    addressLine2: addr?.street2 ?? "",
    suburb: addr?.city ?? "",
    state: addr?.state ?? "",
    postcode: addr?.postalCode ?? "",
    country: addr?.country ?? "Australia",
  };
}

export function settingsToRegionalForm(settings: OrganizationSettingsResponse | null | undefined): RegionalSettingsData {
  const parsed = organizationSettingsSchema.safeParse({
    timezone: settings?.timezone ?? "Australia/Sydney",
    locale: settings?.locale ?? "en-AU",
    currency: settings?.currency ?? "AUD",
    dateFormat: settings?.dateFormat ?? "DD/MM/YYYY",
    timeFormat: settings?.timeFormat ?? "12h",
    weekStartDay: settings?.weekStartDay ?? 1,
    numberFormat: settings?.numberFormat ?? "1,234.56",
  });
  const data = parsed.success ? parsed.data : organizationSettingsSchema.parse({});
  return {
    timezone: data.timezone,
    locale: data.locale,
    currency: data.currency,
    dateFormat: data.dateFormat,
    timeFormat: data.timeFormat,
    weekStartDay: data.weekStartDay,
    numberFormat: data.numberFormat,
  };
}

export function settingsToFinancialForm(settings: OrganizationSettingsResponse | null | undefined): FinancialSettingsData {
  return {
    fiscalYearStart: settings?.fiscalYearStart ?? 7,
    defaultPaymentTerms: settings?.defaultPaymentTerms ?? 30,
    defaultTaxRate: settings?.defaultTaxRate ?? 0,
  };
}

/** Portal branding shape from server (may be empty object) */
type PortalBrandingLike = { logoUrl?: string; primaryColor?: string; secondaryColor?: string; websiteUrl?: string } | null | undefined;

export function settingsToBrandingForm(settings: OrganizationSettingsResponse | null | undefined): BrandingSettingsData {
  const branding = settings?.portalBranding as PortalBrandingLike;
  return {
    logoUrl: branding?.logoUrl ?? "",
    primaryColor: branding?.primaryColor ?? "",
    secondaryColor: branding?.secondaryColor ?? "",
    websiteUrl: branding?.websiteUrl ?? "",
  };
}
