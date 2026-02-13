/**
 * Organization Section Handlers
 *
 * Centralized onSave handlers for organization settings sections.
 * Used by both organization-settings-container and settings-dialog.
 *
 * @see organization-settings-container.tsx
 * @see settings-dialog.tsx
 */

import type { useUpdateOrganization, useUpdateOrganizationSettings } from "@/hooks/organizations";
import {
  orgToGeneralForm,
  orgToAddressForm,
  settingsToRegionalForm,
  settingsToFinancialForm,
  settingsToBrandingForm,
} from "./form-mappers";
import type {
  GeneralSettingsData,
  AddressSettingsData,
  RegionalSettingsData,
  FinancialSettingsData,
  BrandingSettingsData,
} from "@/lib/schemas/settings";
import type { Organization } from "@/lib/schemas/auth";

/** Org from server may have null; mappers expect undefined. @see SCHEMA-TRACE.md type flow */
type OrgFromServer = Pick<Organization, 'name' | 'slug' | 'id' | 'isActive' | 'plan' | 'createdAt' | 'updatedAt'> & {
  abn?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: unknown;
};

function normalizeOrgForForm(org: OrgFromServer): Organization {
  return {
    ...org,
    abn: org.abn ?? undefined,
    email: org.email ?? undefined,
    phone: org.phone ?? undefined,
    website: org.website ?? undefined,
    address: org.address ?? undefined,
  };
}

export function createOrganizationSectionHandlers(
  updateOrganization: ReturnType<typeof useUpdateOrganization>,
  updateSettings: ReturnType<typeof useUpdateOrganizationSettings>
) {
  return {
    onSaveGeneral: async (data: GeneralSettingsData) => {
      const org = await updateOrganization.mutateAsync(data);
      return orgToGeneralForm(normalizeOrgForForm(org));
    },
    onSaveAddress: async (data: AddressSettingsData) => {
      const org = await updateOrganization.mutateAsync({
        address: {
          street1: data.addressLine1,
          street2: data.addressLine2,
          city: data.suburb,
          state: data.state,
          postalCode: data.postcode,
          country: data.country,
        },
      });
      return orgToAddressForm(normalizeOrgForForm(org));
    },
    onSaveRegional: async (data: RegionalSettingsData) => {
      const settingsResult = await updateSettings.mutateAsync({
        timezone: data.timezone,
        locale: data.locale,
        currency: data.currency,
        dateFormat: data.dateFormat,
        timeFormat: data.timeFormat as "12h" | "24h",
        weekStartDay: data.weekStartDay,
        numberFormat: data.numberFormat,
      });
      return settingsToRegionalForm(settingsResult);
    },
    onSaveFinancial: async (data: FinancialSettingsData) => {
      const settingsResult = await updateSettings.mutateAsync({
        fiscalYearStart: data.fiscalYearStart,
        defaultPaymentTerms: data.defaultPaymentTerms,
        defaultTaxRate: data.defaultTaxRate,
      });
      return settingsToFinancialForm(settingsResult);
    },
    onSaveBranding: async (data: BrandingSettingsData) => {
      const settingsResult = await updateSettings.mutateAsync({
        portalBranding: {
          logoUrl: data.logoUrl || undefined,
          primaryColor: data.primaryColor || undefined,
          secondaryColor: data.secondaryColor || undefined,
          websiteUrl: data.websiteUrl || undefined,
        },
      });
      return settingsToBrandingForm(settingsResult);
    },
  };
}
