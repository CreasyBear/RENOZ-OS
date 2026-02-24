/**
 * Document layout constants (Xero/Cin7 production quality + refinement)
 *
 * Use for Invoice, Quote, Credit Note, Pro Forma, Delivery Note, Packing Slip.
 * @see docs/DOCUMENT_DESIGN_SYSTEM.md
 */

export const DOCUMENT_PAGE_MARGINS = { top: 20, bottom: 20, left: 20, right: 20 };
export const DOCUMENT_FONT_SIZE = 9; // Labels, meta, table headers
export const DOCUMENT_BODY_FONT_SIZE = 10; // Descriptions, addresses, line items (print-readable)
export const DOCUMENT_TOTAL_FONT_SIZE = 21;
export const DOCUMENT_TABLE_ROW_PADDING = 5;
export const DOCUMENT_BORDER_COLOR = "#1C1C1E"; // Soft black (colors.text.primary) — refined, less harsh
export const DOCUMENT_LINE_HEIGHT = 1.4; // Body text readability
export const DOCUMENT_SUMMARY_WIDTH = 250;
export const DOCUMENT_SUMMARY_MARGIN_TOP = 60;
export const DOCUMENT_LOGO_HEIGHT = 72; // Proportional to header
export const DOCUMENT_LOGO_MAX_WIDTH = 300;
/** Clearance for minimal fixed header (org + doc #) on all pages */
export const DOCUMENT_FIXED_HEADER_CLEARANCE = 28;
/** Spacing scale: xs=4, sm=8, md=12, lg=16, xl=20 */
export const DOCUMENT_SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20 } as const;
