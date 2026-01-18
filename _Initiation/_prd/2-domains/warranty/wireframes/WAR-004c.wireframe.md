# Wireframe: DOM-WAR-004c - Warranty Certificate: UI

## Story Reference

- **Story ID**: DOM-WAR-004c
- **Name**: Warranty Certificate: UI
- **PRD**: memory-bank/prd/domains/warranty.prd.json
- **Type**: UI Component
- **Component Type**: DetailPanel action bar with Dialog

## Overview

Certificate generation, preview, download, and email actions on the warranty detail page. Includes PDF preview in new tab/modal, download button, email-to-customer dialog, and regenerate functionality when warranty details change.

## UI Patterns (Reference Implementation)

### Card Component
- **Pattern**: RE-UI Card
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`
- **Features**:
  - Certificate section container on warranty detail page
  - PDF preview thumbnail display
  - Action button grouping (View, Download, Email)

### Dialog Component
- **Pattern**: RE-UI Dialog
- **Reference**: `_reference/.reui-reference/registry/default/ui/dialog.tsx`
- **Features**:
  - Email certificate modal with recipient selection
  - PDF preview modal for full-screen certificate view
  - Regenerate confirmation dialog for outdated certificates

### Input & Textarea Components
- **Pattern**: RE-UI Input/Textarea
- **Reference**: `_reference/.reui-reference/registry/default/ui/input.tsx`, `textarea.tsx`
- **Features**:
  - Email recipient input with validation
  - CC recipients multi-select input
  - Email message textarea for custom notes

### Progress Component
- **Pattern**: RE-UI Progress
- **Reference**: `_reference/.reui-reference/registry/default/ui/progress.tsx`
- **Features**:
  - Certificate generation progress bar (0-100%)
  - Upload progress indicator for PDF rendering
  - Multi-stage progress for template rendering, PDF creation, QR code generation

---

## Dependencies

> **STATUS: READY** - All required schema exists, this wireframe can be implemented now.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Available** | warranties, warrantyClaims | IMPLEMENTED |
| **Server Functions** | Standard CRUD | AVAILABLE |
| **PRD Stories** | DOM-WAR-004c | READY |

### Existing Schema Files
- `renoz-v2/lib/schema/warranties.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery/battery installation
- **Currency**: AUD with GST (10%)
- **Date Format**: DD/MM/YYYY

---

## Mobile Wireframe (375px)

### Warranty Detail Page with Certificate Actions

```
+=========================================+
| < Warranties                       [*]  |
+-----------------------------------------+
|                                         |
|  WAR-2026-00123                         |
|  Kitchen Inverter Set - Oak              |
|  Brisbane Solar Cooration                       |
|  =====================================  |
|                                         |
|  Status: [Active]   Expires: Jan 2028   |
|                                         |
+-----------------------------------------+
|                                         |
|  +-------------------------------------+|
|  |        CERTIFICATE ACTIONS          ||
|  +-------------------------------------+|
|  |                                     ||
|  |  +-------------------------------+  ||
|  |  |     [!] Generate Certificate  |  ||
|  |  +-------------------------------+  ||
|  |                                     ||
|  |  No certificate has been generated ||
|  |  yet for this warranty.             ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
|  [Overview] [Claims] [Extensions]       |
|                                         |
|  +-------------------------------------+|
|  | Registration: Jan 5, 2026           ||
|  | Serial: KC-2024-78901               ||
|  | Policy: 24-Month Extended           ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Certificate Generated State

```
+=========================================+
| < Warranties                       [*]  |
+-----------------------------------------+
|                                         |
|  WAR-2026-00123                         |
|  Kitchen Inverter Set - Oak              |
|                                         |
+-----------------------------------------+
|                                         |
|  +-------------------------------------+|
|  |        CERTIFICATE                  ||
|  +-------------------------------------+|
|  |                                     ||
|  |  +-------------------------------+  ||
|  |  |   [PDF Preview Thumbnail]     |  ||
|  |  |   +-------------------------+ |  ||
|  |  |   |   WARRANTY CERTIFICATE  | |  ||
|  |  |   |   [company logo]        | |  ||
|  |  |   |   WAR-2026-00123        | |  ||
|  |  |   |   [QR code]             | |  ||
|  |  |   +-------------------------+ |  ||
|  |  +-------------------------------+  ||
|  |                                     ||
|  |  Generated: Jan 5, 2026 10:30 AM    ||
|  |                                     ||
|  |  +-------------------------------+  ||
|  |  |      [VIEW CERTIFICATE]       |  ||
|  |  +-------------------------------+  ||
|  |                                     ||
|  |  +-------------+ +---------------+  ||
|  |  | [Download]  | | [Email]       |  ||
|  |  +-------------+ +---------------+  ||
|  |                                     ||
|  |  (Regenerate)                       ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Email Certificate Dialog (Bottom Sheet)

