# Settings Domain Wireframes - UI Pattern Application Review

**Generated:** 2026-01-10
**Scope:** DOM-SET-* wireframes (10 files)
**Purpose:** Map wireframe components to reference implementations

---

## Executive Summary

All 10 Settings domain wireframes have been reviewed and mapped to available UI patterns from:
- `_reference/.reui-reference/registry/default/ui/` (ReUI component library)
- `_reference/.midday-reference/` (Midday settings implementation)

Each wireframe includes:
- Component pattern mapping with specific file references
- Form architecture recommendations
- Responsive layout patterns
- State management patterns

---

## Wireframe Review Index

| File | Story | Type | Status | Complexity |
|------|-------|------|--------|------------|
| DOM-SET-001b | System Defaults Settings | Form | Ready | Medium |
| DOM-SET-001c | User Profile Settings | Form | Ready | Medium |
| DOM-SET-002 | Audit Log Viewer | DataTable | Ready | High |
| DOM-SET-003b | Export Page UI | Form + Job | Ready | High |
| DOM-SET-005b | Business Hours Settings | Form + Table | Ready | Medium |
| DOM-SET-006b | Custom Fields Manager | DataTable + CRUD | Ready | High |
| DOM-SET-006c | Field Type Selection | Dialog | Ready | Low |
| DOM-SET-006d | Custom Fields Integration | Collapsible | Ready | Medium |
| DOM-SET-007 | Integrations Hub | Card Grid | Ready | Medium |
| DOM-SET-008 | Settings Search | Command | Ready | High |

---

## 1. DOM-SET-001b: System Defaults Settings Page

### Wireframe Overview
Admin settings form for organization-wide defaults (payment terms, tax rate, currency, order status, quote validity).

### UI Patterns (Reference Implementation)

#### Core Components

**Form Structure**
```typescript
// Base form handling
Reference: _reference/.reui-reference/registry/default/ui/base-form-tanstack.tsx
Pattern: TanStack Form with Zod validation

// Form layout
Reference: _reference/.reui-reference/registry/default/ui/form.tsx
Pattern: Fieldset-based sections with labels

Alternative: _reference/.midday-reference/apps/dashboard/src/app/[locale]/(app)/(sidebar)/settings/page.tsx
Pattern: Settings page layout with sidebar
```

**Input Components**
```typescript
// Number inputs (payment terms, quote validity)
Reference: _reference/.reui-reference/registry/default/ui/base-number-field.tsx
Pattern: Number field with validation, min/max

// Percentage input (tax rate)
Reference: _reference/.reui-reference/registry/default/ui/base-input.tsx
Pattern: Number input with percent suffix formatting

// Select dropdown (currency, order status)
Reference: _reference/.reui-reference/registry/default/ui/select.tsx
Pattern: Custom select with search
```

**Layout Components**
```typescript
// Section cards
Reference: _reference/.reui-reference/registry/default/ui/card.tsx
Pattern: Card, CardHeader, CardTitle, CardContent

// Responsive layout
Reference: _reference/.midday-reference/apps/dashboard/src/app/[locale]/(app)/(sidebar)/settings/layout.tsx
Pattern: Settings sidebar with mobile drawer
```

**Feedback Components**
```typescript
// Success/error toasts
Reference: _reference/.reui-reference/registry/default/ui/base-toast.tsx
Pattern: Toast notifications with actions

// Loading states
Reference: _reference/.reui-reference/registry/default/ui/button.tsx
Pattern: Button loading spinner state
```

#### Recommended Architecture

**Form Validation**
```typescript
// Zod schema validation
import { z } from 'zod';

const systemDefaultsSchema = z.object({
  paymentTerms: z.number().int().positive().max(365),
  taxRate: z.number().min(0).max(100),
  currency: z.enum(['AUD', 'USD', 'GBP', 'EUR', 'NZD']),
  defaultOrderStatus: z.enum(['draft', 'pending', 'confirmed']),
  quoteValidity: z.number().int().positive().max(365),
});

// Use with TanStack Form
Reference: _reference/.reui-reference/registry/default/ui/base-form-tanstack.tsx
```

**Server Actions**
```typescript
// TanStack Router loader for initial data
export const Route = createFileRoute('/_authed/settings/defaults')({
  loader: async () => {
    const defaults = await getOrganizationDefaults();
    return { defaults };
  },
});

// Mutation for saving
const mutation = useMutation({
  mutationFn: updateSystemDefaults,
  onSuccess: () => {
    toast.success('Settings saved successfully');
  },
});
```

#### Responsive Breakpoints
- Mobile (< 768px): Stacked fields, full-width inputs
- Tablet (768px+): 2-column grid for paired fields
- Desktop (1280px+): 3-column grid with info cards

---

## 2. DOM-SET-001c: User Profile Settings

### Wireframe Overview
User profile management with avatar upload, name/email editing, timezone, and notification preferences.

### UI Patterns (Reference Implementation)

#### Core Components

**Avatar Upload**
```typescript
// Avatar display
Reference: _reference/.reui-reference/registry/default/ui/avatar.tsx
Pattern: Avatar with fallback initials

// File upload
Reference: _reference/.reui-reference/registry/default/ui/base-input.tsx
Pattern: File input with preview
Alternative: Use Uploadthing for image uploads
```

