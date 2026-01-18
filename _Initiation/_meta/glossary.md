# Glossary

> **Purpose**: Domain terminology for consistent language across PRDs, code, and communication
> **Last Updated**: 2026-01-09
> **Status**: Active

---

## Core Entities

### Customer

| Term | Definition |
|------|------------|
| **Customer** | A business or individual that purchases products or services. Always has an ABN in B2B context. |
| **Contact** | A person associated with a customer. Customers can have multiple contacts with different roles. |
| **Customer Type** | Classification (PLANNED): `residential`, `commercial`, `trade` - NOT YET IMPLEMENTED |
| **Customer Status** | Lifecycle state: `active`, `inactive` |
| **Primary Contact** | The main point of contact for a customer |
| **Billing Address** | Address used for invoicing and financial correspondence |
| **Shipping Address** | Address used for product delivery (can differ from billing) |
| **ABN** | Australian Business Number - required for B2B customers (PLANNED - not yet implemented) |

### Opportunity

| Term | Definition |
|------|------------|
| **Opportunity** | A potential sale being tracked through the pipeline |
| **New** | Initial stage - potential customer has expressed interest (stage: `new`) |
| **Quoted** | Quote has been generated and sent (stage: `quoted`) |
| **Pending** | Awaiting customer decision (stage: `pending`) |
| **Ordered** | Customer has placed an order (stage: `ordered`) |
| **Won** | Opportunity successfully converted (stage: `won`) |
| **Lost** | Opportunity that didn't convert, capture loss reason (stage: `lost`) |
| **Pipeline** | Visual representation of opportunities by stage |
| **Pipeline Value** | Sum of opportunity values at each stage |
| **Conversion Rate** | Percentage of opportunities that become orders |
| **Win Rate** | Won opportunities / (Won + Lost) |

### Quote

> **Note**: Quotes are embedded within Opportunities, not a separate entity

| Term | Definition |
|------|------------|
| **Quote** | Formal price proposal embedded in an Opportunity |
| **Quote Value** | The `value` field on an Opportunity representing quoted amount |
| **Quote Expiry** | `quoteExpiresAt` field indicating when quote becomes invalid |
| **Line Item** | Individual product or service (via opportunity items) |
| **Configured Quote** | Quote with products selected from catalog with standard pricing |

### Order

| Term | Definition |
|------|------------|
| **Order** | Confirmed purchase from a customer |
| **Order Status** | Fulfillment state: `pending_fulfillment`, `ready_to_pick`, `picking`, `ready_to_ship`, `shipped`, `delivered`, `cancelled`, `on_hold` |
| **Order Number** | Unique identifier (format: ORD-YYYYMM-XXXX) |
| **Line Item** | Individual product on an order with quantity and price |
| **Order Total** | Sum of line items plus tax minus discounts |
| **Deposit** | Partial payment required before processing |
| **Balance Due** | Order total minus payments received |

### Product

| Term | Definition |
|------|------------|
| **Product** | Item available for sale (physical or service) |
| **SKU** | Stock Keeping Unit - unique product identifier |
| **Variant** | Product variation (e.g., different capacity battery) |
| **Category** | Product grouping for organization |
| **Unit Price** | Standard selling price before discounts |
| **Cost Price** | What we pay suppliers (for COGS calculation) |
| **COGS** | Cost of Goods Sold - direct costs of products sold |
| **Margin** | (Unit Price - Cost Price) / Unit Price |
| **Active Product** | Available for sale |
| **Discontinued** | No longer sold, but kept for historical orders |

---

## Inventory & Fulfillment

### Inventory

| Term | Definition |
|------|------------|
| **Stock Level** | Current quantity of a product in warehouse |
| **Available Stock** | Stock Level minus Allocated Stock |
| **Allocated Stock** | Reserved for confirmed orders not yet fulfilled |
| **Reorder Point** | Stock level that triggers reorder |
| **Reorder Quantity** | Standard quantity to order from supplier |
| **Safety Stock** | Buffer stock to prevent stockouts |
| **Stock Movement** | Any change to inventory (receive, ship, adjust) |
| **Stock Take** | Physical count of inventory |
| **Variance** | Difference between system count and physical count |

### Stock Types

| Term | Definition |
|------|------------|
| **Serialized** | Items tracked by unique serial number (e.g., batteries) |
| **Non-Serialized** | Items tracked by quantity only (e.g., cables) |
| **Lot-Tracked** | Items grouped by batch/lot number |

