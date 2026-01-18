# Communications Domain Wireframes - UI Pattern Review

**Review Date**: January 10, 2026
**Reviewer**: Scribe Agent
**Domain**: Communications
**Total Wireframes**: 8

---

## Executive Summary

This document maps all Communications domain wireframes (DOM-COMMS-001c through DOM-COMMS-008) to reference UI patterns from:
- **REUI Reference**: `_reference/.reui-reference/registry/default/ui/`
- **Midday Reference**: `_reference/.midday-reference/`

Each wireframe has been analyzed for:
1. Core UI components needed
2. Layout patterns across breakpoints (mobile/tablet/desktop)
3. State management (loading, empty, error, success)
4. Accessibility requirements
5. Animation patterns

---

## Wireframe 1: DOM-COMMS-001c - Email Tracking Enhancements

### Overview
Fixes non-functional tracking display and adds template performance tracking with open/click rates, bounce tracking, and analytics dashboard.

### UI Pattern Mapping

| Component | Reference Pattern | File Path |
|-----------|------------------|-----------|
| Tracking Badge | Badge with variants | `badge.tsx` |
| Stats Card | Card | `card.tsx` |
| Progress Bar | Progress | `progress.tsx` |
| Data Table | DataGrid | `data-grid.tsx` |
| Timeline | Custom (Card + Separator) | Build composite |
| Detail Dialog | Dialog | `dialog.tsx` |
| Tabs | Tabs | `base-tabs.tsx` |
| Tooltip | Tooltip | `base-tooltip.tsx` |

### Key Implementation Notes

```tsx
// Tracking Badge with Tooltip
<Tooltip>
  <TooltipTrigger>
    <Badge variant="success">Opened 3x</Badge>
  </TooltipTrigger>
  <TooltipContent>Last opened: Jan 10 at 3:45 PM</TooltipContent>
</Tooltip>

// Stats Card with Progress
<Card>
  <CardHeader><CardTitle>Template Stats</CardTitle></CardHeader>
  <CardContent>
    <Progress value={67.5} />
  </CardContent>
</Card>

// Timeline (custom composite)
<div className="relative pl-4 border-l-2 border-border">
  {events.map(event => (
    <div className="mb-4">
      <div className="absolute -left-2 w-4 h-4 rounded-full bg-primary" />
      <Card>{/* Event details */}</Card>
    </div>
  ))}
</div>
```

### Layout Patterns
- **Mobile**: Stacked cards, bottom sheet for details
- **Tablet**: 2-column grid (list + stats panel)
- **Desktop**: 3-column dashboard with modal dialogs

### State Patterns
- **Loading**: Skeleton placeholders with shimmer
- **Empty**: Icon + message + CTA button
- **Error**: Alert with retry action
- **Success**: Toast notification

---

## Wireframe 2: DOM-COMMS-002c - Advanced Email Composition

### Overview
Enhanced composer with rich text, attachments, scheduling, and template selection.

### UI Pattern Mapping

| Component | Reference Pattern | File Path |
|-----------|------------------|-----------|
| Composer Dialog | Dialog (fullscreen variant) | `dialog.tsx` |
| Rich Text Editor | Custom (TipTap/similar) | Third-party integration |
| Attachment Upload | Custom file upload | Build using Button + Input |
| Template Selector | Combobox | `base-combobox.tsx` |
| Recipient Chips | Badge (removable) | `badge.tsx` |
| Date/Time Picker | DateField + time input | `datefield.tsx` |
| Tabs | Tabs | `base-tabs.tsx` |
| Bottom Sheet (mobile) | Sheet | `base-sheet.tsx` |

### Key Implementation Notes

