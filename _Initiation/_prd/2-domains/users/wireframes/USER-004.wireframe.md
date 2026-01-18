# Wireframe: DOM-USER-004 - Add Image Cropper to Avatar Upload

## Story Reference

- **Story ID**: DOM-USER-004
- **Name**: Add Image Cropper to Avatar Upload
- **PRD**: memory-bank/prd/domains/users.prd.json
- **Type**: UI Component
- **Component Type**: Image Cropper Dialog

## Overview

Add client-side image cropper before avatar upload with preview of cropped image before save. Users can select an image, crop/resize it to the appropriate aspect ratio, preview the result, and then upload. Supports drag-and-drop, zoom, rotation, and predefined crop shapes.

## UI Patterns (Reference Implementation)

### Dialog
- **Pattern**: RE-UI Dialog
- **Reference**: `_reference/.reui-reference/registry/default/ui/dialog.tsx`
- **Features**:
  - Image cropper dialog with full-screen mode on mobile
  - File selection dialog with drag-and-drop zone
  - Remove avatar confirmation dialog

### Slider
- **Pattern**: RE-UI Slider
- **Reference**: `_reference/.reui-reference/registry/default/ui/slider.tsx`
- **Features**:
  - Zoom slider with min/max values (1.0x to 3.0x)
  - Real-time preview update on zoom change
  - Keyboard navigation for zoom control

### Avatar
- **Pattern**: RE-UI Avatar
- **Reference**: `_reference/.reui-reference/registry/default/ui/avatar.tsx`
- **Features**:
  - Current avatar display with fallback initials
  - Cropped preview avatar at multiple sizes
  - Upload state indicator on avatar component

### Progress
- **Pattern**: RE-UI Progress
- **Reference**: `_reference/.reui-reference/registry/default/ui/progress.tsx`
- **Features**:
  - Upload progress bar showing percentage
  - Processing indicator during image optimization
  - Determinate progress for file upload

---

## Dependencies

> **STATUS: READY** - All required schema exists, this wireframe can be implemented now.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Available** | users (avatarUrl field) | IMPLEMENTED |
| **Server Functions** | Supabase Storage upload | AVAILABLE |
| **PRD Stories** | DOM-USER-004 | READY |