### Fulfillment

| Term | Definition |
|------|------------|
| **Fulfillment** | Process of delivering order to customer |
| **Pick** | Selecting items from warehouse for an order |
| **Pack** | Preparing items for shipment |
| **Ship** | Sending items to customer |
| **Picking List** | Document listing items to collect |
| **Packing Slip** | Document included with shipment |
| **Tracking Number** | Carrier-provided shipment identifier |
| **Partial Fulfillment** | Shipping some items when others unavailable |
| **Backorder** | Order for items not currently in stock |

### Receiving

| Term | Definition |
|------|------------|
| **Purchase Order (PO)** | Order placed with supplier |
| **Receiving** | Process of accepting goods from supplier |
| **GRN** | Goods Received Note - document confirming receipt |
| **Inspection** | Quality check of received items |
| **Putaway** | Moving received items to storage location |

---

## Jobs & Projects

### Job

| Term | Definition |
|------|------------|
| **Job** | A project, installation, or service engagement |
| **Job Type** | `installation`, `project`, `service`, `maintenance` |
| **Job Status** | `scheduled`, `in_progress`, `completed`, `cancelled` |
| **Job Number** | Unique identifier (format: JOB-YYYYMM-XXXX) |
| **Site** | Physical location where job is performed |

### Scheduling

| Term | Definition |
|------|------------|
| **Phase** | Major section of work within a job |
| **Task** | Individual work item within a phase |
| **Milestone** | Key checkpoint in project timeline |
| **Baseline** | Original approved schedule for comparison |
| **Critical Path** | Sequence of tasks determining minimum duration |
| **Dependency** | Relationship between tasks (finish-to-start, etc.) |
| **Gantt Chart** | Visual timeline of tasks and dependencies |
| **Resource** | Person, equipment, or material needed for task |
| **Allocation** | Assignment of resource to task |

### Field Operations

| Term | Definition |
|------|------------|
| **Technician** | Field worker assigned to jobs |
| **Dispatcher** | Person who assigns technicians to jobs |
| **Time Entry** | Record of hours worked on a job |
| **Punch List** | List of items to complete before job closeout |
| **Deficiency** | Item on punch list requiring correction |
| **Sign-off** | Customer approval of completed work |

### Job Costing

| Term | Definition |
|------|------------|
| **Bill of Materials (BOM)** | List of products/materials needed for job |
| **Labor Cost** | Cost of technician time |
| **Material Cost** | Cost of products used |
| **Overhead** | Indirect costs allocated to job |
| **Estimated Cost** | Planned total cost |
| **Actual Cost** | Real costs incurred |
| **Variance** | Difference between estimated and actual |
| **Change Order** | Approved modification to scope/cost |

---

## Financial

### Invoicing

| Term | Definition |
|------|------------|
| **Invoice** | Bill sent to customer for payment |
| **Invoice Status** | `draft`, `sent`, `overdue`, `paid`, `cancelled` |
| **Invoice Number** | Unique identifier (synced with Xero) |
| **Due Date** | Date payment is expected |
| **Payment Terms** | Standard payment period (e.g., Net 30) |
| **Overdue** | Invoice past due date without payment |
| **Statement** | Summary of customer's account balance |

### Payments

| Term | Definition |
|------|------------|
| **Payment** | Money received from customer |
| **Payment Method** | `bank_transfer`, `credit_card`, `cash`, `cheque` |
| **Payment Reference** | Customer's reference (e.g., their PO number) |
| **Allocation** | Applying payment to specific invoice(s) |
| **Credit Note** | Document reducing amount owed |
| **Refund** | Money returned to customer |

### Tax & Pricing

| Term | Definition |
|------|------------|
| **GST** | Goods and Services Tax (10% in Australia) |
| **GST Inclusive** | Price includes GST |
| **GST Exclusive** | Price before GST |
| **Tax Invoice** | Invoice meeting ATO requirements |
| **Discount** | Reduction from standard price |
| **Margin** | Profit percentage on sale |

### Progress Billing

| Term | Definition |
|------|------------|
| **Progress Invoice** | Invoice for portion of project completed |
| **Milestone Billing** | Invoice triggered by milestone completion |
| **Retention** | Amount held until final completion |
| **Final Invoice** | Last invoice including retention release |

---

## Support & Warranty

### Issues

