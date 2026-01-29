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
  fontSize,
  lineHeight,
  letterSpacing,
  borderRadius,
  commonStyles,
  formatCurrencyForPdf,
  formatDateForPdf,
  formatNumberForPdf,
  FONT_FAMILY,
  FONT_WEIGHTS,
} from "./theme";

// ============================================================================
// HEADER
// ============================================================================

export { DocumentHeader, type DocumentHeaderProps } from "./header";

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