**Form Fields**
```typescript
// Text inputs (name, email)
Reference: _reference/.reui-reference/registry/default/ui/input.tsx
Pattern: Input with label and validation feedback

// Select (timezone)
Reference: _reference/.reui-reference/registry/default/ui/select.tsx
Pattern: Searchable select with grouping (by region)

// Switch (notifications)
Reference: _reference/.reui-reference/registry/default/ui/base-switch.tsx
Pattern: Switch for boolean toggles
```

**Section Layout**
```typescript
// Profile layout
Reference: _reference/.midday-reference/apps/dashboard/src/app/[locale]/(app)/(sidebar)/settings/page.tsx
Pattern: Two-column layout (avatar | form)

// Separator between sections
Reference: _reference/.reui-reference/registry/default/ui/separator.tsx
Pattern: Horizontal divider
```

#### Recommended Architecture

**Image Upload Pattern**
```typescript
// Use Uploadthing for image handling
const { startUpload } = useUploadThing("avatarUploader", {
  onClientUploadComplete: (res) => {
    updateUserAvatar(res[0].url);
  },
});

// Avatar cropping (optional enhancement)
// Could integrate react-easy-crop or similar
```

**Form Sections**
```typescript
// Separate forms for different sections
const ProfileForm = () => {
  // Basic info (name, email)
};

const PreferencesForm = () => {
  // Timezone, notifications
};

// Saves independently, no full page form submission
```

---

## 3. DOM-SET-002: Enhanced Audit Log Viewer

### Wireframe Overview
Admin-only audit log with search, filters (user, entity type, date range, action type), and CSV export.

### UI Patterns (Reference Implementation)

#### Core Components

**DataTable**
```typescript
// Table structure
Reference: _reference/.reui-reference/registry/default/ui/data-grid-table.tsx
Pattern: TanStack Table with sorting, pagination

// Column filtering
Reference: _reference/.reui-reference/registry/default/ui/data-grid-column-filter.tsx
Pattern: Filter popover per column

// Column visibility
Reference: _reference/.reui-reference/registry/default/ui/data-grid-column-visibility.tsx
Pattern: Toggle columns dropdown
```

**Filter Bar**
```typescript
// Search input
Reference: _reference/.reui-reference/registry/default/ui/input.tsx
Pattern: Search with debounce

// Filter dropdowns
Reference: _reference/.reui-reference/registry/default/ui/select.tsx
Pattern: Multi-select for entity types

// Date range picker
Reference: _reference/.reui-reference/registry/default/ui/datefield.tsx
Pattern: Date range with presets (Today, Last 7 days, etc.)
Alternative: react-day-picker for calendar UI
```

**Detail Panel**
```typescript
// Slide-in detail view
Reference: _reference/.reui-reference/registry/default/ui/sheet.tsx
Pattern: Sheet with overlay, slide from right

// Mobile: Full screen sheet
// Desktop: Side panel (30-40% width)
```

**Export**
```typescript
// Export button with progress
Reference: _reference/.reui-reference/registry/default/ui/progress.tsx
Pattern: Progress bar for export generation

// Download toast
Reference: _reference/.reui-reference/registry/default/ui/base-toast.tsx
Pattern: Toast with download link
```

#### Recommended Architecture

**Table State Management**
```typescript
// TanStack Table with server-side filtering
const table = useReactTable({
  data: auditLogs,
  columns,
  state: {
    sorting,
    pagination,
    columnFilters,
  },
  onSortingChange: setSorting,
  onPaginationChange: setPagination,
  onColumnFiltersChange: setColumnFilters,
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
});

// Sync filters to URL search params for shareable links
```

**Filter State**
```typescript
// Use TanStack Router search params
export const Route = createFileRoute('/_authed/settings/audit-log')({
  validateSearch: (search) => ({
    search: search.search ?? '',
    user: search.user ?? null,
    entityType: search.entityType ?? null,
    dateRange: search.dateRange ?? null,
    page: search.page ?? 1,
  }),
});
```

**Export Implementation**
```typescript
// Trigger.dev job for large exports
const exportJob = await trigger.run('export-audit-log', {
  filters,
  totalRecords,
});

// Poll job status
// Download when complete
```

#### Responsive Breakpoints
- Mobile (< 768px): Card list view, filter drawer
- Tablet (768px+): Table with horizontal scroll, collapsible filters
- Desktop (1280px+): Full table, inline filters, side detail panel

---

## 4. DOM-SET-003b: Export Page UI

### Wireframe Overview
Data export page with entity selection (checkboxes), format selection (radio), background job progress, and export history.

### UI Patterns (Reference Implementation)

#### Core Components

**Entity Selection**
```typescript
// Checkbox group
Reference: _reference/.reui-reference/registry/default/ui/checkbox.tsx
Pattern: Checkbox with label and description

// Grid layout for checkboxes
Reference: Custom CSS Grid
Pattern: 2-column grid (mobile: 1-column)

// Select All / Clear buttons
Reference: _reference/.reui-reference/registry/default/ui/button.tsx
Pattern: Ghost button for bulk actions
```

**Format Selection**
```typescript
// Radio group
Reference: _reference/.reui-reference/registry/default/ui/radio-group.tsx
Pattern: RadioGroup with RadioGroupItem

// Format descriptions
// Show format details (CSV vs JSON) with icons
```