```tsx
// Composer Dialog
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent variant="fullscreen">
    <DialogHeader>
      <DialogTitle>Compose Email</DialogTitle>
    </DialogHeader>
    <DialogBody>
      {/* Rich text editor */}
      <Tabs>
        <TabsList>
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>
      </Tabs>
    </DialogBody>
    <DialogFooter>
      <Button variant="outline">Save Draft</Button>
      <Button>Send</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

// Recipient Chips
<div className="flex gap-2 flex-wrap">
  {recipients.map(r => (
    <Badge key={r.id} variant="outline">
      {r.email}
      <button onClick={() => remove(r.id)}>×</button>
    </Badge>
  ))}
</div>

// Template Selector
<Combobox>
  <ComboboxTrigger>
    <ComboboxInput placeholder="Select template..." />
  </ComboboxTrigger>
  <ComboboxContent>
    {templates.map(t => (
      <ComboboxItem key={t.id} value={t.id}>
        {t.name}
      </ComboboxItem>
    ))}
  </ComboboxContent>
</Combobox>
```

### Layout Patterns
- **Mobile**: Full screen dialog, tabs for sections
- **Tablet**: 2-column (composer + preview)
- **Desktop**: 3-column (composer + preview + templates)

### State Patterns
- **Draft Saving**: Auto-save indicator with timestamp
- **Sending**: Progress spinner with disable
- **Validation**: Form validation with error messages
- **Success**: Toast + redirect to sent folder

---

## Wireframe 3: DOM-COMMS-003d - Calling Integration

### Overview
VoIP calling interface with call history, notes, and recording capabilities.

### UI Pattern Mapping

| Component | Reference Pattern | File Path |
|-----------|------------------|-----------|
| Call Interface Modal | Dialog | `dialog.tsx` |
| Call Timer | Custom counter | Build using `counting-number.tsx` |
| Call Controls | Button group | `button.tsx` |
| Call History List | DataGrid | `data-grid.tsx` |
| Recording Player | Custom audio player | HTML5 audio + controls |
| Notes Editor | Textarea with formatting | `input.tsx` (multiline) |
| Contact Selector | Combobox with avatars | `base-combobox.tsx` + `avatar.tsx` |

### Key Implementation Notes

```tsx
// Active Call Dialog
<Dialog open={callActive} modal={false}>
  <DialogContent className="fixed top-4 right-4 w-80">
    <DialogHeader>
      <DialogTitle>
        <Avatar src={contact.avatar} />
        {contact.name}
      </DialogTitle>
    </DialogHeader>
    <DialogBody>
      <div className="text-center">
        <CountingNumber value={callDuration} format="mm:ss" />
        <div className="flex justify-center gap-2 mt-4">
          <Button size="icon" variant="outline">Mute</Button>
          <Button size="icon" variant="destructive">End</Button>
          <Button size="icon" variant="outline">Hold</Button>
        </div>
      </div>
    </DialogBody>
  </DialogContent>
</Dialog>

// Call History Table
<DataGrid table={table} recordCount={callHistory.length}>
  <DataGridTable>
    <DataGridColumnHeader>Contact</DataGridColumnHeader>
    <DataGridColumnHeader>Duration</DataGridColumnHeader>
    <DataGridColumnHeader>Status</DataGridColumnHeader>
    {/* ... */}
  </DataGridTable>
</DataGrid>
```

### Layout Patterns
- **Mobile**: Full screen call interface, list view for history
- **Tablet**: Floating call window, split view (list + details)
- **Desktop**: Picture-in-picture call, full table for history

### State Patterns
- **Ringing**: Pulsing animation, ringtone indicator
- **Active**: Live timer, recording indicator
- **Ended**: Call summary modal
- **Failed**: Error alert with retry option

---

## Wireframe 4: DOM-COMMS-004c - SMS/WhatsApp Integration

### Overview
Unified messaging interface supporting SMS and WhatsApp with conversation threads.

### UI Pattern Mapping

| Component | Reference Pattern | File Path |
|-----------|------------------|-----------|
| Conversation List | Custom list with avatars | Build using Card + Avatar |
| Message Thread | Chat bubble layout | Custom composite |
| Message Input | Textarea with send button | `input.tsx` + `button.tsx` |
| Contact Avatar | Avatar with status | `avatar.tsx` |
| Media Viewer | Dialog with carousel | `dialog.tsx` + `carousel.tsx` |
| Search Bar | Input with icon | `input.tsx` |
| Filter Tabs | Tabs | `base-tabs.tsx` |

### Key Implementation Notes

