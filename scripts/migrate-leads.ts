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

const oldDb = postgres(OLD_DATABASE_URL, { prepare: false, max: 1 });
const newDb = postgres(NEW_DATABASE_URL, { prepare: false, max: 1 });

type OldLead = {
  id: string;
  organization_id: string;
  lead_name: string;
  first_name: string | null;
  last_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  mobile: string | null;
  lead_type: string;
  status: string;
  lead_source: string | null;
  potential_value: number | null;
  currency: string | null;
  assigned_to_user_id: string | null;
  notes: string | null;
  qualified_at: string | null;
  unqualified_at: string | null;
  disqualification_reason: string | null;
  disqualification_details: string | null;
  converted_at: string | null;
  converted_to_customer_id: string | null;
  archived_at: string | null;
  archived_reason: string | null;
  custom_fields: Record<string, unknown> | null;
  created_by_user_id: string;
  updated_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  contact_person_name: string | null;
  company_name: string | null;
  address: Record<string, unknown> | null;
  follow_up_date: string | null;
  last_contacted_date: string | null;
  lead_score: number | null;
  industry: string | null;
  referral_status: string | null;
};

type OldLeadContact = {
  id: string;
  organization_id: string;
  lead_id: string;
  is_primary: boolean;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  created_at: string;
  updated_at: string;
  created_by_user_id: string | null;
  updated_by_user_id: string | null;
};