**Progress Display**
```typescript
// Progress bar
Reference: _reference/.reui-reference/registry/default/ui/progress.tsx
Pattern: Animated progress with percentage

// Status card
Reference: _reference/.reui-reference/registry/default/ui/card.tsx
Pattern: Card with centered content, spinner

// Cancellation
Reference: _reference/.reui-reference/registry/default/ui/button.tsx
Pattern: Destructive variant button
```

**Export History**
```typescript
// History table (desktop)
Reference: _reference/.reui-reference/registry/default/ui/data-grid-table.tsx
Pattern: Simple table with download actions

// History cards (mobile)
Reference: _reference/.reui-reference/registry/default/ui/card.tsx
Pattern: Stacked cards with status badges
```

#### Recommended Architecture

**Job Triggering**
```typescript
// Trigger.dev background job
const exportJob = await trigger.run('export-organization-data', {
  entities: selectedEntities,
  format: selectedFormat,
  organizationId,
});

// Store job ID in database for tracking
await createExportRecord({
  jobId: exportJob.id,
  entities,
  format,
  status: 'pending',
});
```

**Real-time Progress**
```typescript
// Poll job status
const { data: exportJob } = useQuery({
  queryKey: ['export-job', jobId],
  queryFn: () => getExportJobStatus(jobId),
  refetchInterval: 2000, // Poll every 2s
  enabled: !!jobId && status === 'processing',
});

// Update progress bar from job.progress
```

**Download Link Handling**
```typescript
// Generate signed URL for download
const downloadUrl = await generateExportDownloadUrl(exportId);

// Set expiration (7 days)
// Store in database
// Send email notification with link
```

#### State Machine
```
pending -> processing -> complete|failed
              ↓
           (cancelable)
```

---

## 5. DOM-SET-005b: Business Hours Settings

### Wireframe Overview
Weekly schedule editor with time range inputs, closed day toggles, exception dates table, and timezone display.

### UI Patterns (Reference Implementation)

#### Core Components

**Time Range Inputs**
```typescript
// Time picker
Reference: _reference/.reui-reference/registry/default/ui/datefield.tsx
Pattern: Time input with AM/PM or 24hr format

Alternative: Use HTML5 time input with custom styling
<input type="time" step="900" /> // 15-minute increments
```

**Day of Week Layout**
```typescript
// Table-like layout for days
Reference: Custom CSS Grid
Pattern: Day name | Closed toggle | Open time | Close time

// Closed toggle
Reference: _reference/.reui-reference/registry/default/ui/base-switch.tsx
Pattern: Switch disables time inputs when ON
```

**Exception Dates**
```typescript
// Exception date table
Reference: _reference/.reui-reference/registry/default/ui/data-grid-table.tsx
Pattern: Inline editable table rows

// Add exception dialog
Reference: _reference/.reui-reference/registry/default/ui/dialog.tsx
Pattern: Modal form with date picker

// Date picker
Reference: _reference/.reui-reference/registry/default/ui/calendar.tsx
Pattern: Calendar with holiday highlights
```

**Timezone Display**
```typescript
// Readonly timezone display
Reference: _reference/.reui-reference/registry/default/ui/base-input.tsx
Pattern: Disabled input showing org timezone

// Info tooltip
Reference: _reference/.reui-reference/registry/default/ui/base-tooltip.tsx
Pattern: Tooltip explaining timezone source
```

#### Recommended Architecture

**Data Structure**
```typescript
interface BusinessHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  // ... other days
  exceptions: ExceptionDate[];
  timezone: string;
}

interface DaySchedule {
  closed: boolean;
  openTime: string; // "09:00"
  closeTime: string; // "17:00"
}

interface ExceptionDate {
  date: Date;
  reason: string;
  closed: boolean;
  openTime?: string;
  closeTime?: string;
}
```

**Validation**
```typescript
// Zod schema
const dayScheduleSchema = z.object({
  closed: z.boolean(),
  openTime: z.string().regex(/^\d{2}:\d{2}$/),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/),
}).refine(
  (data) => !data.closed && data.openTime < data.closeTime,
  { message: "Close time must be after open time" }
);
```

**Copy Days Feature**
```typescript
// "Copy to weekdays" button
const copyToWeekdays = () => {
  const template = form.getValues('monday');
  ['tuesday', 'wednesday', 'thursday', 'friday'].forEach(day => {
    form.setValue(day, template);
  });
};
```

---

## 6. DOM-SET-006b: Custom Fields Manager

### Wireframe Overview
Admin CRUD interface for custom field definitions with DataTable, create/edit dialogs, field type selection, and drag-to-reorder.

### UI Patterns (Reference Implementation)

#### Core Components

**Fields Table**
```typescript
// DataTable with actions
Reference: _reference/.reui-reference/registry/default/ui/data-grid-table.tsx
Pattern: Table with inline action buttons

// Drag-to-reorder rows
Reference: _reference/.reui-reference/registry/default/ui/data-grid-table-dnd-rows.tsx
Pattern: dnd-kit for row reordering

// Column definitions
const columns = [
  { id: 'drag-handle', cell: DragHandle },
  { id: 'label', header: 'Label' },
  { id: 'type', header: 'Type' },
  { id: 'required', header: 'Required', cell: Badge },
  { id: 'actions', cell: ActionsDropdown },
];
```

