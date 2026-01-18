# Database Webhooks and Background Jobs Patterns

This document covers patterns for implementing webhooks and background jobs in a Supabase/PostgreSQL environment using pg_net, Edge Functions, and Trigger.dev.

## Table of Contents

1. [Database Webhooks with pg_net](#database-webhooks-with-pg_net)
2. [Edge Functions (Deno Runtime)](#edge-functions-deno-runtime)
3. [Trigger.dev Integration](#triggerdev-integration)
4. [Use Cases](#use-cases)
5. [Security Patterns](#security-patterns)
6. [Local Development](#local-development)
7. [Error Handling](#error-handling)

---

## Database Webhooks with pg_net

The `pg_net` extension enables PostgreSQL to make HTTP requests directly from database triggers. This allows real-time webhook calls on data changes.

### Enabling pg_net

```sql
-- Enable the pg_net extension (Supabase has this pre-installed)
CREATE EXTENSION IF NOT EXISTS pg_net;
```

### Basic Webhook Trigger Pattern

```sql
-- Create a function that fires a webhook
CREATE OR REPLACE FUNCTION notify_webhook()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
  webhook_url TEXT := 'https://your-project.supabase.co/functions/v1/webhook-handler';
  service_role_key TEXT := current_setting('app.settings.service_role_key', true);
BEGIN
  -- Build the payload based on operation type
  payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', CASE
      WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)::jsonb
      ELSE row_to_json(NEW)::jsonb
    END,
    'old_record', CASE
      WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD)::jsonb
      ELSE NULL
    END,
    'timestamp', NOW()
  );

  -- Make the HTTP request using pg_net
  PERFORM net.http_post(
    url := webhook_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key,
      'X-Webhook-Secret', current_setting('app.settings.webhook_secret', true)
    ),
    body := payload
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Attaching Triggers to Tables

```sql
-- Trigger for INSERT events
CREATE TRIGGER orders_insert_webhook
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_webhook();

-- Trigger for UPDATE events
CREATE TRIGGER orders_update_webhook
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_webhook();

-- Trigger for DELETE events
CREATE TRIGGER orders_delete_webhook
  AFTER DELETE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_webhook();

-- Combined trigger for all operations
CREATE TRIGGER orders_all_webhook
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_webhook();
```

### Conditional Webhook Trigger

```sql
-- Only fire webhook when specific conditions are met
CREATE OR REPLACE FUNCTION notify_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only fire when status actually changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM net.http_post(
      url := 'https://your-project.supabase.co/functions/v1/status-change',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'order_id', NEW.id,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'changed_at', NOW()
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER order_status_change
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_status_change();
```

### Queued Webhook Pattern

For high-volume scenarios, queue webhooks instead of firing immediately:

```sql
-- Create a webhook queue table
CREATE TABLE webhook_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  error_message TEXT
);

-- Queue webhook instead of firing directly
CREATE OR REPLACE FUNCTION queue_webhook()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO webhook_queue (endpoint, payload)
  VALUES (
    'https://your-project.supabase.co/functions/v1/process-order',
    jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'record', row_to_json(NEW)::jsonb
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Edge Functions (Deno Runtime)

Supabase Edge Functions run on Deno and are ideal for webhook receivers and lightweight processing.

### Basic Webhook Receiver

```typescript
// supabase/functions/webhook-handler/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: Record<string, unknown>;
  old_record?: Record<string, unknown>;
  timestamp: string;
}

serve(async (req: Request) => {
  // Verify request method
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Verify webhook secret
  const webhookSecret = req.headers.get("X-Webhook-Secret");
  const expectedSecret = Deno.env.get("WEBHOOK_SECRET");

  if (webhookSecret !== expectedSecret) {
    console.error("Invalid webhook secret");
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const payload: WebhookPayload = await req.json();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Route based on table and operation
    switch (payload.table) {
      case "orders":
        await handleOrderWebhook(supabase, payload);
        break;
      case "inventory":
        await handleInventoryWebhook(supabase, payload);
        break;
      default:
        console.log(`Unhandled table: ${payload.table}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500
      }
    );
  }
});

async function handleOrderWebhook(
  supabase: SupabaseClient,
  payload: WebhookPayload
): Promise<void> {
  const { type, record } = payload;

  if (type === "INSERT") {
    console.log(`New order created: ${record.id}`);
    // Trigger PDF generation, send confirmation email, etc.
  }
}

async function handleInventoryWebhook(
  supabase: SupabaseClient,
  payload: WebhookPayload
): Promise<void> {
  const { type, record, old_record } = payload;

  if (type === "UPDATE" && record.quantity < record.reorder_threshold) {
    console.log(`Low inventory alert: ${record.product_name}`);
    // Create reorder task
  }
}
```

### PDF Generation Edge Function

```typescript
// supabase/functions/generate-pdf/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Using jspdf for PDF generation
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";

interface OrderData {
  id: string;
  customer_name: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  total: number;
  created_at: string;
}

serve(async (req: Request) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const { order_id } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch order data
    const { data: order, error } = await supabase
      .from("orders")
      .select(`
        id,
        customer_name,
        total,
        created_at,
        order_items (
          name,
          quantity,
          price
        )
      `)
      .eq("id", order_id)
      .single();

    if (error) throw error;

    // Generate PDF
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("Order Invoice", 20, 20);

    doc.setFontSize(12);
    doc.text(`Order ID: ${order.id}`, 20, 40);
    doc.text(`Customer: ${order.customer_name}`, 20, 50);
    doc.text(`Date: ${new Date(order.created_at).toLocaleDateString()}`, 20, 60);

    // Add items
    let yPosition = 80;
    order.order_items.forEach((item: any) => {
      doc.text(`${item.name} x${item.quantity} - $${item.price}`, 20, yPosition);
      yPosition += 10;
    });

    doc.setFontSize(14);
    doc.text(`Total: $${order.total}`, 20, yPosition + 10);

    // Convert to base64
    const pdfBase64 = doc.output("datauristring").split(",")[1];

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("invoices")
      .upload(`${order.id}.pdf`, decode(pdfBase64), {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // Update order with PDF URL
    const { data: publicUrl } = supabase.storage
      .from("invoices")
      .getPublicUrl(`${order.id}.pdf`);

    await supabase
      .from("orders")
      .update({ invoice_url: publicUrl.publicUrl })
      .eq("id", order_id);

    return new Response(
      JSON.stringify({
        success: true,
        pdf_url: publicUrl.publicUrl
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("PDF generation error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

// Helper to decode base64
function decode(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
```

### Email Notification Edge Function

```typescript
// supabase/functions/send-email/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

serve(async (req: Request) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const { to, subject, html, from }: EmailRequest = await req.json();

    // Using Resend as the email provider
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: from || "noreply@yourdomain.com",
        to,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Email send failed: ${error}`);
    }

    const result = await response.json();

    return new Response(
      JSON.stringify({ success: true, message_id: result.id }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Email error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
```

---

## Trigger.dev Integration

For long-running jobs (> 60s), complex workflows, or jobs requiring retries and monitoring, use Trigger.dev.

### Installing Trigger.dev

```bash
npm install @trigger.dev/sdk @trigger.dev/supabase
```

### Basic Job Definition

```typescript
// src/trigger/jobs/process-order.ts
import { client } from "../client";
import { eventTrigger } from "@trigger.dev/sdk";
import { z } from "zod";

// Define the job
export const processOrderJob = client.defineJob({
  id: "process-order",
  name: "Process Order",
  version: "1.0.0",
  trigger: eventTrigger({
    name: "order.created",
    schema: z.object({
      orderId: z.string().uuid(),
      customerId: z.string().uuid(),
      items: z.array(z.object({
        productId: z.string(),
        quantity: z.number(),
        price: z.number(),
      })),
      total: z.number(),
    }),
  }),
  run: async (payload, io, ctx) => {
    // Step 1: Validate inventory
    const inventoryCheck = await io.runTask("check-inventory", async () => {
      // Check all items have sufficient stock
      for (const item of payload.items) {
        const stock = await getInventoryLevel(item.productId);
        if (stock < item.quantity) {
          throw new Error(`Insufficient stock for product ${item.productId}`);
        }
      }
      return { available: true };
    });

    // Step 2: Generate invoice PDF
    const pdfResult = await io.runTask("generate-invoice", async () => {
      const response = await fetch(
        `${process.env.SUPABASE_URL}/functions/v1/generate-pdf`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ order_id: payload.orderId }),
        }
      );
      return response.json();
    });

    // Step 3: Send confirmation email
    await io.runTask("send-confirmation", async () => {
      const customer = await getCustomer(payload.customerId);
      await fetch(
        `${process.env.SUPABASE_URL}/functions/v1/send-email`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: customer.email,
            subject: `Order Confirmation - ${payload.orderId}`,
            html: `
              <h1>Thank you for your order!</h1>
              <p>Order ID: ${payload.orderId}</p>
              <p>Total: $${payload.total}</p>
              <p><a href="${pdfResult.pdf_url}">Download Invoice</a></p>
            `,
          }),
        }
      );
    });

    // Step 4: Reserve inventory
    await io.runTask("reserve-inventory", async () => {
      for (const item of payload.items) {
        await decrementInventory(item.productId, item.quantity);
      }
    });

    return {
      success: true,
      orderId: payload.orderId,
      invoiceUrl: pdfResult.pdf_url,
    };
  },
});
```

### Triggering Jobs from Edge Functions

```typescript
// supabase/functions/trigger-job/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req: Request) => {
  try {
    const payload = await req.json();

    // Send event to Trigger.dev
    const response = await fetch(
      `https://api.trigger.dev/api/v1/events`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${Deno.env.get("TRIGGER_API_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: crypto.randomUUID(),
          name: "order.created",
          payload: {
            orderId: payload.record.id,
            customerId: payload.record.customer_id,
            items: payload.record.items,
            total: payload.record.total,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Trigger.dev error: ${await response.text()}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Trigger job error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
```

### Scheduled Jobs with Trigger.dev

```typescript
// src/trigger/jobs/daily-inventory-check.ts
import { client } from "../client";
import { cronTrigger } from "@trigger.dev/sdk";

export const dailyInventoryCheck = client.defineJob({
  id: "daily-inventory-check",
  name: "Daily Inventory Check",
  version: "1.0.0",
  trigger: cronTrigger({
    cron: "0 8 * * *", // Every day at 8 AM
  }),
  run: async (payload, io, ctx) => {
    // Find low inventory items
    const lowItems = await io.runTask("find-low-inventory", async () => {
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { data } = await supabase
        .from("inventory")
        .select("*")
        .lt("quantity", supabase.rpc("get_column", { col: "reorder_threshold" }));

      return data || [];
    });

    // Create reorder tasks for each low item
    for (const item of lowItems) {
      await io.runTask(`create-reorder-${item.id}`, async () => {
        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        await supabase.from("tasks").insert({
          type: "reorder",
          title: `Reorder: ${item.product_name}`,
          description: `Current stock: ${item.quantity}. Reorder threshold: ${item.reorder_threshold}`,
          priority: "high",
          status: "pending",
          metadata: { inventory_id: item.id },
        });
      });
    }

    return { checkedItems: lowItems.length };
  },
});
```

---

## Use Cases

### Use Case 1: Order Created - Generate PDF and Send Email

```sql
-- SQL Trigger
CREATE OR REPLACE FUNCTION on_order_created()
RETURNS TRIGGER AS $$
BEGIN
  -- Fire webhook to process order
  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/process-order',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := jsonb_build_object(
      'order_id', NEW.id,
      'customer_id', NEW.customer_id,
      'total', NEW.total
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER order_created_trigger
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION on_order_created();
```

```typescript
// supabase/functions/process-order/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req: Request) => {
  const { order_id, customer_id, total } = await req.json();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Get customer details
  const { data: customer } = await supabase
    .from("customers")
    .select("email, name")
    .eq("id", customer_id)
    .single();

  // Generate PDF (call another function or do inline)
  const pdfResponse = await fetch(
    `${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-pdf`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ order_id }),
    }
  );
  const { pdf_url } = await pdfResponse.json();

  // Send email
  await fetch(
    `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: customer.email,
        subject: `Order Confirmation #${order_id}`,
        html: `
          <h1>Thank you, ${customer.name}!</h1>
          <p>Your order #${order_id} has been confirmed.</p>
          <p>Total: $${total}</p>
          <p><a href="${pdf_url}">Download your invoice</a></p>
        `,
      }),
    }
  );

  // Update order status
  await supabase
    .from("orders")
    .update({
      status: "confirmed",
      invoice_url: pdf_url,
      confirmation_sent_at: new Date().toISOString(),
    })
    .eq("id", order_id);

  return new Response(JSON.stringify({ success: true }));
});
```

### Use Case 2: Inventory Low - Create Reorder Task

```sql
-- SQL Trigger for inventory updates
CREATE OR REPLACE FUNCTION check_low_inventory()
RETURNS TRIGGER AS $$
BEGIN
  -- Only fire if quantity dropped below threshold
  IF NEW.quantity < NEW.reorder_threshold
     AND (OLD.quantity >= OLD.reorder_threshold OR TG_OP = 'INSERT') THEN

    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/low-inventory-alert',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object(
        'inventory_id', NEW.id,
        'product_name', NEW.product_name,
        'current_quantity', NEW.quantity,
        'reorder_threshold', NEW.reorder_threshold,
        'supplier_id', NEW.supplier_id
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER inventory_low_trigger
  AFTER INSERT OR UPDATE ON inventory
  FOR EACH ROW
  EXECUTE FUNCTION check_low_inventory();
```

```typescript
// supabase/functions/low-inventory-alert/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req: Request) => {
  const {
    inventory_id,
    product_name,
    current_quantity,
    reorder_threshold,
    supplier_id
  } = await req.json();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Get supplier info
  const { data: supplier } = await supabase
    .from("suppliers")
    .select("name, email, default_order_quantity")
    .eq("id", supplier_id)
    .single();

  // Create reorder task
  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      type: "inventory_reorder",
      title: `Reorder: ${product_name}`,
      description: `
        Current stock: ${current_quantity}
        Reorder threshold: ${reorder_threshold}
        Suggested order quantity: ${supplier?.default_order_quantity || 100}
        Supplier: ${supplier?.name}
      `,
      priority: current_quantity === 0 ? "urgent" : "high",
      status: "pending",
      metadata: {
        inventory_id,
        supplier_id,
        suggested_quantity: supplier?.default_order_quantity || 100,
      },
    })
    .select()
    .single();

  // Notify inventory manager
  await supabase.from("notifications").insert({
    type: "low_inventory",
    title: `Low Inventory Alert: ${product_name}`,
    message: `Stock is at ${current_quantity}. A reorder task has been created.`,
    action_url: `/tasks/${task.id}`,
    target_role: "inventory_manager",
  });

  return new Response(JSON.stringify({ success: true, task_id: task.id }));
});
```

### Use Case 3: Opportunity Stage Change - Update Metrics

```sql
-- SQL Trigger for opportunity stage changes
CREATE OR REPLACE FUNCTION on_opportunity_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only fire if stage changed
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/opportunity-stage-changed',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object(
        'opportunity_id', NEW.id,
        'old_stage', OLD.stage,
        'new_stage', NEW.stage,
        'value', NEW.value,
        'owner_id', NEW.owner_id,
        'changed_at', NOW()
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER opportunity_stage_trigger
  AFTER UPDATE ON opportunities
  FOR EACH ROW
  EXECUTE FUNCTION on_opportunity_stage_change();
```

```typescript
// supabase/functions/opportunity-stage-changed/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface StageChange {
  opportunity_id: string;
  old_stage: string;
  new_stage: string;
  value: number;
  owner_id: string;
  changed_at: string;
}

