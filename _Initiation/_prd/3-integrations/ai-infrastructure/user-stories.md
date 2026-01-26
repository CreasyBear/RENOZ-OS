# AI Assistant User Stories

User stories organized by CRM domain, showing how users interact with the AI assistant.

## Customers Domain

### Search & Lookup

**CUS-001: Find customer by name**
> "Find John Smith"

- AI searches customers by name
- Returns profile summary: name, company, email, phone, status
- Shows recent activity (last 3-5 interactions)
- Highlights any flags (overdue invoices, churn risk)
- Link to full customer profile

**CUS-002: Find customer by context**
> "Who ordered the windows for the Elm Street project?"

- AI cross-references orders, jobs, and customers
- Returns customer with relevant order/job context
- Shows the specific order mentioned

**CUS-003: List customers by criteria**
> "Show me all customers in Austin"
> "Which customers haven't ordered in 6 months?"
> "List customers tagged as 'commercial'"

- AI queries with filters
- Returns table: name, last order date, total revenue, status
- Sortable by relevance to query

### Customer Insights

**CUS-004: Customer history**
> "What's the history with ABC Corp?"

- Returns timeline of interactions
- Orders, quotes, jobs, communications
- Key metrics: lifetime value, order frequency, avg order size

**CUS-005: Churn risk identification**
> "Which customers are at risk of churning?"

- AI analyzes order patterns, engagement, payment history
- Returns ranked list with risk factors
- Suggests follow-up actions

### Customer Actions

**CUS-006: Add customer note**
> "Add a note to John Smith: discussed new project starting in March"

- AI creates draft note
- Shows: customer name, note content, timestamp
- User approves → note saved
- User edits → modify before saving
- User discards → nothing saved

**CUS-007: Update customer status**
> "Mark ABC Corp as inactive"

- AI creates draft status change
- Shows current vs proposed status
- User approves → status updated

---

## Orders Domain

### Order Lookup

**ORD-001: Recent orders**
> "Show me recent orders"
> "What orders came in this week?"

- AI respects current dashboard date filter (parameter resolution)
- Returns table: order #, customer, total, status, date
- Summary row with totals

**ORD-002: Customer orders**
> "Show me John Smith's orders"

- AI filters by customer
- Returns order history with status
- Shows lifetime order value

**ORD-003: Order status**
> "What's the status of order #1234?"
> "Is the Johnson order ready?"

- AI looks up specific order
- Returns: status, line items, dates, assigned job (if any)
- Shows fulfillment progress

### Order Actions

**ORD-004: Create order**
> "Create an order for John Smith - 10 double-hung windows"

- AI resolves customer (searches if needed)
- AI resolves products (searches catalog)
- Creates draft order with line items, pricing
- Shows: customer, items, quantities, unit prices, total
- User approves → order created
- User edits → modify line items/quantities
- User discards → nothing saved

**ORD-005: Add to existing order**
> "Add 5 casement windows to order #1234"

- AI looks up order
- Validates order is still editable
- Creates draft amendment
- Shows: original items + new items + new total
- User approves → order updated

**ORD-006: Cancel order**
> "Cancel order #1234"

- AI looks up order
- Shows order details and cancellation impact
- Requires explicit approval
- User approves → order cancelled with reason logged

---

## Quotes Domain

### Quote Lookup

**QUO-001: Recent quotes**
> "Show me quotes from this month"
> "What quotes are pending?"

- Returns table: quote #, customer, total, status, created date, expiry
- Highlights quotes expiring soon

**QUO-002: Customer quotes**
> "What quotes did we send to ABC Corp?"

- Returns quote history for customer
- Shows which converted to orders

### Quote Actions

**QUO-003: Create quote**
> "Create a quote for Jane Doe - 15 windows and 3 doors, installed"

- AI resolves customer
- AI resolves products and services
- Calculates pricing based on current rates
- Creates draft quote
- Shows: line items, labor, materials, total, valid until date
- User approves → quote created
- User edits → modify before saving

**QUO-004: Revise quote**
> "Update the Johnson quote - change to 20 windows instead of 15"

- AI finds most recent quote for customer
- Creates new version with changes
- Shows diff: old vs new totals
- User approves → new version created, old version archived