### Existing Schema Files
- `renoz-v2/lib/schema/users.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery/battery installation
- **Currency**: AUD with GST (10%)
- **Date Format**: DD/MM/YYYY

---

## Mobile Wireframe (375px)

### Profile Settings - Avatar Section (Mobile)

```
+----------------------------------------+
| <- Settings                            |
+----------------------------------------+
| My Profile                             |
+----------------------------------------+
| [Profile] [Notifications] [Security]   |
| ^^^^^^^^                               |
+----------------------------------------+
|                                        |
| Profile Photo                          |
| --------------------------------       |
|                                        |
|        +------------------+            |
|        |                  |            |
|        |    [Current      |            |
|        |     Avatar]      |            |
|        |                  |            |
|        +------------------+            |
|                                        |
|     [Change Photo]  (Remove)           |
|                                        |
| Recommended: Square image, at least    |
| 200x200 pixels. Max file size: 5MB.    |
|                                        |
| --------------------------------       |
|                                        |
| Display Name *                         |
| +------------------------------------+ |
| | John Smith                         | |
| +------------------------------------+ |
|                                        |
| ...                                    |
|                                        |
+----------------------------------------+
```

### Image Cropper - Full Screen (Mobile)

```
+----------------------------------------+
| Edit Profile Photo               [X]   |
+----------------------------------------+
|                                        |
| +------------------------------------+ |
| |                                    | |
| |    +------------------------+      | |
| |    |                        |      | |
| |    |                        |      | |
| |    |    [Image with         |      | |
| |    |     circular crop      |      | |
| |    |     overlay]           |      | |
| |    |                        |      | |
| |    |                        |      | |
| |    +------------------------+      | |
| |                                    | |
| |    <- Drag to reposition           | |
| |    <-> Pinch to zoom               | |
| |                                    | |
| +------------------------------------+ |
|                                        |
| Zoom:                                  |
| [-------|----------] 1.0x              |
|                                        |
| +--------+ +--------+ +--------+       |
| | [Rotate| |[Rotate | | [Reset]|       |
| | Left]  | | Right] | |        |       |
| +--------+ +--------+ +--------+       |
|                                        |
+----------------------------------------+
| Preview:                               |
| +------+                               |
| |[crop]|  This is how your avatar     |
| |      |  will appear in the app.     |
| +------+                               |
+----------------------------------------+
|       (Cancel)        [Save Photo]     |
+----------------------------------------+
```

### Image Selection (Mobile)

```
+----------------------------------------+
| Select Photo                     [X]   |
+----------------------------------------+
|                                        |
| +------------------------------------+ |
| |                                    | |
| |    +------------------------+      | |
| |    |                        |      | |
| |    |   [Drag & drop image   |      | |
| |    |    or tap to select]   |      | |
| |    |                        |      | |
| |    |   [Image Icon]         |      | |
| |    |                        |      | |
| |    +------------------------+      | |
| |                                    | |
| +------------------------------------+ |
|                                        |
| Or choose from:                        |
|                                        |
| +------------------------------------+ |
| | [Camera] Take Photo                | |
| +------------------------------------+ |
| | [Gallery] Choose from Library      | |
| +------------------------------------+ |
|                                        |
| Supported formats: JPG, PNG, GIF       |
| Maximum size: 5MB                      |
|                                        |
+----------------------------------------+
```

### Upload Progress (Mobile)

```
+----------------------------------------+
| Uploading Photo                        |
+----------------------------------------+
|                                        |
|        +------------------+            |
|        |                  |            |
|        |   [Preview of    |            |
|        |    cropped       |            |
|        |    image]        |            |
|        |                  |            |
|        +------------------+            |
|                                        |
|  [==================--] 85%            |
|                                        |
|  Uploading your profile photo...       |
|                                        |
|         (Cancel Upload)                |
|                                        |
+----------------------------------------+
```

---

## Tablet Wireframe (768px)

### Profile Settings - Avatar Section (Tablet)

```
+----------------------------------------------------------------+
| <- Settings                                                     |
+----------------------------------------------------------------+
| [Profile]    [Notifications]    [Security]    [Privacy]         |
| ^^^^^^^^                                                        |
+----------------------------------------------------------------+
|                                                                 |
| Profile Photo                                                   |
| ----------------------------------------------------------------|
|                                                                 |
| +-------------------------------------------------------------+ |
| |                                                             | |
| |  +------------------+   Profile Photo                       | |
| |  |                  |                                       | |
| |  |  [Current        |   [Change Photo]                      | |
| |  |   Avatar 120px]  |   (Remove Photo)                      | |
| |  |                  |                                       | |
| |  +------------------+   Recommended: Square image,          | |
| |                         at least 200x200 pixels.            | |
| |                         Max file size: 5MB                  | |
| |                         Supported: JPG, PNG, GIF            | |
| |                                                             | |
| +-------------------------------------------------------------+ |
|                                                                 |
| Basic Information                                               |
| ----------------------------------------------------------------|
| ...                                                             |
|                                                                 |
+----------------------------------------------------------------+
```

### Image Cropper Dialog (Tablet)

```
+----------------------------------------------------------------+
| Edit Profile Photo                                        [X]   |
+----------------------------------------------------------------+
|                                                                 |
| +-------------------------------------------------------------+ |
| |                                                             | |
| |  +-----------------------------------+  +-----------------+ | |
| |  |                                   |  |                 | | |
| |  |                                   |  | Preview         | | |
| |  |     [Image with circular          |  |                 | | |
| |  |      crop overlay]                |  | +-------------+ | | |
| |  |                                   |  | |             | | | |
| |  |     +-------------------+         |  | |  [Cropped   | | | |
| |  |     |                   |         |  | |   Preview]  | | | |
| |  |     |   Drag to         |         |  | |             | | | |
| |  |     |   reposition      |         |  | +-------------+ | | |
| |  |     |                   |         |  |                 | | |
| |  |     +-------------------+         |  | This is how     | | |
| |  |                                   |  | your avatar     | | |
| |  |                                   |  | will appear.    | | |
| |  +-----------------------------------+  +-----------------+ | |
| |                                                             | |
| |  Controls:                                                  | |
| |  Zoom: [-------|---------------] 1.2x                       | |
| |                                                             | |
| |  [Rotate -90]  [Rotate +90]  [Flip H]  [Flip V]  [Reset]   | |
| |                                                             | |
| +-------------------------------------------------------------+ |
|                                                                 |
|                              (Cancel)         [Save Photo]      |
|                                                                 |
+----------------------------------------------------------------+
```

### Image Selection (Tablet)

```
+----------------------------------------------------------------+
| Select Profile Photo                                      [X]   |
+----------------------------------------------------------------+
|                                                                 |
| +-------------------------------------------------------------+ |
| |                                                             | |
| |  +--------------------------------------------------+       | |
| |  |                                                  |       | |
| |  |         [Drag and drop an image here]           |       | |
| |  |                                                  |       | |
| |  |              or                                 |       | |
| |  |                                                  |       | |
| |  |         [Browse Files]                          |       | |
| |  |                                                  |       | |
| |  +--------------------------------------------------+       | |
| |                                                             | |
| |  Supported formats: JPG, PNG, GIF                           | |
| |  Maximum file size: 5MB                                     | |
| |  Recommended: Square image, at least 200x200 pixels         | |
| |                                                             | |
| +-------------------------------------------------------------+ |
|                                                                 |
|                                              (Cancel)           |
|                                                                 |
+----------------------------------------------------------------+
```

---

## Desktop Wireframe (1280px+)

### Profile Settings - Avatar Section (Desktop)

```
+-------------------------------------------------------------------------------------------+
| [Logo] Renoz CRM       Dashboard | Customers | Orders | Settings       [Bell] [User]      |
+--------+----------------------------------------------------------------------------------+
|        |                                                                                  |
| Profile|  Profile Photo                                                                   |
| <----  |  ------------------------------------------------------------------------------- |
| Notif. |                                                                                  |
| -----  |  +----------------------------------------------------------------------------+ |
| Secur. |  |                                                                            | |
| -----  |  |  +------------------+                                                      | |
| Privacy|  |  |                  |   Profile Photo                                      | |
|        |  |  |  [Current        |                                                      | |
|        |  |  |   Avatar         |   [Change Photo]    (Remove Photo)                   | |
|        |  |  |   150x150]       |                                                      | |
|        |  |  |                  |   Your profile photo will be visible to team         | |
|        |  |  +------------------+   members across the application.                    | |
|        |  |                                                                            | |
|        |  |  Recommended: Square image, at least 200x200 pixels                        | |
|        |  |  Maximum file size: 5MB | Supported formats: JPG, PNG, GIF                 | |
|        |  |                                                                            | |
|        |  +----------------------------------------------------------------------------+ |
|        |                                                                                  |
|        |  Basic Information                                                               |
|        |  ------------------------------------------------------------------------------- |
|        |  ...                                                                             |
|        |                                                                                  |
+--------+----------------------------------------------------------------------------------+
```

### Image Cropper Dialog (Desktop)

```
+-----------------------------------------------------------------------------------+
| Edit Profile Photo                                                           [X]   |
+-----------------------------------------------------------------------------------+
|                                                                                    |
|  +------------------------------------------------------------------------------+ |
|  |                                                                              | |
|  |  +-----------------------------------------------+  +---------------------+ | |
|  |  |                                               |  |                     | | |
|  |  |                                               |  | Preview             | | |
|  |  |                                               |  |                     | | |
|  |  |         [Image with circular crop             |  | +----------------+  | | |
|  |  |          overlay - drag to reposition]        |  | |                |  | | |
|  |  |                                               |  | |   [Cropped     |  | | |
|  |  |              +---------------+                |  | |    Preview     |  | | |
|  |  |              |               |                |  | |    100x100]    |  | | |
|  |  |              |   Crop Area   |                |  | |                |  | | |
|  |  |              |               |                |  | +----------------+  | | |
|  |  |              +---------------+                |  |                     | | |
|  |  |                                               |  | This is how your    | | |
|  |  |                                               |  | avatar will appear  | | |
|  |  |                                               |  | throughout the app. | | |
|  |  |                                               |  |                     | | |
|  |  +-----------------------------------------------+  +---------------------+ | |
|  |                                                                              | |
|  |  Image Controls:                                                             | |
|  |  -------------------------------------------------------------------------   | |
|  |                                                                              | |
|  |  Zoom:   [-] [-------------------|--------] [+]     1.3x                     | |
|  |                                                                              | |
|  |  Rotation: [-90 deg]  [+90 deg]   Current: 0 deg                             | |
|  |                                                                              | |
|  |  [Flip Horizontal]   [Flip Vertical]   [Reset All]                           | |
|  |                                                                              | |
|  +------------------------------------------------------------------------------+ |
|                                                                                    |
|                                          (Cancel)            [Save Photo]          |
|                                                                                    |
+-----------------------------------------------------------------------------------+
```

### Image Selection with Drag & Drop (Desktop)

```
+-----------------------------------------------------------------------------------+
| Select Profile Photo                                                         [X]   |
+-----------------------------------------------------------------------------------+
|                                                                                    |
|  +------------------------------------------------------------------------------+ |
|  |                                                                              | |
|  |  +-----------------------------------------------------------------------+  | |
|  |  |                                                                       |  | |
|  |  |                                                                       |  | |
|  |  |                   [Image Upload Icon]                                 |  | |
|  |  |                                                                       |  | |
|  |  |              Drag and drop an image here                              |  | |
|  |  |                                                                       |  | |
|  |  |                         or                                            |  | |
|  |  |                                                                       |  | |
|  |  |                   [Browse Files]                                      |  | |
|  |  |                                                                       |  | |
|  |  |                                                                       |  | |
|  |  +-----------------------------------------------------------------------+  | |
|  |                                                                              | |
|  |  Supported formats: JPG, PNG, GIF                                           | |
|  |  Maximum file size: 5MB                                                     | |
|  |  Recommended: Square image, at least 200x200 pixels                         | |
|  |                                                                              | |
|  +------------------------------------------------------------------------------+ |
|                                                                                    |
|                                                               (Cancel)             |
|                                                                                    |
+-----------------------------------------------------------------------------------+
```

### Drag State (Desktop)

```
+-----------------------------------------------------------------------------------+
| Select Profile Photo                                                         [X]   |
+-----------------------------------------------------------------------------------+
|                                                                                    |
|  +------------------------------------------------------------------------------+ |
|  |                                                                              | |
|  |  +- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -+  | |
|  |  |                                                                       |  | |
|  |  |                                                                       |  | |
|  |  |                   [Image Upload Icon]                                 |  | |
|  |  |                                                                       |  | |
|  |  |                   Drop image here                                     |  | |
|  |  |                                                                       |  | |
|  |  |                                                                       |  | |
|  |  |                                                                       |  | |
|  |  |                                                                       |  | |
|  |  +- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -+  | |
|  |  ^ Dashed border, highlighted background                                    | |
|  +------------------------------------------------------------------------------+ |
|                                                                                    |
+-----------------------------------------------------------------------------------+
```

---

## Interaction States

### Loading States

```
IMAGE LOADING (after selection):
+------------------------------------------+
|                                          |
|  +------------------------------------+  |
|  |                                    |  |
|  |    [Spinner]                       |  |
|  |                                    |  |
|  |    Loading image...                |  |
|  |                                    |  |
|  +------------------------------------+  |
|                                          |
+------------------------------------------+

