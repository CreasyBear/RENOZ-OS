# Wireframe: DOM-USER-007c - User Onboarding UI

## Story Reference

- **Story ID**: DOM-USER-007c
- **Name**: User Onboarding UI
- **PRD**: memory-bank/prd/domains/users.prd.json
- **Type**: UI Component
- **Component Type**: Dashboard Card with checklist and ProgressBar

## Overview

Display onboarding checklist for new users. Includes onboarding checklist Card component on dashboard, steps with Checkbox indicators (complete profile, set preferences, view tutorial), progress indicator showing completion percentage, dismiss/skip button with confirmation, links to tutorial videos, and admin view of user onboarding status.

## UI Patterns (Reference Implementation)

### Card
- **Pattern**: RE-UI Card
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`
- **Features**:
  - Onboarding checklist card on dashboard
  - Step items with completion checkmarks
  - Dismissible card with confirmation

### Progress
- **Pattern**: RE-UI Progress
- **Reference**: `_reference/.reui-reference/registry/default/ui/progress.tsx`
- **Features**:
  - Completion percentage bar (e.g., 2/4 steps = 50%)
  - Visual progress indicator with label
  - Animated updates when steps complete

### Checkbox
- **Pattern**: RE-UI Checkbox
- **Reference**: `_reference/.reui-reference/registry/default/ui/checkbox.tsx`
- **Features**:
  - Step completion indicators
  - Read-only checkboxes for completed steps
  - Interactive checkboxes for manual completion

### Dialog
- **Pattern**: RE-UI Dialog
- **Reference**: `_reference/.reui-reference/registry/default/ui/dialog.tsx`
- **Features**:
  - Skip onboarding confirmation dialog
  - Tutorial video player dialog
  - Step detail view with instructions

### Switch
- **Pattern**: RE-UI Switch
- **Reference**: `_reference/.reui-reference/registry/default/ui/switch.tsx`
- **Features**:
  - "Don't show onboarding again" toggle
  - Notification preferences in onboarding steps
  - Theme selection switches

---

## Dependencies

> **IMPORTANT**: This wireframe requires backend stories to complete first.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Required** | `userOnboarding` | NOT CREATED |
| **Server Functions Required** | `getOnboardingStatus`, `completeOnboardingStep`, `skipOnboardingStep`, `dismissOnboarding`, `resetOnboarding`, `sendOnboardingReminder` | NOT CREATED |
| **PRD Stories (Must Complete First)** | DOM-USER-007a, DOM-USER-007b | PENDING |

### Existing Schema Available
- `users` in `renoz-v2/lib/schema/users.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery/battery installation
- Onboarding guides new sales reps and admin staff through CRM setup
- Steps tailored to Renoz workflows: customer management, quoting, order processing
- Admin can monitor team onboarding progress and send reminders

---

## Mobile Wireframe (375px)

### Dashboard - Onboarding Checklist (Mobile Full-Width)

```
+----------------------------------------+
| Dashboard                      [Bell]  |
+----------------------------------------+
|                                        |
| +------------------------------------+ |
| | Welcome to Renoz CRM!              | |
| | ---------------------------------- | |
| |                                    | |
| | Complete these steps to get        | |
| | started with your account.         | |
| |                                    | |
| | [===========-------] 2/4 complete  | |
| |                                    | |
| | +--------------------------------+ | |
| | | [x] Create your account        | | |
| | |     Welcome aboard!            | | |
| | +--------------------------------+ | |
| |                                    | |
| | +--------------------------------+ | |
| | | [x] Complete your profile      | | |
| | |     Add your name and photo    | | |
| | +--------------------------------+ | |
| |                                    | |
| | +--------------------------------+ | |
| | | [ ] Set your preferences  [>]  | | |
| | |     Customize notifications    | | |
| | +--------------------------------+ | |
| |                                    | |
| | +--------------------------------+ | |
| | | [ ] Watch getting started [>]  | | |
| | |     5 min video tutorial       | | |
| | +--------------------------------+ | |
| |                                    | |
| | (Skip for now)                     | |
| +------------------------------------+ |
|                                        |
| Today's Tasks                          |
| --------------------------------       |
| ...                                    |
|                                        |
+----------------------------------------+
```

### Onboarding Step Expanded (Mobile)