```
+=========================================+
|                                         |
|  =====================================  |
|         <- drag handle                  |
|                                         |
|  Email Certificate                 [X]  |
|  =====================================  |
|                                         |
|  Send warranty certificate to customer  |
|                                         |
|  +-------------------------------------+|
|  | To:                                 ||
|  | John Smith <john@acme.com>          ||
|  +-------------------------------------+|
|  ^ Primary contact auto-filled          |
|                                         |
|  +-------------------------------------+|
|  | Add CC:                             ||
|  | [Search contacts or enter email...] ||
|  +-------------------------------------+|
|                                         |
|  Message (optional):                    |
|  +-------------------------------------+|
|  | Please find attached your warranty ||
|  | certificate for your recent        ||
|  | purchase. Keep this for your       ||
|  | records.                            ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |          [SEND CERTIFICATE]         ||
|  +-------------------------------------+|
|                                         |
|  (Cancel)                               |
|                                         |
+=========================================+
```

---

## Tablet Wireframe (768px)

### Warranty Detail with Certificate Card

```
+=======================================================================+
| < Warranties                                                           |
+------------------------------------------------------------------------+
|                                                                        |
|  WAR-2026-00123                                    [Edit] [Actions v]  |
|  Kitchen Inverter Set - Oak | Brisbane Solar Cooration                          |
|  Status: [Active]  |  Expires: January 5, 2028  |  730 days remaining  |
|                                                                        |
+------------------------------------------------------------------------+
|  [Overview] [Claims] [Extensions] [Activity]                           |
+------------------------------------------------------------------------+
|                                                                        |
|  +--- WARRANTY DETAILS ---+  +--- CERTIFICATE (Slide-Over) ---------+  |
|  |                        |  |                                      |  |
|  | Registration:          |  | WARRANTY CERTIFICATE                 |  |
|  | January 5, 2026        |  | ------------------------------------ |  |
|  |                        |  |                                      |  |
|  | Serial Number:         |  | +----------------------------------+ |  |
|  | KC-2024-78901          |  | |      [PDF Preview Image]        | |  |
|  |                        |  | |                                  | |  |
|  | Policy:                |  | |   RENOZ WARRANTY CERTIFICATE    | |  |
|  | 24-Month Extended      |  | |                                  | |  |
|  |                        |  | |   WAR-2026-00123                 | |  |
|  | Customer:              |  | |   Kitchen Inverter Set            | |  |
|  | Brisbane Solar Cooration       |  | |   Brisbane Solar Cooration               | |  |
|  |                        |  | |                                  | |  |
|  | Contact:               |  | |   [QR CODE]                      | |  |
|  | John Smith             |  | |                                  | |  |
|  | john@acme.com          |  | +----------------------------------+ |  |
|  |                        |  |                                      |  |
|  +------------------------+  | Generated: Jan 5, 2026 10:30 AM      |  |
|                              |                                      |  |
|                              | +------------+ +--------+ +--------+ |  |
|                              | |   [View]   | |[Downld]| | [Email]| |  |
|                              | +------------+ +--------+ +--------+ |  |
|                              |                                      |  |
|                              | (Regenerate Certificate)              |  |
|                              |                                      |  |
|                              +--------------------------------------+  |
|                                                                        |
+=======================================================================+
```

---

## Desktop Wireframe (1280px+)

### Warranty Detail Page with Certificate Section

