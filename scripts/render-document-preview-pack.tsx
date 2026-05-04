import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { ActivityExportPdfDocument, buildDocumentOrderFromPreviewData, renderPdfToBuffer, ReportSummaryPdfDocument } from "../src/lib/documents";
import { renderPreviewDocument, type PreviewDocumentType } from "../src/lib/documents/preview-renderers";
import type { DocumentOrganization } from "../src/lib/documents/types";

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const outputDir = resolve("artifacts", "document-previews", `preview-pack-${timestamp}`);
mkdirSync(outputDir, { recursive: true });

const organization: DocumentOrganization = {
  id: "preview-org",
  name: "Acme Renovations Ltd",
  slug: "acme-renovations",
  email: "info@acmerenovations.com",
  phone: "(08) 9456 1200",
  website: "https://acmerenovations.example",
  taxId: "12 345 678 901",
  currency: "AUD",
  locale: "en-AU",
  address: {
    addressLine1: "123 Builder Street",
    addressLine2: "Suite 4",
    city: "Perth",
    state: "WA",
    postalCode: "6000",
    country: "Australia",
  },
  branding: {
    primaryColor: "#1e3a5f",
    secondaryColor: "#d4a73a",
    logoUrl: null,
    logoDataUrl: null,
  },
  settings: {
    timezone: "Australia/Perth",
    defaultTaxRate: 10,
  },
};

const previewData = {
  organization: {
    name: organization.name,
    email: organization.email ?? "",
    phone: organization.phone ?? "",
    address: organization.address?.addressLine1 ?? "",
    city: organization.address?.city ?? "",
    state: organization.address?.state ?? "",
    postalCode: organization.address?.postalCode ?? "",
    country: organization.address?.country ?? "",
    abn: organization.taxId ?? "",
    logoUrl: null,
  },
  customer: {
    name: "Harbour View Apartments",
    email: "facilities@harbourview.example",
    phone: "(08) 6311 2211",
    address: "45 Billing Lane",
    city: "Perth",
    state: "WA",
    postalCode: "6000",
    country: "Australia",
    billingAddress: {
      addressLine1: "45 Billing Lane",
      city: "Perth",
      state: "WA",
      postalCode: "6000",
      country: "Australia",
      contactName: "Accounts Team",
    },
    shippingAddress: {
      addressLine1: "18 Riverside Quay",
      addressLine2: "Loading Dock B",
      city: "Fremantle",
      state: "WA",
      postalCode: "6160",
      country: "Australia",
      contactName: "Site Supervisor",
      contactPhone: "0400 123 456",
    },
    primaryAddress: {
      addressLine1: "45 Billing Lane",
      city: "Perth",
      state: "WA",
      postalCode: "6000",
      country: "Australia",
    },
  },
  order: {
    orderNumber: "SO-2026-0142",
    createdAt: "2026-04-02T09:30:00.000Z",
    dueDate: "2026-04-16T09:30:00.000Z",
    validUntil: "2026-04-18T09:30:00.000Z",
    billingAddress: {
      addressLine1: "45 Billing Lane",
      city: "Perth",
      state: "WA",
      postalCode: "6000",
      country: "Australia",
      contactName: "Accounts Team",
    },
    shippingAddress: {
      addressLine1: "18 Riverside Quay",
      addressLine2: "Loading Dock B",
      city: "Fremantle",
      state: "WA",
      postalCode: "6160",
      country: "Australia",
      contactName: "Site Supervisor",
      contactPhone: "0400 123 456",
    },
    lineItems: [
      {
        description: "Commercial heat-pump installation package",
        quantity: 1,
        unitPrice: 9200,
        total: 10120,
        sku: "HP-COM-9KW",
        taxAmount: 920,
        notes: "Coordinate crane access with site management.",
      },
      {
        description: "Insulated valve kit and commissioning accessories",
        quantity: 2,
        unitPrice: 675,
        total: 1485,
        sku: "VALVE-KIT-PRO",
        taxAmount: 135,
      },
      {
        description: "Controls integration and onsite testing",
        quantity: 6,
        unitPrice: 180,
        total: 1188,
        sku: "CTRL-TEST",
        taxAmount: 108,
      },
    ],
    subtotal: 11300,
    taxRate: 10,
    taxAmount: 1163,
    discount: 350,
    shippingAmount: 680,
    paidAmount: 4000,
    balanceDue: 8793,
    total: 12793,
    notes: "Please confirm site access two business days prior to delivery.",
    terms: "Payment due within 14 days. Freight includes tail-lift delivery only.",
  },
  warranty: {
    certificateNumber: "WC-2026-0041",
    productName: "Commercial Heat Pump System",
    serialNumber: "HP-9KW-0041",
    coverageYears: 5,
    startDate: "2026-04-02T09:30:00.000Z",
    endDate: "2031-04-02T09:30:00.000Z",
    terms: "Covers manufacturing defects, control-board faults, and factory refrigerant circuit issues.",
  },
  job: {
    jobNumber: "JOB-2026-0208",
    title: "Harbour View Plant Room Upgrade",
    description: "Install heat pump, commission controls, and complete building manager walkthrough.",
    scheduledDate: "2026-04-11T08:00:00.000Z",
    tasks: [
      { name: "Deliver plant equipment to site", completed: true },
      { name: "Install hydraulic connections", completed: true },
      { name: "Commission control system", completed: false },
      { name: "Customer handover and training", completed: false },
    ],
    materials: [
      { name: "Heat Pump Unit", quantity: 1, unit: "ea" },
      { name: "Valve Kit", quantity: 2, unit: "ea" },
      { name: "Cable Tray", quantity: 6, unit: "m" },
    ],
  },
};

