# Wireframe: DOM-PROD-003c - Product Images: UI

## Story Reference

- **Story ID**: DOM-PROD-003c
- **Name**: Product Images: UI
- **PRD**: memory-bank/prd/domains/products.prd.json
- **Type**: UI Component
- **Domain Color**: Emerald-500

## Overview

Product image management UI including drag-drop uploader, image gallery with lightbox, reorderable image list, primary image selection, and display in product lists/cards. Images are stored in Supabase storage.

## UI Patterns (Reference Implementation)

### Dialog
- **Pattern**: RE-UI Dialog
- **Reference**: `_reference/.reui-reference/registry/default/ui/dialog.tsx`
- **Features**:
  - Image lightbox for full-screen image viewing
  - Image upload modal with drag-drop zone
  - Delete confirmation dialog for image removal

### Card
- **Pattern**: RE-UI Card
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`
- **Features**:
  - Product cards with primary image thumbnail in list/grid views
  - Image upload drop zone card with instructions
  - Image management card showing all product images with reorder controls

### Badge
- **Pattern**: RE-UI Badge
- **Reference**: `_reference/.reui-reference/registry/default/ui/badge.tsx`
- **Features**:
  - Primary image badge with star icon
  - Upload progress percentage badge
  - Image count badge (e.g., "4 images")

### Input
- **Pattern**: RE-UI Input (File Upload)
- **Reference**: `_reference/.reui-reference/registry/default/ui/input.tsx`
- **Features**:
  - File input with drag-drop capabilities
  - Multiple file selection support
  - File type and size validation feedback

### Progress
- **Pattern**: RE-UI Progress
- **Reference**: `_reference/.reui-reference/registry/default/ui/progress.tsx`
- **Features**:
  - Upload progress bar with percentage indicator
  - Multi-file upload progress tracking
  - Success/error state indicators

---

## Dependencies

> **STATUS: READY** - All required schema exists, this wireframe can be implemented now.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Available** | products, categories | IMPLEMENTED |
| **Server Functions** | Standard CRUD | AVAILABLE |
| **PRD Stories** | N/A | N/A |

### Existing Schema Files
- `renoz-v2/lib/schema/products.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery/battery installation
- **Currency**: AUD with GST (10%)
- **Date Format**: DD/MM/YYYY

---

## Mobile Wireframe (375px)

### Product Images Tab (Product Detail)

```
+========================================+
| <- Products                            |
+========================================+
|                                        |
|  Solar Panel 400W                      |
|  SKU: SP-400W                          |
|                                        |
|  [Overview] [Pricing] [Images] [Stock] |
|                        ^active         |
|                                        |
+========================================+
|                                        |
|  PRODUCT IMAGES (4)                    |
|  --------------------------------      |
|                                        |
|  +----------------------------------+  |
|  |                                  |  |
|  |     [================]           |  |
|  |     [                ]           |  |
|  |     [ PRIMARY IMAGE  ]           |  |
|  |     [   (tap to view)]           |  |
|  |     [================]           |  |
|  |                                  |  |
|  |     [star] Primary Image         |  |
|  +----------------------------------+  |
|                                        |
|  Thumbnails:                           |
|  +------+ +------+ +------+ +------+   |
|  |[img1]| |[img2]| |[img3]| |[img4]|   |
|  | [*]  | |      | |      | |      |   |
|  +------+ +------+ +------+ +------+   |
|  ^primary                              |
|                                        |
|  [+ Add Image]                         |
|                                        |
+========================================+
```

### Image Upload (Bottom Sheet)

```
+========================================+
| Add Image                         [X]  |
+========================================+
|                                        |
|  +----------------------------------+  |
|  |                                  |  |
|  |    +------------------------+    |  |
|  |    |                        |    |  |
|  |    |    [camera icon]       |    |  |
|  |    |                        |    |  |
|  |    |   Tap to take photo    |    |  |
|  |    |   or select from       |    |  |
|  |    |   gallery              |    |  |
|  |    |                        |    |  |
|  |    +------------------------+    |  |
|  |                                  |  |
|  +----------------------------------+  |
|                                        |
|  [Take Photo]   [Choose from Gallery]  |
|                                        |
+========================================+
```

