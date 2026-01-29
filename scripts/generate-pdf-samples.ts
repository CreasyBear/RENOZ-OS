/**
 * PDF Sample Generator
 *
 * Generates test PDFs to preview the premium document designs.
 * Run with: bun run scripts/generate-pdf-samples.ts
 */

import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import React from "react";
import { renderPdfToBuffer } from "../src/lib/documents/render";
import {
  QuotePdfDocument,
  InvoicePdfDocument,
  PackingSlipPdfDocument,
  DeliveryNotePdfDocument,
  generateQRCode,
} from "../src/lib/documents";

// ============================================================================
// MOCK DATA
// ============================================================================

const mockOrganization = {
  id: "org-test-123",
  name: "Renoz Renovations Pty Ltd",
  email: "accounts@renoz.com.au",
  phone: "+61 2 1234 5678",
  website: "www.renoz.com.au",
  taxId: "12 345 678 901",
  currency: "AUD",
  locale: "en-AU",
  address: {
    addressLine1: "123 Main Street",
    addressLine2: "Suite 100",
    city: "Sydney",
    state: "NSW",
    postalCode: "2000",
    country: "Australia",
  },
  branding: {
    logoUrl: undefined, // Will show org name as fallback
    primaryColor: "#0F766E", // Teal brand color
  },
};

const mockCustomer = {
  id: "cust-456",
  name: "John & Sarah Smith",
  email: "john.smith@email.com",
  phone: "+61 412 345 678",
  address: {
    addressLine1: "45 Ocean View Drive",
    addressLine2: "",
    city: "Manly",
    state: "NSW",
    postalCode: "2095",
    country: "Australia",
  },
};

const mockLineItems = [
  {
    id: "item-1",
    description: "Premium Double-Glazed Windows - Living Room",
    sku: "WIN-DBL-2400",
    quantity: 3,
    unitPrice: 850.0,
    discountPercent: 0,
    discountAmount: 0,
    taxAmount: 255.0,
    total: 2805.0,
    notes: "White frame, Low-E glass",
  },
  {
    id: "item-2",
    description: "Sliding Door - Kitchen to Patio",
    sku: "DR-SLD-3000",
    quantity: 1,
    unitPrice: 2200.0,
    discountPercent: 5,
    discountAmount: 110.0,
    taxAmount: 209.0,
    total: 2299.0,
    notes: "Black frame, security screen included",
  },
  {
    id: "item-3",
    description: "Installation Labour",
    sku: "LAB-INSTALL",
    quantity: 16,
    unitPrice: 95.0,
    discountPercent: 0,
    discountAmount: 0,
    taxAmount: 152.0,
    total: 1672.0,
    notes: "2-day installation, includes cleanup",
  },
  {
    id: "item-4",
    description: "Disposal of Old Windows",
    sku: "SRV-DISPOSE",
    quantity: 1,
    unitPrice: 350.0,
    discountPercent: 0,
    discountAmount: 0,
    taxAmount: 35.0,
    total: 385.0,
    notes: "Eco-friendly disposal and recycling",
  },
];

const mockOrder = {
  id: "ord-789",
  orderNumber: "R-2024-0128",
  status: "confirmed",
  paymentStatus: "partial",
  orderDate: new Date("2024-01-15"),
  dueDate: new Date("2024-02-14"),
  shippedDate: null,
  deliveredDate: null,
  customer: mockCustomer,
  lineItems: mockLineItems,
  billingAddress: mockCustomer.address,
  shippingAddress: mockCustomer.address,
  subtotal: 7161.0,
  discount: 110.0,
  discountType: "percentage" as const,
  discountPercent: 5,
  taxRate: 10,
  taxAmount: 651.0,
  shippingAmount: 0,
  total: 7702.0,
  paidAmount: 2000.0,
  balanceDue: 5702.0,
  internalNotes: "Customer wants installation completed before March",
  customerNotes: "Please coordinate installation timing with our builder",
};

