/**
 * Settings Section Components
 *
 * Modular, slot-in components for each settings section.
 * Each can be used independently or composed in the unified settings shell.
 * Follows container/presenter pattern - these are presenters.
 */

import { useState, type ReactNode } from "react";
import { SettingsSection, SettingsRow } from "./settings-ui";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

// ============================================================================
// SHARED TYPES
// ============================================================================

export interface SectionProps<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  isSaving?: boolean;
}

// ============================================================================
// GENERAL SETTINGS SECTION
// ============================================================================

export interface GeneralSettingsData {
  name: string;
  email: string;
  phone: string;
  abn: string;
  website: string;
}

export function GeneralSettingsSection({
  data,
  onSave,
  isSaving = false,
}: SectionProps<GeneralSettingsData>) {
  const [local, setLocal] = useState(data);
  const [dirty, setDirty] = useState(false);

  const update = <K extends keyof GeneralSettingsData>(key: K, value: GeneralSettingsData[K]) => {
    setLocal((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    try {
      await onSave(local);
      setDirty(false);
      toast.success("General settings saved");
    } catch {
      toast.error("Failed to save");
    }
  };

  return (
    <SettingsSection id="general" title="General" description="Basic organization information.">
      <SettingsRow label="Organization Name" description="The public name for your business.">
        <Input value={local.name} onChange={(e) => update("name", e.target.value)} placeholder="Acme Corp" />
      </SettingsRow>
      <SettingsRow label="Email" description="Primary contact email.">
        <Input type="email" value={local.email} onChange={(e) => update("email", e.target.value)} placeholder="hello@example.com" />
      </SettingsRow>
      <SettingsRow label="Phone" description="Primary contact phone.">
        <Input type="tel" value={local.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+61 2 1234 5678" />
      </SettingsRow>
      <SettingsRow label="ABN" description="Australian Business Number.">
        <Input value={local.abn} onChange={(e) => update("abn", e.target.value)} placeholder="12 345 678 901" />
      </SettingsRow>
      <SettingsRow label="Website" description="Your organization's website.">
        <Input value={local.website} onChange={(e) => update("website", e.target.value)} placeholder="https://example.com" />
      </SettingsRow>
      {dirty && (
        <div className="py-3 flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </div>
      )}
    </SettingsSection>
  );
}

// ============================================================================
// ADDRESS SETTINGS SECTION
// ============================================================================

export interface AddressSettingsData {
  addressLine1: string;
  addressLine2: string;
  suburb: string;
  state: string;
  postcode: string;
  country: string;
}

export function AddressSettingsSection({
  data,
  onSave,
  isSaving = false,
}: SectionProps<AddressSettingsData>) {
  const [local, setLocal] = useState(data);
  const [dirty, setDirty] = useState(false);

  const update = <K extends keyof AddressSettingsData>(key: K, value: AddressSettingsData[K]) => {
    setLocal((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    try {
      await onSave(local);
      setDirty(false);
      toast.success("Address saved");
    } catch {
      toast.error("Failed to save");
    }
  };

  return (
    <SettingsSection id="address" title="Address" description="Physical business address.">
      <SettingsRow label="Address Line 1">
        <Input value={local.addressLine1} onChange={(e) => update("addressLine1", e.target.value)} placeholder="123 Main Street" />
      </SettingsRow>
      <SettingsRow label="Address Line 2">
        <Input value={local.addressLine2} onChange={(e) => update("addressLine2", e.target.value)} placeholder="Suite 100" />
      </SettingsRow>
      <SettingsRow label="Suburb">
        <Input value={local.suburb} onChange={(e) => update("suburb", e.target.value)} placeholder="Sydney" />
      </SettingsRow>
      <SettingsRow label="State">
        <Input value={local.state} onChange={(e) => update("state", e.target.value)} placeholder="NSW" />
      </SettingsRow>
      <SettingsRow label="Postcode">
        <Input value={local.postcode} onChange={(e) => update("postcode", e.target.value)} placeholder="2000" />
      </SettingsRow>
      <SettingsRow label="Country">
        <Input value={local.country} onChange={(e) => update("country", e.target.value)} placeholder="Australia" />
      </SettingsRow>
      {dirty && (
        <div className="py-3 flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </div>
      )}
    </SettingsSection>
  );
}

// ============================================================================
// REGIONAL SETTINGS SECTION
// ============================================================================

export interface RegionalSettingsData {
  timezone: string;
  locale: string;
  currency: string;
  dateFormat: string;
  timeFormat: string;
  weekStartDay: number;
}

const TIMEZONES = ["Australia/Sydney", "Australia/Melbourne", "Australia/Brisbane", "Australia/Perth", "Australia/Adelaide", "Pacific/Auckland", "UTC"];
const CURRENCIES = ["AUD", "USD", "EUR", "GBP", "NZD"];
const DATE_FORMATS = [{ value: "DD/MM/YYYY", label: "31/12/2026" }, { value: "MM/DD/YYYY", label: "12/31/2026" }, { value: "YYYY-MM-DD", label: "2026-12-31" }];
const TIME_FORMATS = [{ value: "12h", label: "12-hour (2:30 PM)" }, { value: "24h", label: "24-hour (14:30)" }];
const WEEK_DAYS = [{ value: 0, label: "Sunday" }, { value: 1, label: "Monday" }, { value: 6, label: "Saturday" }];

export function RegionalSettingsSection({
  data,
  onSave,
  isSaving = false,
}: SectionProps<RegionalSettingsData>) {
  const [local, setLocal] = useState(data);
  const [dirty, setDirty] = useState(false);

  const update = <K extends keyof RegionalSettingsData>(key: K, value: RegionalSettingsData[K]) => {
    setLocal((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    try {
      await onSave(local);
      setDirty(false);
      toast.success("Regional settings saved");
    } catch {
      toast.error("Failed to save");
    }
  };

  return (
    <SettingsSection id="regional" title="Regional" description="Timezone, currency, and formatting preferences.">
      <SettingsRow label="Timezone" description="Your primary business timezone.">
        <Select value={local.timezone} onValueChange={(v) => update("timezone", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {TIMEZONES.map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
          </SelectContent>
        </Select>
      </SettingsRow>
      <SettingsRow label="Currency" description="Default currency for financial operations.">
        <Select value={local.currency} onValueChange={(v) => update("currency", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </SettingsRow>
      <SettingsRow label="Date Format" description="How dates are displayed.">
        <Select value={local.dateFormat} onValueChange={(v) => update("dateFormat", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {DATE_FORMATS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </SettingsRow>
      <SettingsRow label="Time Format" description="12-hour or 24-hour clock.">
        <Select value={local.timeFormat} onValueChange={(v) => update("timeFormat", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {TIME_FORMATS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </SettingsRow>
      <SettingsRow label="Week Starts On" description="First day of the week for calendars.">
        <Select value={String(local.weekStartDay)} onValueChange={(v) => update("weekStartDay", parseInt(v))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {WEEK_DAYS.map((d) => <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </SettingsRow>
      {dirty && (
        <div className="py-3 flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </div>
      )}
    </SettingsSection>
  );
}

// ============================================================================
// FINANCIAL SETTINGS SECTION
// ============================================================================

export interface FinancialSettingsData {
  fiscalYearStart: number;
  defaultPaymentTerms: number;
  defaultTaxRate: number;
}

const FISCAL_MONTHS = [
  { value: 1, label: "January" }, { value: 2, label: "February" }, { value: 3, label: "March" },
  { value: 4, label: "April" }, { value: 5, label: "May" }, { value: 6, label: "June" },
  { value: 7, label: "July" }, { value: 8, label: "August" }, { value: 9, label: "September" },
  { value: 10, label: "October" }, { value: 11, label: "November" }, { value: 12, label: "December" },
];

export function FinancialSettingsSection({
  data,
  onSave,
  isSaving = false,
}: SectionProps<FinancialSettingsData>) {
  const [local, setLocal] = useState(data);
  const [dirty, setDirty] = useState(false);

  const update = <K extends keyof FinancialSettingsData>(key: K, value: FinancialSettingsData[K]) => {
    setLocal((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    try {
      await onSave(local);
      setDirty(false);
      toast.success("Financial settings saved");
    } catch {
      toast.error("Failed to save");
    }
  };

  return (
    <SettingsSection id="financial" title="Financial" description="Financial settings and defaults.">
      <SettingsRow label="Fiscal Year Start" description="Month your fiscal year begins.">
        <Select value={String(local.fiscalYearStart)} onValueChange={(v) => update("fiscalYearStart", parseInt(v))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {FISCAL_MONTHS.map((m) => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </SettingsRow>
      <SettingsRow label="Default Payment Terms" description="Default payment due period in days.">
        <Select value={String(local.defaultPaymentTerms)} onValueChange={(v) => update("defaultPaymentTerms", parseInt(v))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
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
          value={local.defaultTaxRate}
          onChange={(e) => update("defaultTaxRate", parseFloat(e.target.value) || 0)}
          min={0}
          max={100}
        />
      </SettingsRow>
      {dirty && (
        <div className="py-3 flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </div>
      )}
    </SettingsSection>
  );
}

// ============================================================================
// LINK SECTION (for domain settings pages)
// ============================================================================

export interface LinkSectionProps {
  id: string;
  title: string;
  description: string;
  href: string;
  children?: ReactNode;
}

/**
 * A section that links to a separate domain-specific settings page.
 * Used for complex settings that need their own dedicated UI.
 */
export function LinkSettingsSection({
  id,
  title,
  description,
  href,
  children,
}: LinkSectionProps) {
  return (
    <SettingsSection id={id} title={title} description={description}>
      {children || (
        <SettingsRow label={`Manage ${title}`} description="Open dedicated settings page.">
          <Button variant="outline" asChild>
            <a href={href}>Open Settings</a>
          </Button>
        </SettingsRow>
      )}
    </SettingsSection>
  );
}