### Image Upload Progress

```
+========================================+
| Uploading...                      [X]  |
+========================================+
|                                        |
|  +----------------------------------+  |
|  |                                  |  |
|  |    [image preview]               |  |
|  |                                  |  |
|  |    [==================---] 75%   |  |
|  |                                  |  |
|  |    Uploading solar_panel.jpg...  |  |
|  |                                  |  |
|  +----------------------------------+  |
|                                        |
|  [Cancel]                              |
|                                        |
+========================================+
```

### Image Lightbox (Full Screen)

```
+========================================+
|                                   [X]  |
+========================================+
|                                        |
|                                        |
|                                        |
|     +----------------------------+     |
|     |                            |     |
|     |                            |     |
|     |      [FULL SIZE IMAGE]     |     |
|     |                            |     |
|     |                            |     |
|     +----------------------------+     |
|                                        |
|                                        |
|                                        |
+========================================+
| [<]   1 / 4   [>]                      |
+========================================+
|                                        |
| [Set as Primary]  [Delete]             |
|                                        |
+========================================+
```

### Manage Images (Edit Mode)

```
+========================================+
| Manage Images                     [X]  |
+========================================+
|                                        |
|  Drag to reorder, tap for options      |
|                                        |
|  +----------------------------------+  |
|  | [=] [img1]  Front view     [*]   |  |
|  |             Primary              |  |
|  |                  [Set] [Delete]  |  |
|  +----------------------------------+  |
|                                        |
|  +----------------------------------+  |
|  | [=] [img2]  Side view            |  |
|  |                                  |  |
|  |                  [Set] [Delete]  |  |
|  +----------------------------------+  |
|                                        |
|  +----------------------------------+  |
|  | [=] [img3]  Back view            |  |
|  |                                  |  |
|  |                  [Set] [Delete]  |  |
|  +----------------------------------+  |
|                                        |
|  +----------------------------------+  |
|  | [=] [img4]  Detail               |  |
|  |                                  |  |
|  |                  [Set] [Delete]  |  |
|  +----------------------------------+  |
|                                        |
|  [+ Add More]                [Done]    |
|                                        |
+========================================+
```

### Product Card with Image (List View)

```
+========================================+
| Products                     [+ New]   |
+========================================+
| [Search_______________] [Filter v]     |
+========================================+
|                                        |
|  +----------------------------------+  |
|  | +------+                         |  |
|  | |[img] | Solar Panel 400W        |  |
|  | |      | SP-400W                 |  |
|  | +------+ $450.00                 |  |
|  |                       Active *   |  |
|  +----------------------------------+  |
|                                        |
|  +----------------------------------+  |
|  | +------+                         |  |
|  | |[img] | Inverter 5kW            |  |
|  | |      | INV-5K                  |  |
|  | +------+ $1,200.00               |  |
|  |                       Active *   |  |
|  +----------------------------------+  |
|                                        |
|  +----------------------------------+  |
|  | +------+                         |  |
|  | |[ -- ]| Mounting Kit            |  |
|  | |[no  ]| MNT-STD                 |  |
|  | +------+ $150.00                 |  |
|  |  ^no image            Active *   |  |
|  +----------------------------------+  |
|                                        |
+========================================+
```

---

## Tablet Wireframe (768px)

### Product Images Tab