**Create/Edit Dialog**
```typescript
// Dialog
Reference: _reference/.reui-reference/registry/default/ui/dialog.tsx
Pattern: Modal with form

// Field type selector
Reference: _reference/.reui-reference/registry/default/ui/select.tsx
Pattern: Select with icons per type

// Field configuration
// Dynamic form based on field type
// Text: maxLength
// Number: min, max, precision
// Select: options array
```

**Field Type Icons**
```typescript
// Icon per field type
Reference: lucide-react icons
Pattern:
- Text: Type icon
- Number: Hash icon
- Date: Calendar icon
- Select: List icon
- Checkbox: CheckSquare icon
```

**Confirmation Dialogs**
```typescript
// Delete confirmation
Reference: _reference/.reui-reference/registry/default/ui/alert-dialog.tsx
Pattern: AlertDialog with destructive action

// Warning before required toggle
// AlertDialog explaining data impact
```

#### Recommended Architecture

**Field Type System**
```typescript
type FieldType = 'text' | 'number' | 'date' | 'select' | 'checkbox';

interface CustomFieldDefinition {
  id: string;
  entityType: 'customers' | 'orders' | 'products';
  label: string;
  key: string; // e.g., "account_manager"
  type: FieldType;
  required: boolean;
  displayOrder: number;
  config: FieldConfig; // Type-specific config
}

type FieldConfig =
  | TextFieldConfig
  | NumberFieldConfig
  | SelectFieldConfig
  | DateFieldConfig
  | CheckboxFieldConfig;
```

**Reordering Logic**
```typescript
// dnd-kit sensors and handlers
const sensors = useSensors(
  useSensor(PointerSensor),
  useSensor(KeyboardSensor)
);

const handleDragEnd = (event: DragEndEvent) => {
  const { active, over } = event;
  if (over && active.id !== over.id) {
    const oldIndex = fields.findIndex(f => f.id === active.id);
    const newIndex = fields.findIndex(f => f.id === over.id);
    const reordered = arrayMove(fields, oldIndex, newIndex);

    // Update displayOrder values
    const updated = reordered.map((field, index) => ({
      ...field,
      displayOrder: index,
    }));

    // Persist to database
    updateFieldOrder(updated);
  }
};
```

**Validation**
```typescript
// Validate unique field keys per entity type
const customFieldSchema = z.object({
  label: z.string().min(1).max(50),
  key: z.string().regex(/^[a-z_]+$/),
  type: z.enum(['text', 'number', 'date', 'select', 'checkbox']),
  required: z.boolean(),
  config: z.any(), // Validated by type-specific schema
});
```

---

## 7. DOM-SET-006c: Field Type Selection Dialog

### Wireframe Overview
Modal dialog for selecting custom field type with visual cards showing type icons, descriptions, and examples.

### UI Patterns (Reference Implementation)

#### Core Components

**Dialog Structure**
```typescript
// Modal dialog
Reference: _reference/.reui-reference/registry/default/ui/dialog.tsx
Pattern: Dialog, DialogContent, DialogHeader, DialogTitle

// Dialog grid
Reference: Custom CSS Grid
Pattern: 2-column grid of selectable cards (mobile: 1-column)
```

**Type Selection Cards**
```typescript
// Selectable cards
Reference: _reference/.reui-reference/registry/default/ui/card.tsx
Pattern: Interactive card with hover state

// Card content
const FieldTypeCard = ({ type, icon, description, example }) => (
  <Card
    className="cursor-pointer hover:border-primary"
    onClick={() => onSelect(type)}
  >
    <CardHeader>
      <Icon className="w-8 h-8" />
      <CardTitle>{type}</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground">{description}</p>
      <p className="text-xs text-muted-foreground">Example: {example}</p>
    </CardContent>
  </Card>
);
```

**Type Descriptions**
```typescript
const FIELD_TYPES = [
  {
    type: 'text',
    icon: Type,
    label: 'Text',
    description: 'Single line of text',
    example: 'Account manager name',
  },
  {
    type: 'number',
    icon: Hash,
    label: 'Number',
    description: 'Numeric values',
    example: 'Credit limit, quantity',
  },
  {
    type: 'date',
    icon: Calendar,
    label: 'Date',
    description: 'Calendar date',
    example: 'Contract end date',
  },
  {
    type: 'select',
    icon: List,
    label: 'Select',
    description: 'Choose from options',
    example: 'Industry, category',
  },
  {
    type: 'checkbox',
    icon: CheckSquare,
    label: 'Checkbox',
    description: 'Yes/No toggle',
    example: 'VIP customer, active',
  },
];
```

#### Recommended Architecture

**Dialog Flow**
```
1. User clicks "Add Field" button
2. FieldTypeSelectionDialog opens
3. User selects a type
4. Dialog closes, returns selected type
5. FieldConfigDialog opens with type-specific form
```

**State Management**
```typescript
const [isTypeDialogOpen, setIsTypeDialogOpen] = useState(false);
const [selectedType, setSelectedType] = useState<FieldType | null>(null);

const handleTypeSelect = (type: FieldType) => {
  setSelectedType(type);
  setIsTypeDialogOpen(false);
  // Open config dialog with selected type
  setIsConfigDialogOpen(true);
};
```

