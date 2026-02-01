/**
 * Organization Settings Presenter
 *
 * Pure UI component for the unified organization settings page.
 * Receives all data and callbacks as props - no data fetching.
 * Follows STANDARDS.md container/presenter pattern.
 */

import { useState, useCallback } from "react";
import {
  SettingsShell,
  SettingsSection,
  SettingsRow,
  SettingsSidebarItem,
} from "./settings-ui";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Building2, Globe, DollarSign, MapPin } from "lucide-react";
import { toast } from "sonner";

// ============================================================================
// TYPES
// ============================================================================

export interface OrganizationSettingsData {
  // General
  name: string;
  email: string;
  phone: string;
  abn: string;
  website: string;

  // Address
  addressLine1: string;
  addressLine2: string;
  suburb: string;
  state: string;
  postcode: string;
  country: string;

  // Regional
  timezone: string;
  locale: string;
  currency: string;
  dateFormat: string;
  timeFormat: string;
  weekStartDay: number;
  numberFormat: string;

  // Financial
  fiscalYearStart: number;
  defaultPaymentTerms: number;
  defaultTaxRate: number;
}

export interface OrganizationSettingsCallbacks {
  onUpdateGeneral: (values: Partial<OrganizationSettingsData>) => Promise<void>;
  onUpdateAddress: (values: Partial<OrganizationSettingsData>) => Promise<void>;
  onUpdateRegional: (values: Partial<OrganizationSettingsData>) => Promise<void>;
  onUpdateFinancial: (values: Partial<OrganizationSettingsData>) => Promise<void>;
}

export interface OrganizationSettingsPresenterProps {
  data: OrganizationSettingsData;
  callbacks: OrganizationSettingsCallbacks;
  initialSection?: string;
  isSaving?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SECTIONS = [
  { id: "general", label: "General", icon: <Building2 className="w-4 h-4" /> },
  { id: "address", label: "Address", icon: <MapPin className="w-4 h-4" /> },
  { id: "regional", label: "Regional", icon: <Globe className="w-4 h-4" /> },
  { id: "financial", label: "Financial", icon: <DollarSign className="w-4 h-4" /> },
] as const;

const TIMEZONES = [
  "Australia/Sydney",
  "Australia/Melbourne",
  "Australia/Brisbane",
  "Australia/Perth",
  "Australia/Adelaide",
  "Pacific/Auckland",
  "UTC",
] as const;

const CURRENCIES = ["AUD", "USD", "EUR", "GBP", "NZD"] as const;

const DATE_FORMATS = [
  { value: "DD/MM/YYYY", label: "31/12/2026" },
  { value: "MM/DD/YYYY", label: "12/31/2026" },
  { value: "YYYY-MM-DD", label: "2026-12-31" },
] as const;

const TIME_FORMATS = [
  { value: "12h", label: "12-hour (2:30 PM)" },
  { value: "24h", label: "24-hour (14:30)" },
] as const;

const FISCAL_MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
] as const;

const WEEK_DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 6, label: "Saturday" },
] as const;

// ============================================================================
// COMPONENT
// ============================================================================

