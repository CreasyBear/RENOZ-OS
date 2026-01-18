# State Displays Foundation Wireframe

**Purpose:** Comprehensive empty, loading, partial, and error state patterns for Renoz CRM
**Priority:** FOUNDATION (Phase: pre-domain)
**Design Aesthetic:** Helpful and informative - clear guidance on what happened and what to do next

---

## Dependencies

> **STATUS: READY** - Foundation patterns, no schema dependencies

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Components** | shadcn/ui skeleton, alert, button | AVAILABLE |
| **Icons** | lucide-react icons | AVAILABLE |
| **Animation** | Framer Motion (optional) | AVAILABLE |

### Renoz Business Context
- **Industry**: Australian B2B battery/battery installation
- **User Base**: Sales reps, operations, warehouse, admins
- **Data Types**: Customers, orders, products, inventory, warranties

---

## 1. Empty States

### 1.1 Table Empty State - No Data Yet

```
+================================================================+
|  Customers                          [Search...] [+ Add Customer]|
+================================================================+
|                                                                |
|                                                                |
|                       [Battery/Customer icon]                  |
|                                                                |
|                     No customers yet                           |
|                                                                |
|              Get started by adding your first customer.        |
|              Track orders, warranties, and more.               |
|                                                                |
|                     [+ Add Customer]                           |
|                                                                |
|              or [Import from CSV]                              |
|                                                                |
|                                                                |
+================================================================+
```

**Components:**
- Icon: `lucide-react/Users` or `lucide-react/Battery`
- Heading: `text-xl font-semibold text-gray-900`
- Description: `text-sm text-gray-500 max-w-md`
- Primary action: `<Button>` with icon
- Secondary action: `<Button variant="ghost">` link

**Implementation:**
```tsx
<EmptyState
  icon={Users}
  title="No customers yet"
  description="Get started by adding your first customer. Track orders, warranties, and more."
  primaryAction={{ label: "Add Customer", onClick: handleAdd }}
  secondaryAction={{ label: "Import from CSV", href: "/import" }}
/>
```

---

### 1.2 Search Empty State - No Results

```
+================================================================+
|  Customers              [Search: "Acme Solar Co"] [x Clear]    |
+================================================================+
|                                                                |
|                                                                |
|                       [Magnifying glass icon]                  |
|                                                                |
|                  No results for "Acme Solar Co"                |
|                                                                |
|              We couldn't find any customers matching           |
|              your search. Try:                                 |
|                                                                |
|              • Checking your spelling                          |
|              • Using different keywords                        |
|              • Removing some filters                           |
|                                                                |
|                     [Clear Search]                             |
|                                                                |
|                                                                |
+================================================================+
```

**Components:**
- Icon: `lucide-react/Search` or `lucide-react/SearchX`
- Query display: Bold search term
- Suggestions: Bulleted list
- Action: Clear search/filters

**Implementation:**
```tsx
<EmptyState
  icon={SearchX}
  title={`No results for "${query}"`}
  description={
    <>
      <p>We couldn't find any customers matching your search. Try:</p>
      <ul className="list-disc list-inside space-y-1 mt-2">
        <li>Checking your spelling</li>
        <li>Using different keywords</li>
        <li>Removing some filters</li>
      </ul>
    </>
  }
  primaryAction={{ label: "Clear Search", onClick: handleClear }}
/>
```

---

### 1.3 Filter Empty State - No Matches

```
+================================================================+
|  Orders                [Status: Pending] [Customer: Acme] [x]  |
+================================================================+
|                                                                |
|                                                                |
|                       [Filter icon]                            |
|                                                                |
|               No orders match current filters                  |
|                                                                |
|              Active filters: Status = Pending,                 |
|              Customer = Acme Solar Co                          |
|                                                                |
|              Try adjusting your filters to see more results.   |
|                                                                |
|                     [Clear All Filters]                        |
|                                                                |
|                                                                |
+================================================================+
```

**Components:**
- Icon: `lucide-react/Filter` or `lucide-react/FilterX`
- Active filters list: Pills showing current filters
- Action: Clear all filters button

**Implementation:**
```tsx
<EmptyState
  icon={FilterX}
  title="No orders match current filters"
  description={
    <>
      <p className="mb-2">Active filters:</p>
      <div className="flex gap-2 flex-wrap justify-center">
        {filters.map(f => (
          <Badge key={f.key} variant="secondary">
            {f.label} = {f.value}
          </Badge>
        ))}
      </div>
      <p className="mt-3">Try adjusting your filters to see more results.</p>
    </>
  }
  primaryAction={{ label: "Clear All Filters", onClick: clearFilters }}
/>
```

