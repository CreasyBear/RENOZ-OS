/**
 * Operational Document Templates
 *
 * PDF templates for warehouse, shipping, and field operations.
 * These documents focus on operational details rather than financial information.
 */

export {
  DeliveryNotePdfDocument,
  DeliveryNotePdfTemplate,
  type DeliveryNoteDocumentData,
  type DeliveryNoteLineItem,
  type DeliveryNotePdfDocumentProps,
  type DeliveryNotePdfTemplateProps,
} from "./delivery-note";

export {
  WorkOrderPdfDocument,
  WorkOrderPdfTemplate,
  type WorkOrderDocumentData,
  type WorkOrderChecklistItem,
  type WorkOrderMaterial,
  type WorkOrderPriority,
  type WorkOrderPdfDocumentProps,
  type WorkOrderPdfTemplateProps,
} from "./work-order";

export {
  PackingSlipPdfDocument,
  PackingSlipPdfTemplate,
  type PackingSlipDocumentData,
  type PackingSlipLineItem,
  type PackingSlipPdfDocumentProps,
  type PackingSlipPdfTemplateProps,
} from "./packing-slip";
