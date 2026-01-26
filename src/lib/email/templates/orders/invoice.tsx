/**
 * Invoice Email Template
 *
 * Sent when an invoice is generated for a customer.
 *
 * @see EMAIL-TPL-007
 */

import {
  Body,
  Container,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import {
  EmailThemeProvider,
  Button,
  Header,
  Footer,
  getEmailInlineStyles,
  getEmailThemeClasses,
  emailTheme,
} from "../../components";
import { formatCurrency, formatDate, getFirstName } from "../../format";
import type { BaseEmailProps } from "../../render";

// ============================================================================
// TYPES
// ============================================================================

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total?: number;
}

export interface InvoiceProps extends BaseEmailProps {
  /** Customer's full name */
  customerName?: string | null;
  /** Company name (if B2B) */
  companyName?: string | null;
  /** Invoice number */
  invoiceNumber?: string | null;
  /** Invoice date */
  invoiceDate?: Date | string | null;
  /** Due date for payment */
  dueDate?: Date | string | null;
  /** Line items on the invoice */
  items?: InvoiceLineItem[];
  /** Subtotal before tax */
  subtotal?: number | null;
  /** Tax amount */
  tax?: number | null;
  /** Total amount due */
  total?: number | null;
  /** Amount already paid (if partial payment) */
  amountPaid?: number | null;
  /** Balance due */
  balanceDue?: number | null;
  /** URL to view/pay invoice */
  invoiceUrl?: string;
  /** Support email address */
  supportEmail?: string;
  /** Sender/From company name */
  fromCompanyName?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function Invoice(props: InvoiceProps) {
  // Destructure with defaults (EMAIL-TPL-002: null handling)
  const {
    customerName = "Valued Customer",
    companyName = null,
    invoiceNumber = "",
    invoiceDate = new Date(),
    dueDate = null,
    items = [],
    subtotal = 0,
    tax = 0,
    total = 0,
    amountPaid = 0,
    balanceDue = null,
    invoiceUrl = "#",
    supportEmail = "support@renoz.energy",
    fromCompanyName = "Renoz",
    unsubscribeUrl,
  } = props;

  const themeClasses = getEmailThemeClasses();
  const lightStyles = getEmailInlineStyles("light");
  const firstName = getFirstName(customerName);
  const actualBalanceDue = balanceDue ?? (total ?? 0) - (amountPaid ?? 0);
  const isPaid = actualBalanceDue <= 0;
  const previewText = isPaid
    ? `Invoice ${invoiceNumber} - Paid in Full`
    : `Invoice ${invoiceNumber} from ${fromCompanyName} - ${formatCurrency(actualBalanceDue)} due`;

  return (
    <EmailThemeProvider preview={<Preview>{previewText}</Preview>}>
      <Body
        className={`my-auto mx-auto font-sans ${themeClasses.body}`}
        style={lightStyles.body}
      >
        <Container
          className="my-[40px] mx-auto p-0 max-w-[600px]"
          style={{
            borderStyle: "solid",
            borderWidth: 1,
            borderColor: lightStyles.container.borderColor,
            borderRadius: "8px",
            overflow: "hidden",
          }}
        >
          <Header brandName={fromCompanyName} tagline="Invoice" />

          {/* Status Banner */}
          <Section
            style={{
              backgroundColor: isPaid ? "#ECFDF5" : "#FEF3C7",
              borderLeft: `4px solid ${isPaid ? emailTheme.light.success : emailTheme.light.warning}`,
              padding: "16px 24px",
            }}
          >
            <Text
              style={{
                color: isPaid ? "#065F46" : "#92400E",
                fontSize: "16px",
                fontWeight: "600",
                margin: 0,
              }}
            >
              {isPaid ? "Invoice Paid" : `Payment Due: ${formatCurrency(actualBalanceDue)}`}
            </Text>
            {!isPaid && dueDate && (
              <Text
                style={{
                  color: "#B45309",
                  fontSize: "14px",
                  margin: "4px 0 0 0",
                }}
              >
                Due by {formatDate(dueDate, { style: "long" })}
              </Text>
            )}
          </Section>

          {/* Main Content */}
          <Section style={{ padding: "32px 24px" }}>
            <Text
              className={themeClasses.text}
              style={{ color: lightStyles.text.color, margin: "0 0 24px 0" }}
            >
              Hi {firstName},
            </Text>

            <Text
              className={themeClasses.text}
              style={{
                color: lightStyles.text.color,
                margin: "0 0 24px 0",
                lineHeight: "1.5",
              }}
            >
              {isPaid
                ? `Thank you for your payment. Here's a copy of your invoice ${invoiceNumber} for your records.`
                : `Please find your invoice ${invoiceNumber} below. Review the details and click the button to make a payment.`}
            </Text>

            {/* Invoice Details */}
            <Section
              style={{
                backgroundColor: "#F9FAFB",
                borderRadius: "8px",
                padding: "20px",
                marginBottom: "24px",
              }}
            >
              <table cellPadding="0" cellSpacing="0" style={{ width: "100%" }}>
                <tr>
                  <td style={{ padding: "4px 0" }}>
                    <span style={{ color: "#6B7280", fontSize: "14px" }}>
                      Invoice Number:
                    </span>
                  </td>
                  <td style={{ padding: "4px 0", textAlign: "right" }}>
                    <span
                      style={{
                        color: "#111827",
                        fontSize: "14px",
                        fontWeight: "500",
                      }}
                    >
                      {invoiceNumber || "N/A"}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "4px 0" }}>
                    <span style={{ color: "#6B7280", fontSize: "14px" }}>
                      Invoice Date:
                    </span>
                  </td>
                  <td style={{ padding: "4px 0", textAlign: "right" }}>
                    <span
                      style={{
                        color: "#111827",
                        fontSize: "14px",
                        fontWeight: "500",
                      }}
                    >
                      {formatDate(invoiceDate)}
                    </span>
                  </td>
                </tr>
                {dueDate && (
                  <tr>
                    <td style={{ padding: "4px 0" }}>
                      <span style={{ color: "#6B7280", fontSize: "14px" }}>
                        Due Date:
                      </span>
                    </td>
                    <td style={{ padding: "4px 0", textAlign: "right" }}>
                      <span
                        style={{
                          color: isPaid ? "#111827" : "#B45309",
                          fontSize: "14px",
                          fontWeight: "500",
                        }}
                      >
                        {formatDate(dueDate)}
                      </span>
                    </td>
                  </tr>
                )}
                {companyName && (
                  <tr>
                    <td style={{ padding: "4px 0" }}>
                      <span style={{ color: "#6B7280", fontSize: "14px" }}>
                        Bill To:
                      </span>
                    </td>
                    <td style={{ padding: "4px 0", textAlign: "right" }}>
                      <span
                        style={{
                          color: "#111827",
                          fontSize: "14px",
                          fontWeight: "500",
                        }}
                      >
                        {companyName}
                      </span>
                    </td>
                  </tr>
                )}
              </table>
            </Section>