---

### 1.4 First-Time Welcome State

```
+================================================================+
|  Renoz CRM                                        [x Dismiss]  |
+================================================================+
|                                                                |
|                  [Large Renoz logo/Battery icon]               |
|                                                                |
|                  Welcome to Renoz CRM!                         |
|                                                                |
|         Your complete battery installation management system   |
|                                                                |
|  +----------------------------------------------------------+  |
|  |  GETTING STARTED                                         |  |
|  |                                                          |  |
|  |  1. [✓] Create your account                              |  |
|  |  2. [ ] Add your first customer        [Start]          |  |
|  |  3. [ ] Import your product catalog    [Later]          |  |
|  |  4. [ ] Set up your team members       [Later]          |  |
|  |  5. [ ] Configure tax and currency     [Later]          |  |
|  |                                                          |  |
|  +----------------------------------------------------------+  |
|                                                                |
|              [Take 2-Minute Tour]    [Skip for Now]            |
|                                                                |
+================================================================+
```

**Components:**
- Card with gradient background
- Checklist with status indicators
- Progress indicator (1/5 complete)
- CTAs: Tour vs Skip

**Implementation:**
```tsx
<OnboardingWelcome
  steps={[
    { id: 1, label: "Create your account", status: "complete" },
    { id: 2, label: "Add your first customer", status: "current", action: handleAddCustomer },
    { id: 3, label: "Import your product catalog", status: "pending" },
    { id: 4, label: "Set up your team members", status: "pending" },
    { id: 5, label: "Configure tax and currency", status: "pending" },
  ]}
  onTakeTour={startTour}
  onDismiss={dismissWelcome}
/>
```

---

## 2. Loading States

### 2.1 Table Skeleton - Rows with Shimmer

```
+================================================================+
|  Customers              [Search...] [+ Add Customer]           |
+================================================================+
|  [Checkbox] | Name            | Contact       | Orders | Status |
+================================================================+
|  [░░]       | [████████░░]    | [██████░░]    | [██]   | [████] |
|  [░░]       | [██████████]    | [████████]    | [██]   | [████] |
|  [░░]       | [████░░░░░░]    | [██████░░]    | [██]   | [████] |
|  [░░]       | [████████░░]    | [████░░░░]    | [██]   | [████] |
|  [░░]       | [██████░░░░]    | [██████████]  | [██]   | [████] |
|  [░░]       | [████████░░]    | [████░░░░]    | [██]   | [████] |
|  [░░]       | [██████████]    | [██████░░]    | [██]   | [████] |
|  [░░]       | [████░░░░░░]    | [████████]    | [██]   | [████] |
+================================================================+
|  Showing 1-8 of [░░] | [Previous] [1] [Next]                   |
+================================================================+

[Shimmer animation: gradient sweep left-to-right continuously]
```

**Components:**
- `<Skeleton>` component with varying widths
- Header row remains visible
- Shimmer animation: `animate-pulse` or gradient sweep

**Implementation:**
```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Contact</TableHead>
      <TableHead>Orders</TableHead>
      <TableHead>Status</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {Array.from({ length: 8 }).map((_, i) => (
      <TableRow key={i}>
        <TableCell><Skeleton className="h-4 w-[180px]" /></TableCell>
        <TableCell><Skeleton className="h-4 w-[140px]" /></TableCell>
        <TableCell><Skeleton className="h-4 w-[40px]" /></TableCell>
        <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

---

### 2.2 Card Skeleton - Grid with Shimmer

```
+================================================================+
|  Products                           [Grid View] [+ Add Product] |
+================================================================+
|                                                                |
|  +-------------+  +-------------+  +-------------+             |
|  | [████████]  |  | [████████]  |  | [████████]  |             |
|  | [████████]  |  | [████████]  |  | [████████]  |             |
|  | [████████]  |  | [████████]  |  | [████████]  |             |
|  |             |  |             |  |             |             |
|  | [██████]    |  | [██████]    |  | [██████]    |             |
|  | [████]      |  | [████]      |  | [████]      |             |
|  +-------------+  +-------------+  +-------------+             |
|                                                                |
|  +-------------+  +-------------+  +-------------+             |
|  | [████████]  |  | [████████]  |  | [████████]  |             |
|  | [████████]  |  | [████████]  |  | [████████]  |             |
|  | [████████]  |  | [████████]  |  | [████████]  |             |
|  |             |  |             |  |             |             |
|  | [██████]    |  | [██████]    |  | [██████]    |             |
|  | [████]      |  | [████]      |  | [████]      |             |
|  +-------------+  +-------------+  +-------------+             |
|                                                                |
+================================================================+

