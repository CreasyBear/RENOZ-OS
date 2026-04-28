import { and, eq, inArray, isNotNull, ne, notInArray, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { contacts, customers } from 'drizzle/schema';
import { customerStatusEnum, customerTypeEnum } from 'drizzle/schema/_shared/enums';
import type { CampaignRecipientCriteria } from 'drizzle/schema/communications';

export function buildCampaignRecipientConditions(
  criteria: CampaignRecipientCriteria,
  organizationId: string
) {
  const conditions = [
    eq(contacts.organizationId, organizationId),
    isNotNull(contacts.email),
    ne(contacts.email, ''),
  ];

  if (criteria.contactIds && criteria.contactIds.length > 0) {
    conditions.push(inArray(contacts.id, criteria.contactIds));
  }

  if (criteria.customerIds && criteria.customerIds.length > 0) {
    conditions.push(inArray(contacts.customerId, criteria.customerIds));
  }

  if (criteria.excludeContactIds && criteria.excludeContactIds.length > 0) {
    conditions.push(notInArray(contacts.id, criteria.excludeContactIds));
  }

  if (criteria.statuses && criteria.statuses.length > 0) {
    const validStatuses = criteria.statuses.filter((status) =>
      customerStatusEnum.enumValues.includes(status as typeof customerStatusEnum.enumValues[number])
    ) as typeof customerStatusEnum.enumValues[number][];

    if (validStatuses.length > 0) {
      const customerStatusSubquery = db
        .select({ id: customers.id })
        .from(customers)
        .where(
          and(
            eq(customers.organizationId, organizationId),
            inArray(customers.status, validStatuses)
          )
        );
      conditions.push(inArray(contacts.customerId, customerStatusSubquery));
    }
  }

  if (criteria.customerTypes && criteria.customerTypes.length > 0) {
    const validTypes = criteria.customerTypes.filter((type) =>
      customerTypeEnum.enumValues.includes(type as typeof customerTypeEnum.enumValues[number])
    ) as typeof customerTypeEnum.enumValues[number][];

    if (validTypes.length > 0) {
      const customerTypeSubquery = db
        .select({ id: customers.id })
        .from(customers)
        .where(
          and(
            eq(customers.organizationId, organizationId),
            inArray(customers.type, validTypes)
          )
        );
      conditions.push(inArray(contacts.customerId, customerTypeSubquery));
    }
  }

  if (criteria.tags && criteria.tags.length > 0) {
    conditions.push(
      sql`${contacts.customerId} IN (
        SELECT id FROM customers
        WHERE organization_id = ${organizationId}
        AND tags ?| array[${sql.join(criteria.tags.map((tag: string) => sql`${tag}`), sql`, `)}]
      )`
    );
  }

  return conditions;
}