```
+================================================================+
| <- Back to Products                                             |
+================================================================+
|                                                                 |
|  Solar Panel 400W                          [Edit] [Actions v]   |
|  SKU: SP-400W | Category: Solar Panels                          |
|                                                                 |
|  [Overview] [Pricing] [Images] [Stock] [Attributes]             |
|                        ^active                                  |
|                                                                 |
+================================================================+
|                                                                 |
|  +------------------------+  +-------------------------------+  |
|  |                        |  | IMAGE MANAGEMENT              |  |
|  |                        |  | ---------------------------   |  |
|  | [==================]   |  |                               |  |
|  | [                  ]   |  | [+ Upload Images]             |  |
|  | [  PRIMARY IMAGE   ]   |  |                               |  |
|  | [   (click to      ]   |  | Drag images to reorder        |  |
|  | [    enlarge)      ]   |  |                               |  |
|  | [==================]   |  | +---------------------------+ |  |
|  |                        |  | | [=] [img] Front   [*] [X] | |  |
|  | [star] Primary         |  | +---------------------------+ |  |
|  |                        |  | | [=] [img] Side        [X] | |  |
|  +------------------------+  | +---------------------------+ |  |
|                              | | [=] [img] Back        [X] | |  |
|  Thumbnails:                 | +---------------------------+ |  |
|  +----+ +----+ +----+ +----+ | | [=] [img] Detail      [X] | |  |
|  |img1| |img2| |img3| |img4| | +---------------------------+ |  |
|  |[*] | |    | |    | |    | |                               |  |
|  +----+ +----+ +----+ +----+ +-------------------------------+  |
|                                                                 |
+================================================================+
```

### Upload Zone (Drag & Drop)

```
+================================================================+
|                                                                 |
|  +-----------------------------------------------------------+  |
|  |                                                            |  |
|  |     +--------------------------------------------+         |  |
|  |     |                                            |         |  |
|  |     |            [cloud upload icon]             |         |  |
|  |     |                                            |         |  |
|  |     |     Drag and drop images here              |         |  |
|  |     |     or click to browse                     |         |  |
|  |     |                                            |         |  |
|  |     |     Supports: JPG, PNG, WebP               |         |  |
|  |     |     Max size: 5MB per file                 |         |  |
|  |     |                                            |         |  |
|  |     +--------------------------------------------+         |  |
|  |                                                            |  |
|  +-----------------------------------------------------------+  |
|                                                                 |
+================================================================+
```

### Upload Progress (Multiple Files)

```
+================================================================+
|                                                                 |
|  Uploading 3 images...                                          |
|                                                                 |
|  +-----------------------------------------------------------+  |
|  | solar_front.jpg          [====================] Complete   |  |
|  | solar_side.jpg           [============--------] 65%        |  |
|  | solar_detail.jpg         [====-----------------] 25%       |  |
|  +-----------------------------------------------------------+  |
|                                                                 |
|  [Cancel All]                                                   |  |
|                                                                 |
+================================================================+
```

### Lightbox Gallery

```
+================================================================+
|                                                              [X]|
+================================================================+
|                                                                 |
|  +-----------------------------------------------------------+  |
|  |                                                            |  |
|  |                                                            |  |
|  |                                                            |  |
|  |              [LARGE IMAGE DISPLAY]                         |  |
|  |                                                            |  |
|  |                                                            |  |
|  |                                                            |  |
|  |                                                            |  |
|  +-----------------------------------------------------------+  |
|                                                                 |
|  [<]               2 of 4               [>]                     |
|                                                                 |
|  +----+ +----+ +----+ +----+                                    |
|  |    | |[**]| |    | |    |  <- thumbnail strip               |
|  +----+ +----+ +----+ +----+                                    |
|                                                                 |
|  [Set as Primary]              [Download]  [Delete]             |
|                                                                 |
+================================================================+
```

---

## Desktop Wireframe (1280px+)

### Product Images Tab (Full)

