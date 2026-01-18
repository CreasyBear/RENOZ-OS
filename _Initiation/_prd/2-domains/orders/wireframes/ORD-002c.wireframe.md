# Wireframe: DOM-ORD-002c - Delivery Confirmation UI

## Story Reference

- **Story ID**: DOM-ORD-002c
- **Name**: Delivery Confirmation: UI
- **PRD**: memory-bank/prd/domains/orders.prd.json
- **Type**: UI Component
- **Component Type**: FormDialog with signature capture and photo upload

## Overview

Capture delivery confirmation including recipient name, signature capture via touch/mouse, photo upload for proof of delivery, and notes. Integrates with shipment list to show proof icons and allows viewing captured proofs in a modal viewer.

---

## UI Patterns (Reference Implementation)

### Dialog/Modal
- **Pattern**: RE-UI Dialog (nested variant)
- **Reference**: shadcn/ui Dialog primitive
- **Features**:
  - Full-screen on mobile, centered modal on desktop
  - Backdrop overlay with dismissible behavior
  - Trapped focus and keyboard navigation
  - Step-based progression for multi-step flows

### Signature Capture
- **Pattern**: Canvas-based signature pad
- **Reference Implementation**: Custom Canvas component
- **Features**:
  - Touch and mouse input support
  - Stroke smoothing with Bezier interpolation
  - Pressure-sensitive width (if available)
  - Minimum stroke length validation
  - Clear/reset functionality
  - Export to base64 dataURL

### File Upload
- **Pattern**: Drag-and-drop zone with preview
- **Reference**: RE-UI File Upload pattern
- **Features**:
  - Drag-drop zone with visual feedback
  - Click to browse fallback
  - File type validation (JPG, PNG, HEIC)
  - Size limit enforcement (10MB)
  - Preview thumbnail with remove option
  - Upload progress indicator
  - Error state handling

### Badge/Status Indicator
- **Pattern**: RE-UI Badge component
- **Reference**: `_reference/.reui-reference/registry/default/ui/badge.tsx`
- **Features**:
  - Proof available icons (signature, camera, photo)
  - Semantic colors (success for delivered)
  - Size variants (sm for inline, md for standalone)

### Form Validation
- **Pattern**: TanStack Form with Zod schema
- **Features**:
  - Real-time validation on blur
  - Required field indicators
  - Error messages below inputs
  - Submit disabled until valid

---

## Dependencies

> **STATUS: READY** - All required schema exists, this wireframe can be implemented now.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Available** | orders, orderItems | IMPLEMENTED |
| **Server Functions** | Standard CRUD | AVAILABLE |
| **PRD Stories** | DOM-ORD-002c | N/A |

### Existing Schema Files
- `renoz-v2/lib/schema/orders.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery manufacturer
- **Currency**: AUD with GST (10%)
- **Date Format**: DD/MM/YYYY
- **Order Types**: Battery system orders, Inverter orders, Mixed installations
- **Typical Values**: Residential ($5K-$20K), Commercial ($50K-$500K)

---

## Mobile Wireframe (375px)

### Confirm Delivery Dialog (Full Screen)

```
+=========================================+
| Confirm Delivery                   [X]  |
| Shipment: AusPost - AP123456789AU       |
+-----------------------------------------+
|                                         |
|  Recipient Name *                       |
|  +-------------------------------------+|
|  | Enter recipient name                || <- 48px input
|  +-------------------------------------+|
|                                         |
|  ───────────────────────────────────    |
|                                         |
|  SIGNATURE                              |
|  (Optional)                             |
|                                         |
|  +-------------------------------------+|
|  |                                     ||
|  |                                     ||
|  |                                     ||
|  |     Draw signature here             || <- 200px height
|  |                                     ||     Touch/mouse canvas
|  |                                     ||
|  |                                     ||
|  |                                     ||
|  +-------------------------------------+|
|  [Clear]                    [signature] |
|                                         |
|  ───────────────────────────────────    |
|                                         |
|  DELIVERY PHOTO                         |
|  (Optional)                             |
|                                         |
|  +-------------------------------------+|
|  |                                     ||
|  |     +-------------------+           ||
|  |     |                   |           ||
|  |     |     [camera]      |           || <- Tap to upload
|  |     |                   |           ||
|  |     +-------------------+           ||
|  |                                     ||
|  |     Tap to add photo                ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
|  ───────────────────────────────────    |
|                                         |
|  Delivery Notes                         |
|  +-------------------------------------+|
|  |                                     ||
|  | Any additional notes...             ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |                                     ||
|  |      [CONFIRM DELIVERY]             || <- 56px primary
|  |                                     ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Signature Pad Active State