const baseOrder = buildDocumentOrderFromPreviewData(previewData, {
  orderId: "preview-order",
});
const orderDate = new Date(previewData.order.createdAt);
const dueDate = new Date(previewData.order.dueDate);
const validUntil = new Date(previewData.order.validUntil);

function previewContext(documentType: PreviewDocumentType) {
  return {
    documentType,
    documentData: previewData,
    orgData: organization,
    baseOrder,
    baseLineItems: baseOrder.lineItems,
    orderDate,
    dueDate,
    validUntil,
  };
}

const previewEntries: Array<{
  slug: string;
  label: string;
  reviewFocus: string;
  render: () => ReturnType<typeof renderPreviewDocument>;
}> = [
  {
    slug: "invoice",
    label: "Invoice",
    reviewFocus: "Bill/ship separation, due-date emphasis, totals block balance.",
    render: () => renderPreviewDocument(previewContext("invoice")),
  },
  {
    slug: "quote",
    label: "Quote",
    reviewFocus: "Validity callout, acceptance hierarchy, pricing table rhythm.",
    render: () => renderPreviewDocument(previewContext("quote")),
  },
  {
    slug: "pro-forma",
    label: "Pro Forma",
    reviewFocus: "Disclaimer prominence, pricing clarity, payment details weight.",
    render: () => renderPreviewDocument(previewContext("pro_forma")),
  },
  {
    slug: "packing-slip",
    label: "Packing Slip",
    reviewFocus: "Weighted logistics strip, serial chips, table scanability.",
    render: () => renderPreviewDocument(previewContext("packing_slip")),
  },
  {
    slug: "delivery-note",
    label: "Delivery Note",
    reviewFocus: "Acknowledgment zone, delivery metadata, serialized-item proofing.",
    render: () => renderPreviewDocument(previewContext("delivery_note")),
  },
  {
    slug: "work-order",
    label: "Work Order",
    reviewFocus: "Schedule/priority emphasis, field-operational readability.",
    render: () => renderPreviewDocument(previewContext("work_order")),
  },
  {
    slug: "warranty-certificate",
    label: "Warranty Certificate",
    reviewFocus: "Certificate shell breathing room, title hierarchy, detail-strip fit.",
    render: () => renderPreviewDocument(previewContext("warranty_certificate")),
  },
  {
    slug: "completion-certificate",
    label: "Completion Certificate",
    reviewFocus: "Centered frame vs. aligned content, ceremonial tone without wasted space.",
    render: () => renderPreviewDocument(previewContext("completion_certificate")),
  },
  {
    slug: "handover-pack",
    label: "Handover Pack",
    reviewFocus: "Section rhythm, certificate framing, supporting detail density.",
    render: () => renderPreviewDocument(previewContext("handover_pack")),
  },
  {
    slug: "report-summary",
    label: "Report Summary",
    reviewFocus: "Headline KPI hierarchy, supporting metrics, table fallback.",
    render: () => (
      <ReportSummaryPdfDocument
        organization={organization}
        data={{
          reportName: "April Operations Snapshot",
          dateFrom: new Date("2026-04-01T00:00:00.000Z"),
          dateTo: new Date("2026-04-30T23:59:59.000Z"),
          generatedAt: new Date("2026-04-09T09:00:00.000Z"),
          metrics: [
            { label: "Revenue", value: "$482,300" },
            { label: "Total Orders", value: "34" },
            { label: "Average Order Value", value: "$14,185" },
            { label: "Gross Margin", value: "31.8%" },
            { label: "Open Work Orders", value: "11" },
            { label: "Completion Rate", value: "94%" },
          ],
        }}
      />
    ),
  },
  {
    slug: "activity-export",
    label: "Activity Export",
    reviewFocus: "Dense table readability, filter summary spacing, metadata weighting.",
    render: () => (
      <ActivityExportPdfDocument
        organization={organization}
        data={{
          reportName: "Operations Activity Export",
          generatedAt: new Date("2026-04-09T09:00:00.000Z"),
          totalCount: 7,
          filterSummary: [
            "Date range: 1 Apr 2026 to 9 Apr 2026",
            "Entities: orders, jobs, documents",
            "Actors: office team + field technicians",
          ],
          activities: [
            {
              timestamp: new Date("2026-04-08T08:14:00.000Z"),
              action: "updated",
              entity: "Order",
              actor: "Mia Lawson",
              description: "Adjusted shipping address for Harbour View Apartments.",
            },
            {
              timestamp: new Date("2026-04-08T09:02:00.000Z"),
              action: "generated",
              entity: "Invoice",
              actor: "Mia Lawson",
              description: "Generated invoice INV-SO-2026-0142 for customer review.",
            },
            {
              timestamp: new Date("2026-04-08T10:27:00.000Z"),
              action: "allocated",
              entity: "Shipment",
              actor: "Warehouse Team",
              description: "Allocated serialized heat-pump units and valve kits to order.",
            },
            {
              timestamp: new Date("2026-04-08T13:41:00.000Z"),
              action: "scheduled",
              entity: "Work Order",
              actor: "Dispatch",
              description: "Assigned plant-room upgrade to technician team for Friday morning.",
            },
            {
              timestamp: new Date("2026-04-09T07:55:00.000Z"),
              action: "generated",
              entity: "Packing Slip",
              actor: "Warehouse Team",
              description: "Generated packing slip and serialized manifest for outbound freight.",
            },
            {
              timestamp: new Date("2026-04-09T08:12:00.000Z"),
              action: "commented",
              entity: "Job",
              actor: "Site Supervisor",
              description: "Requested loading dock access window confirmation for Friday delivery.",
            },
            {
              timestamp: new Date("2026-04-09T08:44:00.000Z"),
              action: "exported",
              entity: "Report",
              actor: "Operations Admin",
              description: "Exported April operations snapshot for management review.",
            },
          ],
        }}
      />
    ),
  },
];