```
+----------------------------------------+
| <- Dashboard                           |
+----------------------------------------+
| Set Your Preferences                   |
+----------------------------------------+
|                                        |
| +------------------------------------+ |
| | Notification Settings              | |
| | ---------------------------------- | |
| |                                    | |
| | Email Notifications                | |
| | +--------------------------------+ | |
| | | [x] Order updates              | | |
| | | [x] Customer activity          | | |
| | | [ ] Daily digest               | | |
| | | [ ] Weekly reports             | | |
| | +--------------------------------+ | |
| |                                    | |
| | Push Notifications                 | |
| | +--------------------------------+ | |
| | | [x] Urgent alerts only         | | |
| | | [ ] All activity               | | |
| | +--------------------------------+ | |
| |                                    | |
| +------------------------------------+ |
|                                        |
| +------------------------------------+ |
| | Display Settings                   | |
| | ---------------------------------- | |
| |                                    | |
| | Theme                              | |
| | +--------------------------------+ | |
| | | (o) Light   ( ) Dark   ( ) Auto| | |
| | +--------------------------------+ | |
| |                                    | |
| | Dashboard Layout                   | |
| | +--------------------------------+ | |
| | | (o) Compact   ( ) Detailed     | | |
| | +--------------------------------+ | |
| |                                    | |
| +------------------------------------+ |
|                                        |
+----------------------------------------+
|     (Skip)     [Mark as Complete]      |
+----------------------------------------+
```

### Tutorial Video (Mobile)

```
+----------------------------------------+
| <- Dashboard                           |
+----------------------------------------+
| Getting Started Tutorial               |
+----------------------------------------+
|                                        |
| +------------------------------------+ |
| | +--------------------------------+ | |
| | |                                | | |
| | |      [Video Player]            | | |
| | |                                | | |
| | |         [Play]                 | | |
| | |                                | | |
| | +--------------------------------+ | |
| | Duration: 5 minutes               | |
| +------------------------------------+ |
|                                        |
| Video Chapters:                        |
|                                        |
| +------------------------------------+ |
| | [x] 1. Dashboard overview (1:30)  | | |
| +------------------------------------+ |
| | [ ] 2. Managing customers (1:15)  | | |
| +------------------------------------+ |
| | [ ] 3. Creating orders (1:45)     | | |
| +------------------------------------+ |
| | [ ] 4. Tips and shortcuts (0:30)  | | |
| +------------------------------------+ |
|                                        |
| Watch at least 80% to complete        |
|                                        |
+----------------------------------------+
|     (Skip Tutorial)   [Mark Complete]  |
+----------------------------------------+
```

### Skip/Dismiss Confirmation (Mobile)

```
+----------------------------------------+
| Skip Onboarding                  [X]   |
+----------------------------------------+
|                                        |
| Are you sure you want to skip the      |
| remaining onboarding steps?            |
|                                        |
| --------------------------------       |
|                                        |
| Incomplete steps:                      |
| - Set your preferences                 |
| - Watch getting started tutorial       |
|                                        |
| --------------------------------       |
|                                        |
| You can always complete these later    |
| from your profile settings.            |
|                                        |
| [ ] Don't show onboarding again        |
|                                        |
+----------------------------------------+
|     (Continue Onboarding)  [Skip]      |
+----------------------------------------+
```

### Onboarding Complete (Mobile)

```
+----------------------------------------+
| Dashboard                      [Bell]  |
+----------------------------------------+
|                                        |
| +------------------------------------+ |
| |                                    | |
| |        [checkmark icon]            | |
| |                                    | |
| |     Onboarding Complete!           | |
| |                                    | |
| | You're all set up and ready to     | |
| | start using Renoz CRM.             | |
| |                                    | |
| | [====================] 4/4 done    | |
| |                                    | |
| |        [Get Started]               | |
| |                                    | |
| | (View completed steps)             | |
| |                                    | |
| +------------------------------------+ |
|                                        |
| Today's Tasks                          |
| --------------------------------       |
| ...                                    |
|                                        |
+----------------------------------------+
```

---

## Tablet Wireframe (768px)

### Dashboard - Onboarding Widget (Tablet Sidebar)