UPLOAD IN PROGRESS:
+------------------------------------------+
|                                          |
|  +------------------------------------+  |
|  |   [Preview of cropped image]       |  |
|  +------------------------------------+  |
|                                          |
|  [==================------] 75%          |
|                                          |
|  Uploading profile photo...              |
|  Please don't close this dialog.         |
|                                          |
|          (Cancel Upload)                 |
|                                          |
+------------------------------------------+

PROCESSING IMAGE:
+------------------------------------------+
|                                          |
|  [Spinner] Processing your image...      |
|                                          |
|  Optimizing for best quality...          |
|                                          |
+------------------------------------------+
```

### Empty States

```
NO IMAGE SELECTED:
+------------------------------------------+
|                                          |
|  +------------------------------------+  |
|  |                                    |  |
|  |     +--------------------+         |  |
|  |     |  [Placeholder      |         |  |
|  |     |   Avatar Icon]     |         |  |
|  |     +--------------------+         |  |
|  |                                    |  |
|  +------------------------------------+  |
|                                          |
|  No profile photo set                    |
|                                          |
|  [Upload Photo]                          |
|                                          |
+------------------------------------------+
```

### Error States

```
FILE TOO LARGE:
+------------------------------------------+
| [!] File too large                        |
|                                          |
| The selected image is 12MB.               |
| Maximum allowed size is 5MB.              |
|                                          |
| Tips:                                     |
| - Use a compressed image format (JPG)     |
| - Reduce image dimensions                 |
| - Use an online image compressor          |
|                                          |
|         [Select Different Image]          |
+------------------------------------------+

