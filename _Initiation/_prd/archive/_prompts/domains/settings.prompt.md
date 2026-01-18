# Task: Implement Settings Domain

## Context
Read the PRD file to find the first story where `passes: false`.
Read the progress file for learnings from previous iterations.
Read `AGENTS.md` and conventions for project patterns.

## Project Location
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack

## PRD File
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/memory-bank/prd/domains/settings.prd.json

## Progress File
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/memory-bank/prd/_progress/dom-settings.progress.txt

## PRD ID
DOM-SETTINGS

## Phase
domain-core

## Priority
3

## Dependencies
- FOUND-AUTH (for admin access control)

---

## Pre-Flight Checks

Before starting, verify:

```bash
# 1. TypeScript compiles
npm run typecheck

# 2. Check auth patterns are available
# Verify FOUND-AUTH is complete
```

---

## Context Files

### Required Reading (in order)

1. **Progress File**: Check for learnings from previous iterations
2. **PRD File**: Get current story and acceptance criteria
3. **Conventions**: `memory-bank/_meta/conventions.md`
4. **Glossary**: `memory-bank/_meta/glossary.md`

### Domain References

| Reference | Purpose |
|-----------|---------|
| `lib/schema/settings.ts` | Settings database schema |
| `lib/schemas/settings.ts` | Settings Zod schemas |
| `src/server/functions/settings.ts` | Settings server functions |
| `src/routes/_authed/settings/` | Settings UI routes |
| `src/components/domain/settings/` | Settings UI components |

---

## Renoz Business Context

### Settings Hierarchy

Renoz settings follow a three-tier hierarchy reflecting Australian battery business operations:

```
System Settings (Admin Only)
    ↓
Organization Settings (Admin/Owner)
    ↓
User Preferences (All Users)
```

**Setting Tiers:**

- **System Settings**: Application-wide defaults, integrations, feature flags
- **Organization Settings**: Company-specific config (ABN, trading name, default terms, tax settings)
- **User Preferences**: Individual display, notification, dashboard customization

**IMPORTANT**: Unlike generic SaaS settings, Renoz requires GST-specific configuration (10% Australian tax), CEC compliance settings for installers, and hazmat shipping parameters for battery transport.

### Critical Organization Settings

**Business Identity:**
- Trading name (as registered with Australian Business Register)
- ABN (Australian Business Number) - required for tax invoices
- Default payment terms (commonly Net 30 for B2B battery sales)
- Bank details (BSB + Account for direct deposits)

**Tax Configuration:**
- GST registration status (affects invoice formatting)
- Default tax rate (10% GST)
- Tax invoice number format (ATO compliance)

**Operational Defaults:**
- Default warranty period (batteries: 5-10 years typical)
- CEC accreditation numbers (for compliant installers)
- Hazmat handling protocols (UN3481 compliance)
- Temperature thresholds for battery storage/transport

**Industry-Specific Requirements:**
- **Battery Storage Safety**: Temperature monitoring thresholds (typically -10°C to 45°C)
- **CEC Compliance**: Clean Energy Council accreditation tracking for installers
- **Hazmat Transport**: UN3481 (lithium-ion batteries) handling protocols
- **Warranty Activation**: Serial number capture requirements per manufacturer
- **GST Compliance**: Australian tax invoice formatting (ATO requirements)

### Settings Categories

```
Business Profile (ABN, Trading Name, Contact Details)
    ↓
Tax & Compliance (GST, CEC, Hazmat)
    ↓
Payment Terms (Net 30/60, Bank Details)
    ↓
Operational Defaults (Warranty, Shipping, Temperature)
    ↓
Integrations (Xero, Email, Shipping Carriers)
    ↓
User Preferences (Notifications, Dashboard, Display)
```

---

## UI Pattern References

### Settings Navigation Sidebar

**Component**: Vertical tab navigation with role-based visibility

```typescript
// Reference implementation
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/registry/default/ui/tabs';

// Role-based tab visibility
const settingsTabs = [
  { id: 'profile', label: 'Profile', roles: ['all'] },
  { id: 'notifications', label: 'Notifications', roles: ['all'] },
  { id: 'organization', label: 'Organization', roles: ['admin', 'owner'] },
  { id: 'integrations', label: 'Integrations', roles: ['admin'] },
  { id: 'team', label: 'Team', roles: ['admin', 'owner'] },
  { id: 'billing', label: 'Billing', roles: ['owner'] },
  { id: 'security', label: 'Security', roles: ['admin'] },
];

// Usage with role filtering
<Tabs defaultValue="profile" orientation="vertical">
  <TabsList className="w-48">
    {settingsTabs
      .filter(tab => canAccessTab(tab.roles, userRole))
      .map(tab => (
        <TabsTrigger key={tab.id} value={tab.id}>
          {tab.label}
        </TabsTrigger>
      ))}
  </TabsList>

  <TabsContent value="profile">
    <ProfileSettings />
  </TabsContent>
  {/* Other tab contents */}
</Tabs>
```