```
+----------------------------------------------------------------+
| Dashboard                                              [Bell]   |
+----------------------------------------------------------------+
|                                                                 |
| +-------------------------------------------+ +--------------+  |
| |                                           | |              |  |
| | Today's Overview                          | | Onboarding   |  |
| | ----------------------------------------- | | ------------ |  |
| |                                           | |              |  |
| | +------------+ +------------+ +----------+| | 2/4 complete |  |
| | | Open Orders| | Pending    | | Revenue  || |              |  |
| | | 12         | | 5          | | $45,200  || | [========--] |  |
| | +------------+ +------------+ +----------+| |              |  |
| |                                           | | [x] Account  |  |
| | Recent Activity                           | | [x] Profile  |  |
| | -----------------------------------------+| | [ ] Prefs  > |  |
| |                                           | | [ ] Tutorial>|  |
| | +---------------------------------------+ | |              |  |
| | | John created order #ORD-1234         | | | (Skip)       |  |
| | | Sarah updated customer Acme Corp     | | |              |  |
| | | Order #ORD-1230 shipped              | | +--------------+  |
| | +---------------------------------------+ |                   |
| |                                           |                   |
| +-------------------------------------------+                   |
|                                                                 |
+----------------------------------------------------------------+
```

### Onboarding Checklist Expanded (Tablet)

```
+----------------------------------------------------------------+
| Dashboard                                              [Bell]   |
+----------------------------------------------------------------+
|                                                                 |
| Welcome to Renoz CRM!                                           |
| ----------------------------------------------------------------|
|                                                                 |
| Complete these steps to get the most out of your account.       |
|                                                                 |
| [================---------] 2 of 4 steps complete (50%)         |
|                                                                 |
| +-------------------------------------------------------------+ |
| |                                                             | |
| | +-------------------------------------------------------+   | |
| | | [x] Create your account                          Done |   | |
| | |     Your account has been created successfully.        |   | |
| | +-------------------------------------------------------+   | |
| |                                                             | |
| | +-------------------------------------------------------+   | |
| | | [x] Complete your profile                        Done |   | |
| | |     Add your name, photo, and contact information.    |   | |
| | |     Completed on Jan 10, 2026                         |   | |
| | +-------------------------------------------------------+   | |
| |                                                             | |
| | +-------------------------------------------------------+   | |
| | | [ ] Set your preferences                             >|   | |
| | |     Customize notifications, theme, and display.       |   | |
| | |     Takes about 2 minutes                              |   | |
| | +-------------------------------------------------------+   | |
| |                                                             | |
| | +-------------------------------------------------------+   | |
| | | [ ] Watch getting started tutorial                   >|   | |
| | |     Learn the basics with a 5-minute video.           |   | |
| | |     Or read the quick start guide                     |   | |
| | +-------------------------------------------------------+   | |
| |                                                             | |
| +-------------------------------------------------------------+ |
|                                                                 |
|                                              (Skip for now)     |
|                                                                 |
+----------------------------------------------------------------+
```

### Admin View - User Onboarding Status (Tablet)

```
+----------------------------------------------------------------+
| User Detail: John Smith                                         |
+----------------------------------------------------------------+
|                                                                 |
| [Overview] [Activity] [Permissions] [Onboarding]                |
|                                     ^^^^^^^^^^^^^               |
+----------------------------------------------------------------+
|                                                                 |
| Onboarding Progress                                             |
| ----------------------------------------------------------------|
|                                                                 |
| [================---------] 2 of 4 steps complete (50%)         |
|                                                                 |
| +-------------------------------------------------------------+ |
| | Step                    | Status      | Completed           | |
| +-------------------------------------------------------------+ |
| | Create account          | [ok] Done   | Jan 8, 2026 10:00  | |
| | Complete profile        | [ok] Done   | Jan 8, 2026 10:15  | |
| | Set preferences         | [ ] Pending | -                   | |
| | Watch tutorial          | [ ] Pending | -                   | |
| +-------------------------------------------------------------+ |
|                                                                 |
| User joined: January 8, 2026 (2 days ago)                       |
| Days to complete onboarding: -                                  |
|                                                                 |
| Actions:                                                        |
| [Send Reminder Email]  [Reset Onboarding]  [Mark as Complete]   |
|                                                                 |
+----------------------------------------------------------------+
```

---

## Desktop Wireframe (1280px+)

### Dashboard - Onboarding Widget (Desktop Grid)