const mockQuoteData = {
  type: "quote" as const,
  documentNumber: "Q-2024-0128",
  issueDate: new Date("2024-01-15"),
  validUntil: new Date("2024-02-15"),
  order: mockOrder,
  terms: "50% deposit required to confirm order. Balance due upon completion. All work includes 10-year warranty on materials and installation.",
  notes: "Quote includes all materials, labour, and disposal. Price valid for 30 days.",
  reference: "PO-SMITH-001",
  generatedAt: new Date(),
  generatedBy: "user-123",
};

const mockInvoiceData = {
  type: "invoice" as const,
  documentNumber: "INV-2024-0128",
  issueDate: new Date("2024-01-15"),
  dueDate: new Date("2024-02-14"),
  order: mockOrder,
  paymentDetails: {
    bankName: "Commonwealth Bank",
    accountName: "Renoz Renovations Pty Ltd",
    accountNumber: "1234 5678 9012",
    bsb: "062-000",
    swift: "CTBAAU2S",
    paymentTerms: "Net 30 days",
    paymentInstructions: "Please include invoice number as reference",
  },
  terms: "Payment due within 30 days. Late payments subject to 1.5% monthly service charge.",
  notes: "Thank you for your business! Please contact us with any questions.",
  reference: "Q-2024-0128",
  generatedAt: new Date(),
  generatedBy: "user-123",
  isPaid: false,
  paidAt: null,
};

const mockPaidInvoiceData = {
  ...mockInvoiceData,
  documentNumber: "INV-2024-0105",
  isPaid: true,
  paidAt: new Date("2024-01-20"),
  order: {
    ...mockOrder,
    orderNumber: "R-2024-0105",
    paidAmount: 4850.0,
    balanceDue: 0,
    total: 4850.0,
  },
};

const mockPackingSlipData = {
  documentNumber: "PS-2024-0128",
  orderNumber: "R-2024-0128",
  issueDate: new Date("2024-01-15"),
  shipDate: new Date("2024-01-20"),
  customer: mockCustomer,
  shippingAddress: mockCustomer.address,
  lineItems: mockLineItems.map((item) => ({
    id: item.id,
    lineNumber: item.id.split("-")[1],
    sku: item.sku,
    description: item.description,
    quantity: item.quantity,
    notes: item.notes,
    location: null,
    isFragile: item.sku?.includes("WIN") || false,
    weight: item.sku?.includes("WIN") ? 45 : 25,
  })),
  carrier: "Toll Priority",
  shippingMethod: "Express Delivery",
  packageCount: 2,
  totalWeight: 160,
  specialInstructions: "Handle with care - glass contents. Customer requested morning delivery.",
  notes: "Please inspect all items before signing",
};

const mockDeliveryNoteData = {
  documentNumber: "DN-2024-0128",
  orderNumber: "R-2024-0128",
  issueDate: new Date("2024-01-15"),
  deliveryDate: new Date("2024-01-20"),
  customer: mockCustomer,
  shippingAddress: mockCustomer.address,
  lineItems: mockLineItems.map((item) => ({
    id: item.id,
    lineNumber: item.id.split("-")[1],
    sku: item.sku,
    description: item.description,
    quantity: item.quantity,
    notes: item.notes,
    isFragile: item.sku?.includes("WIN") || false,
    weight: item.sku?.includes("WIN") ? 45 : 25,
    dimensions: null,
  })),
  carrier: "Toll Priority",
  trackingNumber: "TP123456789",
  specialInstructions: "Please inspect all items before signing. Report any damage immediately.",
  notes: "Items delivered in good condition",
};

// ============================================================================
// GENERATION FUNCTIONS
// ============================================================================

async function generateQuotePDF(outputDir: string) {
  console.log("Generating Quote PDF...");

  const qrCode = await generateQRCode("https://app.renoz.com.au/quotes/Q-2024-0128", {
    width: 120,
    margin: 1,
  });

  const { buffer } = await renderPdfToBuffer(
    React.createElement(QuotePdfDocument, {
      organization: mockOrganization,
      data: mockQuoteData,
      qrCodeDataUrl: qrCode,
    })
  );

  const outputPath = join(outputDir, "sample-quote.pdf");
  writeFileSync(outputPath, buffer);
  console.log(`  ✓ Quote PDF saved: ${outputPath} (${(buffer.length / 1024).toFixed(1)} KB)`);
}