INVALID FILE TYPE:
+------------------------------------------+
| [!] Unsupported file format               |
|                                          |
| The selected file is not a valid image.   |
|                                          |
| Supported formats:                        |
| - JPEG (.jpg, .jpeg)                      |
| - PNG (.png)                              |
| - GIF (.gif)                              |
|                                          |
|         [Select Different Image]          |
+------------------------------------------+

UPLOAD FAILED:
+------------------------------------------+
| [!] Upload failed                         |
|                                          |
| There was a problem uploading your        |
| profile photo. Please try again.          |
|                                          |
| Error: Network connection lost            |
|                                          |
|         [Retry]    [Cancel]               |
+------------------------------------------+

IMAGE PROCESSING ERROR:
+------------------------------------------+
| [!] Could not process image               |
|                                          |
| The image could not be cropped.           |
| The file may be corrupted.                |
|                                          |
|         [Select Different Image]          |
+------------------------------------------+
```

### Success States

```
UPLOAD COMPLETE:
+------------------------------------------+
| [checkmark] Profile photo updated         |
|                                          |
| Your new profile photo is now visible     |
| across the application.                   |
|                                          |
| <- Toast notification (3s)               |
+------------------------------------------+

PHOTO REMOVED:
+------------------------------------------+
| [checkmark] Profile photo removed         |
|                                          |
| <- Toast notification (3s)               |
+------------------------------------------+
```

### Remove Confirmation

```
REMOVE PHOTO CONFIRMATION:
+------------------------------------------+
| Remove Profile Photo                [X]   |
+------------------------------------------+
|                                          |
|  Are you sure you want to remove your    |
|  profile photo?                          |
|                                          |
|  You'll be shown with a default avatar   |
|  until you upload a new photo.           |
|                                          |
|            (Cancel)     [Remove]         |
|                                          |
+------------------------------------------+
```

---

## Accessibility Notes

### Focus Order

1. **Profile Settings Page**
   - Tab to "Change Photo" button
   - Tab to "Remove Photo" button (if photo exists)

2. **Image Selection Dialog**
   - Drop zone (focusable)
   - Browse Files button
   - Cancel button

3. **Image Cropper Dialog**
   - Image crop area (for keyboard controls)
   - Zoom slider
   - Rotate buttons (left, right)
   - Flip buttons (horizontal, vertical)
   - Reset button
   - Preview area
   - Cancel button
   - Save Photo button

### Keyboard Navigation

```
DROP ZONE:
- Tab: Focus drop zone
- Enter/Space: Open file picker
- Drag files: Keyboard users can use file picker instead