const STAGE_ORDER = [
  "lead",
  "qualified",
  "proposal",
  "negotiation",
  "closed_won",
  "closed_lost",
];

serve(async (req: Request) => {
  const payload: StageChange = await req.json();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Record stage transition
  await supabase.from("stage_transitions").insert({
    opportunity_id: payload.opportunity_id,
    from_stage: payload.old_stage,
    to_stage: payload.new_stage,
    transitioned_at: payload.changed_at,
    user_id: payload.owner_id,
  });

  // Update pipeline metrics
  const oldIndex = STAGE_ORDER.indexOf(payload.old_stage);
  const newIndex = STAGE_ORDER.indexOf(payload.new_stage);
  const isProgression = newIndex > oldIndex;

  // Update sales rep metrics
  if (payload.new_stage === "closed_won") {
    await supabase.rpc("increment_sales_metric", {
      p_user_id: payload.owner_id,
      p_metric: "deals_won",
      p_value: 1,
    });
    await supabase.rpc("increment_sales_metric", {
      p_user_id: payload.owner_id,
      p_metric: "revenue_closed",
      p_value: payload.value,
    });
  } else if (payload.new_stage === "closed_lost") {
    await supabase.rpc("increment_sales_metric", {
      p_user_id: payload.owner_id,
      p_metric: "deals_lost",
      p_value: 1,
    });
  }

  // Update pipeline value by stage
  await supabase.rpc("update_pipeline_stage_value", {
    p_old_stage: payload.old_stage,
    p_new_stage: payload.new_stage,
    p_value: payload.value,
  });

  // Calculate and update win rate
  const { data: metrics } = await supabase
    .from("sales_metrics")
    .select("deals_won, deals_lost")
    .eq("user_id", payload.owner_id)
    .single();

  if (metrics) {
    const total = metrics.deals_won + metrics.deals_lost;
    const winRate = total > 0 ? (metrics.deals_won / total) * 100 : 0;

    await supabase
      .from("sales_metrics")
      .update({ win_rate: winRate })
      .eq("user_id", payload.owner_id);
  }

  return new Response(JSON.stringify({
    success: true,
    isProgression,
  }));
});
```

---

## Security Patterns

### Webhook Secret Verification

```typescript
// Verify HMAC signature for secure webhooks
import { createHmac, timingSafeEqual } from "node:crypto";

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  const sigBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");

  if (sigBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(sigBuffer, expectedBuffer);
}