```
+=========================================+
|  SIGNATURE                              |
|                                         |
|  +=====================================+|
|  ||                                   |||
|  ||                                   ||| <- Active border glow
|  ||          /\                       |||
|  ||         /  \      ___             |||
|  ||        /    \____/   \            ||| <- User drawing
|  ||       /              \_____       |||
|  ||                                   |||
|  ||                                   |||
|  +=====================================+|
|  [Clear]            [Signature valid]   |
|                                         |
|  Minimum size reached: Yes              |
|  ↑ Validation indicator                 |
+=========================================+
```

### Photo Upload - With Preview

```
+=========================================+
|  DELIVERY PHOTO                         |
|                                         |
|  +-------------------------------------+|
|  |                                     ||
|  |  +-----------------------------+    ||
|  |  |                             |    ||
|  |  |     [PHOTO PREVIEW]         |    ||
|  |  |                             |    || <- 150px preview
|  |  |  delivery-proof-001.jpg     |    ||
|  |  |                             |    ||
|  |  +-----------------------------+    ||
|  |                                     ||
|  |  [Change Photo]     [Remove]        ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
|  Uploading: [==========          ] 60%  | <- Progress bar
|                                         |
+=========================================+
```

### Camera/Upload Options (Action Sheet)

```
+=========================================+
|                                         |
|  +-------------------------------------+|
|  |                                     ||
|  |        Add Delivery Photo           ||
|  |                                     ||
|  |  +-------------------------------+  ||
|  |  |  [camera]  Take Photo         |  ||
|  |  +-------------------------------+  ||
|  |                                     ||
|  |  +-------------------------------+  ||
|  |  |  [image]   Choose from Library|  ||
|  |  +-------------------------------+  ||
|  |                                     ||
|  |  +-------------------------------+  ||
|  |  |           Cancel              |  ||
|  |  +-------------------------------+  ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Delivery Proof Viewer (Shipment List)

```
+=========================================+
| Delivery Proof                     [X]  |
| AusPost - AP123456789AU                 |
+-----------------------------------------+
|                                         |
|  RECIPIENT                              |
|  ───────────────────────────────────    |
|  John Smith                             |
|  Received: Jan 9, 2026 at 3:45 PM       |
|                                         |
|  ───────────────────────────────────    |
|                                         |
|  SIGNATURE                              |
|  +-------------------------------------+|
|  |                                     ||
|  |          /\                         ||
|  |         /  \      ___               ||
|  |        /    \____/   \              ||
|  |       /              \_____         ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
|  ───────────────────────────────────    |
|                                         |
|  PHOTO                                  |
|  +-------------------------------------+|
|  |                                     ||
|  |                                     ||
|  |       [DELIVERY PHOTO]              ||
|  |                                     ||
|  |                                     ||
|  +-------------------------------------+|
|  [Tap to enlarge]                       |
|                                         |
|  ───────────────────────────────────    |
|                                         |
|  NOTES                                  |
|  Left at front door with concierge      |
|                                         |
|                            [Download]   |
|                                         |
+=========================================+
```

---

## Tablet Wireframe (768px)

### Confirm Delivery Dialog (Centered Modal)

```
+=====================================================================+
|                                                                      |
|   +--------------------------------------------------------------+   |
|   | Confirm Delivery                                         [X] |   |
|   | Shipment: AusPost - AP123456789AU                            |   |
|   +--------------------------------------------------------------+   |
|   |                                                              |   |
|   |  +-- LEFT COLUMN ----------+  +-- RIGHT COLUMN -----------+  |   |
|   |  |                         |  |                           |  |   |
|   |  |  Recipient Name *       |  |  SIGNATURE                |  |   |
|   |  |  [___________________]  |  |  (Optional)               |  |   |
|   |  |                         |  |                           |  |   |
|   |  |                         |  |  +---------------------+  |  |   |
|   |  |  DELIVERY PHOTO         |  |  |                     |  |  |   |
|   |  |  (Optional)             |  |  |                     |  |  |   |
|   |  |                         |  |  |  Draw signature     |  |  |   |
|   |  |  +-----------------+    |  |  |     here            |  |  |   |
|   |  |  |                 |    |  |  |                     |  |  |   |
|   |  |  |   [camera]      |    |  |  |                     |  |  |   |
|   |  |  |                 |    |  |  +---------------------+  |  |   |
|   |  |  |  Tap to add     |    |  |  [Clear]                  |  |   |
|   |  |  |                 |    |  |                           |  |   |
|   |  |  +-----------------+    |  +---------------------------+  |   |
|   |  |                         |                                 |   |
|   |  |  Delivery Notes         |                                 |   |
|   |  |  [___________________]  |                                 |   |
|   |  |  [___________________]  |                                 |   |
|   |  |                         |                                 |   |
|   |  +-------------------------+                                 |   |
|   |                                                              |   |
|   +--------------------------------------------------------------+   |
|   |                        ( Cancel )   [ Confirm Delivery ]     |   |
|   +--------------------------------------------------------------+   |
|                                                                      |
+=====================================================================+
```

### Proof Viewer - Side Panel

```
+=====================================================================+
| < Back | Order #ORD-2024-0156 - Brisbane Solar       [Print] [Actions v]  |
+---------------------------------------------------------------------+
| [Items] [Fulfillment] [Activity] [Amendments]                        |
|         ==============                                               |
+----------------------------------------------+-----------------------+
|                                              |                       |
|  SHIPMENTS                                   |  DELIVERY PROOF       |
|  ────────────────────────────────────────    |  StarTrack            |
|                                              |  ST987654321          |
|  +----------------------------------------+  |  ─────────────────    |
|  | StarTrack  | ST987654321   | Delivered |  |                       |
|  |            | [sig][cam]    | Jan 9     |<-|  Recipient:           |
|  +----------------------------------------+  |  John Smith           |
|                                              |  Jan 9, 3:45 PM       |
|  +----------------------------------------+  |                       |
|  | AusPost    | AP123456789AU | In Transit|  |  +---------------+    |
|  +----------------------------------------+  |  |               |    |
|                                              |  |  [Signature]  |    |
|                                              |  |               |    |
|                                              |  +---------------+    |
|                                              |                       |
|                                              |  +---------------+    |
|                                              |  |               |    |
|                                              |  |  [Photo]      |    |
|                                              |  |               |    |
|                                              |  +---------------+    |
|                                              |                       |
|                                              |  Notes:               |
|                                              |  Left with concierge  |
|                                              |                       |
|                                              |  [Download All]       |
|                                              |                       |
+----------------------------------------------+-----------------------+
```

---

## Desktop Wireframe (1280px+)

### Confirm Delivery Dialog (Standard Modal)

```
+===================================================================================================+
|                                                                                                   |
|     +-------------------------------------------------------------------------------------+       |
|     | Confirm Delivery                                                               [X] |       |
|     | Shipment: AusPost - AP123456789AU                                                  |       |
|     +-------------------------------------------------------------------------------------+       |
|     |                                                                                     |       |
|     |  +-- RECIPIENT INFO --------+  +-- SIGNATURE CAPTURE --------------------------+   |       |
|     |  |                          |  |                                               |   |       |
|     |  |  Recipient Name *        |  |  Signature (Optional)                         |   |       |
|     |  |  +--------------------+  |  |                                               |   |       |
|     |  |  | John Smith         |  |  |  +---------------------------------------+    |   |       |
|     |  |  +--------------------+  |  |  |                                       |    |   |       |
|     |  |                          |  |  |                                       |    |   |       |
|     |  |  Delivered By            |  |  |      Draw signature here              |    |   |       |
|     |  |  Mike Johnson (auto)     |  |  |                                       |    |   |       |
|     |  |                          |  |  |                                       |    |   |       |
|     |  |  Delivery Date           |  |  |                                       |    |   |       |
|     |  |  Jan 9, 2026 3:45 PM     |  |  +---------------------------------------+    |   |       |
|     |  |  [Change]                |  |  [Clear Signature]      [Signature valid]     |   |       |
|     |  |                          |  |                                               |   |       |
|     |  +--------------------------+  +-----------------------------------------------+   |       |
|     |                                                                                     |       |
|     |  +-- PHOTO UPLOAD ----------+  +-- DELIVERY NOTES -----------------------------+   |       |
|     |  |                          |  |                                               |   |       |
|     |  |  Delivery Photo          |  |  Notes                                        |   |       |
|     |  |  (Optional)              |  |                                               |   |       |
|     |  |                          |  |  +---------------------------------------+    |   |       |
|     |  |  +------------------+    |  |  |                                       |    |   |       |
|     |  |  |                  |    |  |  | Left at front door. Signed by         |    |   |       |
|     |  |  |    [camera]      |    |  |  | building concierge.                   |    |   |       |
|     |  |  |                  |    |  |  |                                       |    |   |       |
|     |  |  |  Drop file or    |    |  |  +---------------------------------------+    |   |       |
|     |  |  |  click to upload |    |  |                                               |   |       |
|     |  |  |                  |    |  |                                               |   |       |
|     |  |  +------------------+    |  |                                               |   |       |
|     |  |                          |  |                                               |   |       |
|     |  +--------------------------+  +-----------------------------------------------+   |       |
|     |                                                                                     |       |
|     +-------------------------------------------------------------------------------------+       |
|     |                                          ( Cancel )    [ Confirm Delivery ]         |       |
|     +-------------------------------------------------------------------------------------+       |
|                                                                                                   |
+===================================================================================================+
```

### Photo Upload - Drag & Drop Zone

```
+-- PHOTO UPLOAD --------------------------+
|                                          |
|  Delivery Photo (Optional)               |
|                                          |
|  +------------------------------------+  |
|  |                                    |  |
|  |  +------------------------------+  |  |
|  |  |                              |  |  |
|  |  |         [cloud-up]           |  |  |
|  |  |                              |  |  |
|  |  |   Drag and drop image here   |  |  |
|  |  |        or click to browse    |  |  |
|  |  |                              |  |  |
|  |  |   Accepts: JPG, PNG, HEIC    |  |  |
|  |  |   Max size: 10MB             |  |  |
|  |  |                              |  |  |
|  |  +------------------------------+  |  |
|  |                                    |  |
|  +------------------------------------+  |
|                                          |
+------------------------------------------+