---

## 8. DOM-SET-006d: Custom Fields Integration

### Wireframe Overview
Collapsible custom fields section integrated into customer create/edit forms and detail pages.

### UI Patterns (Reference Implementation)

#### Core Components

**Collapsible Section**
```typescript
// Collapsible
Reference: _reference/.reui-reference/registry/default/ui/collapsible.tsx
Pattern: Collapsible, CollapsibleTrigger, CollapsibleContent

// Section header
const CustomFieldsHeader = ({ count, isExpanded }) => (
  <CollapsibleTrigger className="flex items-center gap-2">
    {isExpanded ? <ChevronDown /> : <ChevronRight />}
    <span>Custom Fields ({count})</span>
    <span className="text-muted-foreground">Additional organization data</span>
  </CollapsibleTrigger>
);
```

**Field Rendering**
```typescript
// Dynamic field rendering based on type
const renderField = (field: CustomFieldDefinition) => {
  switch (field.type) {
    case 'text':
      return <Input {...fieldProps} />;
    case 'number':
      return <NumberInput {...fieldProps} />;
    case 'date':
      return <DateField {...fieldProps} />;
    case 'select':
      return <Select {...fieldProps} options={field.config.options} />;
    case 'checkbox':
      return <Checkbox {...fieldProps} />;
  }
};
```

**Detail Page Display**
```typescript
// Display-only custom fields card
Reference: _reference/.reui-reference/registry/default/ui/card.tsx
Pattern: Card with description list

// Description list for field values
<dl className="grid grid-cols-2 gap-4">
  {fields.map(field => (
    <>
      <dt className="text-sm font-medium">{field.label}</dt>
      <dd className="text-sm text-muted-foreground">
        {formatFieldValue(field.type, value)}
      </dd>
    </>
  ))}
</dl>
```

**Error Boundary**
```typescript
// Isolate custom fields errors
Reference: react-error-boundary
Pattern: ErrorBoundary wrapping CustomFieldsSection

// Non-blocking error state
<ErrorBoundary
  fallbackRender={({ error, resetErrorBoundary }) => (
    <Alert variant="destructive">
      <AlertTitle>Couldn't load custom fields</AlertTitle>
      <AlertDescription>
        You can continue without custom fields. This won't affect saving the customer.
        <Button onClick={resetErrorBoundary}>Retry</Button>
      </AlertDescription>
    </Alert>
  )}
>
  <CustomFieldsSection />
</ErrorBoundary>
```

#### Recommended Architecture

**Form Integration**
```typescript
// Separate form state for custom fields
const customFieldsForm = useForm({
  defaultValues: customFieldValues,
});

// Submit both forms together
const handleSubmit = async (mainFormData) => {
  // Validate custom fields
  const customFieldsValid = await customFieldsForm.trigger();

  if (!customFieldsValid) {
    // Expand section to show errors
    setIsCustomFieldsExpanded(true);
    return;
  }

  // Combine data
  const data = {
    ...mainFormData,
    customFieldValues: customFieldsForm.getValues(),
  };

  await createCustomer(data);
};
```

**Loading Strategy**
```typescript
// Load custom field definitions separately
const { data: fieldDefinitions, isLoading } = useQuery({
  queryKey: ['custom-fields', 'customers'],
  queryFn: () => getCustomFieldDefinitions('customers'),
});

// Show skeleton in collapsible while loading
// Don't block main form rendering
```

---

## 9. DOM-SET-007: Unified Integrations Hub

### Wireframe Overview
Dashboard showing all system integrations (Xero, Resend, Trigger.dev) with status, test connection, and quick stats.

### UI Patterns (Reference Implementation)

#### Core Components

**Integration Cards**
```typescript
// Card grid
Reference: _reference/.reui-reference/registry/default/ui/card.tsx
Pattern: Grid of cards with responsive columns

// Grid layout
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"

// Card structure
<Card>
  <CardHeader>
    <img src={integration.logo} alt="" className="w-12 h-12" />
    <CardTitle>{integration.name}</CardTitle>
    <StatusBadge status={integration.status} />
  </CardHeader>
  <CardContent>
    <p className="text-sm text-muted-foreground">
      {integration.description}
    </p>
    <IntegrationStats stats={integration.details} />
  </CardContent>
  <CardFooter>
    <Button variant="outline" onClick={testConnection}>
      Test Connection
    </Button>
    <Button variant="link" href={integration.configureUrl}>
      Configure →
    </Button>
  </CardFooter>
</Card>
```

**Status Badges**
```typescript
// Status indicator
Reference: _reference/.reui-reference/registry/default/ui/badge.tsx
Pattern: Badge with color variants

const StatusBadge = ({ status }) => {
  const variants = {
    connected: 'default', // green
    disconnected: 'secondary', // gray
    error: 'destructive', // red
    checking: 'outline', // spinner
  };

  return (
    <Badge variant={variants[status]}>
      <StatusIcon status={status} />
      {status}
    </Badge>
  );
};
```

