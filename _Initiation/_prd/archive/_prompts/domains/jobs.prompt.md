# Task: Implement Jobs Domain

## Context
Read the PRD file to find the first story where `passes: false`.
Read the progress file for learnings from previous iterations.
Read `AGENTS.md` and conventions for project patterns.

## Project Location
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack

## PRD File
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/memory-bank/prd/domains/jobs.prd.json

## Progress File
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/memory-bank/prd/_progress/dom-jobs.progress.txt

## PRD ID
DOM-JOBS

## Phase
domain-core

## Priority
2

## Dependencies
- DOM-ORDERS (order reference)
- DOM-CUSTOMERS (customer reference)
- FOUND-SCHEMA (schema patterns)

---

## Pre-Flight Checks

Before starting, verify:

```bash
# 1. TypeScript compiles
npm run typecheck

# 2. Check order domain is available
# Verify DOM-ORDERS and DOM-CUSTOMERS are complete
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
| `lib/schema/jobs.ts` | Job database schema |
| `lib/schemas/jobs.ts` | Job Zod schemas |
| `src/server/functions/jobs.ts` | Job server functions |
| `src/components/domain/jobs/` | Job UI components |
| `src/routes/_authed/jobs/` | Job UI routes |

---

## Renoz Business Context

### Job Types & Workflow

Renoz jobs represent field service operations for battery system installations:

```
Installation → Maintenance → Service → Warranty Repair
     ↓              ↓            ↓            ↓
  On-Site       Scheduled    Emergency    Claim-based
```

**Job Types:**

- **Installation**: Battery system deployment (residential or commercial BESS)
- **Maintenance**: Scheduled preventive maintenance (annual/bi-annual)
- **Service**: Reactive service calls (system issues, performance checks)
- **Warranty Repair**: Manufacturer warranty claim work

**IMPORTANT**: Unlike generic field service, Renoz installations require CEC (Clean Energy Council) compliance documentation, serial number capture for warranty activation, electrical certification, and commissioning reports for grid-connected battery systems.

### Job Lifecycle

```
Scheduled → In Progress → Completed → Commissioned → Invoiced
              ↓                          ↓
           On Hold                   Failed QA
              ↓                          ↓
          Cancelled                Rework Required
```

**Status Definitions:**

- **Scheduled**: Job assigned to technician, time slot booked
- **In Progress**: Technician on-site, work underway
- **On Hold**: Paused (parts delay, weather, customer request)
- **Completed**: Physical work finished, awaiting sign-off
- **Commissioned**: System tested, certified, and handed over
- **Failed QA**: Did not pass quality inspection, rework needed
- **Invoiced**: Job invoiced, ready for payment
- **Cancelled**: Job terminated (customer cancellation, scope change)

### Critical Job Data

**Installation Requirements:**
- CEC-accredited installer assigned (A-class electrician)
- Bill of Materials (BOM) with serial numbers
- Electrical compliance certificate
- Commissioning report (battery capacity test, grid connection)
- Customer handover documentation (operation manual, warranty terms)

**Field Operations:**
- GPS check-in/check-out (verify on-site time)
- Photo documentation (before/during/after installation)
- Time tracking (labor hours for costing)
- Parts/inventory consumption tracking
- Customer signature for completion

**Safety & Compliance:**
- CEC compliance checklist (AS/NZS 5139:2019 for battery storage)
- Hazmat handling (UN3481 lithium-ion batteries)
- Electrical safety certification
- Grid connection approval (DNO notification for >5kW systems)

---

## UI Pattern References

### Job Board / Kanban View

**Component**: Drag-and-drop Kanban board for job scheduling

```typescript
// Reference implementation
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import { Card, CardHeader, CardTitle, CardContent } from '@/registry/default/ui/card';
import { Badge } from '@/registry/default/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/registry/default/ui/avatar';