DRAG OVER STATE:
+------------------------------------+
|  ================================  |
|  ||                            ||  |
|  ||      Drop image here       ||  |  <- Blue dashed border
|  ||                            ||  |     Background highlight
|  ||         [check]            ||  |
|  ||                            ||  |
|  ================================  |
+------------------------------------+

WITH PREVIEW:
+------------------------------------+
|  +------------------------------+  |
|  |                              |  |
|  |     [PHOTO THUMBNAIL]        |  |
|  |                              |  |
|  |  delivery-proof.jpg          |  |
|  |  2.4 MB                      |  |
|  |                              |  |
|  +------------------------------+  |
|                                    |
|  [Replace]          [Remove]       |
+------------------------------------+
```

### Proof Viewer - Lightbox Modal

```
+===================================================================================================+
|                                                                                                   |
|     +-------------------------------------------------------------------------------------+       |
|     | Delivery Proof - StarTrack ST987654321                               [<] [>] [X]   |       |
|     +-------------------------------------------------------------------------------------+       |
|     |                                                                                     |       |
|     |                                                                                     |       |
|     |     +-- SIGNATURE ----------------------------+     +-- PHOTO ------------------+   |       |
|     |     |                                         |     |                           |   |       |
|     |     |                                         |     |                           |   |       |
|     |     |                                         |     |                           |   |       |
|     |     |              /\                         |     |   [LARGE PHOTO VIEW]      |   |       |
|     |     |             /  \      ___               |     |                           |   |       |
|     |     |            /    \____/   \              |     |                           |   |       |
|     |     |           /              \_____         |     |                           |   |       |
|     |     |                                         |     |                           |   |       |
|     |     |                                         |     |                           |   |       |
|     |     +-----------------------------+           |     +---------------------------+   |       |
|     |                                                                                     |       |
|     |     Recipient: John Smith                                                           |       |
|     |     Delivered: January 9, 2026 at 3:45 PM                                           |       |
|     |     Delivered By: Mike Johnson                                                      |       |
|     |     Notes: Left at front door. Signed by building concierge.                        |       |
|     |                                                                                     |       |
|     +-------------------------------------------------------------------------------------+       |
|     |                           [Download Signature] [Download Photo] [Download All]      |       |
|     +-------------------------------------------------------------------------------------+       |
|                                                                                                   |
+===================================================================================================+
```

---

## Interaction States

### Loading States

```
DIALOG OPENING:
+-------------------------------------+
|                                     |
|  Loading shipment details...        |
|  [spinner]                          |
|                                     |
+-------------------------------------+