```tsx
// Conversation List
<ScrollArea className="h-full">
  {conversations.map(conv => (
    <Card key={conv.id} onClick={() => select(conv)}>
      <CardContent className="flex gap-3 p-3">
        <Avatar src={conv.avatar}>
          <AvatarStatus status={conv.isOnline ? 'online' : 'offline'} />
        </Avatar>
        <div className="flex-1">
          <div className="flex justify-between">
            <span className="font-medium">{conv.name}</span>
            <span className="text-xs text-muted-foreground">{conv.time}</span>
          </div>
          <p className="text-sm text-muted-foreground truncate">
            {conv.lastMessage}
          </p>
        </div>
        {conv.unread > 0 && (
          <Badge variant="destructive">{conv.unread}</Badge>
        )}
      </CardContent>
    </Card>
  ))}
</ScrollArea>

// Message Thread
<div className="flex flex-col gap-2">
  {messages.map(msg => (
    <div
      key={msg.id}
      className={cn(
        "flex",
        msg.isSent ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[70%] rounded-lg p-3",
          msg.isSent
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        )}
      >
        <p>{msg.text}</p>
        <span className="text-xs opacity-70">{msg.time}</span>
      </div>
    </div>
  ))}
</div>
```

### Layout Patterns
- **Mobile**: Full screen thread view, swipe back to list
- **Tablet**: Side-by-side (list + thread)
- **Desktop**: 3-column (list + thread + contact info)

### State Patterns
- **Typing Indicator**: Animated dots
- **Sending**: Message opacity + spinner
- **Delivered**: Checkmark badge
- **Read**: Double checkmark badge

---

## Wireframe 5: DOM-COMMS-005 - Campaign Management

### Overview
Email campaign builder with audience selection, template editing, and scheduling.

### UI Pattern Mapping

| Component | Reference Pattern | File Path |
|-----------|------------------|-----------|
| Campaign Builder | Multi-step form | Custom wizard using Tabs |
| Audience Selector | DataGrid with selection | `data-grid.tsx` |
| Campaign Stats | Card grid | `card.tsx` |
| Schedule Calendar | Calendar picker | `calendar.tsx` |
| Template Preview | Dialog | `dialog.tsx` |
| Progress Steps | Custom stepper | Build using Badge + Separator |
| Chart Widgets | Chart components | `chart.tsx` |

### Key Implementation Notes

```tsx
// Campaign Builder Wizard
<Tabs value={currentStep} onValueChange={setCurrentStep}>
  <TabsList className="grid grid-cols-4">
    <TabsTrigger value="audience">
      <Badge>1</Badge> Audience
    </TabsTrigger>
    <TabsTrigger value="template">
      <Badge>2</Badge> Template
    </TabsTrigger>
    <TabsTrigger value="schedule">
      <Badge>3</Badge> Schedule
    </TabsTrigger>
    <TabsTrigger value="review">
      <Badge>4</Badge> Review
    </TabsTrigger>
  </TabsList>

  <TabsContent value="audience">
    <DataGrid table={contactsTable} />
  </TabsContent>

  <TabsContent value="schedule">
    <Calendar
      mode="single"
      selected={date}
      onSelect={setDate}
    />
  </TabsContent>
</Tabs>

// Campaign Stats Dashboard
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  {stats.map(stat => (
    <Card key={stat.label}>
      <CardHeader>
        <CardTitle className="text-sm">{stat.label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{stat.value}</div>
        <Progress value={stat.progress} className="mt-2" />
      </CardContent>
    </Card>
  ))}
</div>
```

### Layout Patterns
- **Mobile**: Wizard steps as bottom sheet tabs
- **Tablet**: 2-column builder view
- **Desktop**: Full wizard with side preview

### State Patterns
- **Draft**: Auto-save with indicator
- **Sending**: Progress bar with count
- **Scheduled**: Countdown timer
- **Complete**: Success summary with stats

---

## Wireframe 6: DOM-COMMS-006 - Email Signature Management

### Overview
Custom email signature builder with rich text, images, and templates.

### UI Pattern Mapping

| Component | Reference Pattern | File Path |
|-----------|------------------|-----------|
| Signature Editor | Rich text editor | Third-party (TipTap) |
| Preview Panel | Card | `card.tsx` |
| Image Upload | Custom uploader | Button + Input |
| Signature List | DataGrid | `data-grid.tsx` |
| Settings Form | Form | `form.tsx` |
| Template Gallery | Grid of cards | `card.tsx` |