// In Edge Function (Deno)
serve(async (req: Request) => {
  const signature = req.headers.get("X-Webhook-Signature");
  const timestamp = req.headers.get("X-Webhook-Timestamp");
  const rawBody = await req.text();

  // Check timestamp to prevent replay attacks
  const webhookTime = parseInt(timestamp || "0");
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - webhookTime) > 300) { // 5 minute tolerance
    return new Response("Webhook timestamp too old", { status: 401 });
  }

  // Verify signature
  const signedPayload = `${timestamp}.${rawBody}`;
  const secret = Deno.env.get("WEBHOOK_SECRET")!;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(signedPayload)
  );

  const expectedSignature = Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  if (signature !== expectedSignature) {
    return new Response("Invalid signature", { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  // Process webhook...
});
```

### Authorization Header Patterns

```typescript
// Verify JWT from Supabase Auth
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

async function verifyAuth(req: Request): Promise<{ userId: string } | null> {
  const authHeader = req.headers.get("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return null;
  }

  return { userId: user.id };
}

// Service role for internal calls
function isServiceRole(req: Request): boolean {
  const authHeader = req.headers.get("Authorization");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  return authHeader === `Bearer ${serviceRoleKey}`;
}
```

### Storing Secrets in Database

```sql
-- Store secrets securely using Vault (Supabase feature)
SELECT vault.create_secret(
  'webhook_secret',
  'your-super-secret-key',
  'Webhook signing secret'
);

-- Retrieve in functions
SELECT decrypted_secret
FROM vault.decrypted_secrets
WHERE name = 'webhook_secret';

-- Or use app settings (less secure but simpler)
ALTER DATABASE postgres SET app.settings.webhook_secret = 'your-secret';
```

---

## Local Development

### Testing Webhooks Locally

#### Option 1: Using ngrok

```bash
# Install ngrok
npm install -g ngrok

# Start your local Supabase
supabase start

# Expose local functions
ngrok http 54321

# Use the ngrok URL in your triggers
# https://abc123.ngrok.io/functions/v1/your-function
```

#### Option 2: Using Supabase CLI

```bash
# Start Supabase locally
supabase start

# Serve functions locally
supabase functions serve webhook-handler --env-file .env.local

# Test with curl
curl -X POST http://localhost:54321/functions/v1/webhook-handler \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "X-Webhook-Secret: your-secret" \
  -d '{"type":"INSERT","table":"orders","record":{"id":"123"}}'
```

#### Option 3: Mock Webhook Trigger

```typescript
// scripts/test-webhook.ts
const payload = {
  type: "INSERT",
  table: "orders",
  schema: "public",
  record: {
    id: "test-order-123",
    customer_id: "cust-456",
    total: 99.99,
    status: "pending",
    created_at: new Date().toISOString(),
  },
  timestamp: new Date().toISOString(),
};

async function testWebhook() {
  const response = await fetch(
    "http://localhost:54321/functions/v1/webhook-handler",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "X-Webhook-Secret": process.env.WEBHOOK_SECRET,
      },
      body: JSON.stringify(payload),
    }
  );

  console.log("Status:", response.status);
  console.log("Response:", await response.json());
}