// Job card in Kanban column
function JobCard({ job }: { job: Job }) {
  return (
    <Card className="mb-3 cursor-move">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-sm font-medium">
              {job.customer.name}
            </CardTitle>
            <p className="text-xs text-muted-foreground">{job.address}</p>
          </div>
          <Badge variant={jobTypeBadge[job.type]} size="sm">
            {job.type}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2">
          <Avatar size="sm">
            <AvatarImage src={job.assignedTechnician?.avatar} />
            <AvatarFallback>{job.assignedTechnician?.initials}</AvatarFallback>
          </Avatar>
          <span className="text-sm">{job.assignedTechnician?.name}</span>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{format(job.scheduledDate, 'MMM d, h:mm a')}</span>
          <span>{job.estimatedHours}h</span>
        </div>
        {job.requiresCEC && (
          <Badge variant="warning" size="sm">
            CEC Required
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}

// Kanban board columns
const jobStatuses = [
  { id: 'scheduled', label: 'Scheduled', color: 'blue' },
  { id: 'in_progress', label: 'In Progress', color: 'yellow' },
  { id: 'completed', label: 'Completed', color: 'green' },
  { id: 'on_hold', label: 'On Hold', color: 'gray' },
];

<DndContext onDragEnd={handleDragEnd}>
  <div className="grid grid-cols-4 gap-4">
    {jobStatuses.map((status) => (
      <div key={status.id} className="space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          {status.label}
          <Badge variant="outline">{jobsByStatus[status.id].length}</Badge>
        </h3>
        <div className="space-y-3">
          {jobsByStatus[status.id].map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      </div>
    ))}
  </div>
</DndContext>
```

**Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`

### Job Detail View with Timeline

**Component**: Side panel with job timeline and checklist

```typescript
// Job detail panel
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/registry/default/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/registry/default/ui/tabs';
import { Checkbox } from '@/registry/default/ui/checkbox';

<Sheet open={selectedJob !== null} onOpenChange={handleClose}>
  <SheetContent className="w-[700px]">
    <SheetHeader>
      <SheetTitle>{selectedJob.customer.name} - {selectedJob.type}</SheetTitle>
      <div className="flex items-center gap-2">
        <Badge variant={statusBadge[selectedJob.status]}>
          {selectedJob.status}
        </Badge>
        {selectedJob.requiresCEC && (
          <Badge variant="warning">CEC Required</Badge>
        )}
      </div>
    </SheetHeader>

    <Tabs defaultValue="details">
      <TabsList>
        <TabsTrigger value="details">Details</TabsTrigger>
        <TabsTrigger value="checklist">Checklist</TabsTrigger>
        <TabsTrigger value="materials">Materials</TabsTrigger>
        <TabsTrigger value="timeline">Timeline</TabsTrigger>
        <TabsTrigger value="photos">Photos</TabsTrigger>
      </TabsList>

      <TabsContent value="checklist">
        <div className="space-y-3">
          <h4 className="font-medium">CEC Compliance Checklist</h4>
          {job.checklist.map((item) => (
            <div key={item.id} className="flex items-start gap-3">
              <Checkbox
                checked={item.completed}
                onCheckedChange={(checked) => handleChecklistToggle(item.id, checked)}
              />
              <div className="flex-1">
                <p className="text-sm font-medium">{item.task}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="materials">
        <BillOfMaterialsTable jobId={selectedJob.id} />
      </TabsContent>

      <TabsContent value="timeline">
        <JobTimeline events={selectedJob.events} />
      </TabsContent>
    </Tabs>
  </SheetContent>
</Sheet>
```

**Reference**: `_reference/.reui-reference/registry/default/ui/sheet.tsx`

### Mobile-Friendly Job Card

**Component**: Touch-optimized job card for field technicians

```typescript
// Mobile job view for technicians
import { Button } from '@/registry/default/ui/button';
import { Separator } from '@/registry/default/ui/separator';

<Card className="w-full">
  <CardHeader>
    <div className="flex items-start justify-between">
      <div>
        <CardTitle>{job.customer.name}</CardTitle>
        <p className="text-sm text-muted-foreground">{job.address}</p>
      </div>
      <Badge variant={statusBadge[job.status]}>{job.status}</Badge>
    </div>
  </CardHeader>

  <CardContent className="space-y-4">
    {/* Quick actions */}
    <div className="grid grid-cols-2 gap-2">
      <Button variant="outline" onClick={handleCheckIn}>
        Check In
      </Button>
      <Button variant="outline" onClick={handleNavigate}>
        Navigate
      </Button>
    </div>

    <Separator />

    {/* Job details */}
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Scheduled</span>
        <span className="font-medium">{format(job.scheduledDate, 'PPp')}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Duration</span>
        <span className="font-medium">{job.estimatedHours}h</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Contact</span>
        <a href={`tel:${job.customer.phone}`} className="text-primary">
          {job.customer.phone}
        </a>
      </div>
    </div>

    <Separator />

    {/* BOM preview */}
    <div>
      <h4 className="text-sm font-medium mb-2">Materials ({job.materials.length})</h4>
      <ul className="space-y-1 text-sm">
        {job.materials.slice(0, 3).map((material) => (
          <li key={material.id} className="flex justify-between">
            <span>{material.product.name}</span>
            <span className="text-muted-foreground">Qty: {material.quantity}</span>
          </li>
        ))}
      </ul>
    </div>

    {/* Action buttons */}
    <div className="grid grid-cols-2 gap-2">
      <Button onClick={handleStartJob} disabled={job.status !== 'scheduled'}>
        Start Job
      </Button>
      <Button variant="outline" onClick={handleViewDetails}>
        View Details
      </Button>
    </div>
  </CardContent>
</Card>
```

### Commissioning Report Form

**Component**: Multi-step form for battery system commissioning

```typescript
// Commissioning report for completed installation
import { Stepper, StepperNav, StepperItem } from '@/registry/default/ui/stepper';
import { Form, FormField } from '@/registry/default/ui/form';

<Form onSubmit={handleSubmitCommissioningReport}>
  <Stepper value={currentStep}>
    <StepperNav>
      <StepperItem step={1}>System Details</StepperItem>
      <StepperItem step={2}>Capacity Test</StepperItem>
      <StepperItem step={3}>Grid Connection</StepperItem>
      <StepperItem step={4}>Sign-Off</StepperItem>
    </StepperNav>

    {currentStep === 1 && (
      <div className="space-y-4">
        <FormField label="Battery Capacity (kWh)" required>
          <Input
            type="number"
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
          />
        </FormField>

        <FormField label="Inverter Model" required>
          <Select value={inverterModel} onValueChange={setInverterModel}>
            <SelectItem value="huawei_sun2000">Huawei SUN2000</SelectItem>
            <SelectItem value="fronius_primo">Fronius Primo</SelectItem>
            <SelectItem value="sungrow_hybrid">SunGrow Hybrid</SelectItem>
          </Select>
        </FormField>

        <FormField label="Battery Serial Numbers" required hint="Comma-separated for multiple units">
          <Textarea
            value={serialNumbers}
            onChange={(e) => setSerialNumbers(e.target.value)}
            placeholder="ABC123456, ABC789012"
          />
        </FormField>
      </div>
    )}

    {currentStep === 2 && (
      <div className="space-y-4">
        <FormField label="Charge Test (% of rated capacity)" required>
          <Input
            type="number"
            value={chargeTestResult}
            onChange={(e) => setChargeTestResult(Number(e.target.value))}
            min={0}
            max={100}
          />
        </FormField>

        {chargeTestResult < 95 && (
          <Alert variant="warning">
            <AlertDescription>
              Charge test result below 95% may indicate battery issue. Please investigate.
            </AlertDescription>
          </Alert>
        )}

        <FormField label="Discharge Test (% of rated capacity)" required>
          <Input
            type="number"
            value={dischargeTestResult}
            onChange={(e) => setDischargeTestResult(Number(e.target.value))}
            min={0}
            max={100}
          />
        </FormField>
      </div>
    )}

    {currentStep === 3 && (
      <div className="space-y-4">
        <FormField label="Grid Connection Approved">
          <Switch
            checked={gridConnected}
            onCheckedChange={setGridConnected}
          />
        </FormField>

        {gridConnected && (
          <>
            <FormField label="DNO Notification Reference" required>
              <Input
                value={dnoReference}
                onChange={(e) => setDnoReference(e.target.value)}
              />
            </FormField>

            <FormField label="G99 Compliance Certificate">
              <Input type="file" accept=".pdf" onChange={handleG99Upload} />
            </FormField>
          </>
        )}
      </div>
    )}

    {currentStep === 4 && (
      <div className="space-y-4">
        <Alert>
          <AlertDescription>
            Customer signature confirms system handover, operation training completed, and warranty terms explained.
          </AlertDescription>
        </Alert>

        <FormField label="Customer Signature" required>
          <SignaturePad onSave={setCustomerSignature} />
        </FormField>

        <FormField label="Installer Signature" required>
          <SignaturePad onSave={setInstallerSignature} />
        </FormField>

        <FormField label="CEC Certificate Number" required>
          <Input
            value={cecCertificate}
            onChange={(e) => setCecCertificate(e.target.value)}
            pattern="^A\d{7}$"
          />
        </FormField>
      </div>
    )}
  </Stepper>

  <div className="flex justify-between mt-6">
    <Button
      variant="outline"
      onClick={handlePreviousStep}
      disabled={currentStep === 1}
    >
      Previous
    </Button>
    {currentStep < 4 ? (
      <Button onClick={handleNextStep}>Next</Button>
    ) : (
      <Button type="submit">Complete Commissioning</Button>
    )}
  </div>
</Form>
```

---

## Implementation Notes

### Job Schema with CEC Compliance

```typescript
// Jobs with field service and compliance tracking
import { pgTable, uuid, text, timestamp, integer, decimal, boolean, jsonb } from 'drizzle-orm/pg-core';

export const jobs = pgTable('jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull(),
  jobNumber: text('job_number').notNull().unique(), // JOB-YYYYMM-XXXX

  // Relationships
  customerId: uuid('customer_id').notNull(),
  orderId: uuid('order_id'), // Optional link to order
  siteAddressId: uuid('site_address_id').notNull(),

  // Job classification
  type: text('type').notNull(), // 'installation', 'maintenance', 'service', 'warranty_repair'
  status: text('status').notNull().default('scheduled'),

  // Scheduling
  scheduledDate: timestamp('scheduled_date').notNull(),
  scheduledEndDate: timestamp('scheduled_end_date'),
  estimatedHours: decimal('estimated_hours', { precision: 5, scale: 2 }),

  // Assignment
  assignedTechnicianId: uuid('assigned_technician_id'),
  assignedTeam: text('assigned_team'), // For multi-person jobs

  // CEC Compliance
  requiresCEC: boolean('requires_cec').default(true), // Most battery installs need CEC
  cecCertificateNumber: text('cec_certificate_number'),
  cecAccreditedInstaller: uuid('cec_accredited_installer_id'),

  // Field tracking
  checkedInAt: timestamp('checked_in_at'),
  checkedOutAt: timestamp('checked_out_at'),
  actualHours: decimal('actual_hours', { precision: 5, scale: 2 }),

  // Completion
  completedAt: timestamp('completed_at'),
  commissionedAt: timestamp('commissioned_at'),
  commissioningReport: jsonb('commissioning_report'), // Detailed test results

  // Financial
  laborCost: decimal('labor_cost', { precision: 10, scale: 2 }),
  materialsCost: decimal('materials_cost', { precision: 10, scale: 2 }),
  totalCost: decimal('total_cost', { precision: 10, scale: 2 }),
  invoiced: boolean('invoiced').default(false),

  // Notes
  description: text('description'),
  customerNotes: text('customer_notes'),
  internalNotes: text('internal_notes'),

  // Audit
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  version: integer('version').notNull().default(1),
});

// Job checklist items (CEC compliance tasks)
export const jobChecklistItems = pgTable('job_checklist_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id').notNull(),
  task: text('task').notNull(),
  description: text('description'),
  category: text('category'), // 'safety', 'electrical', 'mechanical', 'documentation'
  required: boolean('required').default(true),
  completed: boolean('completed').default(false),
  completedBy: uuid('completed_by'),
  completedAt: timestamp('completed_at'),
  sortOrder: integer('sort_order').notNull(),
});

// Bill of Materials for job
export const jobMaterials = pgTable('job_materials', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id').notNull(),
  productId: uuid('product_id').notNull(),
  quantity: integer('quantity').notNull(),
  serialNumber: text('serial_number'), // For batteries/inverters
  costPrice: decimal('cost_price', { precision: 10, scale: 2 }),
  allocated: boolean('allocated').default(false),
  consumed: boolean('consumed').default(false),
  consumedAt: timestamp('consumed_at'),
});

// Job photos/attachments
export const jobAttachments = pgTable('job_attachments', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id').notNull(),
  type: text('type').notNull(), // 'photo', 'document', 'signature'
  category: text('category'), // 'before', 'during', 'after', 'compliance'
  fileUrl: text('file_url').notNull(),
  fileName: text('file_name').notNull(),
  fileSize: integer('file_size'),
  uploadedBy: uuid('uploaded_by').notNull(),
  uploadedAt: timestamp('uploaded_at').notNull().defaultNow(),
  description: text('description'),
});

// Time tracking for job
export const jobTimeEntries = pgTable('job_time_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id').notNull(),
  technicianId: uuid('technician_id').notNull(),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time'),
  hours: decimal('hours', { precision: 5, scale: 2 }),
  billable: boolean('billable').default(true),
  description: text('description'),
});
```

### CEC Compliance Checklist Template

```typescript
// Predefined CEC checklist for battery installations
const cecInstallationChecklist = [
  {
    category: 'safety',
    task: 'Verify site is safe for installation',
    description: 'Check for hazards, proper ventilation, and safe access',
    required: true,
  },
  {
    category: 'electrical',
    task: 'Confirm electrical supply meets requirements',
    description: 'Verify voltage, frequency, and earthing comply with AS/NZS 3000',
    required: true,
  },
  {
    category: 'mechanical',
    task: 'Battery mounting secure and level',
    description: 'Wall brackets installed per manufacturer specs, weight load verified',
    required: true,
  },
  {
    category: 'electrical',
    task: 'DC cabling installed to manufacturer specs',
    description: 'Correct gauge, routing, and terminations per install manual',
    required: true,
  },
  {
    category: 'electrical',
    task: 'AC connection to inverter complete',
    description: 'Phase wiring correct, RCD/MCB installed, labeling complete',
    required: true,
  },
  {
    category: 'safety',
    task: 'Temperature monitoring configured',
    description: 'Verify battery management system (BMS) temp sensors working',
    required: true,
  },
  {
    category: 'electrical',
    task: 'Grid connection tested (if applicable)',
    description: 'Anti-islanding protection verified, export limiting configured',
    required: true,
  },
  {
    category: 'documentation',
    task: 'Serial numbers recorded',
    description: 'Battery pack, inverter, and BMS serial numbers captured',
    required: true,
  },
  {
    category: 'documentation',
    task: 'Commissioning report completed',
    description: 'Charge/discharge tests performed, results recorded',
    required: true,
  },
  {
    category: 'documentation',
    task: 'Customer handover training provided',
    description: 'Operation, emergency procedures, and warranty terms explained',
    required: true,
  },
];

// Create checklist items when job is created
export async function createJobChecklist(jobId: string, jobType: string) {
  const template = jobType === 'installation' ? cecInstallationChecklist : [];

  for (const [index, item] of template.entries()) {
    await db.insert(jobChecklistItems).values({
      jobId,
      task: item.task,
      description: item.description,
      category: item.category,
      required: item.required,
      sortOrder: index + 1,
    });
  }
}
```

### GPS Check-In/Check-Out

```typescript
// Track technician location for job verification
export const checkInToJob = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    jobId: z.string().uuid(),
    latitude: z.number(),
    longitude: z.number(),
  }))
  .handler(async ({ data }) => {
    const ctx = await requireAuth();

    return withRLSContext(ctx.session, async (tx) => {
      const [job] = await tx
        .select()
        .from(jobs)
        .where(eq(jobs.id, data.jobId));

      if (!job) {
        throw new NotFoundError('job', data.jobId);
      }

      // Verify technician is assigned to this job
      if (job.assignedTechnicianId !== ctx.session.userId) {
        throw new AppError('Not assigned to this job', 'FORBIDDEN', 403);
      }

      // Verify location is near job site (within 500m)
      const siteAddress = await tx
        .select()
        .from(addresses)
        .where(eq(addresses.id, job.siteAddressId));

      const distance = calculateDistance(
        data.latitude,
        data.longitude,
        siteAddress[0].latitude,
        siteAddress[0].longitude
      );

      if (distance > 0.5) {
        // More than 500 meters away
        throw new ValidationError('Location verification failed - not at job site');
      }

      // Record check-in
      const [updated] = await tx
        .update(jobs)
        .set({
          status: 'in_progress',
          checkedInAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(jobs.id, data.jobId))
        .returning();

      // Start time entry
      await tx.insert(jobTimeEntries).values({
        jobId: data.jobId,
        technicianId: ctx.session.userId,
        startTime: new Date(),
        billable: true,
      });

      return updated;
    });
  });
```

### Serial Number Capture

```typescript
// Ensure serial numbers are captured for warranty
export const recordMaterialSerial = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    jobMaterialId: z.string().uuid(),
    serialNumber: z.string().min(1),
  }))
  .handler(async ({ data }) => {
    const ctx = await requireAuth();

    return withRLSContext(ctx.session, async (tx) => {
      // Update job material with serial number
      const [updated] = await tx
        .update(jobMaterials)
        .set({
          serialNumber: data.serialNumber,
          consumed: true,
          consumedAt: new Date(),
        })
        .where(eq(jobMaterials.id, data.jobMaterialId))
        .returning();

      // Check if all critical materials have serial numbers
      const job = await tx
        .select()
        .from(jobs)
        .where(eq(jobs.id, updated.jobId));

      const materials = await tx
        .select()
        .from(jobMaterials)
        .innerJoin(products, eq(jobMaterials.productId, products.id))
        .where(
          and(
            eq(jobMaterials.jobId, updated.jobId),
            eq(products.serialized, true)
          )
        );

      const allHaveSerials = materials.every(m => m.job_materials.serialNumber !== null);

      if (allHaveSerials && job[0].status === 'completed') {
        // Can now mark as ready for commissioning
        await tx
          .update(jobs)
          .set({ status: 'ready_for_commissioning' })
          .where(eq(jobs.id, updated.jobId));
      }

      return updated;
    });
  });
```

### Commissioning Report

```typescript
// Store detailed commissioning test results
type CommissioningReport = {
  systemDetails: {
    batteryCapacityKwh: number;
    inverterModel: string;
    inverterSerialNumber: string;
    batterySerialNumbers: string[];
  };
  capacityTest: {
    chargeTestPercent: number;
    dischargeTestPercent: number;
    cycleCount: number;
    testDate: string;
  };
  gridConnection: {
    connected: boolean;
    dnoReference?: string;
    g99Certificate?: string; // File URL
    antiIslandingTested: boolean;
    exportLimitKw?: number;
  };
  signOff: {
    customerSignature: string; // Base64 image
    installerSignature: string;
    cecCertificateNumber: string;
    handoverDate: string;
    warrantyExplained: boolean;
  };
};

export const completeCommissioning = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    jobId: z.string().uuid(),
    report: z.custom<CommissioningReport>(),
  }))
  .handler(async ({ data }) => {
    const ctx = await requireAuth();

    // Verify CEC accreditation
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, ctx.session.userId));

    const cecMetadata = user[0].roleMetadata as { cecAccreditation?: any };
    if (!cecMetadata?.cecAccreditation) {
      throw new AppError('Installer must be CEC accredited to commission', 'FORBIDDEN', 403);
    }

    return withRLSContext(ctx.session, async (tx) => {
      const [job] = await tx
        .update(jobs)
        .set({
          status: 'commissioned',
          commissionedAt: new Date(),
          commissioningReport: data.report as unknown as JsonValue,
          cecCertificateNumber: data.report.signOff.cecCertificateNumber,
          updatedAt: new Date(),
        })
        .where(eq(jobs.id, data.jobId))
        .returning();

      // Activate warranties for all battery serial numbers
      for (const serialNumber of data.report.systemDetails.batterySerialNumbers) {
        await activateWarranty(serialNumber, job.customerId, new Date());
      }

      return job;
    });
  });
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
- Link jobs to orders and customers
- Support field technician assignment with CEC verification
- Track job materials (BOM) with serial number capture
- Enable mobile-friendly job completion
- Implement GPS check-in/check-out for location verification
- Require CEC compliance checklist for installations
- Support photo documentation (before/during/after)
- Track time entries for labor costing
- Store commissioning reports with test results
- Capture customer and installer signatures
- Validate serial numbers before commissioning
- Support job status transitions with business logic
- Enable multi-step commissioning workflow
- Track warranty activation linked to serial numbers

### DON'T
- Break order-job relationship
- Remove scheduling functionality
- Allow commissioning without CEC accreditation
- Skip serial number capture for serialized products
- Allow check-in without location verification
- Mark job complete without completing checklist
- Skip capacity testing for battery installations
- Remove photo documentation requirements
- Allow unsigned commissioning reports
- Skip warranty activation after commissioning
- Delete time entries (preserve for payroll/costing)
- Allow job deletion (soft delete only)

---

## Completion Signals

When the target story passes:
```xml
<promise>[STORY_ID]_COMPLETE</promise>
```

When ALL stories in this PRD have `passes: true`:
```xml
<promise>DOM_JOBS_COMPLETE</promise>
```

---

*Domain PRD - Job scheduling and field service for battery system installations*