            {/* Line Items */}
            {items.length > 0 && (
              <Section style={{ marginBottom: "24px" }}>
                <table
                  cellPadding="0"
                  cellSpacing="0"
                  style={{ width: "100%", borderCollapse: "collapse" }}
                >
                  <thead>
                    <tr>
                      <th
                        style={{
                          textAlign: "left",
                          padding: "8px 0",
                          borderBottom: `1px solid ${emailTheme.light.border}`,
                          fontSize: "12px",
                          color: "#6B7280",
                          fontWeight: "500",
                        }}
                      >
                        Description
                      </th>
                      <th
                        style={{
                          textAlign: "center",
                          padding: "8px 0",
                          borderBottom: `1px solid ${emailTheme.light.border}`,
                          fontSize: "12px",
                          color: "#6B7280",
                          fontWeight: "500",
                        }}
                      >
                        Qty
                      </th>
                      <th
                        style={{
                          textAlign: "right",
                          padding: "8px 0",
                          borderBottom: `1px solid ${emailTheme.light.border}`,
                          fontSize: "12px",
                          color: "#6B7280",
                          fontWeight: "500",
                        }}
                      >
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={index}>
                        <td
                          style={{
                            padding: "12px 0",
                            borderBottom:
                              index < items.length - 1
                                ? `1px solid ${emailTheme.light.border}`
                                : undefined,
                            fontSize: "14px",
                            color: "#111827",
                          }}
                        >
                          {item.description}
                        </td>
                        <td
                          style={{
                            padding: "12px 0",
                            borderBottom:
                              index < items.length - 1
                                ? `1px solid ${emailTheme.light.border}`
                                : undefined,
                            textAlign: "center",
                            fontSize: "14px",
                            color: "#6B7280",
                          }}
                        >
                          {item.quantity}
                        </td>
                        <td
                          style={{
                            padding: "12px 0",
                            borderBottom:
                              index < items.length - 1
                                ? `1px solid ${emailTheme.light.border}`
                                : undefined,
                            textAlign: "right",
                            fontSize: "14px",
                            color: "#111827",
                            fontWeight: "500",
                          }}
                        >
                          {formatCurrency(item.total ?? item.unitPrice * item.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals */}
                <table
                  cellPadding="0"
                  cellSpacing="0"
                  style={{ width: "100%", marginTop: "16px" }}
                >
                  <tr>
                    <td style={{ padding: "4px 0" }}>
                      <span style={{ color: "#6B7280", fontSize: "14px" }}>
                        Subtotal:
                      </span>
                    </td>
                    <td style={{ padding: "4px 0", textAlign: "right" }}>
                      <span style={{ color: "#111827", fontSize: "14px" }}>
                        {formatCurrency(subtotal)}
                      </span>
                    </td>
                  </tr>
                  {(tax ?? 0) > 0 && (
                    <tr>
                      <td style={{ padding: "4px 0" }}>
                        <span style={{ color: "#6B7280", fontSize: "14px" }}>
                          Tax:
                        </span>
                      </td>
                      <td style={{ padding: "4px 0", textAlign: "right" }}>
                        <span style={{ color: "#111827", fontSize: "14px" }}>
                          {formatCurrency(tax)}
                        </span>
                      </td>
                    </tr>
                  )}
                  <tr
                    style={{
                      borderTop: `2px solid ${emailTheme.light.border}`,
                    }}
                  >
                    <td style={{ padding: "12px 0 4px 0" }}>
                      <span
                        style={{
                          color: "#111827",
                          fontSize: "16px",
                          fontWeight: "600",
                        }}
                      >
                        Total:
                      </span>
                    </td>
                    <td style={{ padding: "12px 0 4px 0", textAlign: "right" }}>
                      <span
                        style={{
                          color: "#111827",
                          fontSize: "16px",
                          fontWeight: "600",
                        }}
                      >
                        {formatCurrency(total)}
                      </span>
                    </td>
                  </tr>
                  {(amountPaid ?? 0) > 0 && (
                    <>
                      <tr>
                        <td style={{ padding: "4px 0" }}>
                          <span style={{ color: "#059669", fontSize: "14px" }}>
                            Amount Paid:
                          </span>
                        </td>
                        <td style={{ padding: "4px 0", textAlign: "right" }}>
                          <span style={{ color: "#059669", fontSize: "14px" }}>
                            -{formatCurrency(amountPaid)}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: "4px 0" }}>
                          <span
                            style={{
                              color: isPaid ? "#059669" : "#B45309",
                              fontSize: "16px",
                              fontWeight: "600",
                            }}
                          >
                            Balance Due:
                          </span>
                        </td>
                        <td style={{ padding: "4px 0", textAlign: "right" }}>
                          <span
                            style={{
                              color: isPaid ? "#059669" : "#B45309",
                              fontSize: "16px",
                              fontWeight: "600",
                            }}
                          >
                            {formatCurrency(actualBalanceDue)}
                          </span>
                        </td>
                      </tr>
                    </>
                  )}
                </table>
              </Section>
            )}

            {/* CTA Button */}
            <Section style={{ textAlign: "center", margin: "32px 0" }}>
              <Button href={invoiceUrl}>
                {isPaid ? "View Invoice" : "Pay Now"}
              </Button>
            </Section>

            {!isPaid && (
              <Text
                className={themeClasses.mutedText}
                style={{
                  color: lightStyles.mutedText.color,
                  fontSize: "14px",
                  lineHeight: "1.5",
                  margin: "24px 0 0 0",
                  textAlign: "center",
                }}
              >
                If you have any questions about this invoice, please reply to
                this email or contact us.
              </Text>
            )}
          </Section>

          <Footer
            companyName={fromCompanyName}
            supportEmail={supportEmail}
            unsubscribeUrl={unsubscribeUrl}
          />
        </Container>
      </Body>
    </EmailThemeProvider>
  );
}

// Default export for React Email dev server
export default Invoice;

// Preview props for development
Invoice.PreviewProps = {
  customerName: "John Doe",
  companyName: "Acme Corp",
  invoiceNumber: "INV-2024-0001",
  invoiceDate: new Date(),
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
  items: [
    { description: "Tesla Powerwall 2", quantity: 2, unitPrice: 8500, total: 17000 },
    { description: "Professional Installation", quantity: 1, unitPrice: 1200, total: 1200 },
    { description: "Permit & Inspection Fee", quantity: 1, unitPrice: 500, total: 500 },
  ],
  subtotal: 18700,
  tax: 1683,
  total: 20383,
  amountPaid: 0,
  balanceDue: 20383,
  invoiceUrl: "https://app.renoz.energy/invoices/INV-2024-0001",
  supportEmail: "billing@renoz.energy",
  fromCompanyName: "Renoz Energy",
} as InvoiceProps;