### Key Implementation Notes

```tsx
// Signature Editor with Preview
<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
  <Card>
    <CardHeader>
      <CardTitle>Edit Signature</CardTitle>
    </CardHeader>
    <CardContent>
      <Form>
        <FormField name="name">
          <FormLabel>Signature Name</FormLabel>
          <FormControl>
            <Input placeholder="My Signature" />
          </FormControl>
        </FormField>

        <FormField name="content">
          <FormLabel>Content</FormLabel>
          <FormControl>
            {/* Rich text editor */}
          </FormControl>
        </FormField>
      </Form>
    </CardContent>
  </Card>

  <Card>
    <CardHeader>
      <CardTitle>Preview</CardTitle>
    </CardHeader>
    <CardContent>
      <div dangerouslySetInnerHTML={{ __html: signatureHTML }} />
    </CardContent>
  </Card>
</div>
```

### Layout Patterns
- **Mobile**: Editor full screen, preview as tab
- **Tablet**: Side-by-side editor + preview
- **Desktop**: 2-column with template gallery sidebar

---

## Wireframe 7: DOM-COMMS-007 - Custom Email Templates

### Overview
Database-stored templates with visual editor, variable insertion, and version history.

### UI Pattern Mapping

| Component | Reference Pattern | File Path |
|-----------|------------------|-----------|
| Template Editor | Rich text with toolbar | Third-party editor |
| Variable Toolbar | Popover menu | `base-popover.tsx` + `base-menu.tsx` |
| Preview Panel | Card with sample data | `card.tsx` |
| Version History | Sheet/Dialog with list | `base-sheet.tsx` |
| Category Tabs | Tabs | `base-tabs.tsx` |
| Template Card | Card | `card.tsx` |

### Key Implementation Notes

```tsx
// Template Editor with Variable Insertion
<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
  <div>
    <Form>
      <FormField name="subject">
        <FormLabel>Subject</FormLabel>
        <FormControl>
          <div className="flex gap-2">
            <Input placeholder="Email subject..." />
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  Variables
                </Button>
              </PopoverTrigger>
              <PopoverContent>
                <Menu>
                  {variables.map(v => (
                    <MenuItem
                      key={v.name}
                      onSelect={() => insertVariable(v)}
                    >
                      {`{{${v.name}}}`} - {v.description}
                    </MenuItem>
                  ))}
                </Menu>
              </PopoverContent>
            </Popover>
          </div>
        </FormControl>
      </FormField>

      <FormField name="body">
        <FormLabel>Body</FormLabel>
        <FormControl>
          {/* Rich text editor with variable support */}
        </FormControl>
      </FormField>
    </Form>
  </div>

  <Card>
    <CardHeader>
      <CardTitle>Preview</CardTitle>
    </CardHeader>
    <CardContent>
      {/* Rendered template with sample data */}
    </CardContent>
  </Card>
</div>

// Version History Sheet
<Sheet open={showHistory} onOpenChange={setShowHistory}>
  <SheetContent>
    <SheetHeader>
      <SheetTitle>Version History</SheetTitle>
    </SheetHeader>
    <ScrollArea className="h-full">
      {versions.map(v => (
        <Card key={v.version} className="mb-2">
          <CardContent className="p-3">
            <div className="flex justify-between">
              <span className="font-medium">v{v.version}</span>
              {v.isCurrent && <Badge>Current</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">
              {v.createdAt} by {v.createdBy}
            </p>
            <p className="text-xs mt-1">{v.message}</p>
            <div className="flex gap-2 mt-2">
              <Button size="sm" variant="outline">
                View
              </Button>
              {!v.isCurrent && (
                <Button size="sm">Restore</Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </ScrollArea>
  </SheetContent>
</Sheet>
```

### Layout Patterns
- **Mobile**: Full screen editor, bottom sheet for variables
- **Tablet**: Split view (editor + preview)
- **Desktop**: 3-column (categories + editor + preview)

---

## Wireframe 8: DOM-COMMS-008 - Communications Timeline