**QUO-005: Convert quote to order**
> "Convert quote #Q-456 to an order"

- AI validates quote is still valid
- Creates draft order from quote
- Shows: quote details → order preview
- User approves → order created, quote marked as won

---

## Jobs Domain

### Job Lookup

**JOB-001: Job status**
> "What's the status of the Johnson installation?"
> "Where are we on job #J-789?"

- Returns: job status, assigned crew, scheduled dates, completion %
- Shows related order and customer
- Lists any blockers or notes

**JOB-002: Today's jobs**
> "What jobs are scheduled for today?"
> "What's on the calendar this week?"

- Returns schedule view: job, customer, address, crew, time
- Grouped by date if multi-day query

**JOB-003: Crew assignments**
> "What jobs does Mike have this week?"
> "Who's assigned to the Elm Street job?"

- Returns crew schedule or job assignments
- Shows conflicts if any

### Job Actions

**JOB-004: Schedule job**
> "Schedule the Johnson installation for next Tuesday"

- AI finds related order/job
- Creates draft schedule entry
- Shows: job details, proposed date, crew availability
- User approves → job scheduled
- Notifies assigned crew (if notifications enabled)

**JOB-005: Reassign job**
> "Move the Elm Street job to Thursday"
> "Assign Mike to the Johnson job"

- AI creates draft change
- Shows: current assignment → proposed assignment
- Highlights conflicts
- User approves → schedule updated

**JOB-006: Complete job**
> "Mark the Johnson job as complete"

- AI creates draft status change
- Shows: job details, completion checklist status
- User approves → job marked complete
- Triggers invoice generation if configured

---

## Invoices & Payments Domain

### Invoice Lookup

**INV-001: Outstanding invoices**
> "Show me unpaid invoices"
> "What's outstanding for ABC Corp?"

- Returns table: invoice #, customer, amount, due date, days overdue
- Highlights overdue items
- Shows total outstanding

**INV-002: Overdue invoices**
> "Which invoices are overdue?"
> "Show me invoices more than 30 days past due"

- Returns overdue list sorted by age
- Shows aging buckets (30/60/90 days)
- Includes customer contact info for follow-up

### Invoice Actions

**INV-003: Send payment reminder**
> "Send a payment reminder to John Smith for invoice #I-123"

- AI drafts reminder email
- Shows: recipient, subject, body preview
- User approves → email sent
- User edits → modify message before sending

**INV-004: Record payment**
> "Record a $500 payment from ABC Corp on invoice #I-456"

- AI creates draft payment record
- Shows: invoice details, payment amount, remaining balance
- User approves → payment recorded
- Updates invoice status if paid in full

**INV-005: Create invoice from job**
> "Invoice the Johnson job"

- AI pulls job details and line items
- Creates draft invoice
- Shows: customer, line items, totals, payment terms
- User approves → invoice created and optionally sent

---

## Analytics & Reporting Domain

### Revenue & Sales

**ANA-001: Revenue summary**
> "What's our revenue this month?"
> "How did we do last quarter?"

- Returns: total revenue, comparison to prior period, growth %
- Breaks down by category if relevant
- Uses dashboard date filter if set

**ANA-002: Revenue by customer**
> "Who are our top customers?"
> "Revenue breakdown by customer this year"

- Returns ranked table: customer, revenue, order count, avg order
- Shows % of total revenue

**ANA-003: Sales pipeline**
> "What's in the pipeline?"
> "How many quotes are pending?"

- Returns: open quotes by status, total value, expected close dates
- Shows conversion rate trends

### Operational Metrics

**ANA-004: Job metrics**
> "How many jobs did we complete this month?"
> "What's our average job completion time?"

- Returns: completed jobs count, avg duration, on-time %
- Comparison to prior period

**ANA-005: Customer metrics**
> "How many new customers this quarter?"
> "What's our customer retention rate?"

- Returns: new customers, churned customers, net growth
- Lifetime value trends

---

## Communications Domain

### Communication History

**COM-001: Recent communications**
> "When did we last contact John Smith?"
> "Show me communications with ABC Corp"

- Returns: communication timeline (calls, emails, meetings)
- Shows: date, type, summary, who handled it

### Communication Actions