const galleryEntries: Array<{
  slug: string;
  label: string;
  reviewFocus: string;
  pdfFile: string;
  pngFile: string;
}> = [];

for (const entry of previewEntries) {
  const pdfPath = join(outputDir, `${entry.slug}.pdf`);
  const pngBase = join(outputDir, entry.slug);
  const { buffer } = await renderPdfToBuffer(entry.render());
  writeFileSync(pdfPath, buffer);
  execFileSync("pdftoppm", ["-png", "-f", "1", "-singlefile", pdfPath, pngBase], {
    stdio: "ignore",
  });

  galleryEntries.push({
    slug: entry.slug,
    label: entry.label,
    reviewFocus: entry.reviewFocus,
    pdfFile: `${entry.slug}.pdf`,
    pngFile: `${entry.slug}.png`,
  });
}

const galleryHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Document Preview Pack</title>
  <style>
    :root {
      --bg: #f5f1eb;
      --surface: rgba(255,255,255,0.92);
      --surface-strong: #ffffff;
      --border: rgba(29, 40, 56, 0.12);
      --text: #172033;
      --text-dim: #5f6674;
      --accent: #1e3a5f;
      --accent-soft: rgba(30, 58, 95, 0.08);
      --gold: #b8872e;
      --shadow: 0 18px 45px rgba(23, 32, 51, 0.08);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "IBM Plex Sans", "Avenir Next", "Segoe UI", sans-serif;
      color: var(--text);
      background:
        radial-gradient(circle at top left, rgba(184,135,46,0.08), transparent 28%),
        linear-gradient(180deg, #faf7f2 0%, var(--bg) 100%);
    }
    .shell {
      max-width: 1480px;
      margin: 0 auto;
      padding: 40px 24px 64px;
    }
    .hero {
      display: grid;
      grid-template-columns: 1.5fr 1fr;
      gap: 20px;
      margin-bottom: 28px;
    }
    .hero-card, .summary-card, .doc-card {
      background: var(--surface);
      backdrop-filter: blur(10px);
      border: 1px solid var(--border);
      border-radius: 24px;
      box-shadow: var(--shadow);
    }
    .hero-card {
      padding: 28px;
    }
    .eyebrow {
      font-size: 12px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--gold);
      margin-bottom: 10px;
      font-weight: 700;
    }
    h1 {
      margin: 0 0 12px;
      font-size: clamp(32px, 4vw, 54px);
      line-height: 0.95;
      font-family: "Instrument Serif", Georgia, serif;
      font-weight: 400;
    }
    .hero p, .summary-card li {
      color: var(--text-dim);
      line-height: 1.6;
      font-size: 15px;
    }
    .summary-card {
      padding: 24px;
    }
    .summary-card h2 {
      margin: 0 0 14px;
      font-size: 15px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--accent);
    }
    .summary-card ul {
      margin: 0;
      padding-left: 18px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
      gap: 20px;
    }
    .doc-card {
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .doc-meta {
      padding: 18px 18px 14px;
      border-bottom: 1px solid var(--border);
      background: linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,255,255,0.78));
    }
    .doc-meta h3 {
      margin: 0 0 8px;
      font-size: 22px;
      line-height: 1.1;
    }
    .focus {
      margin: 0;
      color: var(--text-dim);
      font-size: 14px;
      line-height: 1.55;
    }
    .preview {
      background: #e9e3da;
      padding: 14px;
      display: flex;
      justify-content: center;
      align-items: flex-start;
    }
    .preview img {
      width: 100%;
      max-width: 540px;
      border-radius: 14px;
      border: 1px solid rgba(23, 32, 51, 0.08);
      background: white;
    }
    .links {
      display: flex;
      gap: 10px;
      padding: 14px 18px 18px;
    }
    .links a {
      text-decoration: none;
      color: var(--accent);
      font-weight: 600;
      font-size: 14px;
      padding: 10px 12px;
      border-radius: 999px;
      background: var(--accent-soft);
    }
    @media (max-width: 900px) {
      .hero { grid-template-columns: 1fr; }
    }
  </style>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet">