**Reference**: `_reference/.reui-reference/registry/default/ui/tabs.tsx`

### Settings Form Pattern

**Component**: Segmented form sections with auto-save indicators

```typescript
// Reference implementation
import { Form } from '@/registry/default/ui/form';
import { Input } from '@/registry/default/ui/input';
import { Button } from '@/registry/default/ui/button';
import { Badge } from '@/registry/default/ui/badge';

// Auto-save status indicator
function SaveStatus({ status }: { status: 'idle' | 'saving' | 'saved' | 'error' }) {
  const variants = {
    idle: null,
    saving: <Badge variant="outline">Saving...</Badge>,
    saved: <Badge variant="success" appearance="light">Saved</Badge>,
    error: <Badge variant="destructive" appearance="light">Error saving</Badge>,
  };
  return variants[status];
}

// Settings section
<div className="space-y-6">
  <div className="flex items-center justify-between">
    <h3 className="text-lg font-medium">Organization Details</h3>
    <SaveStatus status={saveStatus} />
  </div>

  <Form onSubmit={handleSubmit}>
    <FormField label="Trading Name" required>
      <Input
        value={tradingName}
        onChange={(e) => handleFieldChange('tradingName', e.target.value)}
      />
    </FormField>

    <FormField label="ABN" required hint="11-digit Australian Business Number">
      <Input
        value={abn}
        onChange={(e) => handleFieldChange('abn', e.target.value)}
        pattern="[0-9]{11}"
      />
    </FormField>

    <Button type="submit" disabled={!isDirty}>
      Save Changes
    </Button>
  </Form>
</div>
```

### Integration Toggle Pattern

**Component**: Switch with connection status and test button

```typescript
// Integration card with status
import { Switch } from '@/registry/default/ui/switch';
import { Badge } from '@/registry/default/ui/badge';

<div className="border rounded-lg p-4">
  <div className="flex items-center justify-between mb-2">
    <div className="flex items-center gap-3">
      <img src="/xero-logo.svg" className="w-8 h-8" />
      <div>
        <h4 className="font-medium">Xero</h4>
        <p className="text-sm text-muted-foreground">Accounting integration</p>
      </div>
    </div>
    <Switch
      checked={xeroEnabled}
      onCheckedChange={handleToggleXero}
    />
  </div>

  {xeroEnabled && (
    <div className="mt-4 space-y-2">
      <div className="flex items-center gap-2">
        <Badge variant={xeroConnected ? 'success' : 'destructive'}>
          {xeroConnected ? 'Connected' : 'Disconnected'}
        </Badge>
        {xeroConnected && (
          <span className="text-sm text-muted-foreground">
            Last sync: {lastSyncTime}
          </span>
        )}
      </div>
      <Button variant="outline" size="sm" onClick={testConnection}>
        Test Connection
      </Button>
    </div>
  )}
</div>
```

**Reference**: `_reference/.reui-reference/registry/default/ui/switch.tsx`

### Temperature Threshold Configuration

**Component**: Dual slider for min/max temperature ranges

```typescript
// Battery storage temperature configuration
import { Slider } from '@/registry/default/ui/slider';
import { Alert, AlertDescription } from '@/registry/default/ui/alert';

<div className="space-y-4">
  <FormField label="Battery Storage Temperature Range" hint="Safe operating temperatures for lithium-ion batteries">
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <label className="text-sm text-muted-foreground">Minimum (°C)</label>
          <Slider
            value={[tempMin]}
            onValueChange={([value]) => setTempMin(value)}
            min={-20}
            max={0}
            step={1}
          />
          <span className="text-sm font-medium">{tempMin}°C</span>
        </div>
        <div className="flex-1">
          <label className="text-sm text-muted-foreground">Maximum (°C)</label>
          <Slider
            value={[tempMax]}
            onValueChange={([value]) => setTempMax(value)}
            min={20}
            max={60}
            step={1}
          />
          <span className="text-sm font-medium">{tempMax}°C</span>
        </div>
      </div>
      {(tempMin < -10 || tempMax > 45) && (
        <Alert variant="warning">
          <AlertDescription>
            Temperature range {tempMin}°C to {tempMax}°C exceeds typical lithium-ion safe operating range (-10°C to 45°C)
          </AlertDescription>
        </Alert>
      )}
    </div>
  </FormField>
</div>
```

