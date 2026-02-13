/**
 * Document Preview Renderers
 *
 * Registry of document-type → renderer functions for preview.
 * Replaces the large switch in preview-document.tsx.
 *
 * @see docs/DOCUMENT_DESIGN_SYSTEM.md
 */

import type { ReactElement } from 'react';
import {
  QuotePdfDocument,
  InvoicePdfDocument,
  ProFormaPdfDocument,
  DeliveryNotePdfDocument,
  PackingSlipPdfDocument,
  ReportSummaryPdfDocument,
} from '@/lib/documents';
import { WorkOrderPdfDocument } from '@/lib/documents/templates/operational/work-order';
import { WarrantyCertificatePdfDocument } from '@/lib/documents/templates/certificates/warranty';
import { CompletionCertificatePdfDocument } from '@/lib/documents/templates/certificates/completion';
import { HandoverPackPdfDocument } from '@/lib/documents/templates/certificates/handover-pack';
import type { DocumentOrganization, DocumentOrder, DocumentLineItem } from '@/lib/documents/types';

export type PreviewDocumentType =
  | 'quote'
  | 'invoice'
  | 'pro_forma'
  | 'delivery_note'
  | 'packing_slip'
  | 'work_order'
  | 'warranty_certificate'
  | 'completion_certificate'
  | 'handover_pack'
  | 'report_summary';

export interface PreviewRenderContext {
  documentType: PreviewDocumentType;
  documentData: {
    organization: Record<string, unknown>;
    customer: {
      name: string;
      email?: string;
      phone?: string;
      address?: string;
      addressLine2?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      postcode?: string;
      country?: string;
    };
    order: {
      orderNumber: string;
      createdAt: string;
      dueDate?: string;
      validUntil: string;
      lineItems: Array<{ description: string; quantity: number; unitPrice: number; total: number; sku?: string }>;
      subtotal: number;
      taxRate?: number;
      taxAmount: number;
      discount?: number;
      total: number;
      notes?: string;
      terms?: string;
    };
    warranty: {
      certificateNumber: string;
      productName: string;
      serialNumber: string;
      coverageYears: number;
      startDate: string;
      endDate: string;
      terms: string;
    };
    job: {
      jobNumber: string;
      title: string;
      description: string;
      scheduledDate: string;
      tasks: Array<{ name: string; completed: boolean }>;
      materials: Array<{ name: string; quantity: number; unit?: string }>;
    };
  };
  orgData: DocumentOrganization;
  baseOrder: DocumentOrder;
  baseLineItems: DocumentLineItem[];
  orderDate: Date;
  dueDate: Date;
  validUntil: Date;
  qrCodeDataUrl?: string;
  viewUrl?: string;
}

type PreviewRenderer = (ctx: PreviewRenderContext) => ReactElement;

function shippingAddressFromContext(ctx: PreviewRenderContext) {
  const c = ctx.documentData.customer;
  return {
    addressLine1: c.address ?? '',
    addressLine2: c.addressLine2,
    city: c.city ?? '',
    state: c.state ?? '',
    postalCode: c.postalCode ?? c.postcode ?? '',
    country: c.country ?? '',
  };
}