```
+================================================================================+
| [Logo] Renoz CRM      Dashboard | Catalog | Orders | Customers     [Bell][User]|
+=========+======================================================================+
|         |                                                                       |
| Dashbrd | <- Back to Products                                                   |
| ------  |                                                                       |
| Catalog | Solar Panel 400W                              [Edit] [Duplicate] [v]  |
|   All   | SKU: SP-400W | Category: Solar Panels | Status: Active               |
|   Cat.  | ---------------------------------------------------------------------  |
| Orders  |                                                                       |
| Custmrs | [Overview] [Pricing] [Images] [Stock] [Attributes] [Related]          |
| Reports |                        ^active                                        |
|         |                                                                       |
+=========+======================================================================+
|         |                                                                       |
|         | +----------------------------+  +----------------------------------+  |
|         | |                            |  |                                  |  |
|         | |  +----------------------+  |  | IMAGE GALLERY                    |  |
|         | |  |                      |  |  | -------------------------------- |  |
|         | |  |                      |  |  |                                  |  |
|         | |  |                      |  |  | +------------------------------+ |  |
|         | |  |   PRIMARY IMAGE      |  |  | |                              | |  |
|         | |  |   (400 x 400)        |  |  | | +------+  +----------------+ | |  |
|         | |  |                      |  |  | | |      |  |                | | |  |
|         | |  |   Click to enlarge   |  |  | | | Drag |  | Drop images    | | |  |
|         | |  |                      |  |  | | | here |  | here or click  | | |  |
|         | |  |                      |  |  | | |      |  | to upload      | | |  |
|         | |  +----------------------+  |  | | +------+  |                | | |  |
|         | |                            |  | |           | Max 5MB each   | | |  |
|         | |  [star] Primary Image      |  | |           +----------------+ | |  |
|         | |                            |  | |                              | |  |
|         | +----------------------------+  | +------------------------------+ |  |
|         |                                 |                                  |  |
|         | Thumbnails:                     | MANAGE IMAGES (4)                |  |
|         | +----+ +----+ +----+ +----+     | -------------------------------- |  |
|         | |img1| |img2| |img3| |img4|     |                                  |  |
|         | |[*] | |    | |    | |    |     | Drag to reorder. Click star to   |  |
|         | +----+ +----+ +----+ +----+     | set primary image.               |  |
|         |                                 |                                  |  |
|         |                                 | +------------------------------+ |  |
|         |                                 | |[=][thumb] Front view    [*][X]||  |
|         |                                 | +------------------------------+ |  |
|         |                                 | |[=][thumb] Side view       [X]| |  |
|         |                                 | +------------------------------+ |  |
|         |                                 | |[=][thumb] Back view       [X]| |  |
|         |                                 | +------------------------------+ |  |
|         |                                 | |[=][thumb] Connector       [X]| |  |
|         |                                 | +------------------------------+ |  |
|         |                                 |                                  |  |
|         |                                 +----------------------------------+  |
|         |                                                                       |
+=========+======================================================================+
```

### Drag & Drop Upload Zone (Active State)

```
+================================================================================+
|                                                                                 |
|  +----------------------------------------------------------------------------+ |
|  |                                                                            | |
|  |    +------------------------------------------------------------------+    | |
|  |    |                                                                  |    | |
|  |    |                  [DASHED BORDER - ACTIVE]                        |    | |
|  |    |                                                                  |    | |
|  |    |                      [cloud icon]                                |    | |
|  |    |                                                                  |    | |
|  |    |                  Drop images here                                |    | |
|  |    |                                                                  |    | |
|  |    |     ---------------------------------------------------         |    | |
|  |    |                                                                  |    | |
|  |    |     Or [Browse Files] to select from your computer              |    | |
|  |    |                                                                  |    | |
|  |    |     Accepted formats: JPG, PNG, WebP, GIF                       |    | |
|  |    |     Maximum file size: 5MB per image                            |    | |
|  |    |     Maximum images: 10 per product                              |    | |
|  |    |                                                                  |    | |
|  |    +------------------------------------------------------------------+    | |
|  |                                                                            | |
|  +----------------------------------------------------------------------------+ |
|                                                                                 |
+================================================================================+
```

### Drag & Drop (Hover State)