**COM-002: Log a call**
> "Log a call with John Smith - discussed the March project, he'll send dimensions next week"

- AI creates draft communication log
- Shows: customer, type (call), summary, date
- User approves → logged

**COM-003: Schedule follow-up**
> "Schedule a follow-up with Jane Doe for next Friday"

- AI creates draft task/reminder
- Shows: customer, date, suggested subject
- User approves → reminder created

**COM-004: Draft email**
> "Draft an email to John Smith about his quote"

- AI drafts email based on context (recent quote, etc.)
- Shows: recipient, subject, body
- User edits/approves → queued or sent

---

## Multi-Step Workflows

### Batch Operations

**WF-001: Follow up on stale quotes**
> "Follow up with everyone who got a quote last month but didn't order"

- AI identifies qualifying customers
- Shows list with quote details
- User selects which to contact
- AI drafts personalized messages for each
- User reviews/approves batch send

**WF-002: Payment collection campaign**
> "Send reminders for all invoices over 30 days overdue"

- AI identifies overdue invoices
- Shows list with customer, amount, age
- AI drafts reminder for each
- User reviews/approves batch send

### Complex Queries

**WF-003: Customer 360**
> "Give me everything on ABC Corp"

- AI aggregates: profile, orders, quotes, jobs, invoices, communications
- Returns comprehensive summary with key metrics
- Links to each section for details

**WF-004: Project status**
> "What's the full status of the Johnson project?"

- AI traces: quote → order → job → invoice
- Shows each stage with status
- Highlights what's pending/blocked

---

## Products & Catalog Domain

### Product Lookup

**PRD-001: Find product**
> "What's the price for double-hung windows?"
> "Find product SKU-12345"

- AI searches product catalog
- Returns: name, SKU, price, availability, description
- Shows variants if applicable (sizes, colors)

**PRD-002: Product availability**
> "Do we have casement windows in stock?"
> "What's available in the premium line?"

- Returns: product, on-hand qty, committed qty, available qty
- Highlights low stock items

**PRD-003: Pricing lookup**
> "What's the markup on Anderson windows?"
> "Show me pricing for all door products"

- Returns: product, cost, price, margin
- Grouped by category if broad query

### Product Actions

**PRD-004: Update pricing** (requires approval)
> "Increase prices on all windows by 5%"

- AI calculates new prices
- Shows: product, old price, new price, change
- User approves → prices updated

---

## Inventory Domain

### Inventory Lookup

**INV-001: Stock levels**
> "What's our inventory on windows?"
> "Show me low stock items"

- Returns: product, on-hand, committed, available, reorder point
- Highlights items below reorder point

**INV-002: Inventory by location**
> "What's in the warehouse?"
> "Show me inventory at the showroom"

- Returns stock levels by location
- Shows transfer opportunities

**INV-003: Inventory value**
> "What's our total inventory value?"
> "What's the value of window inventory?"

- Returns: product category, qty, unit cost, total value
- Summary with total

### Inventory Actions

**INV-004: Adjust inventory** (requires approval)
> "Adjust SKU-123 to 50 units - found during count"

- AI creates draft adjustment
- Shows: product, old qty, new qty, variance, reason
- User approves → adjustment recorded

**INV-005: Transfer inventory** (requires approval)
> "Transfer 10 windows from warehouse to showroom"

- AI creates draft transfer
- Shows: product, from location, to location, qty
- User approves → transfer recorded

**INV-006: Receive inventory** (no approval needed)
> "Receive PO-456 - 20 windows arrived"

- AI looks up purchase order
- Records receipt against PO
- Shows: items received, remaining on order
- Executes immediately (low risk, reversible)

---

## Warranties Domain

### Warranty Lookup

**WAR-001: Customer warranties**
> "What warranties does John Smith have?"
> "Show me active warranties"

- Returns: product, purchase date, warranty end, status
- Highlights expiring soon

**WAR-002: Warranty status**
> "Is the Johnson installation still under warranty?"
> "Check warranty for order #1234"

- Returns: coverage details, expiration, claims history
- Shows what's covered

**WAR-003: Expiring warranties**
> "Which warranties expire this month?"

- Returns list for proactive outreach
- Shows customer contact info

### Warranty Actions

**WAR-004: Register warranty** (no approval needed)
> "Register warranty for order #1234"

