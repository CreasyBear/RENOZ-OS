/**
 * PDF Document Components
 *
 * Reusable components for building PDF documents.
 */

// ============================================================================
// THEME
// ============================================================================

export {
  colors,
  spacing,
  pageMargins,
  fixedHeaderClearance,
  fontSize,
  lineHeight,
  letterSpacing,
  tabularNums,
  borderRadius,
  commonStyles,
  formatCurrencyForPdf,
  formatDateForPdf,
  formatNumberForPdf,
  FONT_FAMILY,
  FONT_WEIGHTS,
} from "./theme";

// ============================================================================
// DOCUMENT LAYOUT CONSTANTS & UTILITIES
// ============================================================================

export {
  DOCUMENT_PAGE_MARGINS,
  DOCUMENT_FONT_SIZE,
  DOCUMENT_BODY_FONT_SIZE,
  DOCUMENT_TOTAL_FONT_SIZE,
  DOCUMENT_TABLE_ROW_PADDING,
  DOCUMENT_BORDER_COLOR,
  DOCUMENT_LINE_HEIGHT,
  DOCUMENT_SUMMARY_WIDTH,
  DOCUMENT_SUMMARY_MARGIN_TOP,
  DOCUMENT_LOGO_HEIGHT,
  DOCUMENT_LOGO_MAX_WIDTH,
  DOCUMENT_FIXED_HEADER_CLEARANCE,
  DOCUMENT_SPACING,
} from "./document-constants";

export { formatAddressLines, type AddressInput } from "./address-utils";

export {
  DocumentFixedHeader,
  type DocumentFixedHeaderProps,
} from "./document-fixed-header";

// ============================================================================
// HEADER
// ============================================================================

export {
  DocumentHeader,
  FixedDocumentHeader,
  type DocumentHeaderProps,
  type FixedDocumentHeaderProps,
} from "./header";

// ============================================================================
// ADDRESS
// ============================================================================

export {
  AddressBlock,
  AddressColumns,
  type AddressData,
  type AddressBlockProps,
  type AddressColumnsProps,
} from "./address-block";

// ============================================================================
// LINE ITEMS
// ============================================================================

export { LineItems, type LineItemsProps } from "./line-items";

// ============================================================================
// SUMMARY
// ============================================================================

export { Summary, type SummaryProps } from "./summary";

// ============================================================================
// FOOTER
// ============================================================================

export {
  Terms,
  Notes,
  PaymentDetails,
  PageNumber,
  DocumentFooter,
  type TermsProps,
  type NotesProps,
  type PaymentDetailsProps,
  type DocumentFooterProps,
  type PageNumberProps,
} from "./footer";

// ============================================================================
// QR CODE
// ============================================================================

export {
  QRCode,
  generateQRCode,
  type QRCodeProps,
  type GenerateQRCodeOptions,
} from "./qr-code";

// ============================================================================
// WATERMARK
// ============================================================================

export { PaidWatermark, type PaidWatermarkProps } from "./paid-watermark";

// ============================================================================
// CERTIFICATE BORDER
// ============================================================================

export {
  CertificateBorder,
  CertificateDivider,
  CertificateSeal,
  type CertificateBorderProps,
  type CertificateDividerProps,
  type CertificateSealProps,
} from "./certificate-border";

// ============================================================================
// SIGNATURE LINE
// ============================================================================

export {
  SignatureLine,
  DeliveryAcknowledgment,
  WorkOrderSignOff,
  type SignatureLineProps,
  type DeliveryAcknowledgmentProps,
  type WorkOrderSignOffProps,
} from "./signature-line";

// ============================================================================
// SERIAL NUMBERS
// ============================================================================

export {
  SerialNumbersCell,
  type SerialNumbersCellProps,
} from "./serial-numbers-cell";

// ============================================================================
// ICONS
// ============================================================================

export {
  MailIcon,
  CheckIcon,
  FileTextIcon,
  ExternalLinkIcon,
  type PdfIconProps,
} from "./icons";