```
+================================================================================+
|                                                                                 |
|  +----------------------------------------------------------------------------+ |
|  |                                                                            | |
|  |    +==================================================================+    | |
|  |    ||                                                                ||    | |
|  |    ||               [EMERALD BORDER - PULSING]                       ||    | |
|  |    ||                                                                ||    | |
|  |    ||                   [download icon]                              ||    | |
|  |    ||                                                                ||    | |
|  |    ||              Release to upload 3 files                         ||    | |
|  |    ||                                                                ||    | |
|  |    ||     solar_front.jpg (2.3 MB)                                   ||    | |
|  |    ||     solar_side.jpg (1.8 MB)                                    ||    | |
|  |    ||     solar_detail.jpg (2.1 MB)                                  ||    | |
|  |    ||                                                                ||    | |
|  |    +==================================================================+    | |
|  |                                                                            | |
|  +----------------------------------------------------------------------------+ |
|                                                                                 |
+================================================================================+
```

### Lightbox Gallery (Desktop)

```
+================================================================================+
|                                                                            [X]  |
+================================================================================+
|                                                                                 |
|  +----------------------------------------------------------------------------+ |
|  |                                                                            | |
|  |    [<]                                                           [>]       | |
|  |                                                                            | |
|  |          +------------------------------------------------------+          | |
|  |          |                                                      |          | |
|  |          |                                                      |          | |
|  |          |                                                      |          | |
|  |          |              FULL SIZE IMAGE                         |          | |
|  |          |              (zoom on hover)                         |          | |
|  |          |                                                      |          | |
|  |          |                                                      |          | |
|  |          |                                                      |          | |
|  |          +------------------------------------------------------+          | |
|  |                                                                            | |
|  +----------------------------------------------------------------------------+ |
|                                                                                 |
|  +------+ +------+ +------+ +------+                                            |
|  | img1 | |[img2]| | img3 | | img4 |  <- clickable thumbnails                   |
|  +------+ +------+ +------+ +------+                                            |
|                 ^current                                                        |
|                                                                                 |
|  solar_side.jpg  |  1920 x 1080  |  2.3 MB                                     |
|                                                                                 |
|  [star Set as Primary]      [download Download]      [trash Delete]             |
|                                                                                 |
+================================================================================+
```

### Product List with Images (Desktop)

```
+================================================================================+
| Products                                                       [+ New Product]  |
+================================================================================+
| [Search________________________] [Category v] [Status v] [Sort: Name v]         |
|                                                                                 |
| View: [Grid] [List]                                                             |
+================================================================================+
|                                                                                 |
|  GRID VIEW:                                                                     |
|  +------------------+ +------------------+ +------------------+ +-------------+ |
|  |  +-----------+   | |  +-----------+   | |  +-----------+   | |  +-------+  | |
|  |  |           |   | |  |           |   | |  |           |   | |  | [no   |  | |
|  |  |   [img]   |   | |  |   [img]   |   | |  |   [img]   |   | |  |  img] |  | |
|  |  |           |   | |  |           |   | |  |           |   | |  +-------+  | |
|  |  +-----------+   | |  +-----------+   | |  +-----------+   | |             | |
|  |                  | |                  | |                  | | Mounting    | |
|  | Solar Panel 400W | | Inverter 5kW     | | Battery 10kWh    | | Kit         | |
|  | SP-400W          | | INV-5K           | | BAT-10K          | | MNT-STD     | |
|  | $450.00          | | $1,200.00        | | $3,500.00        | | $150.00     | |
|  | [*] Active       | | [*] Active       | | [*] Active       | | [*] Active  | |
|  +------------------+ +------------------+ +------------------+ +-------------+ |
|                                                                                 |
|  LIST VIEW:                                                                     |
|  +----------------------------------------------------------------------------+ |
|  | [img] | Product Name        | SKU      | Category    | Price    | Status   | |
|  |-------+---------------------+----------+-------------+----------+----------| |
|  | [img] | Solar Panel 400W    | SP-400W  | Solar Panels| $450.00  | Active   | |
|  | [img] | Inverter 5kW        | INV-5K   | Inverters   | $1,200   | Active   | |
|  | [img] | Battery 10kWh       | BAT-10K  | Batteries   | $3,500   | Active   | |
|  | [--]  | Mounting Kit        | MNT-STD  | Mounting    | $150.00  | Active   | |
|  +----------------------------------------------------------------------------+ |
|                                                                                 |
+================================================================================+
```