```
+-------------------------------------------------------------------------------------------+
| [Logo] Renoz CRM       Dashboard | Customers | Orders | Settings       [Bell] [User]      |
+--------+----------------------------------------------------------------------------------+
|        |                                                                                  |
| Dash   |  Welcome back, John!                                          January 10, 2026   |
| <----  |  ------------------------------------------------------------------------------- |
| Custom |                                                                                  |
| -----  |  +------------------------------------------+ +-------------------------------+  |
| Orders |  |                                          | |                               |  |
| -----  |  | Today's Overview                         | | Getting Started               |  |
| Jobs   |  | ---------------------------------------- | | ----------------------------- |  |
|        |  |                                          | |                               |  |
|        |  | +----------+ +----------+ +----------+   | | [============----] 2/4        |  |
|        |  | | Open     | | Pending  | | Revenue  |   | |                               |  |
|        |  | | Orders   | | Tasks    | | (Today)  |   | | [x] Create account            |  |
|        |  | | 12       | | 5        | | $3,450   |   | |     Done                      |  |
|        |  | +----------+ +----------+ +----------+   | |                               |  |
|        |  |                                          | | [x] Complete profile          |  |
|        |  +------------------------------------------+ |     Done                      |  |
|        |                                               |                               |  |
|        |  +------------------------------------------+ | [ ] Set preferences      [>]  |  |
|        |  |                                          | |     ~2 minutes               |  |
|        |  | Recent Activity                          | |                               |  |
|        |  | ---------------------------------------- | | [ ] Watch tutorial       [>]  |  |
|        |  | John created order #ORD-1234 - 2h ago   | |     5 min video               |  |
|        |  | Sarah updated Acme Corp - 3h ago        | |                               |  |
|        |  | Order #ORD-1230 shipped - 5h ago        | | (Skip for now)                |  |
|        |  |                                          | |                               |  |
|        |  +------------------------------------------+ +-------------------------------+  |
|        |                                                                                  |
+--------+----------------------------------------------------------------------------------+
```

### Onboarding Checklist Full View (Desktop)

```
+-------------------------------------------------------------------------------------------+
| Getting Started with Renoz CRM                                                            |
+-------------------------------------------------------------------------------------------+
|                                                                                           |
|  Complete these steps to get the most out of your account.                                |
|                                                                                           |
|  +-------------------------------------------------------------------------------------+ |
|  |                                                                                     | |
|  | [===============================-----------------] 2 of 4 steps complete (50%)      | |
|  |                                                                                     | |
|  +-------------------------------------------------------------------------------------+ |
|                                                                                           |
|  +-------------------------------------------+ +-------------------------------------+   |
|  |                                           | |                                     |   |
|  | Onboarding Steps                          | | Current Step                        |   |
|  | ----------------------------------------- | | ----------------------------------- |   |
|  |                                           | |                                     |   |
|  | +---------------------------------------+ | | Set Your Preferences                |   |
|  | | [checkmark] Create your account      | | |                                     |   |
|  | |             Completed Jan 8, 10:00   | | | Customize your Renoz CRM experience |   |
|  | +---------------------------------------+ | | by setting your notification        |   |
|  |                                           | | preferences and display options.    |   |
|  | +---------------------------------------+ | |                                     |   |
|  | | [checkmark] Complete your profile    | | | Time to complete: ~2 minutes        |   |
|  | |             Completed Jan 8, 10:15   | | |                                     |   |
|  | +---------------------------------------+ | | What you'll set up:                 |   |
|  |                                           | | - Email notification preferences    |   |
|  | +---------------------------------------+ | | - Push notification settings        |   |
|  | | [o] Set your preferences    <- focus | | | - Display theme (light/dark)        |   |
|  | |     ~2 minutes                       | | | - Dashboard layout options          |   |
|  | +---------------------------------------+ | |                                     |   |
|  |                                           | |        [Start This Step]            |   |
|  | +---------------------------------------+ | |                                     |   |
|  | | [ ] Watch getting started tutorial   | | | Or: (Skip this step)                |   |
|  | |     5 min video                      | | |                                     |   |
|  | +---------------------------------------+ | +-------------------------------------+   |
|  |                                           |                                           |
|  +-------------------------------------------+                                           |
|                                                                                           |
|                                                          (Skip all remaining)             |
|                                                                                           |
+-------------------------------------------------------------------------------------------+
```

### Admin View - User Onboarding Status (Desktop)