**Test Connection Flow**
```typescript
// Test button with loading state
Reference: _reference/.reui-reference/registry/default/ui/button.tsx
Pattern: Button with loading prop

// Test result toast
Reference: _reference/.reui-reference/registry/default/ui/base-toast.tsx
Pattern: Toast with icon and action

const testConnection = async (integration) => {
  setTesting(integration.type);

  try {
    const result = await testIntegrationConnection(integration.type);
    toast.success(`${integration.name} connection successful`, {
      description: `API responding normally. Latency: ${result.latency}ms`,
    });
  } catch (error) {
    toast.error(`${integration.name} connection failed`, {
      description: error.message,
      action: {
        label: 'Reconnect',
        onClick: () => reconnect(integration.type),
      },
    });
  } finally {
    setTesting(null);
  }
};
```

**Activity Log (Optional)**
```typescript
// Activity table
Reference: _reference/.reui-reference/registry/default/ui/data-grid-table.tsx
Pattern: Simple table with timestamp, event, status

// Shows recent integration events
// Xero sync, Resend email sent, Trigger job completed
```

#### Recommended Architecture

**Integration Status Polling**
```typescript
// Poll integration status on mount
const { data: integrations } = useQuery({
  queryKey: ['integrations-status'],
  queryFn: checkAllIntegrations,
  refetchInterval: 60000, // Refresh every minute
  staleTime: 30000,
});

// Cache status to avoid excessive checks
```

**Integration Configuration**
```typescript
const INTEGRATIONS = [
  {
    type: 'xero',
    name: 'Xero',
    description: 'Accounting & invoicing integration',
    logo: '/integrations/xero.svg',
    configureUrl: '/settings/xero',
    getStatus: async () => {
      // Check Xero API connection
      // Return { connected, lastSync, error }
    },
  },
  // ... other integrations
];
```

---

## 10. DOM-SET-008: Settings Search

### Wireframe Overview
Global settings search with keyboard shortcut (Cmd+K), debounced search, results dropdown, recent searches, and scroll-to-highlight.

### UI Patterns (Reference Implementation)

#### Core Components

**Command Palette**
```typescript
// Command component
Reference: _reference/.reui-reference/registry/default/ui/command.tsx
Pattern: Command, CommandInput, CommandList, CommandGroup, CommandItem

// Keyboard shortcut
Reference: _reference/.reui-reference/registry/default/ui/kbd.tsx
Pattern: Keyboard hint display

// Command palette structure
<Command>
  <CommandInput placeholder="Search settings..." />
  <CommandList>
    <CommandGroup heading="System Defaults">
      <CommandItem onSelect={navigateToSetting}>
        <SearchResultItem result={result} />
      </CommandItem>
    </CommandGroup>

    <CommandSeparator />

    <CommandGroup heading="Recent Searches">
      {recentSearches.map(query => (
        <CommandItem onSelect={() => search(query)}>
          {query}
        </CommandItem>
      ))}
    </CommandGroup>
  </CommandList>
</Command>
```

**Search Implementation**
```typescript
// Debounced search
import { useDebouncedValue } from '@/hooks/use-debounced-value';

const [query, setQuery] = useState('');
const debouncedQuery = useDebouncedValue(query, 300);

// Search index
const searchSettings = (query: string) => {
  const results = SEARCHABLE_SETTINGS.filter(setting => {
    const searchText = `${setting.title} ${setting.description} ${setting.keywords.join(' ')}`.toLowerCase();
    return searchText.includes(query.toLowerCase());
  });

  return results.slice(0, 10); // Limit results
};
```

**Keyboard Shortcuts**
```typescript
// Global keyboard listener
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setIsSearchOpen(true);
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

**Navigation & Highlight**
```typescript
// Navigate to result
const navigateToResult = (result: SearchResult) => {
  // Close search
  setIsSearchOpen(false);

  // Navigate to page
  router.navigate({
    to: result.path,
    search: { highlight: result.fieldId },
  });

  // Scroll and highlight
  setTimeout(() => {
    const element = document.getElementById(result.fieldId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('highlight-pulse');

      // Remove highlight after 3s
      setTimeout(() => {
        element.classList.remove('highlight-pulse');
      }, 3000);
    }
  }, 100);
};
```

**Highlight Animation**
```css
/* Highlight pulse animation */
@keyframes highlight-pulse {
  0%, 100% {
    background-color: transparent;
    box-shadow: 0 0 0 0 var(--yellow-200);
  }
  50% {
    background-color: var(--yellow-100);
    box-shadow: 0 0 0 4px var(--yellow-200);
  }
}

.highlight-pulse {
  animation: highlight-pulse 1s ease-out 2;
  border-radius: 4px;
}
```

#### Recommended Architecture

**Searchable Index**
```typescript
// Static searchable settings index
const SEARCHABLE_SETTINGS: SearchableSettings[] = [
  {
    id: 'defaults-payment-terms',
    section: 'defaults',
    title: 'Payment Terms',
    description: 'Default payment term in days for invoices',
    path: '/settings/defaults',
    fieldId: 'payment-terms',
    keywords: ['payment', 'terms', 'invoice', 'days', 'financial'],
  },
  // ... more entries
];