```
+================================================================================================+
| [Logo] Renoz CRM                                                         [Bell] [User v]       |
+----------+-------------------------------------------------------------------------------------+
|          |                                                                                      |
| Support  |  < Back to Warranties                                                               |
| -------  |                                                                                      |
| Issues   |  WAR-2026-00123                                      [Generate Certificate] [Edit]  |
| Warranty<|  Kitchen Inverter Set - Oak                                                          |
|          |  Brisbane Solar Cooration | John Smith | john@acme.com                                      |
|          |  ==================================================================================  |
|          |                                                                                      |
|          |  +--- STATUS BAR -------------------------------------------------------------+      |
|          |  | [Active]  |  Registered: Jan 5, 2026  |  Expires: Jan 5, 2028  |  730 days |      |
|          |  +----------------------------------------------------------------------------+      |
|          |                                                                                      |
|          |  [Overview] [Claims] [Extensions] [Activity]                                         |
|          |                                                                                      |
|          |  +--- WARRANTY DETAILS ----+  +--- CERTIFICATE -----------------------------+       |
|          |  |                         |  |                                             |       |
|          |  | Serial Number           |  | +--- PDF PREVIEW --------------------------+|       |
|          |  | KC-2024-78901           |  | |                                          ||       |
|          |  |                         |  | |  +---------------------------------+     ||       |
|          |  | Product                 |  | |  |                                 |     ||       |
|          |  | Kitchen Inverter Set     |  | |  |     RENOZ WARRANTY              |     ||       |
|          |  | SKU: KC-OAK-2024        |  | |  |     CERTIFICATE                 |     ||       |
|          |  |                         |  | |  |                                 |     ||       |
|          |  | Policy                  |  | |  |  [Company Logo]                 |     ||       |
|          |  | 24-Month Extended       |  | |  |                                 |     ||       |
|          |  |                         |  | |  |  Certificate No: WAR-2026-00123 |     ||       |
|          |  | Coverage                |  | |  |  Product: Kitchen Inverter Set   |     ||       |
|          |  | - Materials defects     |  | |  |  Owner: Brisbane Solar Cooration        |     ||       |
|          |  | - Workmanship           |  | |  |  Valid: Jan 5, 2026 - Jan 5, 28 |     ||       |
|          |  | - Manufacturing         |  | |  |                                 |     ||       |
|          |  |                         |  | |  |  [QR CODE]                      |     ||       |
|          |  | Exclusions              |  | |  |  Scan to verify warranty        |     ||       |
|          |  | - Normal wear           |  | |  |                                 |     ||       |
|          |  | - Misuse                |  | |  +---------------------------------+     ||       |
|          |  | - Modifications         |  | |                                          ||       |
|          |  |                         |  | +------------------------------------------+|       |
|          |  +-------------------------+  |                                             |       |
|          |                               | Generated: January 5, 2026 at 10:30 AM      |       |
|          |                               | File: WAR-2026-00123-certificate.pdf        |       |
|          |                               |                                             |       |
|          |                               | +----------+ +----------+ +--------------+ |       |
|          |                               | |  [View]  | |[Download]| |   [Email]    | |       |
|          |                               | +----------+ +----------+ +--------------+ |       |
|          |                               |                                             |       |
|          |                               | (Regenerate Certificate)                     |       |
|          |                               | Last generated: Jan 5, 2026                  |       |
|          |                               |                                             |       |
|          |                               +---------------------------------------------+       |
|          |                                                                                      |
+----------+-------------------------------------------------------------------------------------+
```

### Email Certificate Dialog (Modal)