---

## Interaction States

### Loading States

```
IMAGES LOADING:
+----------------------------------+
|                                  |
| [================]               |
| [    shimmer    ]               |
| [================]               |
|                                  |
| +----+ +----+ +----+ +----+      |
| |shim| |shim| |shim| |shim|      |
| +----+ +----+ +----+ +----+      |
+----------------------------------+

UPLOAD IN PROGRESS:
+----------------------------------+
| [image preview]                  |
|                                  |
| [==============----] 75%         |
| Uploading solar_panel.jpg...     |
|                                  |
| [Cancel]                         |
+----------------------------------+

IMAGE LOADING (in gallery):
+----------------------------------+
|                                  |
|    [spinner]                     |
|    Loading image...              |
|                                  |
+----------------------------------+
```

### Empty States

```
NO IMAGES:
+----------------------------------+
|                                  |
|     [image icon]                 |
|                                  |
|   No images yet                  |
|                                  |
|   Add photos to showcase         |
|   this product                   |
|                                  |
|   [+ Upload First Image]         |
|                                  |
+----------------------------------+

NO PRIMARY IMAGE (in list):
+----------------------------------+
| +------+                         |
| |      |                         |
| | [no  |  Product Name           |
| | img] |  SKU: ABC-123           |
| |      |                         |
| +------+                         |
+----------------------------------+
```

### Error States

```
UPLOAD FAILED:
+----------------------------------+
| [!] Upload failed                |
|                                  |
|     solar_panel.jpg could not    |
|     be uploaded. Please try      |
|     again.                       |
|                                  |
|     [Retry] [Skip]               |
+----------------------------------+

FILE TOO LARGE:
+----------------------------------+
| [!] File too large               |
|                                  |
|     big_image.jpg (12 MB)        |
|     exceeds the 5MB limit.       |
|                                  |
|     [OK]                         |
+----------------------------------+

INVALID FORMAT:
+----------------------------------+
| [!] Invalid file type            |
|                                  |
|     document.pdf is not a        |
|     supported image format.      |
|                                  |
|     Supported: JPG, PNG, WebP    |
|                                  |
|     [OK]                         |
+----------------------------------+

DELETE FAILED:
+----------------------------------+
| [!] Could not delete image       |
|                                  |
|     [Retry] [Cancel]             |
+----------------------------------+
```

### Success States

```
IMAGE UPLOADED:
+----------------------------------+
| [checkmark] Image uploaded       |
|             successfully         |
| <- Toast 3s                      |
+----------------------------------+

PRIMARY SET:
+----------------------------------+
| [star] Primary image updated     |
| <- Toast 3s                      |
+----------------------------------+

IMAGE DELETED:
+----------------------------------+
| [checkmark] Image removed        |
| <- Toast 3s                      |
+----------------------------------+

IMAGES REORDERED:
+----------------------------------+
| [checkmark] Image order saved    |
| <- Toast 2s                      |
+----------------------------------+
```

---

## Accessibility Notes

### Focus Order

1. **Images Tab**
   - Tab to primary image (opens lightbox on Enter)
   - Tab through thumbnails
   - Tab to upload zone/button
   - Tab through manage images list

2. **Upload Zone**
   - Focusable with Enter to open file picker
   - Drag events handled on focus

3. **Lightbox**
   - Focus trapped in lightbox
   - Tab: Close -> Prev -> Next -> Set Primary -> Delete
   - Escape closes lightbox
   - Arrow keys navigate images

4. **Manage Images List**
   - Tab through rows
   - Within row: drag handle (optional) -> set primary -> delete
   - Keyboard reorder with Ctrl+Arrow

### ARIA Requirements