[Shimmer animation on all cards simultaneously]
```

**Implementation:**
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {Array.from({ length: 6 }).map((_, i) => (
    <Card key={i}>
      <CardHeader>
        <Skeleton className="h-[120px] w-full rounded-md" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </CardContent>
    </Card>
  ))}
</div>
```

---

### 2.3 Page Loading - Centered Spinner

```
+================================================================+
|  HEADER BAR                                                    |
|  [Breadcrumb: Home > Orders]           [Search] [User Menu]    |
+================================================================+
|                                                                |
|                                                                |
|                                                                |
|                                                                |
|                          [Spinner icon]                        |
|                                                                |
|                       Loading orders...                        |
|                                                                |
|                                                                |
|                                                                |
|                                                                |
|                                                                |
+================================================================+
```

**Components:**
- Centered container
- Spinner: `lucide-react/Loader2` with `animate-spin`
- Optional progress text

**Implementation:**
```tsx
<div className="flex items-center justify-center min-h-[400px]">
  <div className="text-center space-y-3">
    <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
    <p className="text-sm text-gray-500">Loading orders...</p>
  </div>
</div>
```

---

### 2.4 Button Loading - Inline Spinner

```
+----------------------------------+
|  Create Order                    |
+----------------------------------+
|  Customer: [Acme Solar Co  v]    |
|  Product:  [10kWh Battery  v]    |
|  Quantity: [5             ]      |
|                                  |
|  [[○] Creating order...]  [Cancel]|
+----------------------------------+

[Spinner rotates, button disabled, text changes]
```

**Implementation:**
```tsx
<Button disabled={isLoading}>
  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  {isLoading ? "Creating order..." : "Create Order"}
</Button>
```

---

### 2.5 Form Submitting State

```
+================================================================+
|  Add Customer                                      [x Close]   |
+================================================================+
|  [Overlay with opacity 0.5]                                    |
|                                                                |
|  +----------------------------------------------------------+  |
|  |                                                          |  |
|  |                    [Spinner icon]                        |  |
|  |                                                          |  |
|  |                  Creating customer...                    |  |
|  |                                                          |  |
|  |              Please wait a moment.                       |  |
|  |                                                          |  |
|  +----------------------------------------------------------+  |
|                                                                |
+================================================================+
```

**Components:**
- Overlay with loading indicator
- Form fields disabled/dimmed
- Modal blocks interaction

**Implementation:**
```tsx
<Dialog open={isOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Add Customer</DialogTitle>
    </DialogHeader>

    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <Input name="name" disabled={isSubmitting} />
        <Input name="email" disabled={isSubmitting} />
      </div>

      <DialogFooter>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? "Creating..." : "Create Customer"}
        </Button>
      </DialogFooter>
    </form>

    {isSubmitting && (
      <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">Creating customer...</p>
        </div>
      </div>
    )}
  </DialogContent>
</Dialog>
```

---

## 3. Partial States

### 3.1 Lazy Loading - Load More Button

```
+================================================================+
|  Orders                                                        |
+================================================================+
|  Order ID | Customer        | Amount    | Status               |
+================================================================+
|  ORD-001  | Acme Solar Co   | $12,450   | Completed            |
|  ORD-002  | Brisbane Energy | $8,900    | Pending              |
|  ORD-003  | Sydney Systems  | $15,200   | Shipped              |
|  ORD-004  | Melbourne Solar | $6,750    | Processing           |
|  ORD-005  | Perth Batteries | $9,300    | Completed            |
|  ...                                                           |
|  ORD-020  | Adelaide Power  | $11,100   | Pending              |
+================================================================+
|                                                                |
|              Showing 20 of 157 orders                          |
|                                                                |
|                    [Load More Orders]                          |
|                                                                |
+================================================================+
```

**Implementation:**
```tsx
<div className="space-y-4">
  <Table>
    {/* table content */}
  </Table>

  {hasMore && (
    <div className="text-center py-4">
      <p className="text-sm text-gray-500 mb-3">
        Showing {items.length} of {total} orders
      </p>
      <Button
        variant="outline"
        onClick={loadMore}
        disabled={isLoadingMore}
      >
        {isLoadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isLoadingMore ? "Loading..." : "Load More Orders"}
      </Button>
    </div>
  )}
</div>
```