```
+================================================================================================+
|                                                                                                 |
|     +--------------------------------------------------------------------+                      |
|     | Email Warranty Certificate                                     [X] |                      |
|     +====================================================================+                      |
|     |                                                                    |                      |
|     |  Send warranty certificate to the customer                         |                      |
|     |                                                                    |                      |
|     |  +------------------------------------------------------------+   |                      |
|     |  | WARRANTY CERTIFICATE PREVIEW                               |   |                      |
|     |  | +--------------------------+                               |   |                      |
|     |  | | [PDF thumbnail]          |  WAR-2026-00123               |   |                      |
|     |  | |                          |  Kitchen Inverter Set - Oak    |   |                      |
|     |  | |                          |  Brisbane Solar Cooration             |   |                      |
|     |  | +--------------------------+                               |   |                      |
|     |  +------------------------------------------------------------+   |                      |
|     |                                                                    |                      |
|     |  To *                                                              |                      |
|     |  +------------------------------------------------------------+   |                      |
|     |  | John Smith <john@acme.com>                             [x] |   |                      |
|     |  +------------------------------------------------------------+   |                      |
|     |                                                                    |                      |
|     |  CC                                                                |                      |
|     |  +------------------------------------------------------------+   |                      |
|     |  | [Search contacts or enter email addresses...]              |   |                      |
|     |  +------------------------------------------------------------+   |                      |
|     |                                                                    |                      |
|     |  Subject                                                           |                      |
|     |  +------------------------------------------------------------+   |                      |
|     |  | Your Warranty Certificate - WAR-2026-00123                 |   |                      |
|     |  +------------------------------------------------------------+   |                      |
|     |                                                                    |                      |
|     |  Message                                                           |                      |
|     |  +------------------------------------------------------------+   |                      |
|     |  | Dear John,                                                 |   |                      |
|     |  |                                                            |   |                      |
|     |  | Please find attached your warranty certificate for your   |   |                      |
|     |  | recent purchase. This certificate confirms your warranty   |   |                      |
|     |  | coverage through January 5, 2028.                          |   |                      |
|     |  |                                                            |   |                      |
|     |  | Please keep this document for your records.                |   |                      |
|     |  |                                                            |   |                      |
|     |  | Best regards,                                              |   |                      |
|     |  | The Renoz Team                                             |   |                      |
|     |  +------------------------------------------------------------+   |                      |
|     |                                                                    |                      |
|     |  +------------------------------------------------------------+   |                      |
|     |  |                                                            |   |                      |
|     |  |                  (Cancel)    [SEND CERTIFICATE]            |   |                      |
|     |  |                                                            |   |                      |
|     |  +------------------------------------------------------------+   |                      |
|     |                                                                    |                      |
|     +--------------------------------------------------------------------+                      |
|                                                                                                 |
+================================================================================================+
```

### Regenerate Confirmation Dialog

```
+--------------------------------------------+
| Regenerate Certificate?               [X]  |
+--------------------------------------------+
|                                            |
|  [!] The warranty details have changed     |
|  since the last certificate was generated. |
|                                            |
|  Changes detected:                         |
|  - Customer contact updated                |
|  - Policy terms modified                   |
|                                            |
|  Regenerating will create a new            |
|  certificate PDF with the latest           |
|  information.                              |
|                                            |
|  The previous certificate will be          |
|  archived.                                 |
|                                            |
|  +--------------------------------------+  |
|  |                                      |  |
|  |     (Cancel)    [REGENERATE]         |  |
|  |                                      |  |
|  +--------------------------------------+  |
|                                            |
+--------------------------------------------+
```

---

## PDF Preview States

### Full-Screen Preview (Mobile)

```
+=========================================+
| [X] Close                [Download]     |
+-----------------------------------------+
|                                         |
|  +-------------------------------------+|
|  |                                     ||
|  |                                     ||
|  |      RENOZ WARRANTY CERTIFICATE     ||
|  |                                     ||
|  |      [Company Logo]                 ||
|  |                                     ||
|  |      Certificate Number:            ||
|  |      WAR-2026-00123                 ||
|  |                                     ||
|  |      This certifies that:           ||
|  |      Brisbane Solar Cooration               ||
|  |                                     ||
|  |      Is the registered owner of:    ||
|  |      Kitchen Inverter Set - Oak      ||
|  |      Serial: KC-2024-78901          ||
|  |                                     ||
|  |      Warranty Period:               ||
|  |      Jan 5, 2026 - Jan 5, 2028      ||
|  |      (24 months)                    ||
|  |                                     ||
|  |      [QR CODE]                      ||
|  |      Scan to verify warranty        ||
|  |                                     ||
|  |      Terms and conditions apply.    ||
|  |      See full policy at renoz.com   ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
|  [<] Page 1 of 1 [>]                    |
|                                         |
+=========================================+
```

