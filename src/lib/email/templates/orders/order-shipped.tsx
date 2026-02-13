/**
 * Order Shipped Email Template
 *
 * Sent when an order is shipped with tracking information.
 *
 * @see EMAIL-TPL-007
 */

import {
  Body,
  Container,
  Preview,
  Section,
  Text,
  Link,
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
import { formatDate, formatOrderNumber, formatAddress, getFirstName } from "../../format";
import type { BaseEmailProps } from "../../render";

// ============================================================================
// TYPES
// ============================================================================

export interface ShippingAddress {
  street?: string | null;
  street2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
}

export interface OrderShippedProps extends BaseEmailProps {
  /** Customer's full name */
  customerName?: string | null;
  /** Order number/ID */
  orderNumber?: string | null;
  /** Carrier name (e.g., "UPS", "FedEx") */
  carrier?: string | null;
  /** Tracking number */
  trackingNumber?: string | null;
  /** URL to track the shipment */
  trackingUrl?: string | null;
  /** Estimated delivery date */
  estimatedDelivery?: Date | string | null;
  /** Shipping address */
  shippingAddress?: ShippingAddress | null;
  /** URL to view order details */
  orderUrl?: string;
  /** Support email address */
  supportEmail?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function OrderShipped(props: OrderShippedProps) {
  // Destructure with defaults (EMAIL-TPL-002: null handling)
  const {
    customerName = "Valued Customer",
    orderNumber = "",
    carrier = "Carrier",
    trackingNumber = null,
    trackingUrl = null,
    estimatedDelivery = null,
    shippingAddress = null,
    orderUrl = "#",
    supportEmail = "support@renoz.energy",
    unsubscribeUrl,
  } = props;

  const themeClasses = getEmailThemeClasses();
  const lightStyles = getEmailInlineStyles("light");
  const firstName = getFirstName(customerName);
  const formattedOrderNumber = formatOrderNumber(orderNumber);
  const previewText = `Great news! Your order ${formattedOrderNumber} has shipped.`;

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
          <Header tagline="Shipping Notification" />

          {/* Shipped Banner */}
          <Section
            style={{
              backgroundColor: "#EFF6FF",
              borderLeft: `4px solid ${emailTheme.light.accent}`,
              padding: "16px 24px",
            }}
          >
            <Text
              style={{
                color: "#1E40AF",
                fontSize: "16px",
                fontWeight: "600",
                margin: 0,
              }}
            >
              Your Order Has Shipped!
            </Text>
            <Text
              style={{
                color: "#3B82F6",
                fontSize: "14px",
                margin: "4px 0 0 0",
              }}
            >
              It&apos;s on the way to you.
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
              Great news! Your order <strong>{formattedOrderNumber}</strong> has
              shipped and is on its way to you.
            </Text>

            {/* Tracking Info */}
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
                Tracking Information
              </Text>

              <table cellPadding="0" cellSpacing="0" style={{ width: "100%" }}>
                <tr>
                  <td style={{ padding: "4px 0" }}>
                    <span style={{ color: "#6B7280", fontSize: "14px" }}>
                      Carrier:
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
                      {carrier}
                    </span>
                  </td>
                </tr>
                {trackingNumber && (
                  <tr>
                    <td style={{ padding: "4px 0" }}>
                      <span style={{ color: "#6B7280", fontSize: "14px" }}>
                        Tracking Number:
                      </span>
                    </td>
                    <td style={{ padding: "4px 0", textAlign: "right" }}>
                      {trackingUrl ? (
                        <Link
                          href={trackingUrl}
                          style={{
                            color: emailTheme.light.accent,
                            fontSize: "14px",
                            fontWeight: "500",
                            fontFamily: "monospace",
                            textDecoration: "none",
                          }}
                        >
                          {trackingNumber}
                        </Link>
                      ) : (
                        <span
                          style={{
                            color: "#111827",
                            fontSize: "14px",
                            fontWeight: "500",
                            fontFamily: "monospace",
                          }}
                        >
                          {trackingNumber}
                        </span>
                      )}
                    </td>
                  </tr>
                )}
                {estimatedDelivery && (
                  <tr>
                    <td style={{ padding: "4px 0" }}>
                      <span style={{ color: "#6B7280", fontSize: "14px" }}>
                        Estimated Delivery:
                      </span>
                    </td>
                    <td style={{ padding: "4px 0", textAlign: "right" }}>
                      <span
                        style={{
                          color: "#059669",
                          fontSize: "14px",
                          fontWeight: "600",
                        }}
                      >
                        {formatDate(estimatedDelivery, { style: "long" })}
                      </span>
                    </td>
                  </tr>
                )}
              </table>
            </Section>

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

            {/* CTA Buttons */}
            <Section style={{ textAlign: "center", margin: "32px 0" }}>
              {trackingUrl && (
                <Button href={trackingUrl}>Track Your Package</Button>
              )}
              <Text style={{ margin: "16px 0" }}>
                <Link
                  href={orderUrl}
                  style={{
                    color: emailTheme.light.accent,
                    fontSize: "14px",
                    textDecoration: "none",
                  }}
                >
                  View Order Details
                </Link>
              </Text>
            </Section>

            <Text
              className={themeClasses.mutedText}
              style={{
                color: lightStyles.mutedText.color,
                fontSize: "14px",
                lineHeight: "1.5",
                margin: "24px 0 0 0",
              }}
            >
              If you have any questions about your delivery, please don&apos;t
              hesitate to contact us.
            </Text>
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
export default OrderShipped;

// Preview props for development
OrderShipped.PreviewProps = {
  customerName: "John Doe",
  orderNumber: "ORD-2024-0001",
  carrier: "FedEx",
  trackingNumber: "1234567890123456",
  trackingUrl: "https://fedex.com/track?id=1234567890123456",
  estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
  shippingAddress: {
    street: "123 Solar Street",
    city: "San Francisco",
    state: "CA",
    zip: "94102",
  },
  orderUrl: "https://app.renoz.energy/orders/ORD-2024-0001",
  supportEmail: "support@renoz.energy",
} as OrderShippedProps;