### Overview
Enhanced timeline with filtering, search, quick actions, and export.

### UI Pattern Mapping

| Component | Reference Pattern | File Path |
|-----------|------------------|-----------|
| Timeline Feed | Custom list | Build using Card + Separator |
| Filter Bar | Toolbar with selects | `base-toolbar.tsx` + `base-select.tsx` |
| Search Input | Input with clear button | `input.tsx` |
| Activity Card | Card | `card.tsx` |
| Quick Action Buttons | Button group | `button.tsx` |
| Export Menu | Dropdown menu | `dropdown-menu.tsx` |
| Date Range Picker | Calendar (range mode) | `calendar.tsx` |

### Key Implementation Notes

```tsx
// Filter Bar
<div className="flex gap-2 items-center p-4 border-b">
  <Input
    placeholder="Search activities..."
    value={search}
    onChange={e => setSearch(e.target.value)}
    className="flex-1"
  />

  <Select value={typeFilter} onValueChange={setTypeFilter}>
    <SelectTrigger className="w-40">
      <SelectValue placeholder="Type" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All Types</SelectItem>
      <SelectItem value="email">Emails</SelectItem>
      <SelectItem value="call">Calls</SelectItem>
      <SelectItem value="note">Notes</SelectItem>
    </SelectContent>
  </Select>

  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="outline">Export</Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent>
      <DropdownMenuItem onClick={() => exportCSV()}>
        Export as CSV
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => exportPDF()}>
        Export as PDF
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</div>

// Timeline with Quick Actions
<ScrollArea className="h-full">
  {activityGroups.map(group => (
    <div key={group.date}>
      <h3 className="text-sm font-medium text-muted-foreground p-4">
        {group.date}
      </h3>

      {group.activities.map(activity => (
        <Card key={activity.id} className="m-4">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <ActivityIcon type={activity.type} />
              </div>

              <div className="flex-1">
                <h4 className="font-medium">{activity.title}</h4>
                <p className="text-sm text-muted-foreground">
                  {activity.description}
                </p>
                <div className="flex gap-2 mt-2">
                  <span className="text-xs text-muted-foreground">
                    {activity.time} by {activity.user}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-3 pt-3 border-t">
              <Button size="sm" variant="outline">
                Reply
              </Button>
              <Button size="sm" variant="outline">
                View Details
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  ))}

  {hasMore && (
    <Button
      variant="ghost"
      className="w-full"
      onClick={loadMore}
    >
      Load More
    </Button>
  )}
</ScrollArea>
```

### Layout Patterns
- **Mobile**: Full screen list, bottom sheet for filters
- **Tablet**: Sidebar filters + timeline feed
- **Desktop**: Full filter bar + timeline + detail panel

---

## Common Patterns Across All Wireframes

### Responsive Layout Strategy

```tsx
// Mobile-first grid pattern
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Cards auto-flow */}
</div>

// Responsive sidebar pattern
<div className="flex flex-col lg:flex-row">
  <aside className="w-full lg:w-64 border-b lg:border-r">
    {/* Filters */}
  </aside>
  <main className="flex-1">
    {/* Content */}
  </main>
</div>
```

### Loading States

All wireframes use consistent skeleton patterns:

```tsx
// Card skeleton
<Card>
  <CardContent className="p-4">
    <div className="space-y-2">
      <div className="h-4 bg-muted animate-pulse rounded" />
      <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
    </div>
  </CardContent>
</Card>

// Table skeleton
<DataGridTableSkeleton rows={5} columns={4} />
```

### Empty States

```tsx
<div className="flex flex-col items-center justify-center p-12 text-center">
  <Icon className="w-12 h-12 text-muted-foreground mb-4" />
  <h3 className="text-lg font-medium mb-2">{emptyTitle}</h3>
  <p className="text-sm text-muted-foreground mb-4">
    {emptyDescription}
  </p>
  {emptyAction && (
    <Button onClick={emptyAction.onClick}>
      {emptyAction.label}
    </Button>
  )}
</div>
```

### Error States