---

### 3.2 Infinite Scroll Indicator

```
+================================================================+
|  Products                                    [Scroll: 45%]     |
+================================================================+
|  [...product cards...]                                         |
|  [...product cards...]                                         |
|  [...product cards...]                                         |
+================================================================+
|                                                                |
|              [○] Loading more products...                      |
|                                                                |
+================================================================+
|  [More products appear below as you scroll]                    |
```

**Implementation:**
```tsx
<InfiniteScroll
  dataLength={items.length}
  next={loadMore}
  hasMore={hasMore}
  loader={
    <div className="text-center py-8">
      <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
      <p className="text-sm text-gray-500 mt-2">Loading more products...</p>
    </div>
  }
  endMessage={
    <div className="text-center py-8 text-sm text-gray-500">
      You've reached the end
    </div>
  }
>
  {items.map(item => <ProductCard key={item.id} {...item} />)}
</InfiniteScroll>
```

---

### 3.3 Background Refresh Indicator

```
+================================================================+
|  Dashboard           [[○] Refreshing...]   [Last: 2 min ago]  |
+================================================================+
|  [Dashboard content with slight opacity overlay]               |
|                                                                |
|  +----------+  +----------+  +----------+  +----------+        |
|  | Revenue  |  | Orders   |  | Pipeline |  | Issues   |        |
|  | $85,340  |  | 47       |  | 23       |  | 7        |        |
|  | [~~~~]   |  | [~~~~]   |  | [~~~~]   |  | [~~~~]   |        |
|  +----------+  +----------+  +----------+  +----------+        |
|                                                                |
|  [Charts and widgets continue normally]                        |
|                                                                |
+================================================================+
```

**Components:**
- Small spinner in header
- Subtle overlay (optional)
- "Last updated" timestamp

**Implementation:**
```tsx
<div className="relative">
  <div className="flex items-center gap-2 mb-4">
    <h1 className="text-2xl font-bold">Dashboard</h1>
    {isRefreshing && (
      <div className="flex items-center gap-1 text-sm text-gray-500">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Refreshing...</span>
      </div>
    )}
    <span className="text-sm text-gray-400 ml-auto">
      Last updated: {formatDistance(lastUpdate, new Date(), { addSuffix: true })}
    </span>
  </div>

  <div className={cn(isRefreshing && "opacity-60 pointer-events-none")}>
    {/* Dashboard content */}
  </div>
</div>
```

---

### 3.4 Stale Data Warning

```
+================================================================+
|  Orders                                                        |
+================================================================+
|  [!] This data may be outdated (last synced 30 minutes ago)   |
|      [Refresh Now] or [Enable Auto-refresh]                    |
+================================================================+
|  Order ID | Customer        | Amount    | Status               |
+================================================================+
|  ORD-001  | Acme Solar Co   | $12,450   | Completed            |
|  ORD-002  | Brisbane Energy | $8,900    | Pending              |
|  ...                                                           |
+================================================================+
```

**Components:**
- Alert banner with warning icon
- Timestamp showing staleness
- Actions to refresh or enable auto-refresh

**Implementation:**
```tsx
<div className="space-y-4">
  {isStale && (
    <Alert variant="warning">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>This data may be outdated</AlertTitle>
      <AlertDescription>
        Last synced {formatDistance(lastSync, new Date(), { addSuffix: true })}
        <div className="flex gap-2 mt-2">
          <Button size="sm" variant="outline" onClick={refresh}>
            Refresh Now
          </Button>
          <Button size="sm" variant="ghost" onClick={enableAutoRefresh}>
            Enable Auto-refresh
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )}

  <Table>{/* content */}</Table>
</div>
```

---

## 4. Error States

### 4.1 Inline Field Error

```
+----------------------------------+
|  Add Customer                    |
+----------------------------------+
|  Name: [Acme Solar Co      ]     |
|                                  |
|  Email: [acme@invalid      ] [!] |
|         ^^^^^^^^^^^^^^^^^^^^     |
|         Invalid email format     |
|                                  |
|  Phone: [                  ]     |
|                                  |
|  [Create Customer]  [Cancel]     |
+----------------------------------+
```

**Implementation:**
```tsx
<FormField name="email">
  <FormLabel>Email</FormLabel>
  <FormControl>
    <Input
      type="email"
      className={cn(errors.email && "border-red-500")}
    />
  </FormControl>
  {errors.email && (
    <FormMessage className="text-red-500">
      {errors.email.message}
    </FormMessage>
  )}
</FormField>
```