// Generate at build time or on first load
// Store in memory for fast search
```

**Recent Searches Persistence**
```typescript
// Store in localStorage
const saveRecentSearch = (query: string) => {
  const recent = getRecentSearches();
  const updated = [
    query,
    ...recent.filter(q => q !== query)
  ].slice(0, 5); // Keep last 5

  localStorage.setItem('settings-recent-searches', JSON.stringify(updated));
};

const getRecentSearches = (): string[] => {
  const stored = localStorage.getItem('settings-recent-searches');
  return stored ? JSON.parse(stored) : [];
};
```

**Search Ranking**
```typescript
// Score search results
const scoreResult = (result: SearchableSettings, query: string) => {
  let score = 0;

  // Exact title match
  if (result.title.toLowerCase() === query.toLowerCase()) {
    score += 100;
  }

  // Title contains query
  if (result.title.toLowerCase().includes(query.toLowerCase())) {
    score += 50;
  }

  // Description contains query
  if (result.description.toLowerCase().includes(query.toLowerCase())) {
    score += 20;
  }

  // Keyword match
  if (result.keywords.some(k => k.includes(query.toLowerCase()))) {
    score += 10;
  }

  return score;
};

// Sort by score
results.sort((a, b) => scoreResult(b, query) - scoreResult(a, query));
```

---

## Cross-Cutting Patterns

### 1. Form Validation Pattern

All form-based wireframes should use this consistent pattern:

```typescript
// Zod schema
const schema = z.object({
  field: z.string().min(1, 'Required'),
});

// TanStack Form
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';

const form = useForm({
  defaultValues: initialData,
  validatorAdapter: zodValidator(),
  validators: {
    onChange: schema,
  },
  onSubmit: async ({ value }) => {
    await saveMutation.mutateAsync(value);
  },
});

// Field rendering
<form.Field name="field">
  {(field) => (
    <>
      <Label htmlFor={field.name}>{label}</Label>
      <Input
        id={field.name}
        value={field.state.value}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
      />
      {field.state.meta.errors.length > 0 && (
        <span className="text-sm text-destructive">
          {field.state.meta.errors[0]}
        </span>
      )}
    </>
  )}
</form.Field>
```

### 2. Loading State Pattern

Consistent loading states across all wireframes:

```typescript
// Skeleton loading
Reference: _reference/.reui-reference/registry/default/ui/skeleton.tsx
Pattern: Skeleton component for loading placeholders

// Button loading
<Button disabled={isLoading}>
  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  Save
</Button>

// Table loading
<TableBody>
  {isLoading ? (
    Array.from({ length: 5 }).map((_, i) => (
      <TableRow key={i}>
        <TableCell><Skeleton className="h-4 w-full" /></TableCell>
        <TableCell><Skeleton className="h-4 w-full" /></TableCell>
      </TableRow>
    ))
  ) : (
    // actual rows
  )}
</TableBody>
```

### 3. Error Handling Pattern

Consistent error display:

```typescript
// Toast for transient errors
Reference: _reference/.reui-reference/registry/default/ui/base-toast.tsx
toast.error('Failed to save settings', {
  description: error.message,
  action: { label: 'Retry', onClick: retry },
});

// Alert for persistent errors
Reference: _reference/.reui-reference/registry/default/ui/alert.tsx
<Alert variant="destructive">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>{error.message}</AlertDescription>
</Alert>

// Empty state for no data
const EmptyState = ({ icon: Icon, title, description }) => (
  <div className="flex flex-col items-center justify-center py-12">
    <Icon className="h-12 w-12 text-muted-foreground" />
    <h3 className="mt-4 text-lg font-semibold">{title}</h3>
    <p className="mt-2 text-sm text-muted-foreground">{description}</p>
  </div>
);
```

### 4. Responsive Layout Pattern

All settings pages follow this structure:

```typescript
// Desktop: Sidebar + Content
<div className="flex">
  <SettingsSidebar className="hidden lg:block w-64" />
  <main className="flex-1 p-6">
    <SettingsPageContent />
  </main>
</div>

// Mobile: Full width + Hamburger menu
<Sheet>
  <SheetTrigger asChild>
    <Button variant="ghost" size="icon" className="lg:hidden">
      <Menu />
    </Button>
  </SheetTrigger>
  <SheetContent side="left">
    <SettingsSidebar />
  </SheetContent>
</Sheet>

// Breakpoints
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: 1024px+
```

### 5. Admin-Only Access Pattern

All admin-only settings pages use this guard:

```typescript
// Route guard
export const Route = createFileRoute('/_authed/settings/audit-log')({
  beforeLoad: async ({ context }) => {
    if (!context.auth.user?.isAdmin) {
      throw redirect({
        to: '/unauthorized',
        search: { from: '/settings/audit-log' },
      });
    }
  },
  component: AuditLogPage,
});

// UI indication
<Card>
  <CardHeader>
    <div className="flex items-center gap-2">
      <Shield className="h-5 w-5 text-yellow-500" />
      <CardTitle>Admin Only</CardTitle>
    </div>
  </CardHeader>
