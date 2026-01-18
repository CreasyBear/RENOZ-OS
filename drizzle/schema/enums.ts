/**
 * Consolidated Enum Definitions
 *
 * All pgEnum definitions in one place for consistency.
 * Values MUST match canonical-enums.json exactly.
 *
 * @see _Initiation/_prd/1-foundation/patterns/canonical-enums.json
 */

import { pgEnum } from "drizzle-orm/pg-core";

// ============================================================================
// USER & AUTH ENUMS
// ============================================================================

export const userRoleEnum = pgEnum("user_role", [
  "owner",
  "admin",
  "manager",
  "sales",
  "operations",
  "support",
  "viewer",
]);

export const userStatusEnum = pgEnum("user_status", [
  "active",
  "invited",
  "suspended",
  "deactivated",
]);

export const userTypeEnum = pgEnum("user_type", ["staff", "installer"]);

export const apiTokenScopeEnum = pgEnum("api_token_scope", [
  "read",
  "write",
  "admin",
]);

// ============================================================================
// CUSTOMER ENUMS
// ============================================================================

export const customerStatusEnum = pgEnum("customer_status", [
  "prospect",
  "active",
  "inactive",
  "suspended",
  "blacklisted",
]);

export const customerTypeEnum = pgEnum("customer_type", [
  "individual",
  "business",
  "government",
  "non_profit",
]);

export const customerSizeEnum = pgEnum("customer_size", [
  "micro",
  "small",
  "medium",
  "large",
  "enterprise",
]);

export const addressTypeEnum = pgEnum("address_type", [
  "billing",
  "shipping",
  "service",
  "headquarters",
]);

// Customer activity type enum (for activity timeline)
export const customerActivityTypeEnum = pgEnum("customer_activity_type", [
  "call",
  "email",
  "meeting",
  "note",
  "quote",
  "order",
  "complaint",
  "feedback",
  "website_visit",
  "social_interaction",
]);

// Activity direction enum
export const activityDirectionEnum = pgEnum("activity_direction", [
  "inbound",
  "outbound",
  "internal",
]);

// Customer priority level enum
export const customerPriorityLevelEnum = pgEnum("customer_priority_level", [
  "low",
  "medium",
  "high",
  "vip",
]);

// Service level enum
export const serviceLevelEnum = pgEnum("service_level", [
  "standard",
  "premium",
  "platinum",
]);

// ============================================================================
// PRODUCT & INVENTORY ENUMS
// ============================================================================

export const productTypeEnum = pgEnum("product_type", [
  "physical",
  "service",
  "digital",
  "bundle",
]);

export const productStatusEnum = pgEnum("product_status", [
  "active",
  "inactive",
  "discontinued",
]);

export const attributeTypeEnum = pgEnum("attribute_type", [
  "text",
  "number",
  "boolean",
  "select",
  "multiselect",
  "date",
]);

export const productRelationTypeEnum = pgEnum("product_relation_type", [
  "accessory",
  "alternative",
  "upgrade",
  "compatible",
  "bundle",
]);

export const priceChangeTypeEnum = pgEnum("price_change_type", [
  "base_price",      // Base price changed on product
  "cost_price",      // Cost price changed
  "tier_created",    // New volume tier added
  "tier_updated",    // Existing tier modified
  "tier_deleted",    // Tier removed
  "customer_price",  // Customer-specific price set/updated
  "bulk_update",     // Part of bulk price update operation
]);

export const taxTypeEnum = pgEnum("tax_type", [
  "gst",
  "gst_free",
  "input_taxed",
  "export",
]);

export const inventoryStatusEnum = pgEnum("inventory_status", [
  "available",
  "allocated",
  "sold",
  "damaged",
  "returned",
  "quarantined",
]);

export const movementTypeEnum = pgEnum("movement_type", [
  "receive",
  "allocate",
  "deallocate",
  "pick",
  "ship",
  "adjust",
  "return",
  "transfer",
]);

// ============================================================================
// ORDER & PAYMENT ENUMS
// ============================================================================

export const orderStatusEnum = pgEnum("order_status", [
  "draft",
  "confirmed",
  "picking",
  "picked",
  "shipped",
  "delivered",
  "cancelled",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "partial",
  "paid",
  "refunded",
  "overdue",
]);

export const shipmentStatusEnum = pgEnum("shipment_status", [
  "pending",      // Created, not yet picked up
  "in_transit",   // Picked up by carrier
  "out_for_delivery", // On delivery vehicle
  "delivered",    // Confirmed delivered
  "failed",       // Delivery failed
  "returned",     // Returned to sender
]);

export const purchaseOrderStatusEnum = pgEnum("purchase_order_status", [
  "draft",
  "sent",
  "acknowledged",
  "partial",
  "received",
  "cancelled",
]);

