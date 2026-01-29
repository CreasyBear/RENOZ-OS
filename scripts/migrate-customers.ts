import "dotenv/config";
import postgres from "postgres";
import { randomUUID } from "crypto";

const requiredEnv = ["OLD_DATABASE_URL", "NEW_DATABASE_URL", "OLD_ORG_ID", "NEW_ORG_ID"];

const missing = requiredEnv.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`Missing env vars: ${missing.join(", ")}`);
  process.exit(1);
}

const OLD_DATABASE_URL = process.env.OLD_DATABASE_URL!;
const NEW_DATABASE_URL = process.env.NEW_DATABASE_URL!;
const OLD_ORG_ID = process.env.OLD_ORG_ID!;
const NEW_ORG_ID = process.env.NEW_ORG_ID!;

const DRY_RUN = process.env.DRY_RUN === "1";
const RESET_TARGET = process.env.RESET_TARGET === "1";

const oldDb = postgres(OLD_DATABASE_URL, { prepare: false, max: 1 });
const newDb = postgres(NEW_DATABASE_URL, { prepare: false, max: 1 });

type OldCustomer = {
  id: string;
  organization_id: string;
  customer_name: string;
  customer_type: string;
  status: string;
  primary_email: string | null;
  primary_phone: string | null;
  notes: string | null;
  converted_from_lead_id: string | null;
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
  updated_by_user_id: string | null;
  abn: string | null;
  pricing_tier_id: string | null;
};

type OldCustomerActivity = {
  id: string;
  organization_id: string;
  customer_id: string;
  created_by_user_id: string;
  type: string;
  activity_date: string;
  subject: string | null;
  details: string;
  outcome: string | null;
  created_at: string;
  updated_at: string;
  updated_by_user_id: string | null;
};

type OldCustomerAddress = {
  id: string;
  organization_id: string;
  customer_id: string;
  address_type: string;
  is_primary: boolean;
  street: string;
  city: string;
  state_province: string | null;
  postal_code: string;
  country: string;
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
  updated_by_user_id: string | null;
};

type OldContactPerson = {
  id: string;
  organization_id: string;
  customer_id: string;
  is_primary: boolean;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
  updated_by_user_id: string | null;
};