CROP AREA:
- Arrow keys: Move image position (small increments)
- Shift + Arrow: Move image position (large increments)
- +/-: Zoom in/out
- R: Rotate clockwise
- Shift + R: Rotate counter-clockwise
- H: Flip horizontal
- V: Flip vertical
- Escape: Reset crop

ZOOM SLIDER:
- Tab: Focus slider
- Left/Right arrow: Adjust zoom
- Home: Minimum zoom
- End: Maximum zoom

BUTTONS:
- Tab: Move between buttons
- Enter/Space: Activate button
```

### ARIA Requirements

```html
<!-- Profile Photo Section -->
<section aria-labelledby="profile-photo-heading">
  <h2 id="profile-photo-heading">Profile Photo</h2>

  <img
    src="/avatar.jpg"
    alt="Current profile photo for John Smith"
    role="img"
  />

  <button
    aria-label="Change profile photo"
    aria-haspopup="dialog"
  >
    Change Photo
  </button>

  <button
    aria-label="Remove profile photo"
    aria-haspopup="dialog"
  >
    Remove Photo
  </button>
</section>

<!-- File Drop Zone -->
<div
  role="button"
  tabindex="0"
  aria-label="Drop zone for image upload. Press Enter to browse files or drag and drop an image."
  aria-dropeffect="copy"
