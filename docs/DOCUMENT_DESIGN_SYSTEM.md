# PDF Document Design System

Design system for Renoz PDF documents. **Level 100** = each document is best-in-class for its specific application. Design serves function.

---

## Level 100 Bar

**Level 100** = A recipient feels the document was crafted for its purpose — not generic, not templated. The document disappears into its purpose.

### Per-Document Success Criteria

| Document | Purpose | Level 100 Success |
|----------|---------|-------------------|
| **Quote** | Win business; inspire confidence | Feels premium. Total and validity impossible to miss. Layout says "we take this seriously." One glance = trust. |
| **Invoice** | Get paid; reduce friction | Payment details prominent. Due date unmissable. Zero ambiguity. Paid watermark (when applicable) feels earned, not tacky. |
| **Credit Note** | Formal record of credit | Matches invoice quality. Credit amount prominent. Unambiguous. Professional. |
| **Pro Forma** | Pre-invoice commitment | Same gravitas as invoice. Clear what's being committed. |
| **Delivery Note** | Verify receipt; accountability | Scannable in 5 seconds. Checkboxes obvious. Shipping details clear. Professional enough to sign without hesitation. |
| **Packing Slip** | Pick, pack, ship | Practical. Location column (if used) legible. Fragile/weight cues obvious. No ambiguity on quantities. |
| **Work Order** | Execute in field | Usable on a roof or in a van. Checklist scannable. Materials list prominent. Sign-off blocks obvious. Priority visible. |
| **Warranty Certificate** | Trust; legal record; keepsake | Prestigious. Feels framable. Seal and border convey formality. QR for verification. Customer proud to keep it. |
| **Completion Certificate** | Closure; satisfaction | Celebratory but professional. "We finished your project." Memorable. |
| **Handover Pack** | Complete handover bundle | Cohesive. Feels like a package, not scattered pages. Sections flow. Comprehensive. |
| **Report Summary** | Inform; drive action | Executive-ready. Data-dense but readable. Metrics hierarchy clear. No clutter. |

---

## Document Families

| Family | Documents | Shared Traits |
|--------|-----------|---------------|
| **Financial** | Quote, Invoice, Credit Note, Pro Forma | Line items table, summary box, payment/terms. Fixed header on multi-page. |
| **Operational** | Delivery Note, Packing Slip, Work Order | Item lists, checkboxes, shipping/carrier info. Field-usable. |
| **Certificate** | Warranty, Completion, Handover Pack | Border, seal, formal tone. Centred layouts. |
| **Report** | Report Summary | Metric cards, data tables. Executive-ready. |

---

## Page Dimensions

- **Size**: A4 (595 × 842 pt)
- **Orientation**: Portrait (landscape only where justified)
- **DPI**: 72 (default)

---

## Page Margins

Canonical values from `theme.ts` — use these exclusively:

| Token | Value (pt) |
|-------|------------|
| `pageMargins.top` | 40 |
| `pageMargins.bottom` | 40 |
| `pageMargins.left` | 48 |
| `pageMargins.right` | 48 |

**Fixed header clearance**: When fixed header is present, add `marginTop: fixedHeaderClearance` to main content (from theme; value 56).
**Fixed footer clearance**: Reserve `paddingBottom: 40` for PageNumber area.

---

## Section Spacing (Vertical Rhythm)

| Context | Token | Value (pt) |
|---------|-------|------------|
| Between major sections | `spacing.xl` | 24 |
| Between subsections | `spacing.lg` | 16 |
| Between related items | `spacing.md` | 12 |
| Within rows | `spacing.sm` | 8 |
| Tight spacing | `spacing.xs` | 4 |

---

## Typography Scale

| Style | Token | Size | Weight | Use |
|-------|-------|------|--------|-----|
| Display | `fontSize["4xl"]` | 32pt | Bold | Certificate titles |
| H1 | `fontSize["3xl"]` | 24pt | Semibold | Document titles |
| H2 | `fontSize["2xl"]` | 20pt | Semibold | Section headers |
| H3 | `fontSize.xl` | 16pt | Medium | Subsections |
| Body | `fontSize.base` | 11pt | Regular | Main content |
| Body small | `fontSize.sm` | 10pt | Regular | Secondary text |
| Label | `fontSize.xs` | 9pt | Medium | Uppercase labels |

**Line height**: Body = `lineHeight.relaxed` (1.5). Headings = `lineHeight.snug` (1.3) or `lineHeight.tight` (1.2).

---

## Color Usage

| Token | Hex | Use |
|-------|-----|-----|
| `colors.text.primary` | #1C1C1E | Headings, key values |
| `colors.text.secondary` | #636366 | Body text |
| `colors.text.muted` | #8E8E93 | Labels, captions only |
| `colors.background.white` | #FFFFFF | Page background |
| `colors.background.card` | #FAFAFA | Summary boxes, cards |
| `colors.border.light` | #E5E5EA | Dividers, table borders |
| `colors.status.success` | #34C759 | Paid, complete |
| `colors.status.warning` | #FF9500 | Expiry, attention |

**Contrast**: Minimum 4.5:1 for body text. Reserve `text.muted` for labels/captions only.

---

## Border Radius

| Token | Value |
|-------|-------|
| `borderRadius.sm` | 6pt |
| `borderRadius.md` | 8pt |
| `borderRadius.lg` | 12pt |

---

## Table Styling

- **Header row**: `paddingVertical: spacing.sm`, `paddingHorizontal: spacing.md`, `fontWeight: semibold`, `color: text.muted`
- **Body rows**: `paddingVertical: spacing.md`, `borderBottomWidth: 0.5`, `borderBottomColor: border.light`
- **Column alignment**: Numbers (qty, price, amount) right-aligned. Description left-aligned.

---

## Document Metadata

All Documents must include:

- `title`: Document-specific (e.g. "Quote Q-2024-001")
- `author`: Organization name
- `subject`: Brief description
- `creator`: "Renoz" or "Renoz CRM"
- `language`: "en-AU"

---

## Key Principle

**Design serves function.** A quote persuades. An invoice accelerates payment. A warranty certificate inspires trust. A work order enables execution. Level 100 = the document disappears into its purpose.