---

## Implementation Notes

### Setting Storage Pattern

```typescript
// Settings should be stored as JSON for flexibility
import { pgTable, uuid, jsonb, timestamp, text, integer } from 'drizzle-orm/pg-core';

export const organizationSettings = pgTable('organization_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull(),
  category: text('category').notNull(), // 'business', 'tax', 'operational', 'integrations'
  settings: jsonb('settings').notNull(), // Flexible JSON storage
  updatedBy: uuid('updated_by').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  version: integer('version').notNull().default(1),
});

// Example settings JSON structure
type BusinessSettings = {
  tradingName: string;
  abn: string;
  phone: string;
  email: string;
  website?: string;
};

type TaxSettings = {
  gstRegistered: boolean;
  gstRate: number; // 0.10 for 10%
  taxInvoicePrefix: string; // e.g., 'INV-'
};

type OperationalSettings = {
  defaultWarrantyYears: number;
  cecAccreditationNumber?: string;
  hazmatCompliance: {
    enabled: boolean;
    unNumber: string; // 'UN3481' for lithium-ion
    tempMin: number; // Celsius
    tempMax: number; // Celsius
  };
};
```

### Role-Based Access Control

```typescript
// Settings access should check user role
import { requireAuth } from '@/server/protected-procedure';

export const updateOrganizationSettings = createServerFn({ method: 'POST' })
  .inputValidator(UpdateOrganizationSettingsSchema)
  .handler(async ({ data }) => {
    const ctx = await requireAuth();

    // Only admins can modify organization settings
    if (!['admin', 'owner'].includes(ctx.session.role)) {
      throw new AppError('Insufficient permissions', 'FORBIDDEN', 403);
    }

    return withRLSContext(ctx.session, async (tx) => {
      const [existing] = await tx
        .select()
        .from(organizationSettings)
        .where(
          and(
            eq(organizationSettings.organizationId, ctx.session.orgId),
            eq(organizationSettings.category, data.category)
          )
        );

      if (!existing) {
        // Create new settings
        const [created] = await tx
          .insert(organizationSettings)
          .values({
            organizationId: ctx.session.orgId,
            category: data.category,
            settings: data.settings,
            updatedBy: ctx.session.userId,
          })
          .returning();
        return created;
      }

      // Update with optimistic locking
      if (existing.version !== data.version) {
        throw new ConcurrencyError(
          'organization_settings',
          existing.id,
          data.version,
          existing.version
        );
      }

      const [updated] = await tx
        .update(organizationSettings)
        .set({
          settings: data.settings,
          version: existing.version + 1,
          updatedBy: ctx.session.userId,
          updatedAt: new Date(),
        })
        .where(eq(organizationSettings.id, existing.id))
        .returning();

      return updated;
    });
  });
```

### ABN Validation

```typescript
// ABN validation using weighted algorithm
import { z } from 'zod';

const ABN_WEIGHTS = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];

function isValidABN(abn: string): boolean {
  // Remove spaces and ensure 11 digits
  const digits = abn.replace(/\s/g, '');
  if (!/^\d{11}$/.test(digits)) return false;

  // Apply ABN checksum algorithm
  const nums = digits.split('').map(Number);
  nums[0] -= 1; // Subtract 1 from first digit

  const sum = nums.reduce((acc, digit, idx) => acc + digit * ABN_WEIGHTS[idx], 0);
  return sum % 89 === 0;
}

export const ABNSchema = z
  .string()
  .regex(/^\d{11}$/, 'ABN must be 11 digits')
  .refine(isValidABN, 'Invalid ABN checksum');
```

### Settings Audit Trail

```typescript
// Log all settings changes for compliance
export const settingsAuditLog = pgTable('settings_audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull(),
  category: text('category').notNull(),
  field: text('field').notNull(),
  oldValue: jsonb('old_value'),
  newValue: jsonb('new_value'),
  changedBy: uuid('changed_by').notNull(),
  changedAt: timestamp('changed_at').notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
});

// Helper to log changes
async function auditSettingChange(
  tx: DatabaseTransaction,
  orgId: string,
  category: string,
  oldSettings: Record<string, unknown>,
  newSettings: Record<string, unknown>,
  userId: string
) {
  const changes = Object.keys(newSettings).filter(
    key => JSON.stringify(oldSettings[key]) !== JSON.stringify(newSettings[key])
  );

  for (const field of changes) {
    await tx.insert(settingsAuditLog).values({
      organizationId: orgId,
      category,
      field,
      oldValue: oldSettings[field],
      newValue: newSettings[field],
      changedBy: userId,
    });
  }
}
```