export function OrganizationSettingsPresenter({
  data,
  callbacks,
  initialSection = "general",
  isSaving = false,
}: OrganizationSettingsPresenterProps) {
  const [activeSection, setActiveSection] = useState(initialSection);
  const [localData, setLocalData] = useState(data);
  const [hasChanges, setHasChanges] = useState(false);

  // Track field changes
  const updateField = useCallback(
    <K extends keyof OrganizationSettingsData>(
      field: K,
      value: OrganizationSettingsData[K]
    ) => {
      setLocalData((prev) => ({ ...prev, [field]: value }));
      setHasChanges(true);
    },
    []
  );

  // Save handler for each section
  const handleSave = async (section: string) => {
    try {
      switch (section) {
        case "general":
          await callbacks.onUpdateGeneral({
            name: localData.name,
            email: localData.email,
            phone: localData.phone,
            abn: localData.abn,
            website: localData.website,
          });
          break;
        case "address":
          await callbacks.onUpdateAddress({
            addressLine1: localData.addressLine1,
            addressLine2: localData.addressLine2,
            suburb: localData.suburb,
            state: localData.state,
            postcode: localData.postcode,
            country: localData.country,
          });
          break;
        case "regional":
          await callbacks.onUpdateRegional({
            timezone: localData.timezone,
            locale: localData.locale,
            currency: localData.currency,
            dateFormat: localData.dateFormat,
            timeFormat: localData.timeFormat,
            weekStartDay: localData.weekStartDay,
          });
          break;
        case "financial":
          await callbacks.onUpdateFinancial({
            fiscalYearStart: localData.fiscalYearStart,
            defaultPaymentTerms: localData.defaultPaymentTerms,
            defaultTaxRate: localData.defaultTaxRate,
          });
          break;
      }
      setHasChanges(false);
      toast.success("Settings saved");
    } catch (error) {
      toast.error("Failed to save settings");
    }
  };

  // Scroll to section
  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <SettingsShell
      title="Organization Settings"
      sidebar={
        <>
          {SECTIONS.map((section) => (
            <SettingsSidebarItem
              key={section.id}
              label={section.label}
              icon={section.icon}
              isActive={activeSection === section.id}
              onClick={() => scrollToSection(section.id)}
            />
          ))}
        </>
      }
    >
      {/* General Section */}
      <SettingsSection id="general" title="General" description="Basic organization information.">
        <SettingsRow label="Organization Name" description="The public name for your business.">
          <Input
            value={localData.name}
            onChange={(e) => updateField("name", e.target.value)}
            placeholder="Acme Corp"
          />
        </SettingsRow>

        <SettingsRow label="Email" description="Primary contact email.">
          <Input
            type="email"
            value={localData.email}
            onChange={(e) => updateField("email", e.target.value)}
            placeholder="hello@example.com"
          />
        </SettingsRow>

        <SettingsRow label="Phone" description="Primary contact phone.">
          <Input
            type="tel"
            value={localData.phone}
            onChange={(e) => updateField("phone", e.target.value)}
            placeholder="+61 2 1234 5678"
          />
        </SettingsRow>

        <SettingsRow label="ABN" description="Australian Business Number.">
          <Input
            value={localData.abn}
            onChange={(e) => updateField("abn", e.target.value)}
            placeholder="12 345 678 901"
          />
        </SettingsRow>

        <SettingsRow label="Website" description="Your organization's website.">
          <Input
            value={localData.website}
            onChange={(e) => updateField("website", e.target.value)}
            placeholder="https://example.com"
          />
        </SettingsRow>

        {hasChanges && activeSection === "general" && (
          <div className="py-3 flex justify-end">
            <Button onClick={() => handleSave("general")} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        )}
      </SettingsSection>

      {/* Address Section */}
      <SettingsSection id="address" title="Address" description="Physical business address.">
        <SettingsRow label="Address Line 1">
          <Input
            value={localData.addressLine1}
            onChange={(e) => updateField("addressLine1", e.target.value)}
            placeholder="123 Main Street"
          />
        </SettingsRow>

        <SettingsRow label="Address Line 2">
          <Input
            value={localData.addressLine2}
            onChange={(e) => updateField("addressLine2", e.target.value)}
            placeholder="Suite 100"
          />
        </SettingsRow>

        <SettingsRow label="Suburb">
          <Input
            value={localData.suburb}
            onChange={(e) => updateField("suburb", e.target.value)}
            placeholder="Sydney"
          />
        </SettingsRow>

        <SettingsRow label="State">
          <Input
            value={localData.state}
            onChange={(e) => updateField("state", e.target.value)}
            placeholder="NSW"
          />
        </SettingsRow>

        <SettingsRow label="Postcode">
          <Input
            value={localData.postcode}
            onChange={(e) => updateField("postcode", e.target.value)}
            placeholder="2000"
          />
        </SettingsRow>

        <SettingsRow label="Country">
          <Input
            value={localData.country}
            onChange={(e) => updateField("country", e.target.value)}
            placeholder="Australia"
          />
        </SettingsRow>

        {hasChanges && activeSection === "address" && (
          <div className="py-3 flex justify-end">
            <Button onClick={() => handleSave("address")} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        )}
      </SettingsSection>

      {/* Regional Section */}
      <SettingsSection id="regional" title="Regional" description="Timezone, currency, and formatting preferences.">
        <SettingsRow label="Timezone" description="Your primary business timezone.">
          <Select value={localData.timezone} onValueChange={(v) => updateField("timezone", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz} value={tz}>
                  {tz}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingsRow>

        <SettingsRow label="Currency" description="Default currency for financial operations.">
          <Select value={localData.currency} onValueChange={(v) => updateField("currency", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingsRow>

        <SettingsRow label="Date Format" description="How dates are displayed.">
          <Select value={localData.dateFormat} onValueChange={(v) => updateField("dateFormat", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_FORMATS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingsRow>

        <SettingsRow label="Time Format" description="12-hour or 24-hour clock.">
          <Select value={localData.timeFormat} onValueChange={(v) => updateField("timeFormat", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_FORMATS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingsRow>

        <SettingsRow label="Week Starts On" description="First day of the week for calendars.">
          <Select
            value={String(localData.weekStartDay)}
            onValueChange={(v) => updateField("weekStartDay", parseInt(v))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WEEK_DAYS.map((d) => (
                <SelectItem key={d.value} value={String(d.value)}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingsRow>

        {hasChanges && activeSection === "regional" && (
          <div className="py-3 flex justify-end">
            <Button onClick={() => handleSave("regional")} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        )}
      </SettingsSection>

      {/* Financial Section */}
      <SettingsSection id="financial" title="Financial" description="Financial settings and defaults.">
        <SettingsRow label="Fiscal Year Start" description="Month your fiscal year begins.">
          <Select
            value={String(localData.fiscalYearStart)}
            onValueChange={(v) => updateField("fiscalYearStart", parseInt(v))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FISCAL_MONTHS.map((m) => (
                <SelectItem key={m.value} value={String(m.value)}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingsRow>

        <SettingsRow label="Default Payment Terms" description="Default payment due period in days.">
          <Select
            value={String(localData.defaultPaymentTerms)}
            onValueChange={(v) => updateField("defaultPaymentTerms", parseInt(v))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="14">14 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="60">60 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
            </SelectContent>
          </Select>
        </SettingsRow>

        <SettingsRow label="Default Tax Rate" description="Default GST/tax rate (%).">
          <Input
            type="number"
            value={localData.defaultTaxRate}
            onChange={(e) => updateField("defaultTaxRate", parseFloat(e.target.value) || 0)}
            min={0}
            max={100}
          />
        </SettingsRow>

        {hasChanges && activeSection === "financial" && (
          <div className="py-3 flex justify-end">
            <Button onClick={() => handleSave("financial")} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        )}
      </SettingsSection>
    </SettingsShell>
  );
}