```tsx
<Alert variant="destructive">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>
    {errorMessage}
  </AlertDescription>
  {onRetry && (
    <Button
      size="sm"
      variant="outline"
      onClick={onRetry}
      className="mt-2"
    >
      Retry
    </Button>
  )}
</Alert>
```

### Success Toast

```tsx
import { toast } from "sonner";

toast.success("Email sent successfully", {
  description: "Your email to john@acme.com has been sent.",
  action: {
    label: "View",
    onClick: () => navigate("/communications/sent")
  }
});
```

---

## Reference Component Inventory

### Essential REUI Components Used

1. **Layout & Structure**
   - `card.tsx` - Primary container for all domains
   - `dialog.tsx` - Modals and detail views
   - `base-sheet.tsx` - Mobile bottom sheets
   - `base-tabs.tsx` - Section navigation
   - `separator.tsx` - Visual dividers

2. **Forms & Input**
   - `form.tsx` - Form validation and structure
   - `input.tsx` - Text inputs
   - `base-select.tsx` - Dropdowns
   - `base-combobox.tsx` - Searchable selects
   - `checkbox.tsx` - Multi-select options
   - `datefield.tsx` - Date pickers
   - `calendar.tsx` - Calendar UI

3. **Data Display**
   - `data-grid.tsx` - Tables with sorting/filtering
   - `badge.tsx` - Status indicators
   - `avatar.tsx` - User avatars
   - `progress.tsx` - Progress bars
   - `chart.tsx` - Data visualization

4. **Feedback & Interaction**
   - `base-toast.tsx` - Notifications
   - `alert.tsx` - Error messages
   - `base-tooltip.tsx` - Hover help
   - `base-popover.tsx` - Context menus
   - `dropdown-menu.tsx` - Action menus

5. **Navigation**
   - `button.tsx` - All actions
   - `breadcrumb.tsx` - Page hierarchy
   - `pagination.tsx` - List navigation
   - `scroll-area.tsx` - Scrollable regions

### Midday Reference Patterns

Look in `_reference/.midday-reference/` for:
- Dashboard stat cards
- Activity feed layouts
- Multi-step wizard patterns
- Rich text editor implementations
- File upload components

---

## Implementation Priority

### Phase 1: Core Components (Week 1)
1. Badge variants for status indicators
2. Card layouts for all list views
3. Dialog components for details/editing
4. Form components with validation
5. Basic table/grid for data display

### Phase 2: Advanced Interactions (Week 2)
1. Rich text editors (Email composer, Templates)
2. File upload components (Attachments, Signatures)
3. Date/time pickers (Scheduling, Campaigns)
4. Search and filter bars
5. Multi-step wizards (Campaign builder)

### Phase 3: Special Features (Week 3)
1. Real-time indicators (Call status, Email tracking)
2. Timeline/feed components
3. Chart integrations (Stats dashboards)
4. Export functionality
5. Mobile-specific patterns (Bottom sheets, swipe gestures)

---

## Accessibility Checklist

All wireframes must implement:

- [ ] ARIA labels for all interactive elements
- [ ] Keyboard navigation (Tab, Enter, Escape, Arrow keys)
- [ ] Focus indicators visible and clear
- [ ] Screen reader announcements for state changes
- [ ] Color contrast meets WCAG AA standards
- [ ] Form validation accessible
- [ ] Loading states announced
- [ ] Error messages linked to fields
- [ ] Modal focus trapping
- [ ] Skip links for complex layouts

---

## Testing Requirements

### Visual Regression
- Test all breakpoints: 375px, 768px, 1280px, 1920px
- Test light/dark themes
- Test reduced motion preference
- Test high contrast mode

### Interaction Testing
- Keyboard-only navigation
- Screen reader compatibility (NVDA, JAWS, VoiceOver)
- Touch targets minimum 44x44px
- Drag-and-drop accessibility

### Performance
- Skeleton loads in <100ms
- Interactive in <1s
- List virtualization for >100 items
- Image lazy loading

---

## Next Steps

1. **Review with Product Team**: Validate pattern selections
2. **Create Storybook**: Document all component variants
3. **Build Foundation**: Implement Phase 1 core components
4. **Integration Testing**: Test with real data
5. **Accessibility Audit**: WCAG 2.1 AA compliance check

---

## Questions & Decisions Needed