### CEC Accreditation Validation

```typescript
// CEC accreditation number format for Clean Energy Council
import { z } from 'zod';

export const CECAccreditationSchema = z.object({
  number: z.string().regex(
    /^A\d{7}$/,
    'CEC number must be A followed by 7 digits (e.g., A1234567)'
  ),
  expiryDate: z.string().refine(
    (date) => new Date(date) > new Date(),
    'CEC accreditation must not be expired'
  ),
  categories: z.array(z.enum([
    'Grid Connect',
    'Battery',
    'Stand Alone',
    'Hybrid',
  ])).min(1, 'At least one category required'),
});

export const OperationalSettingsSchema = z.object({
  defaultWarrantyYears: z.number().int().min(1).max(20),
  cecAccreditation: CECAccreditationSchema.optional(),
  hazmatCompliance: z.object({
    enabled: z.boolean(),
    unNumber: z.string().regex(/^UN\d{4}$/, 'UN number format: UN####'),
    tempMin: z.number().min(-40).max(0),
    tempMax: z.number().min(20).max(100),
  }),
});
```

### Integration Settings Pattern

```typescript
// Store integration credentials securely
export const integrationSettings = pgTable('integration_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull(),
  provider: text('provider').notNull(), // 'xero', 'stripe', 'resend'
  enabled: boolean('enabled').default(false),
  credentials: jsonb('credentials').notNull(), // Encrypted in production
  config: jsonb('config'), // Non-sensitive configuration
  lastSyncAt: timestamp('last_sync_at'),
  syncStatus: text('sync_status'), // 'success', 'error', 'pending'
  syncError: text('sync_error'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  version: integer('version').notNull().default(1),
});

// Xero integration example
type XeroCredentials = {
  tenantId: string;
  accessToken: string; // Should be encrypted
  refreshToken: string; // Should be encrypted
  expiresAt: string;
};

type XeroConfig = {
  autoSyncInvoices: boolean;
  autoSyncPayments: boolean;
  defaultAccountCode: string;
  gstAccountCode: string;
};
```

---

## Workflow

1. Find the first story where `passes: false`
2. Check dependencies - all must have `passes: true`
3. Implement according to acceptance_criteria
4. For schema stories: Run `npm run db:generate`
5. Run `npm run typecheck` to verify
6. If tests pass:
   - Set `story.passes = true` in prd.json
   - Append success to progress.txt
   - Commit with message: "Complete [STORY-ID]: Story Title"
7. If tests fail:
   - Append learnings to progress.txt
   - Do NOT modify prd.json
   - Retry with fixes

---

## Domain Guidelines

### DO
- Restrict admin-only settings with role checks
- Validate all inputs (especially ABN format)
- Log setting changes to audit trail
- Support org-level settings with JSON flexibility
- Use optimistic locking (version field) for concurrent updates
- Provide real-time save status feedback
- Validate GST settings for Australian tax compliance
- Support CEC accreditation number format
- Include hazmat compliance settings for battery shipping
- Encrypt sensitive integration credentials
- Validate temperature ranges for battery safety
- Support Australian financial year (July 1 - June 30)
- Include BSB + Account number validation for bank details
- Provide test connection functionality for integrations
- Auto-save user preferences with debouncing

### DON'T
- Expose sensitive settings (API keys) in client responses
- Allow non-admins to modify organization settings
- Hard-code setting values (use database storage)
- Skip validation on ABN or tax settings
- Allow settings updates without audit logging
- Remove existing settings without migration path
- Store integration credentials in plain text
- Skip encryption for sensitive data (API keys, tokens)
- Allow invalid temperature ranges (outside battery safety limits)
- Break integration connections when toggling off (preserve credentials)
- Skip test connection before enabling integrations
- Remove audit trail when deleting settings

---

## Completion Signals

When the target story passes:
```xml
<promise>[STORY_ID]_COMPLETE</promise>
```

When ALL stories in this PRD have `passes: true`:
```xml
<promise>DOM_SETTINGS_COMPLETE</promise>
```

---

*Domain PRD - Application settings for Australian battery business operations*