</Card>
```

---

## Implementation Priority

### Phase 1: Core Settings (Week 1-2)
1. DOM-SET-001b: System Defaults (foundational)
2. DOM-SET-001c: User Profile (foundational)
3. DOM-SET-007: Integrations Hub (high value, moderate complexity)

### Phase 2: Advanced Features (Week 3-4)
4. DOM-SET-002: Audit Log (admin tool, high complexity)
5. DOM-SET-008: Settings Search (UX enhancement, high value)
6. DOM-SET-005b: Business Hours (moderate complexity)

### Phase 3: Custom Fields (Week 5-6)
7. DOM-SET-006b: Custom Fields Manager (high complexity)
8. DOM-SET-006c: Field Type Selection (dependency of 006b)
9. DOM-SET-006d: Custom Fields Integration (dependency of 006b)

### Phase 4: Data Management (Week 7)
10. DOM-SET-003b: Export Page (background jobs, moderate complexity)

---

## Common Gotchas & Best Practices

### 1. Form Performance
- Use React Hook Form or TanStack Form with controlled components
- Avoid full form re-renders on every keystroke
- Debounce autosave functions

### 2. Settings Persistence
- Save immediately on change (auto-save) for simple toggles
- Use explicit "Save" button for complex forms
- Show unsaved changes indicator
- Warn before navigation if unsaved changes exist

### 3. Timezone Handling
- Store all dates in UTC in database
- Display in organization timezone (from settings)
- Use date-fns-tz or Luxon for timezone conversions

### 4. Custom Fields Performance
- Load field definitions once, cache in context
- Lazy load field values only when needed
- Use Error Boundaries to isolate custom field failures

### 5. Search Performance
- Build search index at build time or on first load
- Use Web Workers for large search operations
- Debounce search input (300ms)
- Limit results to 10-20 items

### 6. Table Performance
- Use TanStack Table with pagination
- Implement virtual scrolling for 1000+ rows (use @tanstack/react-virtual)
- Server-side filtering for large datasets
- Lazy load detail panels

---

## Accessibility Checklist

All settings pages must meet these requirements:

### Keyboard Navigation
- [ ] All interactive elements focusable with Tab
- [ ] Focus visible indicator on all elements
- [ ] Escape closes dialogs and dropdowns
- [ ] Enter submits forms
- [ ] Arrow keys navigate within select/radio groups

### Screen Reader Support
- [ ] All form fields have labels (visible or aria-label)
- [ ] Error messages associated with fields (aria-describedby)
- [ ] Loading states announced (aria-live="polite")
- [ ] Success/error toasts announced (role="status")
- [ ] Table headers use scope="col"
- [ ] Dialog traps focus when open (aria-modal="true")

### Visual Accessibility
- [ ] Color contrast ratio ≥ 4.5:1 for text
- [ ] Error states indicated by more than just color
- [ ] Loading spinners have aria-label
- [ ] Icons have aria-label or aria-hidden="true"
- [ ] Focus indicators are visible

### Testing Tools
- Use axe DevTools browser extension
- Test with keyboard only (disconnect mouse)
- Test with screen reader (NVDA, JAWS, VoiceOver)

---

## Next Steps

1. **Review with design team**: Confirm UI pattern selections match design system
2. **Create component mapping spreadsheet**: Detailed mapping of every UI element to reference component
3. **Set up project structure**: Create feature folders for each settings section
4. **Implement shared components first**: Form inputs, layout shells, loading states
5. **Build settings in priority order**: Phase 1 → Phase 2 → Phase 3 → Phase 4
6. **Test accessibility early**: Run axe DevTools on every page before considering it complete

---

## Reference Implementation Files

### ReUI Components (`_reference/.reui-reference/registry/default/ui/`)
- `base-form-tanstack.tsx` - TanStack Form integration
- `form.tsx` - Form layout components
- `input.tsx` - Text/number inputs
- `select.tsx` - Select dropdowns
- `checkbox.tsx` - Checkboxes
- `radio-group.tsx` - Radio buttons
- `base-switch.tsx` - Toggle switches
- `button.tsx` - Buttons with loading states
- `card.tsx` - Card containers
- `dialog.tsx` - Modal dialogs
- `sheet.tsx` - Slide-in panels
- `collapsible.tsx` - Collapsible sections
- `data-grid-table.tsx` - DataTable
- `data-grid-table-dnd-rows.tsx` - Draggable rows
- `base-toast.tsx` - Toast notifications
- `command.tsx` - Command palette
- `calendar.tsx` - Date picker
- `datefield.tsx` - Date/time inputs
- `progress.tsx` - Progress bars
- `skeleton.tsx` - Loading skeletons
- `badge.tsx` - Status badges
- `separator.tsx` - Dividers
- `base-tooltip.tsx` - Tooltips
- `alert.tsx` - Alert messages
- `alert-dialog.tsx` - Confirmation dialogs

### Midday Reference (`_reference/.midday-reference/`)
- `apps/dashboard/src/app/[locale]/(app)/(sidebar)/settings/page.tsx` - Settings landing page
- `apps/dashboard/src/app/[locale]/(app)/(sidebar)/settings/layout.tsx` - Settings layout with sidebar
- `apps/dashboard/src/app/[locale]/(app)/(sidebar)/settings/accounts/page.tsx` - Account settings example
- `apps/dashboard/src/app/[locale]/(app)/(sidebar)/settings/members/page.tsx` - Team members table example

---

**Document Version:** 1.0
**Last Updated:** 2026-01-10
**Reviewer:** Scribe Agent (Claude Sonnet 4.5)