PHOTO UPLOADING:
+-------------------------------------+
|  Delivery Photo                     |
|                                     |
|  +-------------------------------+  |
|  |  [spinner] Uploading...       |  |
|  |                               |  |
|  |  [=============        ] 65%  |  |
|  |                               |  |
|  |  delivery-proof.jpg           |  |
|  +-------------------------------+  |
+-------------------------------------+

CONFIRMING DELIVERY:
+-------------------------------------+
|                                     |
|  +-------------------------------+  |
|  |                               |  |
|  |    [spinner] Confirming...   |  |
|  |                               |  |
|  +-------------------------------+  |
|                                     |
|  All form fields disabled           |
|  Cancel button disabled             |
+-------------------------------------+
```

### Error States

```
PHOTO UPLOAD FAILED:
+-------------------------------------+
|  Delivery Photo                     |
|                                     |
|  +-------------------------------+  |
|  |  [!] Upload failed            |  |
|  |                               |  |
|  |  delivery-proof.jpg           |  |
|  |  Could not upload file.       |  |
|  |  Check connection and retry.  |  |
|  |                               |  |
|  |  [Retry]  [Remove]            |  |
|  +-------------------------------+  |
+-------------------------------------+

SIGNATURE TOO SMALL:
+-------------------------------------+
|  SIGNATURE                          |
|                                     |
|  +-------------------------------+  |
|  |                               |  |
|  |     .                         |  | <- Tiny mark
|  |                               |  |
|  +-------------------------------+  |
|  [!] Signature too small.           |
|      Please sign more clearly.      |
|                                     |
|  [Clear]                            |
+-------------------------------------+