</head>
<body>
  <div class="shell">
    <section class="hero">
      <div class="hero-card">
        <div class="eyebrow">Visual PDF QA</div>
        <h1>Document Preview Pack</h1>
        <p>This pack renders representative first-page previews from the live PDF templates after the hierarchy and spacing polish pass. It is tuned to exercise the main review points: bill-vs-ship separation, weighted logistics metadata, denser serial handling, report KPI hierarchy, and certificate breathing room.</p>
      </div>
      <aside class="summary-card">
        <h2>Suggested QA Pass</h2>
        <ul>
          <li>Check whether the most important information wins the page within two seconds.</li>
          <li>Look for awkward wraps in callouts, address blocks, and metric cards.</li>
          <li>Confirm serial chips are easier to verify than the old comma-separated blocks.</li>
          <li>Compare certificate framing: formal enough to feel official, but not over-padded.</li>
        </ul>
      </aside>
    </section>
    <section class="grid">
      ${galleryEntries.map((entry) => `
        <article class="doc-card">
          <div class="doc-meta">
            <div class="eyebrow">${entry.slug}</div>
            <h3>${entry.label}</h3>
            <p class="focus">${entry.reviewFocus}</p>
          </div>
          <div class="preview">
            <img src="${entry.pngFile}" alt="${entry.label} preview" />
          </div>
          <div class="links">
            <a href="${entry.pdfFile}">Open PDF</a>
            <a href="${entry.pngFile}">Open PNG</a>
          </div>
        </article>
      `).join("")}
    </section>
  </div>
</body>
</html>`;

const galleryPath = join(outputDir, "index.html");
writeFileSync(galleryPath, galleryHtml);

console.log(JSON.stringify({ outputDir, galleryPath, count: galleryEntries.length }, null, 2));