### Preview Modal (Desktop)

```
+------------------------------------------------------------------+
| Certificate Preview                                           [X] |
+------------------------------------------------------------------+
|                                                                   |
|  +-------------------------------------------------------------+ |
|  |                                                             | |
|  |                                                             | |
|  |            RENOZ WARRANTY CERTIFICATE                       | |
|  |                                                             | |
|  |            [Company Logo - Full Color]                      | |
|  |                                                             | |
|  |            Certificate Number: WAR-2026-00123               | |
|  |                                                             | |
|  |            -------------------------------------------      | |
|  |                                                             | |
|  |            This certifies that:                             | |
|  |                                                             | |
|  |            ACME CORPORATION                                 | |
|  |            123 Main Street                                  | |
|  |            Anytown, ST 12345                                | |
|  |                                                             | |
|  |            Is the registered owner of:                      | |
|  |                                                             | |
|  |            Kitchen Inverter Set - Oak                        | |
|  |            Serial Number: KC-2024-78901                     | |
|  |                                                             | |
|  |            Warranty Period:                                 | |
|  |            January 5, 2026 through January 5, 2028          | |
|  |            (24 Months Coverage)                             | |
|  |                                                             | |
|  |            [QR CODE]         Authorized Signature:          | |
|  |            Scan to verify    _______________________        | |
|  |                                                             | |
|  +-------------------------------------------------------------+ |
|                                                                   |
|  Page 1 of 1                                                      |
|                                                                   |
|                              [Download PDF]    [Open in New Tab]  |
+------------------------------------------------------------------+
```

---

## Interaction States

### Loading States

```
GENERATING CERTIFICATE:
+---------------------------------------------+
|  +---------------------------------------+  |
|  |                                       |  |
|  |      [spinner]                        |  |
|  |                                       |  |
|  |      Generating Certificate...        |  |
|  |                                       |  |
|  |      Creating PDF with warranty       |  |
|  |      details and QR code              |  |
|  |                                       |  |
|  |      [========........] 60%           |  |
|  |                                       |  |
|  +---------------------------------------+  |
|                                             |
+---------------------------------------------+

DOWNLOADING:
+------------+
| [spinner]  |
| Downloading|
+------------+

SENDING EMAIL:
+---------------------------------------------+
| Email Warranty Certificate              [X] |
+---------------------------------------------+
|                                             |
|  +---------------------------------------+  |
|  |                                       |  |
|  |  [spinner] Sending certificate...     |  |
|  |                                       |  |
|  +---------------------------------------+  |
|                                             |
|                    (Cancel)  [SENDING...]   |
|                               disabled      |
+---------------------------------------------+
```

### Empty/Initial States

```
NO CERTIFICATE GENERATED:
+---------------------------------------------+
|  CERTIFICATE                                |
+---------------------------------------------+
|                                             |
|      +---------------------------+          |
|      |                           |          |
|      |     [document icon]       |          |
|      |                           |          |
|      +---------------------------+          |
|                                             |
|   No certificate generated yet              |
|                                             |
|   Generate a PDF certificate for this       |
|   warranty with your company branding       |
|   and a QR code for verification.           |
|                                             |
|   +-------------------------------------+   |
|   |       [GENERATE CERTIFICATE]        |   |
|   +-------------------------------------+   |
|                                             |
+---------------------------------------------+
```

### Error States

```
GENERATION FAILED:
+---------------------------------------------+
|  CERTIFICATE                                |
+---------------------------------------------+
|                                             |
|  [!] Failed to generate certificate         |
|                                             |
|  There was a problem creating the PDF.      |
|  Please try again.                          |
|                                             |
|  Error: Template rendering failed           |
|                                             |
|           [Retry Generation]                |
|                                             |
+---------------------------------------------+

EMAIL SEND FAILED:
+---------------------------------------------+
| Email Certificate                       [X] |
+---------------------------------------------+
|                                             |
|  [!] Failed to send email                   |
|                                             |
|  Could not deliver the certificate to       |
|  john@acme.com                              |
|                                             |
|  Please verify the email address and        |
|  try again.                                 |
|                                             |
|           (Cancel)    [Retry Send]          |
|                                             |
+---------------------------------------------+

DOWNLOAD FAILED:
+---------------------------------------------+
|  [!] Download failed                        |
|                                             |
|  Could not download the certificate file.   |
|                                             |
|  [Retry Download]                           |
+---------------------------------------------+
```