type NewCustomerRow = {
  id: string;
  organization_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  type: string;
  tax_id: string | null;
  custom_fields: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

type NewCustomerActivityRow = {
  id: string;
  organization_id: string;
  customer_id: string;
  contact_id: string | null;
  activity_type: string;
  direction: string | null;
  subject: string | null;
  description: string;
  outcome: string | null;
  duration: number | null;
  scheduled_at: string | null;
  completed_at: string | null;
  assigned_to: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  created_by: string;
};

type NewContactRow = {
  id: string;
  organization_id: string;
  customer_id: string;
  first_name: string;
  last_name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  is_primary: boolean;
  created_by: string | null;
  updated_by: string | null;
};

type NewAddressRow = {
  id: string;
  organization_id: string;
  customer_id: string;
  type: string;
  is_primary: boolean;
  street1: string;
  street2: string | null;
  city: string;
  state: string | null;
  postcode: string;
  country: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

function mapCustomerStatus(oldStatus: string) {
  switch (oldStatus) {
    case "ACTIVE":
      return "active";
    case "INACTIVE":
      return "inactive";
    case "PROSPECT":
      return "prospect";
    default:
      return "prospect";
  }
}

function mapCustomerType(oldType: string) {
  switch (oldType) {
    case "INDIVIDUAL":
      return "individual";
    case "BUSINESS":
      return "business";
    case "END_CUSTOMER":
      return "business";
    default:
      return "business";
  }
}

function mapActivityType(oldType: string) {
  switch (oldType) {
    case "CALL":
      return "call";
    case "EMAIL":
      return "email";
    case "MEETING":
      return "meeting";
    case "NOTE":
      return "note";
    case "STATUS_CHANGE":
      return "note";
    default:
      return "note";
  }
}

function mapAddressType(oldType: string) {
  switch (oldType) {
    case "BILLING":
      return "billing";
    case "SHIPPING":
      return "shipping";
    case "OTHER":
      return "service";
    default:
      return "service";
  }
}

function splitContactName(fullName: string) {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return { firstName: "Primary", lastName: "Contact" };
  }
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: "Primary", lastName: trimmed };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

async function main() {
  console.log("Starting customer migration...");

  const oldCustomers = (await oldDb<OldCustomer[]>`
    select *
    from public.customers
    where organization_id = ${OLD_ORG_ID}
  `) as OldCustomer[];

  const oldActivities = (await oldDb<OldCustomerActivity[]>`
    select *
    from public.customer_activities
    where organization_id = ${OLD_ORG_ID}
  `) as OldCustomerActivity[];

  const oldAddresses = (await oldDb<OldCustomerAddress[]>`
    select *
    from public.customer_addresses
    where organization_id = ${OLD_ORG_ID}
  `) as OldCustomerAddress[];

  const oldContactPersons = (await oldDb<OldContactPerson[]>`
    select *
    from public.customer_contact_persons
    where organization_id = ${OLD_ORG_ID}
  `) as OldContactPerson[];

  const existingEmailRows = (await newDb<{ email: string }[]>`
    select email
    from public.customers
    where organization_id = ${NEW_ORG_ID} and email is not null
  `) as { email: string }[];
  const existingEmails = new Set(
    existingEmailRows.map((row) => row.email.toLowerCase())
  );
  const batchEmails = new Set<string>();
  let duplicateEmailCount = 0;

  if (RESET_TARGET && !DRY_RUN) {
    console.log("RESET_TARGET=1: clearing target tables for org...");
    await newDb`
      delete from public.customer_activities where organization_id = ${NEW_ORG_ID}
    `;
    await newDb`
      delete from public.addresses where organization_id = ${NEW_ORG_ID}
    `;
    await newDb`
      delete from public.contacts where organization_id = ${NEW_ORG_ID}
    `;
    await newDb`
      delete from public.customers where organization_id = ${NEW_ORG_ID}
    `;
  }

  const customerRows: NewCustomerRow[] = oldCustomers.map((customer) => {
    const isEndCustomer = customer.customer_type === "END_CUSTOMER";
    const status = isEndCustomer
      ? "inactive"
      : mapCustomerStatus(customer.status);
    const email = customer.primary_email?.trim() || null;
    let dedupedEmail = email;
    if (email) {
      const normalized = email.toLowerCase();
      if (existingEmails.has(normalized) || batchEmails.has(normalized)) {
        dedupedEmail = null;
        duplicateEmailCount += 1;
      } else {
        batchEmails.add(normalized);
      }
    }

    return {
      id: customer.id,
      organization_id: NEW_ORG_ID,
      name: customer.customer_name,
      email: dedupedEmail,
      phone: customer.primary_phone,
      status,
      type: mapCustomerType(customer.customer_type),
      tax_id: customer.abn,
      custom_fields: {
        legacy_notes: customer.notes,
        legacy_pricing_tier_id: customer.pricing_tier_id,
        legacy_converted_from_lead_id: customer.converted_from_lead_id,
        legacy_primary_email: customer.primary_email,
        customer_segment: isEndCustomer ? "end_customer" : undefined,
      },
      created_at: customer.created_at,
      updated_at: customer.updated_at,
      created_by: customer.created_by_user_id,
      updated_by: customer.updated_by_user_id,
    };
  });

  if (!DRY_RUN) {
    if (customerRows.length > 0) {
      const customerColumns = [
        "id",
        "organization_id",
        "name",
        "email",
        "phone",
        "status",
        "type",
        "tax_id",
        "custom_fields",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
      ] as const;

      await newDb`
        insert into public.customers ${newDb(customerRows, customerColumns)}
        on conflict (id) do nothing
      `;
    }
  } else {
    console.log(`DRY_RUN: would insert ${customerRows.length} customers`);
  }
  console.log(`Deduplicated emails (set to null): ${duplicateEmailCount}`);

  const addressRows: NewAddressRow[] = oldAddresses.map((address) => ({
    id: address.id,
    organization_id: NEW_ORG_ID,
    customer_id: address.customer_id,
    type: mapAddressType(address.address_type),
    is_primary: address.is_primary,
    street1: address.street,
    street2: null,
    city: address.city,
    state: address.state_province,
    postcode: address.postal_code,
    country: address.country,
    notes: null,
    created_at: address.created_at,
    updated_at: address.updated_at,
  }));

  if (!DRY_RUN) {
    if (addressRows.length > 0) {
      const addressColumns = [
        "id",
        "organization_id",
        "customer_id",
        "type",
        "is_primary",
        "street1",
        "street2",
        "city",
        "state",
        "postcode",
        "country",
        "notes",
        "created_at",
        "updated_at",
      ] as const;

      await newDb`
        insert into public.addresses ${newDb(addressRows, addressColumns)}
        on conflict (id) do nothing
      `;
    }
  } else {
    console.log(`DRY_RUN: would insert ${addressRows.length} addresses`);
  }

  const contactEmailKeyByCustomer = new Map<string, Set<string>>();
  const customersWithContacts = new Set<string>();
  const contactRows: NewContactRow[] = [];

  for (const contact of oldContactPersons) {
    const { firstName, lastName } = splitContactName(contact.name);
    const email = contact.email?.trim() || null;
    const normalizedEmail = email ? email.toLowerCase() : null;
    const keySet = contactEmailKeyByCustomer.get(contact.customer_id) ?? new Set();
    if (normalizedEmail && keySet.has(normalizedEmail)) {
      continue;
    }
    if (normalizedEmail) {
      keySet.add(normalizedEmail);
      contactEmailKeyByCustomer.set(contact.customer_id, keySet);
    }
    customersWithContacts.add(contact.customer_id);
    contactRows.push({
      id: contact.id,
      organization_id: NEW_ORG_ID,
      customer_id: contact.customer_id,
      first_name: firstName,
      last_name: lastName,
      title: contact.role,
      email,
      phone: contact.phone,
      is_primary: contact.is_primary,
      created_by: contact.created_by_user_id,
      updated_by: contact.updated_by_user_id,
    });
  }

  for (const customer of oldCustomers) {
    if (customersWithContacts.has(customer.id)) {
      continue;
    }
    if (!customer.primary_email && !customer.primary_phone) {
      continue;
    }
    const email = customer.primary_email?.trim() || null;
    const normalizedEmail = email ? email.toLowerCase() : null;
    const keySet = contactEmailKeyByCustomer.get(customer.id) ?? new Set();
    if (normalizedEmail && keySet.has(normalizedEmail)) {
      continue;
    }
    if (normalizedEmail) {
      keySet.add(normalizedEmail);
      contactEmailKeyByCustomer.set(customer.id, keySet);
    }
    contactRows.push({
      id: randomUUID(),
      organization_id: NEW_ORG_ID,
      customer_id: customer.id,
      first_name: "Primary",
      last_name: customer.customer_name,
      title: null,
      email,
      phone: customer.primary_phone,
      is_primary: true,
      created_by: customer.created_by_user_id,
      updated_by: customer.updated_by_user_id,
    });
  }

  if (!DRY_RUN) {
    if (contactRows.length > 0) {
      const contactColumns = [
        "id",
        "organization_id",
        "customer_id",
        "first_name",
        "last_name",
        "title",
        "email",
        "phone",
        "is_primary",
        "created_by",
        "updated_by",
      ] as const;

      await newDb`
        insert into public.contacts ${newDb(contactRows, contactColumns)}
        on conflict (id) do nothing
      `;
    }
  } else {
    console.log(`DRY_RUN: would insert ${contactRows.length} contacts`);
  }

  const activityRows: NewCustomerActivityRow[] = oldActivities.map((activity) => ({
    id: activity.id,
    organization_id: NEW_ORG_ID,
    customer_id: activity.customer_id,
    contact_id: null,
    activity_type: mapActivityType(activity.type),
    direction: null,
    subject: activity.subject,
    description: activity.details,
    outcome: activity.outcome,
    duration: null,
    scheduled_at: null,
    completed_at: activity.activity_date,
    assigned_to: null,
    metadata: {
      legacy_type: activity.type,
    },
    created_at: activity.created_at,
    created_by: activity.created_by_user_id,
  }));

  if (!DRY_RUN) {
    if (activityRows.length > 0) {
      const activityColumns = [
        "id",
        "organization_id",
        "customer_id",
        "contact_id",
        "activity_type",
        "direction",
        "subject",
        "description",
        "outcome",
        "duration",
        "scheduled_at",
        "completed_at",
        "assigned_to",
        "metadata",
        "created_at",
        "created_by",
      ] as const;

      await newDb`
        insert into public.customer_activities ${newDb(activityRows, activityColumns)}
        on conflict (id) do nothing
      `;
    }
  } else {
    console.log(`DRY_RUN: would insert ${activityRows.length} activities`);
  }

  console.log("Migration summary:");
  console.log(`- Customers: ${customerRows.length}`);
  console.log(`- Addresses: ${addressRows.length}`);
  console.log(`- Contacts: ${contactRows.length}`);
  console.log(`- Customer activities: ${activityRows.length}`);

  await oldDb.end();
  await newDb.end();
}

main().catch(async (err) => {
  console.error("Migration failed:", err);
  await oldDb.end();
  await newDb.end();
  process.exit(1);
});