testWebhook();
```

### Local Database Trigger Testing

```sql
-- Create a test trigger that logs instead of firing HTTP
CREATE OR REPLACE FUNCTION test_webhook_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Log to a table instead of firing HTTP
  INSERT INTO webhook_logs (
    operation,
    table_name,
    record_id,
    payload,
    created_at
  ) VALUES (
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    row_to_json(COALESCE(NEW, OLD))::jsonb,
    NOW()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Use for local testing
CREATE TRIGGER local_test_trigger
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION test_webhook_trigger();
```

---

## Error Handling

### Retry Strategies

```typescript
// Exponential backoff retry
async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelayMs = 1000,
    maxDelayMs = 30000,
    backoffMultiplier = 2,
  } = options;

  let lastError: Error;
  let delay = initialDelayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts) {
        break;
      }

      console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));

      delay = Math.min(delay * backoffMultiplier, maxDelayMs);
    }
  }

  throw lastError;
}

// Usage in Edge Function
serve(async (req: Request) => {
  const payload = await req.json();

  try {
    await withRetry(
      () => processOrder(payload),
      { maxAttempts: 3, initialDelayMs: 1000 }
    );

    return new Response(JSON.stringify({ success: true }));
  } catch (error) {
    // All retries failed, send to dead letter queue
    await sendToDeadLetterQueue(payload, error);

    return new Response(
      JSON.stringify({ error: "Processing failed after retries" }),
      { status: 500 }
    );
  }
});
```

### Dead Letter Queue

```sql
-- Dead letter queue table
CREATE TABLE dead_letter_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL, -- 'webhook', 'trigger', 'job'
  payload JSONB NOT NULL,
  error_message TEXT,
  error_stack TEXT,
  attempts INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_attempt_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT
);