CONFIRMATION FAILED:
+=========================================+
|  [!] Delivery Confirmation Failed       |
|                                         |
|  Could not confirm delivery. Your       |
|  signature and photo have been saved    |
|  locally and will retry automatically.  |
|                                         |
|           [Retry Now]  [Close]          |
+=========================================+
```

### Success States

```
DELIVERY CONFIRMED:
+=========================================+
|  [check] Delivery Confirmed             |
|                                         |
|  Shipment marked as delivered.          |
|  Proof of delivery saved.               |
|                                         |
|              <- Auto-dismiss 3s         |
+=========================================+

PROOF ICONS IN LIST:
+------------------------------------------+
| StarTrack  | ST987654321   | Delivered   |
|            |               | [sig][cam]  | <- Icons indicate proof exists
|            |               | Jan 9       |    Tap to view
+------------------------------------------+
```

---

## Accessibility Notes

### Focus Order

1. **Confirm Delivery Dialog**
   - Focus: Dialog title on open
   - Tab sequence: Recipient name -> Signature pad -> Clear button -> Photo upload -> Notes -> Cancel -> Confirm
   - Escape: Close dialog
   - Enter: Submit (when focused on Confirm button)

2. **Signature Pad**
   - Tab to activate
   - Announce: "Signature pad. Draw signature using mouse or touch."
   - Clear button: "Clear signature"
   - Status: "Signature captured" or "Signature required"

3. **Photo Upload**
   - Tab to focus drop zone
   - Enter/Space: Open file picker
   - Announce accepted formats and size limit

### ARIA Requirements

```html
<!-- Confirm Delivery Dialog -->
<dialog
  role="dialog"
  aria-modal="true"
  aria-labelledby="confirm-delivery-title"
  aria-describedby="confirm-delivery-desc"