type OldLeadActivity = {
  id: string;
  organization_id: string;
  lead_id: string;
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

type NewCustomerRow = {
  id: string;
  organization_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  type: string;
  custom_fields: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
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

type NewOpportunityRow = {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  customer_id: string;
  contact_id: string | null;
  assigned_to: string | null;
  stage: string;
  probability: number | null;
  value: number | null;
  expected_close_date: string | null;
  follow_up_date: string | null;
  metadata: Record<string, unknown>;
  tags: string[];
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

type NewOpportunityActivityRow = {
  id: string;
  organization_id: string;
  opportunity_id: string;
  type: string;
  description: string;
  outcome: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
  created_by: string;
  created_at: string;
};

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

function mapLeadActivityType(oldType: string) {
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

function buildLeadTitle(lead: OldLead) {
  const nameParts = [lead.first_name, lead.last_name].filter(Boolean).join(" ");
  return (
    lead.lead_name ||
    lead.company_name ||
    lead.contact_person_name ||
    nameParts ||
    `Lead ${lead.id}`
  );
}

async function main() {
  console.log("Starting lead migration...");

  const leads = (await oldDb<OldLead[]>`
    select *
    from public.leads
    where organization_id = ${OLD_ORG_ID}
  `) as OldLead[];

  const leadContacts = (await oldDb<OldLeadContact[]>`
    select *
    from public.lead_contacts
    where organization_id = ${OLD_ORG_ID}
  `) as OldLeadContact[];

  const leadActivities = (await oldDb<OldLeadActivity[]>`
    select *
    from public.lead_activities
    where organization_id = ${OLD_ORG_ID}
  `) as OldLeadActivity[];

  const existingCustomers = (await newDb<{ id: string; email: string | null }[]>`
    select id, email
    from public.customers
    where organization_id = ${NEW_ORG_ID}
  `) as { id: string; email: string | null }[];

  const existingUsers = (await newDb<{ id: string }[]>`
    select id
    from public.users
    where organization_id = ${NEW_ORG_ID}
  `) as { id: string }[];
  const existingUserIds = new Set(existingUsers.map((row) => row.id));
  const fallbackUserId = existingUsers[0]?.id ?? null;

  const existingCustomerIds = new Set(existingCustomers.map((row) => row.id));
  const existingEmails = new Set(
    existingCustomers
      .map((row) => row.email)
      .filter(Boolean)
      .map((email) => email!.toLowerCase())
  );
  const batchEmails = new Set<string>();

  const customerRows: NewCustomerRow[] = [];
  const customerIdByLeadId = new Map<string, string>();

  for (const lead of leads) {
    const email = lead.contact_email?.trim() || null;
    const normalizedEmail = email ? email.toLowerCase() : null;
    const convertedId = lead.converted_to_customer_id;

    if (convertedId && existingCustomerIds.has(convertedId)) {
      customerIdByLeadId.set(lead.id, convertedId);
      continue;
    }

    if (normalizedEmail && existingEmails.has(normalizedEmail)) {
      const existing = existingCustomers.find(
        (row) => row.email?.toLowerCase() === normalizedEmail
      );
      if (existing) {
        customerIdByLeadId.set(lead.id, existing.id);
        continue;
      }
    }

    const newCustomerId = convertedId ?? lead.id;
    const customerName = lead.company_name || buildLeadTitle(lead);

    let dedupedEmail = email;
    if (normalizedEmail) {
      if (existingEmails.has(normalizedEmail) || batchEmails.has(normalizedEmail)) {
        dedupedEmail = null;
      } else {
        batchEmails.add(normalizedEmail);
      }
    }

    customerRows.push({
      id: newCustomerId,
      organization_id: NEW_ORG_ID,
      name: customerName,
      email: dedupedEmail,
      phone: lead.contact_phone ?? lead.mobile,
      status: convertedId ? "active" : "prospect",
      type: "business",
      custom_fields: {
        lead_id: lead.id,
        lead_status: lead.status,
        lead_type: lead.lead_type,
        lead_source: lead.lead_source,
        lead_score: lead.lead_score,
        referral_status: lead.referral_status,
        industry: lead.industry,
        potential_value: lead.potential_value,
        currency: lead.currency,
        address: lead.address,
        contact_person_name: lead.contact_person_name,
        converted_at: lead.converted_at,
        disqualification_reason: lead.disqualification_reason,
        disqualification_details: lead.disqualification_details,
        archived_at: lead.archived_at,
        archived_reason: lead.archived_reason,
        legacy_primary_email: lead.contact_email,
        legacy_custom_fields: lead.custom_fields,
      },
      created_at: lead.created_at,
      updated_at: lead.updated_at,
      created_by: lead.created_by_user_id,
      updated_by: lead.updated_by_user_id,
    });
    customerIdByLeadId.set(lead.id, newCustomerId);
  }

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

  const existingContactRows = (await newDb<
    { customer_id: string; email: string | null }[]
  >`
    select customer_id, email
    from public.contacts
    where organization_id = ${NEW_ORG_ID} and email is not null
  `) as { customer_id: string; email: string | null }[];

  const contactEmailByCustomer = new Map<string, Set<string>>();
  for (const row of existingContactRows) {
    if (!row.email) continue;
    const key = row.customer_id;
    const set = contactEmailByCustomer.get(key) ?? new Set<string>();
    set.add(row.email.toLowerCase());
    contactEmailByCustomer.set(key, set);
  }

  const contactRows: NewContactRow[] = [];
  const primaryContactByLeadId = new Map<string, string>();
  const leadsWithContacts = new Set<string>();

  for (const contact of leadContacts) {
    const customerId = customerIdByLeadId.get(contact.lead_id);
    if (!customerId) continue;
    const email = contact.email?.trim() || null;
    const normalizedEmail = email ? email.toLowerCase() : null;
    const emailSet = contactEmailByCustomer.get(customerId) ?? new Set<string>();
    if (normalizedEmail && emailSet.has(normalizedEmail)) {
      continue;
    }
    if (normalizedEmail) {
      emailSet.add(normalizedEmail);
      contactEmailByCustomer.set(customerId, emailSet);
    }
    const { firstName, lastName } = splitContactName(contact.name);
    contactRows.push({
      id: contact.id,
      organization_id: NEW_ORG_ID,
      customer_id: customerId,
      first_name: firstName,
      last_name: lastName,
      title: contact.role,
      email,
      phone: contact.phone,
      is_primary: contact.is_primary,
      created_by: contact.created_by_user_id,
      updated_by: contact.updated_by_user_id,
    });
    leadsWithContacts.add(contact.lead_id);
    if (contact.is_primary) {
      primaryContactByLeadId.set(contact.lead_id, contact.id);
    }
  }

  for (const lead of leads) {
    if (leadsWithContacts.has(lead.id)) {
      continue;
    }
    const customerId = customerIdByLeadId.get(lead.id);
    if (!customerId) continue;
    const name = lead.contact_person_name || buildLeadTitle(lead);
    const { firstName, lastName } = splitContactName(name);
    const email = lead.contact_email?.trim() || null;
    const normalizedEmail = email ? email.toLowerCase() : null;
    const emailSet = contactEmailByCustomer.get(customerId) ?? new Set<string>();
    if (normalizedEmail && emailSet.has(normalizedEmail)) {
      continue;
    }
    if (normalizedEmail) {
      emailSet.add(normalizedEmail);
      contactEmailByCustomer.set(customerId, emailSet);
    }
    const contactId = randomUUID();
    contactRows.push({
      id: contactId,
      organization_id: NEW_ORG_ID,
      customer_id: customerId,
      first_name: firstName,
      last_name: lastName,
      title: null,
      email,
      phone: lead.contact_phone ?? lead.mobile,
      is_primary: true,
      created_by: lead.created_by_user_id,
      updated_by: lead.updated_by_user_id,
    });
    primaryContactByLeadId.set(lead.id, contactId);
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

  const opportunityRows: NewOpportunityRow[] = leads.map((lead) => ({
    id: lead.id,
    organization_id: NEW_ORG_ID,
    title: buildLeadTitle(lead),
    description: lead.notes,
    customer_id: customerIdByLeadId.get(lead.id)!,
    contact_id: primaryContactByLeadId.get(lead.id) ?? null,
    assigned_to:
      lead.assigned_to_user_id && existingUserIds.has(lead.assigned_to_user_id)
        ? lead.assigned_to_user_id
        : null,
    stage: "new",
    probability: 10,
    value: lead.potential_value ?? 0,
    expected_close_date: null,
    follow_up_date: lead.follow_up_date,
    metadata: {
      lead_status: lead.status,
      lead_type: lead.lead_type,
      lead_source: lead.lead_source,
      referral_status: lead.referral_status,
      lead_score: lead.lead_score,
      address: lead.address,
      contact_person_name: lead.contact_person_name,
      contact_email: lead.contact_email,
      contact_phone: lead.contact_phone,
      mobile: lead.mobile,
      converted_at: lead.converted_at,
      converted_to_customer_id: lead.converted_to_customer_id,
      disqualification_reason: lead.disqualification_reason,
      disqualification_details: lead.disqualification_details,
      archived_at: lead.archived_at,
      archived_reason: lead.archived_reason,
      last_contacted_date: lead.last_contacted_date,
      industry: lead.industry,
      currency: lead.currency,
    },
    tags: [],
    created_at: lead.created_at,
    updated_at: lead.updated_at,
    created_by: lead.created_by_user_id,
    updated_by: lead.updated_by_user_id,
  }));

  if (!DRY_RUN) {
    if (opportunityRows.length > 0) {
      const opportunityColumns = [
        "id",
        "organization_id",
        "title",
        "description",
        "customer_id",
        "contact_id",
        "assigned_to",
        "stage",
        "probability",
        "value",
        "expected_close_date",
        "follow_up_date",
        "metadata",
        "tags",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
      ] as const;

      await newDb`
        insert into public.opportunities ${newDb(opportunityRows, opportunityColumns)}
        on conflict (id) do nothing
      `;
    }
  } else {
    console.log(`DRY_RUN: would insert ${opportunityRows.length} opportunities`);
  }

  let skippedActivities = 0;
  const activityRows: NewOpportunityActivityRow[] = [];
  for (const activity of leadActivities) {
    const createdBy = existingUserIds.has(activity.created_by_user_id)
      ? activity.created_by_user_id
      : fallbackUserId;
    if (!createdBy) {
      skippedActivities += 1;
      continue;
    }
    activityRows.push({
      id: activity.id,
      organization_id: NEW_ORG_ID,
      opportunity_id: activity.lead_id,
      type: mapLeadActivityType(activity.type),
      description: activity.details,
      outcome: activity.outcome,
      scheduled_at: null,
      completed_at: activity.activity_date,
      created_by: createdBy,
      created_at: activity.created_at,
    });
  }

  if (!DRY_RUN) {
    if (activityRows.length > 0) {
      const activityColumns = [
        "id",
        "organization_id",
        "opportunity_id",
        "type",
        "description",
        "outcome",
        "scheduled_at",
        "completed_at",
        "created_by",
        "created_at",
      ] as const;

      await newDb`
        insert into public.opportunity_activities ${newDb(activityRows, activityColumns)}
        on conflict (id) do nothing
      `;
    }
  } else {
    console.log(`DRY_RUN: would insert ${activityRows.length} activities`);
  }

  console.log("Migration summary:");
  console.log(`- Leads: ${leads.length}`);
  console.log(`- Customers created: ${customerRows.length}`);
  console.log(`- Contacts created: ${contactRows.length}`);
  console.log(`- Opportunities: ${opportunityRows.length}`);
  console.log(`- Opportunity activities: ${activityRows.length}`);
  if (skippedActivities > 0) {
    console.log(`- Activities skipped (no user match): ${skippedActivities}`);
  }

  await oldDb.end();
  await newDb.end();
}

main().catch(async (err) => {
  console.error("Lead migration failed:", err);
  await oldDb.end();
  await newDb.end();
  process.exit(1);
});