```html
<!-- Upload Zone -->
<div
  role="button"
  tabindex="0"
  aria-label="Upload images. Click or drag files here. Accepts JPG, PNG, WebP up to 5MB"
  aria-dropeffect="copy"
>
  ...
</div>

<!-- Image Gallery -->
<section aria-labelledby="gallery-heading">
  <h3 id="gallery-heading">Product Images (4)</h3>

  <!-- Primary Image -->
  <figure>
    <img
      src="..."
      alt="Solar Panel 400W - Front view"
      aria-describedby="primary-badge"
    />
    <figcaption id="primary-badge">Primary Image</figcaption>
  </figure>

  <!-- Thumbnail List -->
  <ul role="list" aria-label="Image thumbnails">
    <li>
      <button
        aria-label="View front view image (primary)"
        aria-current="true"
      >
        <img src="..." alt="Front view thumbnail" />
      </button>
    </li>
  </ul>
</section>

<!-- Lightbox Dialog -->
<dialog
  role="dialog"
  aria-modal="true"
  aria-labelledby="lightbox-title"
>
  <h2 id="lightbox-title" class="visually-hidden">
    Image viewer - Solar Panel 400W front view
  </h2>

  <button aria-label="Previous image">Previous</button>
  <button aria-label="Next image">Next</button>

  <img
    src="..."
    alt="Solar Panel 400W - Full size front view"
  />

  <p aria-live="polite">Image 2 of 4</p>

  <button aria-label="Set as primary image">Set as Primary</button>
  <button aria-label="Delete this image">Delete</button>
  <button aria-label="Close image viewer">Close</button>
</dialog>

<!-- Reorderable List -->
<ul
  role="list"
  aria-label="Reorder product images"
>
  <li
    role="listitem"
    aria-label="Front view, position 1 of 4, primary image"
    draggable="true"
  >
    <button aria-label="Drag to reorder front view image">Drag handle</button>
    <img src="..." alt="Front view" />
    <button aria-label="Set front view as primary" aria-pressed="true">Primary</button>
    <button aria-label="Delete front view image">Delete</button>
  </li>
</ul>
```

### Screen Reader Announcements

- Upload started: "Uploading 3 images"
- Upload progress: "Uploading solar_panel.jpg, 75% complete"
- Upload complete: "Image uploaded successfully"
- Primary set: "Front view set as primary image"
- Image deleted: "Side view image deleted"
- Reorder: "Front view moved to position 2"
- Lightbox: "Viewing image 2 of 4, Side view"

---

## Animation Choreography

### Upload Interactions

```
DROP ZONE HOVER:
- Duration: 200ms
- Border: dashed gray -> solid emerald
- Background: transparent -> emerald/10
- Scale: 1 -> 1.02

FILE DROP:
- Duration: 150ms
- Scale: 1.02 -> 1
- Ripple effect from drop point

UPLOAD PROGRESS:
- Bar: smooth width transition
- Percentage: number animation
- On complete: checkmark scale bounce
```

### Gallery Interactions

```
THUMBNAIL HOVER:
- Duration: 150ms
- Scale: 1 -> 1.05
- Shadow: elevation increase

THUMBNAIL SELECT:
- Duration: 200ms
- Border: transparent -> emerald
- Ring animation around selected

PRIMARY BADGE APPEAR:
- Duration: 300ms
- Star icon: scale 0 -> 1.2 -> 1
- Badge: fade in + slide up
```

### Lightbox

```
LIGHTBOX OPEN:
- Duration: 300ms
- Backdrop: opacity 0 -> 0.9
- Image: scale 0.8 -> 1, opacity 0 -> 1
- Transform-origin: clicked thumbnail position

IMAGE TRANSITION:
- Duration: 250ms
- Current: slide out + fade
- Next: slide in + fade
- Direction based on navigation

LIGHTBOX CLOSE:
- Duration: 200ms
- Image: scale 1 -> 0.9, opacity 1 -> 0
- Backdrop: opacity 0.9 -> 0
```

### Reorder