### Success States

```
CERTIFICATE GENERATED:
+---------------------------------------------+
|  [check] Certificate generated successfully |
|                                             |
|  <- Toast notification (3s)                 |
+---------------------------------------------+

EMAIL SENT:
+---------------------------------------------+
|  [check] Certificate sent to john@acme.com  |
|                                             |
|  <- Toast notification (3s)                 |
+---------------------------------------------+

DOWNLOAD COMPLETE:
+---------------------------------------------+
|  [check] Certificate downloaded             |
|  WAR-2026-00123-certificate.pdf             |
|                                             |
|  <- Toast notification (3s)                 |
+---------------------------------------------+
```

---

## Accessibility Notes

### Focus Order

1. **Certificate Card**
   - Tab: Generate/View button -> Download -> Email -> Regenerate

2. **PDF Preview Modal**
   - Focus trapped within modal
   - Tab: Close button -> Download -> Open in new tab
   - Escape: Close preview

3. **Email Dialog**
   - Focus trapped within dialog
   - Tab: To field -> CC field -> Subject -> Message -> Cancel -> Send
   - Escape: Close with confirmation if changes made

### ARIA Requirements

```html
<!-- Certificate Section -->
<section
  role="region"
  aria-labelledby="certificate-title"
>
  <h3 id="certificate-title">Warranty Certificate</h3>

  <!-- Generate Button (when no certificate) -->
  <button
    aria-label="Generate warranty certificate PDF"
  >
    Generate Certificate
  </button>

  <!-- Certificate Preview -->
  <div
    role="img"
    aria-label="Certificate preview showing warranty WAR-2026-00123
               for Kitchen Inverter Set, Brisbane Solar Cooration"
  >
    <img src="preview.png" alt="" aria-hidden="true" />
  </div>

  <!-- Action Buttons -->
  <div role="group" aria-label="Certificate actions">
    <button aria-label="View certificate in full screen">
      View
    </button>
    <button aria-label="Download certificate PDF">
      Download
    </button>
    <button aria-label="Email certificate to customer">
      Email
    </button>
  </div>

  <!-- Regenerate -->
  <button
    aria-label="Regenerate certificate with updated information"
  >
    Regenerate
  </button>
</section>

<!-- PDF Preview Modal -->
<dialog
  role="dialog"
  aria-modal="true"
  aria-labelledby="preview-title"
>
  <h2 id="preview-title">Certificate Preview</h2>
  <iframe
    title="Warranty certificate PDF preview"
    src="certificate.pdf"
  ></iframe>
</dialog>

<!-- Email Dialog -->
<dialog
  role="dialog"
  aria-modal="true"
  aria-labelledby="email-dialog-title"
>
  <h2 id="email-dialog-title">Email Warranty Certificate</h2>

  <label for="email-to">To</label>
  <input
    id="email-to"
    type="email"
    aria-describedby="email-to-help"
  />
  <span id="email-to-help" class="sr-only">
    Recipient email address for the certificate
  </span>
</dialog>
```

### Screen Reader Announcements

- Generate started: "Generating warranty certificate. Please wait."
- Generate complete: "Certificate generated successfully. Download and email actions now available."
- Download started: "Downloading certificate PDF."
- Download complete: "Certificate downloaded. File: WAR-2026-00123-certificate.pdf"
- Email sent: "Certificate emailed to john@acme.com"
- Error: "Failed to generate certificate. Retry button available."
- Regenerate prompt: "Certificate needs regeneration. Warranty details have changed."

---

## Animation Choreography

### Certificate Generation