```
+-------------------------------------------------------------------------------------------+
| User Detail: John Smith                                                                   |
+-------------------------------------------------------------------------------------------+
|                                                                                           |
|  +-------------------------------------------------------------------------------------+ |
|  |  [Overview]    [Activity]    [Permissions]    [Groups]    [Onboarding]             | |
|  |                                                           ^^^^^^^^^^^              | |
|  +-------------------------------------------------------------------------------------+ |
|                                                                                           |
|  Onboarding Progress for John Smith                                                       |
|  -----------------------------------------------------------------------------------      |
|                                                                                           |
|  +-------------------------------------------------------------------------------------+ |
|  |                                                                                     | |
|  | [===============================-----------------] 2 of 4 steps complete (50%)      | |
|  |                                                                                     | |
|  +-------------------------------------------------------------------------------------+ |
|                                                                                           |
|  +-------------------------------------------------------------------------------------+ |
|  |                                                                                     | |
|  | +-------------------------------------------------------------------------------+   | |
|  | | Step                    | Status      | Completed On        | Time Spent     |   | |
|  | +-------------------------------------------------------------------------------+   | |
|  | | Create account          | [ok] Done   | Jan 8, 2026 10:00   | -              |   | |
|  | +-------------------------------------------------------------------------------+   | |
|  | | Complete profile        | [ok] Done   | Jan 8, 2026 10:15   | 15 min         |   | |
|  | +-------------------------------------------------------------------------------+   | |
|  | | Set preferences         | [ ] Pending | -                   | -              |   | |
|  | +-------------------------------------------------------------------------------+   | |
|  | | Watch tutorial          | [ ] Pending | -                   | -              |   | |
|  | +-------------------------------------------------------------------------------+   | |
|  |                                                                                     | |
|  +-------------------------------------------------------------------------------------+ |
|                                                                                           |
|  +-------------------------------------------+ +-------------------------------------+   |
|  |                                           | |                                     |   |
|  | Stats                                     | | Admin Actions                       |   |
|  | ----------------------------------------- | | ----------------------------------- |   |
|  |                                           | |                                     |   |
|  | User joined: January 8, 2026              | | [Send Reminder Email]               |   |
|  | Days since join: 2 days                   | | Send a friendly reminder to         |   |
|  | Onboarding status: In Progress            | | complete remaining steps.           |   |
|  | Completion rate: 50%                      | |                                     |   |
|  |                                           | | [Reset Onboarding]                  |   |
|  | Average completion time:                  | | Reset progress and restart          |   |
|  | - Profile: 15 min (avg: 10 min)           | | onboarding from the beginning.      |   |
|  |                                           | |                                     |   |
|  |                                           | | [Mark as Complete]                  |   |
|  |                                           | | Skip remaining steps and mark       |   |
|  |                                           | | onboarding as complete.             |   |
|  |                                           | |                                     |   |
|  +-------------------------------------------+ +-------------------------------------+   |
|                                                                                           |
+-------------------------------------------------------------------------------------------+
```

### Tutorial Video Player (Desktop)

```
+-------------------------------------------------------------------------------------------+
| Getting Started Tutorial                                                            [X]   |
+-------------------------------------------------------------------------------------------+
|                                                                                           |
|  +-------------------------------------------------------------------------------------+ |
|  |                                                                                     | |
|  |  +---------------------------------------------------+ +-------------------------+  | |
|  |  |                                                   | |                         |  | |
|  |  |                                                   | | Chapters                |  | |
|  |  |                                                   | | -----------------------  |  | |
|  |  |               [Video Player]                      | |                         |  | |
|  |  |                                                   | | [x] 1. Dashboard       |  | |
|  |  |                 16:9 aspect                       | |    overview (1:30)     |  | |
|  |  |                                                   | |                         |  | |
|  |  |                                                   | | [ ] 2. Managing        |  | |
|  |  |                                                   | |    customers (1:15)    |  | |
|  |  |                                                   | |                         |  | |
|  |  |                                                   | | [ ] 3. Creating        |  | |
|  |  |                                                   | |    orders (1:45)       |  | |
|  |  +---------------------------------------------------+ |                         |  | |
|  |                                                         | [ ] 4. Tips &          |  | |
|  |  [|<] [<] [Play/Pause] [>] [>|]   0:45 / 5:00          |    shortcuts (0:30)    |  | |
|  |  [======--------]  Volume: [===----]                   |                         |  | |
|  |                                                         +-------------------------+  | |
|  |                                                                                     | |
|  +-------------------------------------------------------------------------------------+ |
|                                                                                           |
|  Progress: Watch at least 80% (4:00) to complete this step                               |
|  Current: 0:45 (15%)                                                                      |
|                                                                                           |
|  Prefer reading? [View Quick Start Guide] (opens in new tab)                             |
|                                                                                           |
|                                    (Skip Tutorial)              [Mark as Complete]        |
|                                    (disabled until 80% watched)                           |
|                                                                                           |
+-------------------------------------------------------------------------------------------+
```

