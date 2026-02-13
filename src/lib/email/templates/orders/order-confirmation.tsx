/**
 * Order Confirmation Email Template
 *
 * Sent when a new order is placed.
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
import { formatCurrency, formatDate, formatAddress, formatOrderNumber, getFirstName } from "../../format";
import type { BaseEmailProps } from "../../render";

// ============================================================================
// TYPES
// ============================================================================

export interface OrderLineItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total?: number;
}

export interface OrderAddress {
  street?: string | null;
  street2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
}

export interface OrderConfirmationProps extends BaseEmailProps {
  /** Customer's full name */
  customerName?: string | null;
  /** Order number/ID */
  orderNumber?: string | null;
  /** Order date */
  orderDate?: Date | string | null;
  /** Line items in the order */
  items?: OrderLineItem[];
  /** Order subtotal before tax/shipping */
  subtotal?: number | null;
  /** Tax amount */
  tax?: number | null;
  /** Shipping cost */
  shipping?: number | null;
  /** Total order amount */
  total?: number | null;
  /** Shipping address */
  shippingAddress?: OrderAddress | null;
  /** URL to view order details */
  orderUrl?: string;
  /** Support email address */
  supportEmail?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function OrderConfirmation(props: OrderConfirmationProps) {
  // Destructure with defaults (EMAIL-TPL-002: null handling)
  const {
    customerName = "Valued Customer",
    orderNumber = "",
    orderDate = new Date(),
    items = [],
    subtotal = 0,
    tax = 0,
    shipping = 0,
    total = 0,
    shippingAddress = null,
    orderUrl = "#",
    supportEmail = "support@renoz.energy",
    unsubscribeUrl,
  } = props;

  const themeClasses = getEmailThemeClasses();
  const lightStyles = getEmailInlineStyles("light");
  const firstName = getFirstName(customerName);
  const formattedOrderNumber = formatOrderNumber(orderNumber);
  const previewText = `Your order ${formattedOrderNumber} has been confirmed!`;

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
          <Header tagline="Order Confirmation" />

          {/* Success Banner */}
          <Section
            style={{
              backgroundColor: "#ECFDF5",
              borderLeft: `4px solid ${emailTheme.light.success}`,
              padding: "16px 24px",
            }}
          >
            <Text
              style={{
                color: "#065F46",
                fontSize: "16px",
                fontWeight: "600",
                margin: 0,
              }}
            >
              Order Confirmed!
            </Text>
            <Text
              style={{
                color: "#047857",
                fontSize: "14px",
                margin: "4px 0 0 0",
              }}
            >
              Thank you for your order. We&apos;ll notify you when it ships.
            </Text>
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
              Your order <strong>{formattedOrderNumber}</strong> has been confirmed
              and is being processed. Here&apos;s a summary of your order:
            </Text>

            {/* Order Details */}
            <Section
              style={{
                backgroundColor: "#F9FAFB",
                borderRadius: "8px",
                padding: "20px",
                marginBottom: "24px",
              }}
            >
              <Text
                style={{
                  fontSize: "14px",
                  color: "#6B7280",
                  margin: "0 0 12px 0",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Order Details
              </Text>

              <table cellPadding="0" cellSpacing="0" style={{ width: "100%" }}>
                <tr>
                  <td style={{ padding: "4px 0" }}>
                    <span style={{ color: "#6B7280", fontSize: "14px" }}>
                      Order Number:
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
                      {formattedOrderNumber}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "4px 0" }}>
                    <span style={{ color: "#6B7280", fontSize: "14px" }}>
                      Order Date:
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
                      {formatDate(orderDate)}
                    </span>
                  </td>
                </tr>
              </table>
            </Section>

            {/* Line Items */}
            {items.length > 0 && (
              <Section
                style={{
                  marginBottom: "24px",
                }}
              >
                <Text
                  style={{
                    fontSize: "14px",
                    color: "#6B7280",
                    margin: "0 0 12px 0",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Items Ordered
                </Text>

                <table
                  cellPadding="0"
                  cellSpacing="0"
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                  }}
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
                        Item
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
                        Price
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
                          {item.name}
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
                  {(shipping ?? 0) > 0 && (
                    <tr>
                      <td style={{ padding: "4px 0" }}>
                        <span style={{ color: "#6B7280", fontSize: "14px" }}>
                          Shipping:
                        </span>
                      </td>
                      <td style={{ padding: "4px 0", textAlign: "right" }}>
                        <span style={{ color: "#111827", fontSize: "14px" }}>
                          {formatCurrency(shipping)}
                        </span>
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td style={{ padding: "12px 0 0 0" }}>
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
                    <td style={{ padding: "12px 0 0 0", textAlign: "right" }}>
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
                </table>
              </Section>
            )}

            {/* Shipping Address */}
            {shippingAddress && (
              <Section
                style={{
                  backgroundColor: "#F9FAFB",
                  borderRadius: "8px",
                  padding: "20px",
                  marginBottom: "24px",
                }}
              >
                <Text
                  style={{
                    fontSize: "14px",
                    color: "#6B7280",
                    margin: "0 0 8px 0",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Shipping To
                </Text>
                <Text
                  style={{
                    fontSize: "14px",
                    color: "#111827",
                    margin: 0,
                    whiteSpace: "pre-line",
                  }}
                >
                  {formatAddress(shippingAddress, "Address not provided")}
                </Text>
              </Section>
            )}

            {/* CTA Button */}
            <Section style={{ textAlign: "center", margin: "32px 0" }}>
              <Button href={orderUrl}>View Order Details</Button>
            </Section>
          </Section>

          <Footer
            supportEmail={supportEmail}
            unsubscribeUrl={unsubscribeUrl}
          />
        </Container>
      </Body>
    </EmailThemeProvider>
  );
}

// Default export for React Email dev server
export default OrderConfirmation;

// Preview props for development
OrderConfirmation.PreviewProps = {
  customerName: "John Doe",
  orderNumber: "ORD-2024-0001",
  orderDate: new Date(),
  items: [
    { name: "Tesla Powerwall 2", quantity: 2, unitPrice: 8500, total: 17000 },
    { name: "Installation Service", quantity: 1, unitPrice: 1200, total: 1200 },
  ],
  subtotal: 18200,
  tax: 1638,
  shipping: 0,
  total: 19838,
  shippingAddress: {
    street: "123 Solar Street",
    city: "San Francisco",
    state: "CA",
    zip: "94102",
  },
  orderUrl: "https://app.renoz.energy/orders/ORD-2024-0001",
  supportEmail: "support@renoz.energy",
} as OrderConfirmationProps;