>
  Drag and drop an image here or press Enter to browse
</div>

<!-- Image Cropper -->
<div
  role="application"
  aria-label="Image cropper. Use arrow keys to reposition, plus and minus to zoom."
>
  <div
    role="img"
    aria-label="Image being cropped"
    tabindex="0"
    aria-describedby="crop-instructions"
  >
    <!-- Image canvas -->
  </div>
  <p id="crop-instructions" class="sr-only">
    Use arrow keys to move the image. Press plus or minus to zoom.
    Press R to rotate. Press Escape to reset.
  </p>
</div>

<!-- Zoom Slider -->
<label for="zoom-slider">Zoom</label>
<input
  id="zoom-slider"
  type="range"
  role="slider"
  min="1"
  max="3"
  step="0.1"
  aria-valuemin="1"
  aria-valuemax="3"
  aria-valuenow="1.3"
  aria-valuetext="1.3x zoom"
/>

<!-- Preview -->
<div
  role="img"
  aria-label="Preview of cropped profile photo"
>
  <!-- Preview canvas -->
</div>

<!-- Upload Progress -->
<div
  role="progressbar"
  aria-valuenow="75"
  aria-valuemin="0"
  aria-valuemax="100"
  aria-label="Upload progress: 75%"
>
  [==================------]
</div>
```

### Screen Reader Announcements

- File selected: "Image selected: photo.jpg, 2.5 MB"
- Invalid file: "Error: File too large. Maximum size is 5 MB"
- Crop area moved: "Image repositioned"
- Zoom changed: "Zoom level: 1.3x"
- Rotation applied: "Image rotated 90 degrees clockwise"
- Upload started: "Uploading profile photo"
- Upload progress: "Upload progress: 75%"
- Upload complete: "Profile photo uploaded successfully"
- Upload failed: "Error: Upload failed. Retry button available"

---

## Animation Choreography

### Dialog Animations

```
DIALOG OPEN:
- Duration: 250ms
- Easing: ease-out
- Backdrop: opacity 0 -> 0.5
- Dialog: scale(0.95) -> scale(1), opacity 0 -> 1

DIALOG CLOSE:
- Duration: 200ms
- Easing: ease-in
- Reverse of open
```

### Crop Area Interactions

```
IMAGE DRAG:
- Duration: instant (follows cursor)
- Transform: translate to new position
- Smooth momentum on release

ZOOM:
- Duration: 150ms
- Easing: ease-out
- Scale: smooth transition to new zoom level
- Maintain center point

ROTATION:
- Duration: 300ms
- Easing: ease-in-out
- Rotation: smooth 90-degree turn
- Slight bounce at end
```

### Upload Progress

```
PROGRESS BAR:
- Duration: continuous
- Width: animate to current percentage
- Color: blue during upload

COMPLETION:
- Duration: 300ms
- Color: blue -> green
- Checkmark: scale bounce appear

FAILURE:
- Duration: 200ms
- Color: blue -> red
- Shake animation (2 cycles)
```

### Drop Zone States

```
DRAG ENTER:
- Duration: 150ms
- Border: dashed, color change to accent
- Background: subtle highlight
- Scale: 1 -> 1.02

DRAG LEAVE:
- Duration: 150ms
- Reverse of drag enter