```
BUTTON CLICK:
- Duration: 150ms (Micro)
- Button: scale(1) -> scale(0.95) -> scale(1)
- Transition to spinner

PROGRESS ANIMATION:
- Duration: variable (3-8 seconds typical)
- Progress bar: width 0% -> 100%
- Easing: steps based on actual progress

COMPLETION:
- Duration: 300ms
- Progress bar: flash green
- Spinner -> checkmark icon: morph animation
- Certificate preview: fade in with scale(0.95) -> scale(1)

PREVIEW APPEAR:
- Duration: 250ms
- Easing: ease-out
- Transform: opacity(0) translateY(16px) -> opacity(1) translateY(0)
- Shadow: 0 -> elevation-md
```

### PDF Preview Modal

```
OPEN:
- Duration: 250ms (Complex timing)
- Overlay: opacity(0) -> opacity(0.5)
- Modal: scale(0.9) opacity(0) -> scale(1) opacity(1)
- PDF iframe: fade in after modal (stagger 100ms)

CLOSE:
- Duration: 200ms
- Reverse of open
```

### Email Dialog

```
SEND SUCCESS:
- Duration: 300ms
- Send button: morph to checkmark
- Dialog: hold 500ms, then close with fade
- Toast: slide in from right
```

### Button States

```
HOVER:
- Duration: 150ms
- Background: transparent -> gray-50
- Icon: subtle lift translateY(0) -> translateY(-1px)

LOADING:
- Duration: infinite loop
- Spinner: rotation 360deg per 1s
- Button text: fade to "Generating..." / "Sending..."
- Button: disabled style, reduced opacity
```

---

## Component Props Interface

```typescript
// Certificate Card Component
interface WarrantyCertificateCardProps {
  warranty: Warranty;
  certificate: CertificateInfo | null;
  onGenerate: () => Promise<void>;
  onDownload: () => Promise<void>;
  onEmail: () => void;
  onRegenerate: () => Promise<void>;
  isGenerating: boolean;
  isDownloading: boolean;
  error: Error | null;
}

interface CertificateInfo {
  id: string;
  warrantyId: string;
  fileUrl: string;
  previewUrl: string;
  fileName: string;
  generatedAt: Date;
  generatedBy: string;
  version: number;
  isOutdated: boolean;
}

// Certificate Preview Component
interface CertificatePreviewProps {
  certificate: CertificateInfo;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownload: () => void;
  onOpenInNewTab: () => void;
}

// Email Certificate Dialog Component
interface EmailCertificateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warranty: Warranty;
  certificate: CertificateInfo;
  defaultRecipient: {
    name: string;
    email: string;
  };
  onSend: (data: EmailCertificateData) => Promise<void>;
  isSending: boolean;
  error: Error | null;
}

interface EmailCertificateData {
  to: string[];
  cc: string[];
  subject: string;
  message: string;
}

// Regenerate Confirmation Dialog
interface RegenerateCertificateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  changes: CertificateChange[];
  onConfirm: () => Promise<void>;
  isRegenerating: boolean;
}

interface CertificateChange {
  field: string;
  oldValue: string;
  newValue: string;
}

// Generation Progress Component
interface CertificateGenerationProgressProps {
  isGenerating: boolean;
  progress: number;
  stage: 'preparing' | 'rendering' | 'uploading' | 'complete';
}

// Hook for Certificate Management
interface UseCertificateOptions {
  warrantyId: string;
}

interface UseCertificateReturn {
  certificate: CertificateInfo | null;
  isLoading: boolean;
  isGenerating: boolean;
  isOutdated: boolean;
  generate: () => Promise<void>;
  download: () => Promise<void>;
  regenerate: () => Promise<void>;
  error: Error | null;
}
```

---

## Component Files

| File | Purpose |
|------|---------|
| `src/routes/support/warranties/$warrantyId.tsx` | Integration point (modify) |
| `src/components/domain/support/warranty-certificate-card.tsx` | Certificate section |
| `src/components/domain/support/warranty-certificate-preview.tsx` | PDF preview modal |
| `src/components/domain/support/email-certificate-dialog.tsx` | Email dialog |
| `src/components/domain/support/regenerate-certificate-dialog.tsx` | Regenerate confirmation |
| `src/components/domain/support/certificate-generation-progress.tsx` | Progress indicator |
| `src/hooks/use-warranty-certificate.ts` | Certificate management hook |

---

**Document Version:** 1.0
**Created:** 2026-01-10
**Story Reference:** DOM-WAR-004c