```
DRAG START:
- Duration: 150ms
- Item: elevation increase, slight rotation
- Other items: shift smoothly

DRAGGING:
- Item follows cursor
- Drop zone highlight pulses
- Other items shift in real-time

DROP:
- Duration: 200ms
- Item settles into position
- Other items finalize positions
- Quick success pulse on dropped item
```

### Delete

```
DELETE ANIMATION:
- Duration: 250ms
- Item: scale 1 -> 0.8, opacity 1 -> 0
- Height: full -> 0
- Other items shift to fill gap
```

---

## Component Props Interfaces

```typescript
// Image Uploader
interface ImageUploaderProps {
  productId: string;
  onUpload: (files: File[]) => Promise<UploadResult[]>;
  onUploadProgress?: (progress: UploadProgress[]) => void;
  maxFiles?: number; // Default 10
  maxSizeBytes?: number; // Default 5MB
  acceptedFormats?: string[]; // Default ['image/jpeg', 'image/png', 'image/webp']
  disabled?: boolean;
}

interface UploadProgress {
  fileName: string;
  progress: number; // 0-100
  status: 'pending' | 'uploading' | 'complete' | 'error';
  error?: string;
}

interface UploadResult {
  fileName: string;
  imageUrl: string;
  success: boolean;
  error?: string;
}

// Image Gallery
interface ImageGalleryProps {
  images: ProductImage[];
  primaryImageId?: string;
  onSetPrimary: (imageId: string) => Promise<void>;
  onDelete: (imageId: string) => Promise<void>;
  onReorder: (imageIds: string[]) => Promise<void>;
  onImageClick?: (imageId: string) => void;
  isEditable?: boolean;
}

interface ProductImage {
  id: string;
  imageUrl: string;
  caption?: string;
  sortOrder: number;
  isPrimary: boolean;
}

// Lightbox
interface LightboxProps {
  images: ProductImage[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  onSetPrimary?: (imageId: string) => void;
  onDelete?: (imageId: string) => void;
  onDownload?: (imageId: string) => void;
  productName?: string; // For alt text
}

// Image Thumbnail
interface ImageThumbnailProps {
  image: ProductImage;
  isSelected?: boolean;
  isPrimary?: boolean;
  onClick?: () => void;
  onSetPrimary?: () => void;
  onDelete?: () => void;
  size?: 'sm' | 'md' | 'lg';
  showActions?: boolean;
}

// Reorderable Image List
interface ReorderableImageListProps {
  images: ProductImage[];
  onReorder: (newOrder: string[]) => void;
  onSetPrimary: (imageId: string) => void;
  onDelete: (imageId: string) => void;
}

// Product Card with Image
interface ProductCardProps {
  product: Product;
  imageUrl?: string; // Primary image URL
  showImage?: boolean;
  variant?: 'grid' | 'list';
  onClick?: () => void;
}

// No Image Placeholder
interface NoImagePlaceholderProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}
```

---

## Component Files

| File | Purpose |
|------|---------|
| `src/components/domain/products/image-uploader.tsx` | Drag-drop upload zone |
| `src/components/domain/products/image-gallery.tsx` | Gallery display component |
| `src/components/domain/products/image-lightbox.tsx` | Full-screen image viewer |
| `src/components/domain/products/image-thumbnail.tsx` | Thumbnail with actions |
| `src/components/domain/products/reorderable-image-list.tsx` | Drag-to-reorder list |
| `src/components/domain/products/no-image-placeholder.tsx` | Placeholder for no image |
| `src/components/domain/products/product-columns.tsx` | List column with image |
| `src/components/domain/products/product-card.tsx` | Grid card with image |
| `src/routes/catalog/$productId.tsx` | Images tab integration |

---

## Related Wireframes

- Product Detail Page (images tab)
- Product List (image display)
- Product Form (image upload during creation)
- Quote/Order Line Items (product images)

---

**Document Version:** 1.0
**Created:** 2026-01-10
**Author:** UI Wireframe Generator