| Term | Definition |
|------|------------|
| **Issue** | Customer problem requiring resolution |
| **Issue Type** | `claim`, `question`, `return`, `other` |
| **Issue Status** | `open`, `in_progress`, `on_hold`, `escalated`, `resolved`, `closed` |
| **Priority** | `low`, `normal`, `high`, `urgent` |
| **SLA** | Service Level Agreement - response/resolution targets |
| **First Response** | Initial reply to customer |
| **Resolution** | Action taken to solve the issue |

### Warranty

| Term | Definition |
|------|------------|
| **Warranty** | Guarantee covering product defects |
| **Warranty Period** | Duration of coverage from purchase |
| **Warranty Claim** | Request to exercise warranty |
| **In Warranty** | Product still covered |
| **Out of Warranty** | Coverage expired |
| **RMA** | Return Merchandise Authorization |
| **Replacement** | New product provided under warranty |
| **Repair** | Fixing defective product |

---

## Integration Terms

### Xero

| Term | Definition |
|------|------------|
| **Xero Contact** | Customer/supplier record in Xero |
| **Xero Contact ID** | Unique identifier linking Renoz customer to Xero |
| **Xero Invoice** | Invoice synced to Xero |
| **Sync Status** | `pending`, `synced`, `error` |
| **Last Sync** | Timestamp of most recent synchronization |

### Email (Resend)

| Term | Definition |
|------|------------|
| **Template** | Reusable email format |
| **Merge Field** | Placeholder replaced with data (e.g., {{customer.name}}) |
| **Delivery Status** | `queued`, `sent`, `delivered`, `bounced`, `failed` |

### AI (Claude)

| Term | Definition |
|------|------------|
| **AI Assist** | Claude-powered feature |
| **Generation** | AI-created content (quotes, emails, etc.) |
| **Extraction** | AI-parsed data from documents |
| **Suggestion** | AI-recommended action |

---

## User Roles

| Role | Definition |
|------|------------|
| **Admin** | Full system access, user management |
| **Sales** | Customer, opportunity, quote, order access |
| **Warehouse** | Inventory, fulfillment, receiving access |
| **Finance** | Invoice, payment, reporting access |
| **Viewer** | Read-only access to assigned areas |

---

## Status Enums Reference

### Common Patterns (ACTUAL CODE VALUES)

| Entity | Statuses |
|--------|----------|
| **Customer** | `active`, `inactive` |
| **Opportunity** | `new`, `quoted`, `pending`, `ordered`, `won`, `lost` |
| **Order** | `pending_fulfillment`, `ready_to_pick`, `picking`, `ready_to_ship`, `shipped`, `delivered`, `cancelled`, `on_hold` |
| **Payment** | `pending`, `partial`, `paid` |
| **Invoice** | `draft`, `sent`, `overdue`, `paid`, `cancelled` |
| **Job Assignment** | `scheduled`, `in_progress`, `completed`, `cancelled` |
| **Issue** | `open`, `in_progress`, `on_hold`, `escalated`, `resolved`, `closed` |
| **Issue Type** | `claim`, `question`, `return`, `other` |
| **Issue Priority** | `low`, `normal`, `high`, `urgent` |
| **Warranty** | `active`, `expired`, `claimed`, `void` |
| **Inventory Item** | `available`, `allocated`, `sold`, `damaged`, `returned` |
| **Purchase Order** | `draft`, `sent`, `in_transit`, `partially_received`, `received`, `cancelled` |
| **Sync** | `pending`, `synced`, `error` |
| **User** | `active`, `invited`, `suspended` |
| **Organization** | `active`, `suspended`, `cancelled` |

### Inventory Movement Types

| Type | Description |
|------|-------------|
| `received` | Items received from supplier |
| `allocated` | Items reserved for an order |
| `deallocated` | Items released from reservation |
| `sold` | Items shipped to customer |
| `adjusted` | Manual stock adjustment |
| `returned` | Items returned by customer |

---

## Abbreviations

| Abbr | Full Term |
|------|-----------|
| ABN | Australian Business Number |
| AUD | Australian Dollar |
| BOM | Bill of Materials |
| COGS | Cost of Goods Sold |
| GRN | Goods Received Note |
| GST | Goods and Services Tax |
| PO | Purchase Order |
| RMA | Return Merchandise Authorization |
| SKU | Stock Keeping Unit |
| SLA | Service Level Agreement |

---

*Use these terms consistently in all PRDs, code, and documentation.*