>
  <h2 id="confirm-delivery-title">Confirm Delivery</h2>
  <p id="confirm-delivery-desc">
    Shipment: AusPost - AP123456789AU
  </p>
</dialog>

<!-- Signature Pad -->
<div
  role="img"
  aria-label="Signature pad. Draw your signature here."
  tabindex="0"
>
  <canvas
    aria-hidden="true"
  />
</div>

<button aria-label="Clear signature">
  Clear
</button>

<div role="status" aria-live="polite">
  Signature captured successfully
</div>

<!-- Photo Upload -->
<div
  role="button"
  tabindex="0"
  aria-label="Upload delivery photo. Drag and drop or click to select. Accepts JPG, PNG, HEIC up to 10MB."
  aria-describedby="photo-upload-desc"
>
  <input type="file" aria-hidden="true" />
</div>

<div id="photo-upload-desc">
  Accepts: JPG, PNG, HEIC. Maximum size: 10MB.
</div>

<!-- Upload Progress -->
<div
  role="progressbar"
  aria-valuenow="65"
  aria-valuemin="0"
  aria-valuemax="100"
  aria-label="Uploading delivery-proof.jpg: 65%"
>
</div>

<!-- Proof Icons -->
<button
  aria-label="View delivery proof: signature and photo available"
>
  <span aria-hidden="true">[sig]</span>
  <span aria-hidden="true">[cam]</span>
</button>

<!-- Proof Viewer -->
<dialog
  role="dialog"
  aria-modal="true"
  aria-labelledby="proof-viewer-title"
>
  <h2 id="proof-viewer-title">Delivery Proof</h2>
  <img alt="Signature of John Smith captured on January 9, 2026" />
  <img alt="Photo of delivery at front door" />
</dialog>
```

### Screen Reader Announcements

- Dialog opened: "Confirm Delivery dialog. Shipment AusPost tracking AP123456789AU."
- Signature captured: "Signature captured successfully."
- Signature cleared: "Signature cleared."
- Photo selected: "Photo selected: delivery-proof.jpg, 2.4 megabytes."
- Upload progress: "Uploading: 65 percent complete."
- Upload complete: "Photo uploaded successfully."
- Delivery confirmed: "Delivery confirmed. Shipment marked as delivered."
- Error: "Upload failed. Retry button available."

---

## Animation Choreography

### Dialog Open/Close

```
OPEN (Mobile - Full Screen):
- Duration: 300ms
- Easing: ease-out
- Transform: translateX(100%) -> translateX(0)
- Backdrop fade: 200ms

OPEN (Desktop - Modal):
- Duration: 250ms
- Easing: ease-out
- Transform: scale(0.95) translateY(-20px) -> scale(1) translateY(0)
- Opacity: 0 -> 1
- Backdrop fade: 200ms

CLOSE:
- Duration: 200ms
- Easing: ease-in
- Reverse of open animation
```

### Signature Pad

```
STROKE DRAWING:
- Immediate response (no delay)
- Line smoothing: Bezier interpolation
- Stroke width: Pressure-sensitive if available

CLEAR ANIMATION:
- Duration: 300ms
- Easing: ease-out
- Opacity: 1 -> 0
- Scale: 1 -> 0.95
- Then reset canvas
```

### Photo Upload

```
DROP ZONE HIGHLIGHT:
- Duration: 150ms
- Border color transition
- Background color transition
- Scale: 1 -> 1.02

PHOTO PREVIEW APPEAR:
- Duration: 300ms
- Easing: ease-out
- Opacity: 0 -> 1
- Scale: 0.9 -> 1

PROGRESS BAR:
- Width transition: 100ms ease-out
- Color changes at milestones (blue -> green at 100%)