---

## Interaction States

### Loading States

```
ONBOARDING WIDGET LOADING:
+-------------------------------+
| Getting Started               |
| ----------------------------- |
|                               |
| [..........................] |
|                               |
| [..........................] |
| [..........................] |
| [..........................] |
| [..........................] |
|                               |
+-------------------------------+
^ Skeleton with shimmer

VIDEO LOADING:
+---------------------------------------------------+
|                                                   |
|                   [Spinner]                       |
|                                                   |
|              Loading video...                     |
|                                                   |
+---------------------------------------------------+
```

### Empty States

```
ONBOARDING COMPLETE (celebration):
+-------------------------------+
|                               |
|     [confetti animation]     |
|                               |
|    [checkmark in circle]     |
|                               |
|   All Done! Great job!        |
|                               |
|  You've completed all         |
|  onboarding steps.            |
|                               |
|      [Get Started]            |
|                               |
+-------------------------------+

ONBOARDING DISMISSED:
(Widget no longer appears on dashboard)
(Can be accessed from Profile > Settings > Onboarding)
```

### Error States

```
FAILED TO LOAD ONBOARDING:
+-------------------------------+
|                               |
| [!] Could not load onboarding |
|                               |
| Please try again.             |
|                               |
|         [Retry]               |
|                               |
+-------------------------------+

FAILED TO SAVE PROGRESS:
+-------------------------------+
| [!] Could not save progress   |
|                               |
| Your changes may not be saved.|
| Please try again.             |
|                               |
|     [Retry]    [Cancel]       |
+-------------------------------+

VIDEO PLAYBACK ERROR:
+---------------------------------------------------+
|                                                   |
|              [error icon]                         |
|                                                   |
|        Video could not be loaded                  |
|                                                   |
|  [Try Again]  [Read Guide Instead]                |
|                                                   |
+---------------------------------------------------+
```

### Success States

```
STEP COMPLETED:
+-------------------------------+
| [checkmark] Step completed!   |
|                               |
| Profile setup complete.       |
|                               |
| <- Toast notification (3s)    |
+-------------------------------+

ALL STEPS COMPLETED:
+-------------------------------+
| [confetti] Congratulations!   |
|                               |
| You've completed onboarding.  |
| Welcome to Renoz CRM!         |
|                               |
| <- Toast notification (5s)    |
+-------------------------------+
```

### Step States

```
COMPLETED STEP:
+---------------------------------------+
| [checkmark] Create your account  Done |
|             Completed Jan 8, 10:00    |
+---------------------------------------+
^ Gray background, checkmark icon

CURRENT STEP:
+---------------------------------------+
| [o] Set your preferences         [>]  |
|     Recommended next step             |
+---------------------------------------+
^ Highlighted, ring indicator

PENDING STEP:
+---------------------------------------+
| [ ] Watch getting started        [>]  |
|     5 min video                       |
+---------------------------------------+
^ Default style, empty circle

SKIPPED STEP:
+---------------------------------------+
| [skip] Set preferences       Skipped  |
|        Can complete later             |
+---------------------------------------+
^ Muted style, skip icon
```

---

## Accessibility Notes

### Focus Order

1. **Dashboard Widget**
   - Progress bar (informational)
   - Completed steps (non-interactive)
   - Current/pending steps (buttons)
   - Skip link

2. **Step Detail View**
   - Back button
   - Step content
   - Action buttons (Skip, Complete)

3. **Video Player**
   - Play/pause button
   - Progress slider
   - Volume control
   - Chapter list
   - Skip/Complete buttons

### Keyboard Navigation

```
CHECKLIST:
- Tab: Move between steps and controls
- Enter/Space: Open step detail
- Escape: Close detail, return to dashboard

VIDEO PLAYER:
- Space: Play/pause
- Left/Right arrow: Seek 10 seconds
- Up/Down arrow: Volume
- M: Mute/unmute
- F: Fullscreen
- Number keys (1-9): Jump to percentage

PROGRESS BAR:
- Non-interactive (informational only)
```

### ARIA Requirements

