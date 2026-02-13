/**
 * Unified Settings Container
 *
 * Container component that fetches all settings data and composes
 * modular section components. Uses sidebar to show only active section.
 *
 * @source organization from useOrganizationQuery hook
 * @source settings from useOrganizationSettings context
 */

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useOrganizationQuery, useUpdateOrganization, useUpdateOrganizationSettings } from "@/hooks/organizations";
import { useOrganizationSettings } from "@/contexts/organization-settings-context";
import {
  SettingsShell,
  SettingsSidebarItem,
} from "./settings-ui";
import {
  GeneralSettingsSection,
  AddressSettingsSection,
  RegionalSettingsSection,
  FinancialSettingsSection,
  BrandingSettingsSection,
  type GeneralSettingsData,
  type AddressSettingsData,
  type RegionalSettingsData,
  type FinancialSettingsData,
  type BrandingSettingsData,
} from "./settings-sections";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Building2, MapPin, Globe, DollarSign, Palette } from "lucide-react";
import { queryKeys } from "@/lib/query-keys";
import { createOrganizationSectionHandlers } from "@/lib/settings/organization-section-handlers";

// ============================================================================
// SIDEBAR CONFIGURATION - All inline, no hrefs
// ============================================================================

type SidebarSection = {
  id: string;
  label: string;
  icon: React.ReactNode;
  group: string;
};

const SIDEBAR_SECTIONS: SidebarSection[] = [
  // Organization
  { id: "general", label: "General", icon: <Building2 className="w-4 h-4" />, group: "Organization" },
  { id: "address", label: "Address", icon: <MapPin className="w-4 h-4" />, group: "Organization" },
  { id: "regional", label: "Regional", icon: <Globe className="w-4 h-4" />, group: "Organization" },
  { id: "financial", label: "Financial", icon: <DollarSign className="w-4 h-4" />, group: "Organization" },
  { id: "branding", label: "Branding", icon: <Palette className="w-4 h-4" />, group: "Organization" },
];

const SECTION_GROUPS = ["Organization"];

// ============================================================================
// CONTAINER COMPONENT
// ============================================================================

export interface UnifiedSettingsContainerProps {
  initialSection?: string;
}

export function UnifiedSettingsContainer({ initialSection = "general" }: UnifiedSettingsContainerProps) {
  const [activeSection, setActiveSection] = useState(initialSection);
  const queryClient = useQueryClient();

  // Fetch organization data
  const { data: organization, isLoading: orgLoading, error: orgError } = useOrganizationQuery();

  // Get settings from context
  const settings = useOrganizationSettings();

  // Mutations
  const updateOrganization = useUpdateOrganization();
  const updateSettings = useUpdateOrganizationSettings();

  // Loading state (wait for both org and settings to avoid stale defaultValues)
  if (orgLoading || settings.isLoading) {
    return <LoadingState />;
  }

  // Error state
  if (orgError || settings.error) {
    return (
      <ErrorState
        error={orgError ?? settings.error ?? new Error("Failed to load settings")}
        onRetry={() => {
          queryClient.invalidateQueries({ queryKey: queryKeys.organizations.current() });
          queryClient.invalidateQueries({ queryKey: queryKeys.organizations.settings() });
        }}
      />
    );
  }

  // ============================================================================
  // DATA PREPARATION
  // ============================================================================

  const generalData: GeneralSettingsData = {
    name: organization?.name ?? "",
    email: organization?.email ?? "",
    phone: organization?.phone ?? "",
    abn: organization?.abn ?? "",
    website: organization?.website ?? "",
  };

  const addressData: AddressSettingsData = {
    addressLine1: organization?.address?.street1 ?? "",
    addressLine2: organization?.address?.street2 ?? "",
    suburb: organization?.address?.city ?? "",
    state: organization?.address?.state ?? "",
    postcode: organization?.address?.postalCode ?? "",
    country: organization?.address?.country ?? "Australia",
  };

  const regionalData: RegionalSettingsData = {
    timezone: settings.timezone,
    locale: settings.locale,
    currency: settings.currency,
    dateFormat: settings.dateFormat,
    timeFormat: settings.timeFormat,
    weekStartDay: settings.weekStartDay,
    numberFormat: settings.numberFormat,
  };

  const financialData: FinancialSettingsData = {
    fiscalYearStart: settings.fiscalYearStart ?? 7,
    defaultPaymentTerms: settings.defaultPaymentTerms ?? 30,
    defaultTaxRate: settings.defaultTaxRate ?? 0,
  };

  const brandingData: BrandingSettingsData = {
    logoUrl: settings.portalBranding?.logoUrl ?? "",
    primaryColor: settings.portalBranding?.primaryColor ?? "",
    secondaryColor: settings.portalBranding?.secondaryColor ?? "",
    websiteUrl: settings.portalBranding?.websiteUrl ?? "",
  };

  const handlers = createOrganizationSectionHandlers(updateOrganization, updateSettings);

  // ============================================================================
  // SECTION RENDERING (only active section visible)
  // ============================================================================

  const renderSection = () => {
    switch (activeSection) {
      case "general":
        return (
          <GeneralSettingsSection
            data={generalData}
            onSave={handlers.onSaveGeneral}
          />
        );

      case "address":
        return (
          <AddressSettingsSection
            data={addressData}
            onSave={handlers.onSaveAddress}
          />
        );

      case "regional":
        return (
          <RegionalSettingsSection
            data={regionalData}
            onSave={handlers.onSaveRegional}
          />
        );

      case "financial":
        return (
          <FinancialSettingsSection
            data={financialData}
            onSave={handlers.onSaveFinancial}
          />
        );

      case "branding":
        return (
          <BrandingSettingsSection
            data={brandingData}
            onSave={handlers.onSaveBranding}
          />
        );

      default:
        return (
          <div className="py-8 text-center text-muted-foreground">
            <p className="text-sm">Select a section from the sidebar</p>
          </div>
        );
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <SettingsShell
      title="Settings"
      sidebar={
        <>
          {SECTION_GROUPS.map((group) => (
            <div key={group} className="mb-4">
              <div className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                {group}
              </div>
              {SIDEBAR_SECTIONS.filter((s) => s.group === group).map((section) => (
                <SettingsSidebarItem
                  key={section.id}
                  label={section.label}
                  icon={section.icon}
                  isActive={activeSection === section.id}
                  onClick={() => setActiveSection(section.id)}
                />
              ))}
            </div>
          ))}
        </>
      }
    >
      {renderSection()}
    </SettingsShell>
  );
}

// ============================================================================
// LOADING & ERROR STATES
// ============================================================================

function LoadingState() {
  return (
    <div className="flex gap-8 animate-pulse">
      <div className="w-48 space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
      <div className="flex-1 space-y-6">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <AlertCircle className="h-12 w-12 mb-4 text-destructive" />
      <h3 className="text-lg font-medium text-foreground">Failed to load settings</h3>
      <p className="text-sm mt-1">{error.message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
      >
        Retry
      </button>
    </div>
  );
}

// Re-export old container for backwards compatibility
export { UnifiedSettingsContainer as OrganizationSettingsContainer };