-- Index for finding unresolved items
CREATE INDEX idx_dlq_unresolved ON dead_letter_queue (created_at)
WHERE resolved_at IS NULL;
```

```typescript
// Dead letter queue handler
async function sendToDeadLetterQueue(
  payload: any,
  error: Error
): Promise<void> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  await supabase.from("dead_letter_queue").insert({
    source: "webhook",
    payload,
    error_message: error.message,
    error_stack: error.stack,
    last_attempt_at: new Date().toISOString(),
  });

  // Optionally notify on-call
  await supabase.from("notifications").insert({
    type: "dlq_alert",
    title: "Webhook Processing Failed",
    message: `Payload moved to dead letter queue: ${error.message}`,
    target_role: "admin",
    priority: "high",
  });
}
```

### Reprocessing Dead Letters

```typescript
// supabase/functions/reprocess-dlq/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req: Request) => {
  const { dlq_id } = await req.json();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Get the dead letter item
  const { data: dlqItem, error } = await supabase
    .from("dead_letter_queue")
    .select("*")
    .eq("id", dlq_id)
    .single();

  if (error || !dlqItem) {
    return new Response(
      JSON.stringify({ error: "DLQ item not found" }),
      { status: 404 }
    );
  }

  try {
    // Reprocess the original payload
    const response = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/webhook-handler`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dlqItem.payload),
      }
    );

    if (!response.ok) {
      throw new Error(`Reprocessing failed: ${await response.text()}`);
    }

    // Mark as resolved
    await supabase
      .from("dead_letter_queue")
      .update({
        resolved_at: new Date().toISOString(),
        resolution_notes: "Successfully reprocessed",
      })
      .eq("id", dlq_id);

    return new Response(JSON.stringify({ success: true }));
  } catch (error) {
    // Update attempt count
    await supabase
      .from("dead_letter_queue")
      .update({
        attempts: dlqItem.attempts + 1,
        last_attempt_at: new Date().toISOString(),
        error_message: error.message,
      })
      .eq("id", dlq_id);

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    );
  }
});
```

### Trigger.dev Error Handling

```typescript
// Trigger.dev has built-in retry handling
export const processOrderJob = client.defineJob({
  id: "process-order",
  name: "Process Order",
  version: "1.0.0",
  trigger: eventTrigger({ name: "order.created" }),

  // Configure retries
  retry: {
    maxAttempts: 5,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 60000,
  },

  // Handle failures
  onFailure: async (payload, error, ctx) => {
    console.error(`Job failed after ${ctx.attempt} attempts:`, error);

    // Send to your dead letter queue
    await fetch(`${process.env.SUPABASE_URL}/functions/v1/dlq-insert`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: "trigger.dev",
        payload,
        error_message: error.message,
        job_id: ctx.id,
      }),
    });
  },

  run: async (payload, io, ctx) => {
    // Job implementation...
  },
});
```

---

## Summary

| Pattern | When to Use | Latency | Complexity |
|---------|-------------|---------|------------|
| pg_net direct | Simple notifications, low volume | Low | Low |
| pg_net + queue | High volume, need reliability | Medium | Medium |
| Edge Functions | < 60s processing, transformations | Low | Low |
| Trigger.dev | Long-running, complex workflows | Higher | Medium |

### Best Practices

1. **Always verify webhook signatures** - Never trust unverified payloads
2. **Use idempotency keys** - Prevent duplicate processing
3. **Implement dead letter queues** - Don't lose failed messages
4. **Log everything** - Debug production issues
5. **Set appropriate timeouts** - Edge Functions have 60s limit
6. **Use queues for high volume** - Don't overwhelm your endpoints
7. **Test locally first** - Use ngrok or mock triggers
8. **Monitor failure rates** - Set up alerts for DLQ growth