```html
<!-- Onboarding Widget -->
<section
  aria-labelledby="onboarding-title"
  role="region"
>
  <h2 id="onboarding-title">Getting Started</h2>

  <!-- Progress Bar -->
  <div
    role="progressbar"
    aria-valuenow="50"
    aria-valuemin="0"
    aria-valuemax="100"
    aria-label="Onboarding progress: 2 of 4 steps complete, 50%"
  >
    [============--------]
  </div>

  <!-- Checklist -->
  <ul
    role="list"
    aria-label="Onboarding checklist"
  >
    <li
      role="listitem"
      aria-label="Create your account, completed on January 8, 2026"
    >
      <span aria-hidden="true">[x]</span>
      Create your account
      <span class="sr-only">Completed</span>
    </li>

    <li
      role="listitem"
      aria-label="Set your preferences, pending, approximately 2 minutes"
    >
      <button
        aria-expanded="false"
        aria-controls="preferences-panel"
      >
        <span aria-hidden="true">[ ]</span>
        Set your preferences
        <span class="sr-only">Pending, click to start</span>
      </button>
    </li>
  </ul>

  <button aria-label="Skip remaining onboarding steps">
    Skip for now
  </button>
</section>

<!-- Video Player -->
<div
  role="application"
  aria-label="Getting started tutorial video player"
>
  <video
    aria-describedby="video-description"
  >
    ...
  </video>
  <p id="video-description" class="sr-only">
    5 minute getting started tutorial covering dashboard overview,
    managing customers, creating orders, and tips.
  </p>

  <button aria-label="Play video">Play</button>
  <button aria-label="Pause video">Pause</button>

  <input
    type="range"
    role="slider"
    aria-label="Video progress"
    aria-valuemin="0"
    aria-valuemax="300"
    aria-valuenow="45"
    aria-valuetext="45 seconds of 5 minutes"
  />
</div>

<!-- Skip Confirmation -->
<dialog
  role="alertdialog"
  aria-modal="true"
  aria-labelledby="skip-title"
  aria-describedby="skip-desc"
>
  <h2 id="skip-title">Skip Onboarding?</h2>
  <p id="skip-desc">
    You have 2 incomplete steps. You can complete them later
    from your profile settings.
  </p>
</dialog>
```

### Screen Reader Announcements

- Step completed: "Step completed: Complete your profile. 2 of 4 steps done."
- Step started: "Starting step: Set your preferences"
- Progress update: "Video progress: 45 seconds of 5 minutes, 15%"
- Onboarding complete: "Congratulations! You've completed all onboarding steps."
- Skipped: "Onboarding skipped. You can complete remaining steps from profile settings."
- Reminder sent: "Reminder email sent to john@company.com"

---

## Animation Choreography

### Progress Bar

```
PROGRESS UPDATE:
- Duration: 400ms
- Easing: ease-out
- Width: smooth transition to new percentage
- Color: stays consistent

COMPLETION:
- Duration: 500ms
- Progress bar: fill to 100%
- Color: transition to success green
- Celebration: confetti burst (optional)
```

### Step Completion

```
CHECKMARK APPEAR:
- Duration: 300ms
- Easing: ease-out
- Scale: 0 -> 1.2 -> 1
- Opacity: 0 -> 1

STEP ROW UPDATE:
- Duration: 250ms
- Background: highlight flash (green tint)
- Text: strikethrough animation (if applicable)
```

### Widget Entry/Exit

```
APPEAR (on dashboard load):
- Duration: 300ms
- Delay: 500ms (after main content)
- Easing: ease-out
- Transform: translateY(20px) -> translateY(0)
- Opacity: 0 -> 1

DISMISS:
- Duration: 250ms
- Easing: ease-in
- Transform: scale(1) -> scale(0.95)
- Opacity: 1 -> 0
- Height: collapse to 0
```

### Celebration Animation

```
ONBOARDING COMPLETE:
- Duration: 1500ms
- Confetti: particle burst from center
- Checkmark: scale bounce with glow
- Text: fade in with delay

CONFETTI:
- Duration: 1000ms
- Particle count: 50
- Colors: brand palette
- Physics: gravity fall with slight random drift
```

### Video Player

```
PLAY/PAUSE:
- Duration: 150ms
- Icon: scale bounce

PROGRESS UPDATE:
- Duration: continuous
- Easing: linear
- Fill width tracks playback

CHAPTER CHANGE:
- Duration: 200ms
- Current chapter: highlight background
- Progress: subtle pulse
```

