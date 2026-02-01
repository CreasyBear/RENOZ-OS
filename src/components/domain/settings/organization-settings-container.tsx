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
  type GeneralSettingsData,
  type AddressSettingsData,
  type RegionalSettingsData,
  type FinancialSettingsData,
} from "./settings-sections";
import {
  PreferencesSettingsSection,
  SecuritySettingsSection,
  ApiTokensSettingsSection,
  TargetsSettingsSection,
  WinLossSettingsSection,
  type PreferencesSettingsData,
  type SecuritySettingsData,
  type TargetsSettingsData,
} from "./settings-sections-extended";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  Building2,
  MapPin,
  Globe,
  DollarSign,
  Key,
  Shield,
  Target,
  Wrench,
  FileText,
  FolderOpen,
} from "lucide-react";
import { toast } from "sonner";

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
  // Security & Access
  { id: "security", label: "Security", icon: <Shield className="w-4 h-4" />, group: "Security & Access" },
  { id: "api-tokens", label: "API Tokens", icon: <Key className="w-4 h-4" />, group: "Security & Access" },
  // Operations
  { id: "targets", label: "Targets", icon: <Target className="w-4 h-4" />, group: "Operations" },
  { id: "win-loss", label: "Win/Loss Reasons", icon: <FileText className="w-4 h-4" />, group: "Operations" },
  { id: "categories", label: "Categories", icon: <FolderOpen className="w-4 h-4" />, group: "Operations" },
  // Preferences
  { id: "preferences", label: "Preferences", icon: <Wrench className="w-4 h-4" />, group: "Preferences" },
];

const SECTION_GROUPS = ["Organization", "Security & Access", "Operations", "Preferences"];

// ============================================================================
// CONTAINER COMPONENT
// ============================================================================

export interface UnifiedSettingsContainerProps {
  initialSection?: string;
}

export function UnifiedSettingsContainer({ initialSection = "general" }: UnifiedSettingsContainerProps) {
  const [activeSection, setActiveSection] = useState(initialSection);

  // Fetch organization data
  const { data: organization, isLoading: orgLoading, error: orgError } = useOrganizationQuery();

  // Get settings from context
  const settings = useOrganizationSettings();

  // Mutations
  const updateOrganization = useUpdateOrganization();
  const updateSettings = useUpdateOrganizationSettings();

  // Loading state
  if (orgLoading) {
    return <LoadingState />;
  }

  // Error state
  if (orgError) {
    return <ErrorState error={orgError} />;
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
  };

  const financialData: FinancialSettingsData = {
    fiscalYearStart: settings.fiscalYearStart ?? 7,
    defaultPaymentTerms: settings.defaultPaymentTerms ?? 30,
    defaultTaxRate: settings.defaultTaxRate ?? 0,
  };

  const preferencesData: PreferencesSettingsData = {
    theme: "system",
    accentColor: "blue",
    density: "comfortable",
    notifications_email: true,
    notifications_inApp: true,
    notifications_sound: false,
    tablePageSize: "25",
    stickyHeaders: true,
    reduceMotion: false,
  };

  const securityData: SecuritySettingsData = {
    twoFactorEnabled: false,
    sessionTimeout: "60",
    requirePasswordChange: false,
    passwordExpiryDays: "never",
  };

  const targetsData: TargetsSettingsData = {
    salesTarget: 10,
    leadTarget: 50,
    conversionTarget: 20,
    revenueTarget: 100000,
  };

  // ============================================================================
  // SECTION RENDERING (only active section visible)
  // ============================================================================

  const renderSection = () => {
    switch (activeSection) {
      case "general":
        return (
          <GeneralSettingsSection
            data={generalData}
            onSave={async (data) => { await updateOrganization.mutateAsync(data); }}
            isSaving={updateOrganization.isPending}
          />
        );

      case "address":
        return (
          <AddressSettingsSection
            data={addressData}
            onSave={async (data) => {
              await updateOrganization.mutateAsync({
                address: {
                  street1: data.addressLine1,
                  street2: data.addressLine2,
                  city: data.suburb,
                  state: data.state,
                  postalCode: data.postcode,
                  country: data.country,
                },
              });
            }}
            isSaving={updateOrganization.isPending}
          />
        );

      case "regional":
        return (
          <RegionalSettingsSection
            data={regionalData}
            onSave={async (data) => {
              await updateSettings.mutateAsync({
                timezone: data.timezone,
                locale: data.locale,
                currency: data.currency,
                dateFormat: data.dateFormat,
                timeFormat: data.timeFormat as "12h" | "24h",
                weekStartDay: data.weekStartDay,
              });
            }}
            isSaving={updateSettings.isPending}
          />
        );

      case "financial":
        return (
          <FinancialSettingsSection
            data={financialData}
            onSave={async (data) => {
              await updateSettings.mutateAsync({
                fiscalYearStart: data.fiscalYearStart,
                defaultPaymentTerms: data.defaultPaymentTerms,
                defaultTaxRate: data.defaultTaxRate,
              });
            }}
            isSaving={updateSettings.isPending}
          />
        );

      case "preferences":
        return (
          <PreferencesSettingsSection
            data={preferencesData}
            onSave={async (key, value) => {
              // TODO: Wire to preferences API/hook
              console.log("Save preference:", key, value);
              toast.success("Preference saved");
            }}
          />
        );

      case "security":
        return (
          <SecuritySettingsSection
            data={securityData}
            onSave={async (key, value) => {
              // TODO: Wire to security API/hook
              console.log("Save security setting:", key, value);
              toast.success("Setting saved");
            }}
            onChangePassword={() => {
              // TODO: Open password change dialog
              toast.info("Password change dialog coming soon");
            }}
            onViewSessions={() => {
              // TODO: Navigate to sessions view
              toast.info("Sessions view coming soon");
            }}
          />
        );

      case "api-tokens":
        return (
          <ApiTokensSettingsSection
            tokens={[]}
            onCreateToken={() => toast.info("Create token dialog coming soon")}
            onRevokeToken={(id) => console.log("Revoke token:", id)}
          />
        );

      case "targets":
        return (
          <TargetsSettingsSection
            data={targetsData}
            onSave={async (data) => {
              // TODO: Wire to targets API/hook
              console.log("Save targets:", data);
              toast.success("Targets saved");
            }}
          />
        );

      case "win-loss":
        return (
          <WinLossSettingsSection
            reasons={[]}
            onCreateReason={(type) => toast.info(`Create ${type} reason dialog coming soon`)}
            onToggleReason={(id, isActive) => console.log("Toggle reason:", id, isActive)}
            onDeleteReason={(id) => console.log("Delete reason:", id)}
          />
        );

      case "categories":
        return (
          <div className="py-8 text-center text-muted-foreground">
            <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p className="text-sm">Categories management coming soon</p>
          </div>
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

function ErrorState({ error }: { error: Error }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <AlertCircle className="h-12 w-12 mb-4 text-destructive" />
      <h3 className="text-lg font-medium text-foreground">Failed to load settings</h3>
      <p className="text-sm mt-1">{error.message}</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-4 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
      >
        Retry
      </button>
    </div>
  );
}

// Re-export old container for backwards compatibility
export { UnifiedSettingsContainer as OrganizationSettingsContainer };