UPLOAD COMPLETE:
- Duration: 400ms
- Checkmark draw animation
- Green pulse on thumbnail
```

### Proof Viewer

```
LIGHTBOX OPEN:
- Duration: 300ms
- Backdrop fade: 200ms
- Image scale: 0.8 -> 1
- Opacity: 0 -> 1

IMAGE ZOOM:
- Duration: 200ms
- Easing: ease-out
- Transform origin: click point
- Scale: 1 -> 2 (pinch/double-tap)

NAVIGATION:
- Duration: 200ms
- Current image: translateX(0) -> translateX(-100%)
- Next image: translateX(100%) -> translateX(0)
```

### Success Feedback

```
DELIVERY CONFIRMED:
- Duration: 500ms
- Checkmark draw: 300ms
- Circle expand: 200ms
- Green pulse on dialog
- Toast slide up: 200ms
```

---

## Component Props Interfaces

```typescript
// Confirm Delivery Dialog
interface ConfirmDeliveryDialogProps {
  open: boolean;
  shipment: Shipment;
  onClose: () => void;
  onConfirm: (confirmation: DeliveryConfirmation) => Promise<void>;
  isSubmitting: boolean;
}

// Delivery Confirmation Data
interface DeliveryConfirmation {
  recipientName: string;
  signature?: SignatureData;
  photo?: File;
  notes?: string;
  deliveredAt?: Date;
}

// Signature Data
interface SignatureData {
  dataUrl: string;
  strokes: StrokePoint[][];
  timestamp: Date;
}

interface StrokePoint {
  x: number;
  y: number;
  pressure?: number;
}

// Signature Pad Component
interface SignaturePadProps {
  onChange: (signature: SignatureData | null) => void;
  value?: SignatureData | null;
  width?: number;
  height?: number;
  strokeColor?: string;
  strokeWidth?: number;
  minStrokeLength?: number; // For validation
  disabled?: boolean;
  'aria-label'?: string;
}

// Photo Upload Component
interface DeliveryPhotoUploadProps {
  value?: File | null;
  onChange: (file: File | null) => void;
  onUploadProgress?: (progress: number) => void;
  maxSize?: number; // bytes
  acceptedFormats?: string[];
  disabled?: boolean;
}

// Delivery Proof Viewer
interface DeliveryProofViewerProps {
  open: boolean;
  shipment: Shipment;
  proof: DeliveryProof;
  onClose: () => void;
  onDownload?: (type: 'signature' | 'photo' | 'all') => void;
}

// Delivery Proof Data
interface DeliveryProof {
  recipientName: string;
  signatureUrl?: string;
  photoUrl?: string;
  notes?: string;
  deliveredAt: Date;
  deliveredBy: {
    id: string;
    name: string;
  };
}

// Proof Icons (for shipment list)
interface ProofIconsProps {
  hasSignature: boolean;
  hasPhoto: boolean;
  onClick: () => void;
  size?: 'sm' | 'md';
}
```

---

## Files to Create/Modify

| File | Purpose |
|------|---------|
| `src/components/domain/orders/confirm-delivery-dialog.tsx` | Main confirmation dialog |
| `src/components/domain/orders/signature-pad.tsx` | Touch/mouse signature capture |
| `src/components/domain/orders/delivery-photo-upload.tsx` | Photo upload with preview |
| `src/components/domain/orders/delivery-proof-viewer.tsx` | Lightbox for viewing proof |
| `src/components/domain/orders/proof-icons.tsx` | Signature/photo indicator icons |
| `src/components/domain/orders/shipment-list.tsx` | Integration point |

---

## Related Wireframes

- [DOM-ORD-001c: Shipment Tracking UI](./DOM-ORD-001c.wireframe.md)
- [DOM-ORD-003c: Partial Shipments UI](./DOM-ORD-003c.wireframe.md)
- [DOM-ORD-007: Fulfillment Dashboard](./DOM-ORD-007.wireframe.md)

---

**Document Version:** 1.1
**Updated:** 2026-01-10
**Author:** UI Skill
**Changes:** Added UI Pattern References section