---

## Component Props Interfaces

```typescript
// Onboarding Widget
interface OnboardingWidgetProps {
  userId: string;
  onComplete?: () => void;
  onDismiss?: () => void;
  variant?: 'card' | 'sidebar' | 'full';
}

// Onboarding Status
interface OnboardingStatus {
  userId: string;
  steps: OnboardingStep[];
  currentStepIndex: number;
  completedCount: number;
  totalCount: number;
  progressPercentage: number;
  isDismissed: boolean;
  dismissedAt?: Date;
  completedAt?: Date;
}

// Onboarding Step
interface OnboardingStep {
  id: string;
  name: string;
  description: string;
  status: 'completed' | 'current' | 'pending' | 'skipped';
  completedAt?: Date;
  timeSpent?: number;  // in seconds
  estimatedTime?: number;  // in seconds
  type: 'auto' | 'manual' | 'video' | 'form';
  icon?: string;
}

// Step Types
type OnboardingStepId =
  | 'account_created'
  | 'profile_complete'
  | 'preferences_set'
  | 'tutorial_viewed';

// Checklist Component
interface OnboardingChecklistProps {
  status: OnboardingStatus;
  onStepClick: (stepId: string) => void;
  onSkip: () => void;
  compact?: boolean;
}

// Step Detail Component
interface OnboardingStepDetailProps {
  step: OnboardingStep;
  onComplete: () => Promise<void>;
  onSkip: () => void;
  onBack: () => void;
}

// Progress Bar
interface OnboardingProgressBarProps {
  completed: number;
  total: number;
  showLabel?: boolean;
  showPercentage?: boolean;
}

// Video Tutorial
interface TutorialVideoProps {
  videoUrl: string;
  chapters?: VideoChapter[];
  requiredWatchPercentage?: number;  // default 80
  onProgress: (percentage: number) => void;
  onComplete: () => void;
  onSkip: () => void;
}

// Video Chapter
interface VideoChapter {
  title: string;
  startTime: number;  // in seconds
  duration: number;
  isWatched?: boolean;
}

// Skip Confirmation Dialog
interface SkipOnboardingDialogProps {
  isOpen: boolean;
  remainingSteps: OnboardingStep[];
  onClose: () => void;
  onConfirm: (dontShowAgain: boolean) => Promise<void>;
}

// Completion Celebration
interface OnboardingCompleteProps {
  userName: string;
  onDismiss: () => void;
  showConfetti?: boolean;
}

// Admin View
interface AdminOnboardingViewProps {
  userId: string;
  status: OnboardingStatus;
  onSendReminder: () => Promise<void>;
  onReset: () => Promise<void>;
  onMarkComplete: () => Promise<void>;
}

// Admin Summary (for user list)
interface OnboardingStatusBadgeProps {
  status: 'not_started' | 'in_progress' | 'completed' | 'dismissed';
  progressPercentage?: number;
}

// Hook for onboarding
interface UseOnboardingReturn {
  status: OnboardingStatus | null;
  isLoading: boolean;
  error: Error | null;
  completeStep: (stepId: string) => Promise<void>;
  skipStep: (stepId: string) => Promise<void>;
  dismiss: (dontShowAgain: boolean) => Promise<void>;
  reset: () => Promise<void>;
}
```

---

## Component Files

| File | Purpose |
|------|---------|
| `src/components/domain/users/onboarding-widget.tsx` | Main dashboard widget |
| `src/components/domain/users/onboarding-checklist.tsx` | Step checklist |
| `src/components/domain/users/onboarding-step-detail.tsx` | Step detail view |
| `src/components/domain/users/onboarding-progress-bar.tsx` | Progress indicator |
| `src/components/domain/users/tutorial-video.tsx` | Video player |
| `src/components/domain/users/skip-onboarding-dialog.tsx` | Skip confirmation |
| `src/components/domain/users/onboarding-complete.tsx` | Completion celebration |
| `src/components/domain/users/admin-onboarding-view.tsx` | Admin panel |
| `src/components/domain/users/onboarding-status-badge.tsx` | Status indicator |
| `src/components/domain/users/preferences-step.tsx` | Preferences form |
| `src/hooks/use-onboarding.ts` | Onboarding state hook |
| `src/server/functions/onboarding/` | Server functions directory |
