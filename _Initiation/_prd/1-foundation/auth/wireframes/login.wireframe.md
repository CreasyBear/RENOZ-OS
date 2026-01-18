# Login Screen Wireframe

**Screen:** Authentication / Login
**Route:** `/login`
**Domain:** Foundation
**User Role:** Unauthenticated
**Status:** Draft
**Last Updated:** 2026-01-10

---

## Layout Overview

### Desktop (1024px+)
```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│                                                                │
│                    ┌──────────────────────┐                   │
│                    │                      │                   │
│                    │   [Renoz Energy]     │                   │
│                    │      Logo            │                   │
│                    │                      │                   │
│                    ├──────────────────────┤                   │
│                    │                      │                   │
│                    │  Welcome back        │                   │
│                    │  Sign in to your     │                   │
│                    │  account             │                   │
│                    │                      │                   │
│                    ├──────────────────────┤                   │
│                    │                      │                   │
│                    │  Email address       │                   │
│                    │  [____________]      │                   │
│                    │                      │                   │
│                    │  Password            │                   │
│                    │  [____________] [👁]  │                   │
│                    │                      │                   │
│                    │  ☐ Remember me       │                   │
│                    │                      │                   │
│                    │  [    Sign in    ]   │                   │
│                    │                      │                   │
│                    │  Forgot password?    │                   │
│                    │                      │                   │
│                    └──────────────────────┘                   │
│                                                                │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Mobile (< 768px)
```
┌──────────────────────┐
│                      │
│   [Renoz Energy]     │
│      Logo            │
│                      │
├──────────────────────┤
│                      │
│  Welcome back        │
│  Sign in to your     │
│  account             │
│                      │
├──────────────────────┤
│                      │
│  Email address       │
│  [______________]    │
│                      │
│  Password            │
│  [______________][👁] │
│                      │
│  ☐ Remember me       │
│                      │
│  [    Sign in    ]   │
│                      │
│  Forgot password?    │
│                      │
└──────────────────────┘
```

---

## Component Specifications

### 1. Logo Section
- **Component:** Brand logo with company name
- **Specifications:**
  - Renoz Energy logo (SVG preferred)
  - Height: 48px (desktop), 40px (mobile)
  - Centered alignment
  - Margin bottom: 32px

### 2. Welcome Header
- **Component:** Text heading and subheading
- **Specifications:**
  - H1: "Welcome back" (24px, semi-bold)
  - Subtitle: "Sign in to your account" (14px, regular)
  - Text alignment: Center
  - Color: Neutral-900 (heading), Neutral-600 (subtitle)
  - Margin bottom: 24px

### 3. Email Input Field
- **Component:** Text input with label
- **Specifications:**
  - Label: "Email address" (14px, medium)
  - Input type: email
  - Placeholder: "you@example.com"
  - Width: 100% (max-width: 384px)
  - Height: 40px
  - Border: 1px solid Neutral-300
  - Border radius: 6px
  - Focus state: Border Blue-500, shadow
  - Error state: Border Red-500
  - Required field indicator: *
  - Autocomplete: email

### 4. Password Input Field
- **Component:** Password input with visibility toggle
- **Specifications:**
  - Label: "Password" (14px, medium)
  - Input type: password (toggleable to text)
  - Placeholder: "Enter your password"
  - Width: 100% (max-width: 384px)
  - Height: 40px
  - Border: 1px solid Neutral-300
  - Border radius: 6px
  - Focus state: Border Blue-500, shadow
  - Error state: Border Red-500
  - Required field indicator: *
  - Autocomplete: current-password
  - **Toggle button:**
    - Icon: Eye (visible) / Eye-off (hidden)
    - Position: Absolute right, vertically centered
    - Size: 20px
    - Color: Neutral-500
    - Hover: Neutral-700

### 5. Remember Me Checkbox
- **Component:** Checkbox with label
- **Specifications:**
  - Checkbox size: 16px
  - Label: "Remember me" (14px, regular)
  - Color: Neutral-700
  - Margin: 16px 0
  - Alignment: Left

### 6. Sign In Button
- **Component:** Primary action button
- **Specifications:**
  - Text: "Sign in"
  - Width: 100%
  - Height: 40px
  - Background: Blue-600
  - Text color: White (14px, medium)
  - Border radius: 6px
  - Hover: Blue-700
  - Active: Blue-800
  - Disabled: Blue-300 (non-interactive)
  - Loading state: Spinner + "Signing in..."
  - Margin top: 16px

### 7. Forgot Password Link
- **Component:** Text link
- **Specifications:**
  - Text: "Forgot password?"
  - Font size: 14px, medium
  - Color: Blue-600
  - Text alignment: Center
  - Margin top: 16px
  - Hover: Blue-700, underline
  - Route: `/forgot-password`

### 8. Error Message
- **Component:** Alert banner (conditional)
- **Specifications:**
  - Background: Red-50
  - Border: 1px solid Red-200
  - Border radius: 6px
  - Padding: 12px 16px
  - Icon: Alert circle (Red-500)
  - Text: Error message (14px, Red-700)
  - Position: Above form (after header)
  - Margin bottom: 16px
  - Dismissible: Optional close button

---

## Interaction States

### Default State
- All fields empty
- "Sign in" button enabled
- No error messages visible

### Input Focus States
- Email field focused:
  - Border: Blue-500
  - Box shadow: 0 0 0 3px rgba(59, 130, 246, 0.1)
- Password field focused:
  - Border: Blue-500
  - Box shadow: 0 0 0 3px rgba(59, 130, 246, 0.1)

### Validation States

#### Empty Form Submission
- Show inline errors below empty required fields
- Error text: "Email is required" / "Password is required"
- Error color: Red-600 (14px)
- Prevent form submission

#### Invalid Email Format
- Error text: "Please enter a valid email address"
- Show after blur or submission
- Border: Red-500

#### Invalid Credentials (API Error)
- Show error banner at top of form
- Message: "Invalid email or password. Please try again."
- Icon: Alert circle
- Color: Red-700 on Red-50 background
- Keep entered email (clear password for security)

### Loading State
- Button shows spinner icon
- Button text: "Signing in..."
- Button disabled (non-interactive)
- Form fields disabled
- Cursor: wait

### Success State
- Redirect to `/dashboard` (or last visited route)
- No visual confirmation on login screen
- Optional: Brief "Success!" toast during redirect

### Password Visibility Toggle
- Default: Password hidden (dots/asterisks)
- Click eye icon: Show plain text
- Icon changes: Eye → Eye-off
- Tooltip: "Show password" / "Hide password"

---

## Accessibility Requirements

### Keyboard Navigation
- Tab order: Email → Password → Remember me → Sign in → Forgot password
- Enter key: Submit form (from any input field)
- Spacebar: Toggle checkbox, activate buttons
- Escape: Clear error banner (if dismissible)

### Screen Reader Support
- Form landmark: `<form role="form" aria-label="Sign in form">`
- Email input: `aria-label="Email address" aria-required="true"`
- Password input: `aria-label="Password" aria-required="true"`
- Error messages: `aria-live="polite" role="alert"`
- Password toggle: `aria-label="Toggle password visibility"`
- Loading state: `aria-busy="true"` on form

### Visual Indicators
- Focus outlines: 2px solid Blue-500
- Error states: Red border + icon + text
- Required fields: Asterisk + aria-required
- Color contrast: WCAG AA minimum (4.5:1 for text)

### Error Announcements
- Announce validation errors to screen readers
- Use `aria-describedby` to link errors to inputs
- Preserve error messages until corrected

---

## Responsive Behavior

### Desktop (1024px+)
- Login card: Centered, max-width 384px
- Card shadow: Medium elevation
- Background: Neutral-50 or subtle gradient
- Card padding: 48px 32px

### Tablet (768px - 1023px)
- Login card: Centered, max-width 384px
- Card padding: 40px 24px
- Same layout as desktop

### Mobile (< 768px)
- Login card: Full width with 16px margin
- Card padding: 32px 20px
- Logo slightly smaller (40px)
- Font sizes: Maintain readability
- Touch targets: Minimum 44px height

---

## User Flows

### Happy Path
1. User navigates to `/login`
2. User enters email address
3. User enters password
4. User clicks "Sign in"
5. Loading state shown
6. Authentication succeeds
7. Redirect to `/dashboard`

### Error Path: Invalid Credentials
1. User enters incorrect email/password
2. User clicks "Sign in"
3. Loading state shown
4. API returns 401 error
5. Error banner appears
6. Email retained, password cleared
7. Focus returns to password field

### Forgot Password Flow
1. User clicks "Forgot password?"
2. Navigate to `/forgot-password`
3. User enters email
4. Password reset email sent

### Remember Me Flow
1. User checks "Remember me"
2. After successful login, set extended session (30 days)
3. User can return without re-authentication

---

## Edge Cases

### Already Authenticated
- Redirect to `/dashboard` on route access
- Don't show login form

### Session Expired
- Show banner: "Your session has expired. Please sign in again."
- Pre-fill email if available from expired session
- Auto-focus password field

### Rate Limiting (Too Many Attempts)
- Show error: "Too many login attempts. Please try again in 15 minutes."
- Disable form temporarily
- Show countdown timer

### Network Error
- Show error: "Unable to connect. Please check your internet connection."
- Allow retry

### Password Reset Token from Email
- Query param: `/login?reset=success`
- Show success banner: "Password reset successful. Please sign in with your new password."

---

## Technical Notes

### Authentication
- Backend: Supabase Auth
- Method: Email/password
- Session storage: Local storage (if "Remember me") or Session storage
- CSRF protection: Required

### Security
- Password field: Never autocomplete on public devices
- Rate limiting: 5 attempts per 15 minutes per IP
- Password requirements: Enforced on signup, validated on backend
- HTTPS only: Enforce in production

### Analytics Events
- `login_page_viewed`
- `login_attempted`
- `login_succeeded`
- `login_failed` (with error type)
- `forgot_password_clicked`

### Error Messages
- Generic for security: "Invalid email or password" (don't specify which)
- Avoid: "Email not found" or "Incorrect password"

---

## Design Tokens Reference

### Colors
- Primary action: Blue-600 (#2563EB)
- Error: Red-600 (#DC2626)
- Success: Green-600 (#16A34A)
- Neutral text: Neutral-900 (#171717)
- Subtle text: Neutral-600 (#525252)
- Border: Neutral-300 (#D4D4D4)

### Typography
- Heading: 24px / 1.5 / 600
- Body: 14px / 1.5 / 400
- Label: 14px / 1.5 / 500

### Spacing
- Form field gap: 16px
- Section gap: 24px
- Card padding: 48px (desktop), 32px (mobile)

### Borders
- Input: 1px solid
- Radius: 6px
- Focus ring: 3px rgba shadow

---

## Related Wireframes
- [Forgot Password](./forgot-password.wireframe.md) (to be created)
- [Dashboard](../dashboard/overview.wireframe.md) (post-login)
- [Password Reset](./password-reset.wireframe.md) (to be created)

---

## Notes
- No signup link required (B2B - users created by admin)
- No social login (email/password only)
- No organization selection (single org: Renoz Energy)
- Mobile-first design approach
- Future: Consider 2FA/MFA support