---

### 4.2 Form Submission Error

```
+================================================================+
|  Add Customer                                      [x Close]   |
+================================================================+
|  [!] Failed to create customer                                 |
|                                                                |
|      Unable to save customer details. Please check your        |
|      connection and try again.                                 |
|                                                                |
|      Error: Network timeout after 30 seconds                   |
|                                                                |
|      [Dismiss]                                                 |
+================================================================+
|                                                                |
|  Name:  [Acme Solar Co      ]                                  |
|  Email: [contact@acme.com   ]                                  |
|  Phone: [0412 345 678       ]                                  |
|                                                                |
|  [Retry]  [Cancel]                                             |
+================================================================+
```

**Components:**
- Alert banner at top
- Form fields remain filled (don't lose data)
- Retry button enabled

**Implementation:**
```tsx
<Dialog open={isOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Add Customer</DialogTitle>
    </DialogHeader>

    {error && (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Failed to create customer</AlertTitle>
        <AlertDescription>
          {error.message}
          <Button
            variant="ghost"
            size="sm"
            className="ml-2"
            onClick={() => setError(null)}
          >
            Dismiss
          </Button>
        </AlertDescription>
      </Alert>
    )}

    <form onSubmit={handleSubmit}>
      {/* Form fields retain values */}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {error ? "Retry" : "Create Customer"}
        </Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
```

---

### 4.3 Page Load Error

```
+================================================================+
|  HEADER BAR                                                    |
|  [Breadcrumb: Home > Orders]           [Search] [User Menu]    |
+================================================================+
|                                                                |
|                                                                |
|                       [Alert triangle icon]                    |
|                                                                |
|                  Failed to load orders                         |
|                                                                |
|              We couldn't load the orders page.                 |
|              This might be due to a connection issue.          |
|                                                                |
|              Error code: 500 - Internal Server Error           |
|                                                                |
|              [Try Again]    [Go to Dashboard]                  |
|                                                                |
|              Need help? [Contact Support]                      |
|                                                                |
|                                                                |
+================================================================+
```

**Implementation:**
```tsx
<div className="flex items-center justify-center min-h-[600px]">
  <div className="text-center space-y-4 max-w-md">
    <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
    <h2 className="text-xl font-semibold">Failed to load orders</h2>
    <p className="text-sm text-gray-600">
      We couldn't load the orders page. This might be due to a connection issue.
    </p>
    {error && (
      <code className="text-xs bg-gray-100 px-2 py-1 rounded block">
        Error code: {error.code} - {error.message}
      </code>
    )}
    <div className="flex gap-2 justify-center">
      <Button onClick={retry}>Try Again</Button>
      <Button variant="outline" onClick={() => router.push('/dashboard')}>
        Go to Dashboard
      </Button>
    </div>
    <p className="text-xs text-gray-500">
      Need help? <a href="/support" className="text-blue-600 hover:underline">Contact Support</a>
    </p>
  </div>
</div>
```

---

### 4.4 Network Offline

```
+================================================================+
|  [!] You're currently offline                                  |
|      Your changes will be saved when you reconnect.            |
|      [Dismiss]                                                 |
+================================================================+
|  Dashboard                                                     |
+================================================================+
|  [Dashboard content - showing cached/last known state]         |
|                                                                |
|  +----------+  +----------+  +----------+  +----------+        |
|  | Revenue  |  | Orders   |  | Pipeline |  | Issues   |        |
|  | $85,340  |  | 47       |  | 23       |  | 7        |        |
|  | [offline]|  | [offline]|  | [offline]|  | [offline]|        |
|  +----------+  +----------+  +----------+  +----------+        |
|                                                                |
+================================================================+
```

**Components:**
- Persistent banner at top
- "Offline" badge on widgets
- Cached data shown
- Auto-retry on reconnect

**Implementation:**
```tsx
const isOnline = useOnlineStatus();

return (
  <div>
    {!isOnline && (
      <Alert className="mb-4 border-yellow-500 bg-yellow-50">
        <WifiOff className="h-4 w-4 text-yellow-600" />
        <AlertTitle className="text-yellow-900">You're currently offline</AlertTitle>
        <AlertDescription className="text-yellow-800">
          Your changes will be saved when you reconnect.
        </AlertDescription>
      </Alert>
    )}

    <div className="grid grid-cols-4 gap-4">
      {kpis.map(kpi => (
        <Card key={kpi.id}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{kpi.title}</CardTitle>
            {!isOnline && (
              <Badge variant="outline" className="text-xs">
                <WifiOff className="h-3 w-3 mr-1" />
                Offline
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpi.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);
```

---

### 4.5 Permission Denied

```
+================================================================+
|  Customer Details - Acme Solar Co                              |
+================================================================+
|                                                                |
|                                                                |
|                       [Lock icon]                              |
|                                                                |
|                  Permission Denied                             |
|                                                                |
|              You don't have permission to edit                 |
|              customer details.                                 |
|                                                                |
|              Contact your administrator if you need access.    |
|                                                                |
|              [Go Back]    [Request Access]                     |
|                                                                |
|                                                                |
+================================================================+
```

**Implementation:**
```tsx
<div className="flex items-center justify-center min-h-[400px]">
  <div className="text-center space-y-4">
    <Lock className="h-12 w-12 text-gray-400 mx-auto" />
    <h2 className="text-xl font-semibold">Permission Denied</h2>
    <p className="text-sm text-gray-600 max-w-sm">
      You don't have permission to {action} {resource}.
      Contact your administrator if you need access.
    </p>
    <div className="flex gap-2 justify-center">
      <Button variant="outline" onClick={() => router.back()}>
        Go Back
      </Button>
      <Button onClick={requestAccess}>
        Request Access
      </Button>
    </div>
  </div>
</div>
```

---

## 5. Accessibility Standards (WCAG 2.1 AA)

### Keyboard Navigation

- **Error focus:** Automatically focus first error field
- **Loading states:** Announce to screen readers
- **Empty states:** Action buttons keyboard accessible
- **Skip links:** Skip past loading skeletons

### Screen Reader Support

```tsx
// Loading announcement
<div role="status" aria-live="polite" aria-atomic="true">
  {isLoading && <span className="sr-only">Loading orders...</span>}
</div>

// Error announcement
<div role="alert" aria-live="assertive">
  {error && <span>Error: {error.message}</span>}
</div>

// Empty state
<div role="status" aria-label="No results found">
  <p>No customers match your search.</p>
</div>

// Progress indicator
<div role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
  Loading: {progress}%
</div>
```

### Focus Management

- Focus on primary action in empty states
- Focus on first field after error
- Maintain focus position during background refresh
- Return focus after modal dismissal

---

## 6. Animation Guidelines

### Skeleton Shimmer

```css
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.skeleton {
  background: linear-gradient(
    90deg,
    #f0f0f0 0%,
    #f8f8f8 50%,
    #f0f0f0 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}
```

### Fade In/Out

```tsx
// Empty state fade in
<motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  <EmptyState />
</motion.div>

// Loading spinner
<motion.div
  animate={{ rotate: 360 }}
  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
>
  <Loader2 />
</motion.div>
```

### Progressive Loading

- Show skeleton immediately (0ms)
- Fade in content after load (200ms transition)
- Avoid layout shift (reserve space)

---

## 7. Best Practices Summary

### Empty States

- Always provide a clear next action
- Explain why it's empty (no data vs no results vs no access)
- Use friendly, helpful language
- Include relevant illustration/icon

### Loading States

- Show skeleton for <1s loads
- Show spinner for >1s loads
- Disable interactive elements during load
- Preserve scroll position after load

### Error States

- Be specific about what went wrong
- Provide actionable recovery steps
- Don't lose user data on error
- Log errors for debugging

### Partial States

- Clearly indicate more data available
- Show loading state during pagination
- Warn about stale data
- Auto-retry on reconnect

---

## 8. Component Library

Create reusable state components:

```tsx
// components/states/empty-state.tsx
export function EmptyState({ icon, title, description, action }) { ... }

// components/states/loading-state.tsx
export function LoadingState({ message, variant }) { ... }

// components/states/error-state.tsx
export function ErrorState({ error, onRetry }) { ... }

// components/states/skeleton-table.tsx
export function SkeletonTable({ columns, rows }) { ... }

// components/states/skeleton-card.tsx
export function SkeletonCard() { ... }
```

---

## Success Metrics

- Users understand what to do next in empty states
- Loading states appear for <100ms before content shows
- Error messages are actionable (80%+ recovery rate)
- No data loss on form errors
- Screen reader users can navigate all states
- Skeleton layouts match content layouts (no shift)

---

## Integration Points

- **React Query:** `isLoading`, `isError`, `data`, `error` states
- **Form Validation:** Field errors, submission errors
- **Auth System:** Permission denied states
- **Network Detection:** Offline/online states
- **User Preferences:** Skeleton vs spinner preference