- AI extracts order details
- Creates warranty record
- Shows: product, customer, coverage period
- Executes immediately (standard process)

**WAR-005: File warranty claim** (requires approval)
> "File a warranty claim for John Smith's window - seal failure"

- AI creates draft claim
- Shows: product, issue, coverage verification
- User approves → claim created, workflow triggered

---

## Supplier & Purchasing Domain

### Supplier Lookup

**SUP-001: Supplier info**
> "What's Anderson's contact info?"
> "Who supplies casement windows?"

- Returns: supplier name, contact, products, terms
- Shows recent order history

**SUP-002: Purchase history**
> "What did we order from Anderson last month?"
> "Show me recent POs"

- Returns: PO #, supplier, total, status, date
- Summary with totals

### Purchasing Actions

**SUP-003: Create purchase order** (requires approval)
> "Order 50 windows from Anderson"

- AI resolves supplier and products
- Creates draft PO with pricing
- Shows: items, quantities, costs, total
- User approves → PO created and optionally sent

**SUP-004: Check reorder needs**
> "What do we need to reorder?"

- AI checks inventory vs reorder points
- Returns: product, current qty, reorder point, suggested qty
- Can generate draft POs for approval

---

## Cross-Cutting Concerns

### Context Awareness

All queries respect:
- **Organization scope** - Only shows data for user's organization
- **User permissions** - Respects role-based access
- **Dashboard filters** - Uses date range if set on current view
- **Conversation context** - "Show their orders" works after finding a customer

### Approval Patterns

**Requires Approval (High Impact):**
- Creating/modifying orders, quotes (money)
- Sending emails (external communication)
- Cancelling orders (business impact)
- Adjusting inventory (financial records)
- Changing prices (revenue impact)
- Filing warranty claims (liability)
- Creating purchase orders (spending money)

**No Approval Needed (Low Impact, Reversible):**
- Adding notes to records
- Logging calls/communications
- Receiving inventory against POs
- Registering warranties
- Creating follow-up reminders
- Updating tags/categories

For high-impact actions:
1. AI creates draft
2. User sees preview of what will happen
3. User can: Approve (execute), Edit (modify draft), Discard (cancel)
4. Only approved actions hit the database

### Error Handling

- Not found → "I couldn't find a customer named 'Jon Smithe'. Did you mean John Smith?"
- Ambiguous → "I found 3 customers named 'Smith'. Which one: John Smith, Jane Smith, or Bob Smith?"
- Permission denied → "You don't have permission to create orders. Contact your admin."
- Invalid operation → "Order #1234 is already shipped and can't be modified."
- Insufficient stock → "Only 5 windows available, but order requires 10."

---

## Insights from Midday's Approach

Based on analysis of [Midday's AI implementation](https://github.com/midday-ai/midday):

### What They Do Well

1. **Read-heavy tools** - 30+ query tools, only 2 mutation tools
2. **Financial metrics focus** - burn rate, runway, profit analysis, forecasting
3. **Example queries in UI** - "What's my profit for last year?", "What is my spending on Software?"
4. **Follow-up capable** - "Ask follow-up questions and dig deeper into your data"
5. **Artifact visualizations** - Charts and graphs for financial data

### Applicable Patterns

| Midday Feature | Renoz Equivalent |
|----------------|------------------|
| get-transactions | getOrders, getInvoices |
| get-customers | searchCustomers, getCustomer |
| get-profit-analysis | getRevenue, getMargins |
| get-runway | (not applicable - different domain) |
| get-burn-rate | getExpenses, getCostAnalysis |
| get-documents (receipts/invoices) | getDocuments (contracts, warranties) |
| create-tracker-entry (no approval) | addNote, logCall (no approval) |

### Key Differences

- **CRM vs Finance** - Renoz is action-oriented (create orders, schedule jobs), Midday is analysis-oriented
- **More mutations** - CRM needs more write operations than financial tracking
- **Approval gates** - Renoz needs HITL for business-critical actions
- **Operational focus** - Jobs, scheduling, crew management don't exist in Midday

Sources:
- [Midday GitHub](https://github.com/midday-ai/midday)
- [Midday Assistant Announcement](https://midday.ai/updates/assistant/)