const DOCUMENT_RENDERERS: Record<PreviewDocumentType, PreviewRenderer> = {
  quote: (ctx) => (
    <QuotePdfDocument
      organization={ctx.orgData}
      data={{
        type: 'quote',
        documentNumber: `Q-${ctx.documentData.order.orderNumber}`,
        issueDate: ctx.orderDate,
        validUntil: ctx.validUntil,
        notes: ctx.documentData.order.notes,
        generatedAt: new Date(),
        order: ctx.baseOrder,
      }}
      qrCodeDataUrl={ctx.qrCodeDataUrl}
      viewOnlineUrl={ctx.viewUrl}
    />
  ),
  invoice: (ctx) => (
    <InvoicePdfDocument
      organization={ctx.orgData}
      data={{
        type: 'invoice',
        documentNumber: `INV-${ctx.documentData.order.orderNumber}`,
        issueDate: ctx.orderDate,
        dueDate: ctx.dueDate,
        notes: ctx.documentData.order.notes,
        generatedAt: new Date(),
        order: ctx.baseOrder,
        isPaid: false,
        paidAt: undefined,
      }}
      qrCodeDataUrl={ctx.qrCodeDataUrl}
      viewOnlineUrl={ctx.viewUrl}
    />
  ),
  pro_forma: (ctx) => (
    <ProFormaPdfDocument
      organization={ctx.orgData}
      data={{
        type: 'pro-forma',
        documentNumber: `PF-${ctx.documentData.order.orderNumber}`,
        issueDate: ctx.orderDate,
        validUntil: ctx.validUntil,
        notes: ctx.documentData.order.notes,
        generatedAt: new Date(),
        order: ctx.baseOrder,
      }}
      qrCodeDataUrl={ctx.qrCodeDataUrl}
      viewOnlineUrl={ctx.viewUrl}
    />
  ),
  delivery_note: (ctx) => (
    <DeliveryNotePdfDocument
      organization={ctx.orgData}
      data={{
        documentNumber: `DN-${ctx.documentData.order.orderNumber}`,
        orderNumber: ctx.documentData.order.orderNumber,
        issueDate: ctx.orderDate,
        deliveryDate: ctx.dueDate,
        customer: {
          id: 'preview-customer',
          name: ctx.documentData.customer.name,
          email: ctx.documentData.customer.email,
          phone: ctx.documentData.customer.phone,
        },
        shippingAddress: shippingAddressFromContext(ctx),
        lineItems: ctx.baseLineItems.map((li) => ({
          id: li.id,
          lineNumber: li.lineNumber,
          sku: li.sku,
          description: li.description,
          quantity: li.quantity,
          notes: li.notes,
        })),
      }}
      qrCodeDataUrl={ctx.qrCodeDataUrl}
    />
  ),
  packing_slip: (ctx) => (
    <PackingSlipPdfDocument
      organization={ctx.orgData}
      data={{
        documentNumber: `PS-${ctx.documentData.order.orderNumber}`,
        orderNumber: ctx.documentData.order.orderNumber,
        issueDate: ctx.orderDate,
        customer: {
          id: 'preview-customer',
          name: ctx.documentData.customer.name,
          email: ctx.documentData.customer.email,
          phone: ctx.documentData.customer.phone,
        },
        shippingAddress: shippingAddressFromContext(ctx),
        lineItems: ctx.baseLineItems.map((li) => ({
          id: li.id,
          lineNumber: li.lineNumber,
          sku: li.sku,
          description: li.description,
          quantity: li.quantity,
          notes: li.notes,
        })),
      }}
      qrCodeDataUrl={ctx.qrCodeDataUrl}
    />
  ),
  work_order: (ctx) => (
    <WorkOrderPdfDocument
      organization={ctx.orgData}
      data={{
        documentNumber: `WO-${ctx.documentData.job.jobNumber}`,
        title: ctx.documentData.job.title,
        issueDate: ctx.orderDate,
        customer: {
          id: 'preview-customer',
          name: ctx.documentData.customer.name,
          email: ctx.documentData.customer.email,
          phone: ctx.documentData.customer.phone,
        },
        jobTitle: ctx.documentData.job.title,
        description: ctx.documentData.job.description,
        priority: 'normal',
        scheduledDate: new Date(ctx.documentData.job.scheduledDate),
        checklist: ctx.documentData.job.tasks.map((t, i) => ({
          id: `task-${i}`,
          title: t.name,
          description: null,
          isCompleted: t.completed,
          order: i,
        })),
        materials: ctx.documentData.job.materials.map((m, i) => ({
          id: `mat-${i}`,
          name: m.name,
          quantity: m.quantity,
          unit: m.unit || 'ea',
        })),
      }}
    />
  ),
  warranty_certificate: (ctx) => {
    const startDate = new Date(ctx.documentData.warranty.startDate);
    const endDate = new Date(ctx.documentData.warranty.endDate);
    const diffYears = Math.round(
      (endDate.getTime() - startDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    );
    const warrantyDuration =
      diffYears >= 1 ? `${diffYears} Year${diffYears > 1 ? 's' : ''}` : '12 Months';
    return (
      <WarrantyCertificatePdfDocument
        organization={ctx.orgData}
        data={{
          warrantyNumber: ctx.documentData.warranty.certificateNumber,
          customerName: ctx.documentData.customer.name,
          productName: ctx.documentData.warranty.productName,
          productSerial: ctx.documentData.warranty.serialNumber,
          registrationDate: startDate,
          expiryDate: endDate,
          warrantyDuration,
          terms: ctx.documentData.warranty.terms,
          status: 'active',
        }}
        qrCodeDataUrl={ctx.qrCodeDataUrl}
      />
    );
  },
  completion_certificate: (ctx) => (
    <CompletionCertificatePdfDocument
      organization={ctx.orgData}
      data={{
        jobNumber: ctx.documentData.job.jobNumber,
        jobTitle: ctx.documentData.job.title,
        jobDescription: ctx.documentData.job.description,
        customerName: ctx.documentData.customer.name,
        scheduledDate: new Date(ctx.documentData.job.scheduledDate),
        completedAt: ctx.orderDate,
        technicianName: 'Sample Technician',
        jobType: 'installation',
      }}
      qrCodeDataUrl={ctx.qrCodeDataUrl}
    />
  ),
  handover_pack: (ctx) => (
    <HandoverPackPdfDocument
      organization={ctx.orgData}
      data={{
        projectNumber: `HP-${ctx.documentData.job.jobNumber}`,
        title: ctx.documentData.job.title,
        description: ctx.documentData.job.description,
        projectType: 'renovation',
        customerName: ctx.documentData.customer.name,
        siteAddress: ctx.documentData.customer.address,
        startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        completionDate: ctx.orderDate,
        warrantyInfo: ctx.documentData.warranty.terms,
      }}
      qrCodeDataUrl={ctx.qrCodeDataUrl}
    />
  ),
  report_summary: (ctx) => (
    <ReportSummaryPdfDocument
      organization={ctx.orgData}
      data={{
        reportName: 'Sample Report',
        dateFrom: ctx.orderDate,
        dateTo: ctx.dueDate,
        metrics: [
          { label: 'Total Orders', value: '12' },
          { label: 'Revenue', value: '$24,500' },
          { label: 'Average Order Value', value: '$2,042' },
        ],
        generatedAt: new Date(),
      }}
    />
  ),
};

export function renderPreviewDocument(ctx: PreviewRenderContext): ReactElement {
  const renderer = DOCUMENT_RENDERERS[ctx.documentType];
  if (!renderer) {
    throw new Error(`Unsupported document type for preview: ${ctx.documentType}`);
  }
  return renderer(ctx);
}