DROP:
- Duration: 200ms
- Flash highlight
- Scale: 1.02 -> 1
```

### Preview Update

```
PREVIEW CHANGE:
- Duration: 200ms
- Easing: ease-out
- Old preview: fade out
- New preview: fade in
- Crossfade for smooth transition
```

---

## Component Props Interfaces

```typescript
// Avatar Upload Component (main)
interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl?: string;
  onUploadComplete: (url: string) => void;
  onRemove?: () => void;
}

// Image Cropper Dialog
interface ImageCropperDialogProps {
  isOpen: boolean;
  imageFile: File | null;
  onClose: () => void;
  onSave: (croppedImage: Blob) => Promise<void>;
  aspectRatio?: number;  // default: 1 (square)
  cropShape?: 'circle' | 'square';  // default: 'circle'
  maxOutputSize?: number;  // default: 500 (500x500)
}

// Image Cropper State
interface CropperState {
  image: string;
  crop: { x: number; y: number };
  zoom: number;
  rotation: number;
  flipHorizontal: boolean;
  flipVertical: boolean;
}

// Cropper Controls
interface CropperControlsProps {
  zoom: number;
  rotation: number;
  onZoomChange: (zoom: number) => void;
  onRotateLeft: () => void;
  onRotateRight: () => void;
  onFlipHorizontal: () => void;
  onFlipVertical: () => void;
  onReset: () => void;
}

// Image Drop Zone
interface ImageDropZoneProps {
  onFileSelect: (file: File) => void;
  acceptedTypes?: string[];  // default: ['image/jpeg', 'image/png', 'image/gif']
  maxSize?: number;  // in bytes, default: 5 * 1024 * 1024 (5MB)
  onError: (error: ImageUploadError) => void;
}

// Upload Error Types
interface ImageUploadError {
  type: 'file_too_large' | 'invalid_type' | 'upload_failed' | 'processing_error';
  message: string;
  details?: {
    fileSize?: number;
    maxSize?: number;
    fileType?: string;
    allowedTypes?: string[];
  };
}

// Upload Progress
interface UploadProgressProps {
  progress: number;  // 0-100
  isUploading: boolean;
  onCancel: () => void;
}

// Preview Component
interface CroppedPreviewProps {
  croppedImage: string | null;
  size?: number;  // display size, default: 100
  shape?: 'circle' | 'square';
}

// Remove Confirmation Dialog
interface RemoveAvatarDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

// Avatar Display Component
interface AvatarDisplayProps {
  avatarUrl?: string;
  userName: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';  // 32, 48, 80, 120 px
  showEditButton?: boolean;
  onEditClick?: () => void;
}

// Hook for cropper logic
interface UseCropperOptions {
  imageFile: File | null;
  aspectRatio: number;
  maxOutputSize: number;
}

interface UseCropperReturn {
  imageUrl: string | null;
  crop: { x: number; y: number };
  zoom: number;
  rotation: number;
  setCrop: (crop: { x: number; y: number }) => void;
  setZoom: (zoom: number) => void;
  setRotation: (rotation: number) => void;
  flipHorizontal: () => void;
  flipVertical: () => void;
  reset: () => void;
  getCroppedImage: () => Promise<Blob>;
}
```

---

## Component Files

| File | Purpose |
|------|---------|
| `src/components/domain/users/avatar-upload.tsx` | Main avatar upload section |
| `src/components/domain/users/image-cropper-dialog.tsx` | Cropper dialog |
| `src/components/domain/users/image-cropper.tsx` | Cropper canvas component |
| `src/components/domain/users/cropper-controls.tsx` | Zoom/rotation controls |
| `src/components/domain/users/image-drop-zone.tsx` | Drag and drop area |
| `src/components/domain/users/cropped-preview.tsx` | Preview component |
| `src/components/domain/users/upload-progress.tsx` | Progress indicator |
| `src/components/domain/users/remove-avatar-dialog.tsx` | Remove confirmation |
| `src/components/shared/avatar-display.tsx` | Avatar display component |
| `src/hooks/use-image-cropper.ts` | Cropper logic hook |
| `src/hooks/use-file-upload.ts` | File upload hook |
| `src/utils/image-processing.ts` | Image manipulation utilities |
| `src/server/functions/users/upload-avatar.ts` | Upload server function |