async function generateInvoicePDF(outputDir: string) {
  console.log("Generating Invoice PDF (Unpaid)...");

  const qrCode = await generateQRCode("https://app.renoz.com.au/invoices/INV-2024-0128/pay", {
    width: 120,
    margin: 1,
  });

  const { buffer } = await renderPdfToBuffer(
    React.createElement(InvoicePdfDocument, {
      organization: mockOrganization,
      data: mockInvoiceData,
      qrCodeDataUrl: qrCode,
    })
  );

  const outputPath = join(outputDir, "sample-invoice-unpaid.pdf");
  writeFileSync(outputPath, buffer);
  console.log(`  ✓ Unpaid Invoice PDF saved: ${outputPath} (${(buffer.length / 1024).toFixed(1)} KB)`);
}

async function generatePaidInvoicePDF(outputDir: string) {
  console.log("Generating Invoice PDF (Paid)...");

  const { buffer } = await renderPdfToBuffer(
    React.createElement(InvoicePdfDocument, {
      organization: mockOrganization,
      data: mockPaidInvoiceData,
    })
  );

  const outputPath = join(outputDir, "sample-invoice-paid.pdf");
  writeFileSync(outputPath, buffer);
  console.log(`  ✓ Paid Invoice PDF saved: ${outputPath} (${(buffer.length / 1024).toFixed(1)} KB)`);
}

async function generatePackingSlipPDF(outputDir: string) {
  console.log("Generating Packing Slip PDF...");

  const qrCode = await generateQRCode("https://app.renoz.com.au/orders/R-2024-0128", {
    width: 120,
    margin: 1,
  });

  const { buffer } = await renderPdfToBuffer(
    React.createElement(PackingSlipPdfDocument, {
      organization: mockOrganization,
      data: mockPackingSlipData,
      qrCodeDataUrl: qrCode,
    })
  );

  const outputPath = join(outputDir, "sample-packing-slip.pdf");
  writeFileSync(outputPath, buffer);
  console.log(`  ✓ Packing Slip PDF saved: ${outputPath} (${(buffer.length / 1024).toFixed(1)} KB)`);
}

async function generateDeliveryNotePDF(outputDir: string) {
  console.log("Generating Delivery Note PDF...");

  const { buffer } = await renderPdfToBuffer(
    React.createElement(DeliveryNotePdfDocument, {
      organization: mockOrganization,
      data: mockDeliveryNoteData,
    })
  );

  const outputPath = join(outputDir, "sample-delivery-note.pdf");
  writeFileSync(outputPath, buffer);
  console.log(`  ✓ Delivery Note PDF saved: ${outputPath} (${(buffer.length / 1024).toFixed(1)} KB)`);
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const outputDir = join(process.cwd(), "_development", "pdf-samples");

  // Create output directory
  try {
    mkdirSync(outputDir, { recursive: true });
  } catch (e) {
    // Directory may already exist
  }

  console.log("========================================");
  console.log("PDF Sample Generator");
  console.log("Output directory:", outputDir);
  console.log("========================================\n");

  try {
    await generateQuotePDF(outputDir);
    await generateInvoicePDF(outputDir);
    await generatePaidInvoicePDF(outputDir);
    await generatePackingSlipPDF(outputDir);
    await generateDeliveryNotePDF(outputDir);

    console.log("\n========================================");
    console.log("All PDFs generated successfully!");
    console.log("========================================");
    console.log("\nFiles created:");
    console.log("  - sample-quote.pdf");
    console.log("  - sample-invoice-unpaid.pdf");
    console.log("  - sample-invoice-paid.pdf");
    console.log("  - sample-packing-slip.pdf");
    console.log("  - sample-delivery-note.pdf");
    console.log("\nOpen these files to preview the new premium designs.");
  } catch (error) {
    console.error("\n❌ Error generating PDFs:", error);
    process.exit(1);
  }
}

main();