1. **Rich Text Editor**: TipTap vs. Lexical vs. Slate?
2. **File Upload**: Built-in vs. Third-party (Uppy/Dropzone)?
3. **Charts**: Recharts vs. Chart.js vs. D3?
4. **VoIP Integration**: Twilio vs. custom WebRTC?
5. **Real-time**: WebSockets vs. Server-Sent Events vs. Polling?

---

## Appendix: Component Composition Examples

### Example 1: Email List Item

```tsx
export function EmailListItem({ email, onSelect }: EmailListItemProps) {
  return (
    <Card
      className="cursor-pointer hover:bg-accent transition-colors"
      onClick={() => onSelect(email.id)}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <Avatar src={email.sender.avatar} fallback={email.sender.initials} />
            <div>
              <h4 className="font-medium">{email.sender.name}</h4>
              <p className="text-sm text-muted-foreground">{email.sender.email}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs text-muted-foreground">{email.time}</span>
            {email.unread && <Badge variant="destructive" size="sm">New</Badge>}
          </div>
        </div>

        <h3 className="font-medium mb-1">{email.subject}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {email.preview}
        </p>

        {email.tracking && (
          <div className="flex gap-2 mt-2">
            {email.tracking.opened > 0 && (
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="success" size="sm">
                    Opened {email.tracking.opened}x
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  Last opened: {email.tracking.lastOpened}
                </TooltipContent>
              </Tooltip>
            )}
            {email.tracking.clicked > 0 && (
              <Badge variant="info" size="sm">
                Clicked {email.tracking.clicked}x
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### Example 2: Filter Bar with Search

```tsx
export function CommunicationsFilterBar({
  search,
  onSearchChange,
  filters,
  onFiltersChange,
  onExport
}: FilterBarProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 p-4 border-b">
      <div className="flex-1">
        <Input
          type="search"
          placeholder="Search communications..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full"
          startIcon={<Search className="w-4 h-4" />}
        />
      </div>

      <div className="flex gap-2">
        <Select
          value={filters.type}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, type: value })
          }
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="email">Emails</SelectItem>
            <SelectItem value="call">Calls</SelectItem>
            <SelectItem value="sms">SMS</SelectItem>
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">
              <CalendarIcon className="w-4 h-4 mr-2" />
              {filters.dateRange
                ? `${format(filters.dateRange.from, 'PP')} - ${format(filters.dateRange.to, 'PP')}`
                : 'Date Range'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="range"
              selected={filters.dateRange}
              onSelect={(range) =>
                onFiltersChange({ ...filters, dateRange: range })
              }
            />
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => onExport('csv')}>
              <FileText className="w-4 h-4 mr-2" />
              Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport('pdf')}>
              <FileText className="w-4 h-4 mr-2" />
              Export as PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
```

### Example 3: Activity Timeline Item

```tsx
export function ActivityTimelineItem({ activity }: ActivityTimelineItemProps) {
  const iconMap = {
    email: Mail,
    call: Phone,
    sms: MessageSquare,
    note: FileText,
    order: ShoppingCart
  };

  const Icon = iconMap[activity.type];

  return (
    <div className="relative pl-8 pb-6 border-l-2 border-border last:border-transparent">
      <div className="absolute -left-2 top-1 w-4 h-4 rounded-full bg-primary border-2 border-background" />

      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-primary" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-medium">{activity.title}</h4>
                <Badge variant="outline" size="sm">
                  {activity.type}
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground mb-2">
                {activity.description}
              </p>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <time dateTime={activity.timestamp}>
                  {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                </time>
                <span>•</span>
                <span>{activity.user.name}</span>
              </div>

              {activity.quickActions && (
                <div className="flex gap-2 mt-3 pt-3 border-t">
                  {activity.quickActions.map(action => (
                    <Button
                      key={action.label}
                      size="sm"
                      variant="outline"
                      onClick={action.onClick}
                    >
                      {action.icon && <action.icon className="w-4 h-4 mr-1" />}
                      {action.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

**End of Review Document**

This comprehensive review provides a complete mapping of all Communications domain wireframes to the available reference UI patterns. Use this as the source of truth for implementation planning and component selection.