// ============================================================================
// PIPELINE ENUMS
// ============================================================================

export const opportunityStageEnum = pgEnum("opportunity_stage", [
  "new",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
]);

export const opportunityActivityTypeEnum = pgEnum("opportunity_activity_type", [
  "call",
  "email",
  "meeting",
  "note",
  "follow_up",
]);

export const winLossReasonTypeEnum = pgEnum("win_loss_reason_type", [
  "win",
  "loss",
]);

// ============================================================================
// SUPPORT ENUMS
// ============================================================================

export const warrantyStatusEnum = pgEnum("warranty_status", [
  "active",
  "expired",
  "voided",
  "transferred",
]);

export const issuePriorityEnum = pgEnum("issue_priority", [
  "low",
  "medium",
  "high",
  "critical",
]);

export const issueStatusEnum = pgEnum("issue_status", [
  "open",
  "in_progress",
  "pending",
  "resolved",
  "closed",
]);

// ============================================================================
// NOTIFICATION & COMMUNICATION ENUMS
// ============================================================================

export const notificationStatusEnum = pgEnum("notification_status", [
  "pending",
  "sent",
  "read",
  "dismissed",
  "failed",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "quote",
  "order",
  "issue",
  "warranty",
  "shipment",
  "payment",
  "customer",
  "product",
  "inventory",
  "user",
  "system",
  "call_reminder",
  "call_overdue",
]);

export const emailStatusEnum = pgEnum("email_status", [
  "pending",
  "sent",
  "delivered",
  "opened",
  "clicked",
  "bounced",
  "failed",
]);

export const scheduledEmailStatusEnum = pgEnum("scheduled_email_status", [
  "pending",
  "sent",
  "cancelled",
]);

export const campaignStatusEnum = pgEnum("campaign_status", [
  "draft",
  "scheduled",
  "sending",
  "sent",
  "paused",
  "cancelled",
  "failed",
]);

export const campaignRecipientStatusEnum = pgEnum("campaign_recipient_status", [
  "pending",
  "sent",
  "delivered",
  "opened",
  "clicked",
  "bounced",
  "failed",
  "unsubscribed",
]);

export const scheduledCallStatusEnum = pgEnum("scheduled_call_status", [
  "pending",
  "completed",
  "cancelled",
  "rescheduled",
]);

// ============================================================================
// ACTIVITY & AUDIT ENUMS
// ============================================================================

export const activityActionEnum = pgEnum("activity_action", [
  "created",
  "updated",
  "deleted",
  "viewed",
  "exported",
  "shared",
  "assigned",
  "commented",
  "email_sent",
  "email_opened",
  "email_clicked",
  "call_logged",
  "note_added",
]);

export const activityEntityTypeEnum = pgEnum("activity_entity_type", [
  "customer",
  "contact",
  "order",
  "opportunity",
  "product",
  "inventory",
  "supplier",
  "warranty",
  "issue",
  "user",
  "email",
  "call",
]);

export const activitySourceEnum = pgEnum("activity_source", [
  "manual",
  "email",
  "webhook",
  "system",
  "import",
]);

// ============================================================================
// JOB TRACKING ENUMS
// ============================================================================

export const jobStatusEnum = pgEnum("job_status", [
  "pending",
  "running",
  "completed",
  "failed",
]);

export const jobTypeEnum = pgEnum("job_type", [
  "import",
  "export",
  "bulk_update",
  "report_generation",
  "data_sync",
  "cleanup",
  "other",
]);

// ============================================================================
// WAREHOUSE MANAGEMENT ENUMS
// ============================================================================

export const stockCountStatusEnum = pgEnum("stock_count_status", [
  "draft",
  "in_progress",
  "completed",
  "cancelled",
]);

export const stockCountTypeEnum = pgEnum("stock_count_type", [
  "full",
  "cycle",
  "spot",
  "annual",
]);

export const inventoryAlertTypeEnum = pgEnum("inventory_alert_type", [
  "low_stock",
  "out_of_stock",
  "overstock",
  "expiry",
  "slow_moving",
  "forecast_deviation",
]);

export const forecastPeriodEnum = pgEnum("forecast_period", [
  "daily",
  "weekly",
  "monthly",
]);

export const qualityStatusEnum = pgEnum("quality_status", [
  "good",
  "damaged",
  "expired",
  "quarantined",
]);

export const costLayerReferenceTypeEnum = pgEnum("cost_layer_reference_type", [
  "purchase_order",
  "adjustment",
  "transfer",
]);

// ============================================================================
// UI ENUMS
// ============================================================================

export const emptyStateTypeEnum = pgEnum("empty_state_type", [
  "no_data",
  "filtered_empty",
  "search_empty",
  "permission_denied",
  "error",
]);
