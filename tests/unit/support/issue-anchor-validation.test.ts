import { describe, expect, it } from 'vitest';
import {
  validateIssueAnchors,
  type IssueAnchorValues,
  type ExplicitFieldMap,
  type IssueAnchorResolutionOutcome,
} from '@/server/functions/support/_shared/issue-anchor-resolution';

function buildResolution(
  overrides: Partial<IssueAnchorResolutionOutcome>
): IssueAnchorResolutionOutcome {
  return {
    resolutionSource: 'serial',
    commercialCustomerId: 'customer-1',
    anchors: {
      warrantyId: 'warranty-1',
      warrantyEntitlementId: 'entitlement-1',
      orderId: 'order-1',
      shipmentId: 'shipment-1',
      productId: null,
      serializedItemId: 'serialized-1',
      serviceSystemId: 'system-1',
      serialNumber: 'SER-001',
    },
    supportContext: {
      resolutionSource: 'serial',
      commercialCustomer: { id: 'customer-1', name: 'Acme Solar' },
      warranty: {
        id: 'warranty-1',
        warrantyNumber: 'WAR-001',
        status: 'active',
        productSerial: 'SER-001',
      },
      shipment: { id: 'shipment-1', shipmentNumber: 'SHP-001' },
      serializedItem: { id: 'serialized-1', serialNumber: 'SER-001' },
      serviceSystem: { id: 'system-1', displayName: 'Main Battery System' },
      currentOwner: null,
      order: {
        id: 'order-1',
        orderNumber: 'ORD-001',
        customerId: 'customer-1',
        customerName: 'Acme Solar',
      },
    },
    ...overrides,
  };
}

describe('validateIssueAnchors', () => {
  it('returns no conflicts for matching explicit anchors', () => {
    const anchors: IssueAnchorValues = {
      warrantyId: 'warranty-1',
      warrantyEntitlementId: 'entitlement-1',
      orderId: 'order-1',
      shipmentId: 'shipment-1',
      productId: null,
      serializedItemId: 'serialized-1',
      serviceSystemId: 'system-1',
      serialNumber: 'SER-001',
    };
    const explicitFields: ExplicitFieldMap = {
      warrantyId: true,
      orderId: true,
      shipmentId: true,
      serializedItemId: true,
      serviceSystemId: true,
      serialNumber: true,
      customerId: true,
    };

    expect(
      validateIssueAnchors({
        anchors,
        explicitFields,
        customerId: 'customer-1',
        resolution: buildResolution({}),
      })
    ).toEqual([]);
  });

  it('flags serial and order conflicts', () => {
    const conflicts = validateIssueAnchors({
      anchors: {
        warrantyId: null,
        warrantyEntitlementId: null,
        orderId: 'order-2',
        shipmentId: null,
        productId: null,
        serializedItemId: 'serialized-1',
        serviceSystemId: null,
        serialNumber: 'SER-001',
      },
      explicitFields: {
        orderId: true,
        serializedItemId: true,
        serialNumber: true,
      },
      customerId: null,
      resolution: buildResolution({}),
    });

    expect(conflicts.some((conflict) => conflict.field === 'orderId')).toBe(true);
  });

  it('flags warranty and service-system conflicts', () => {
    const conflicts = validateIssueAnchors({
      anchors: {
        warrantyId: 'warranty-1',
        warrantyEntitlementId: null,
        orderId: null,
        shipmentId: null,
        productId: null,
        serializedItemId: null,
        serviceSystemId: 'system-2',
        serialNumber: null,
      },
      explicitFields: {
        warrantyId: true,
        serviceSystemId: true,
      },
      customerId: null,
      resolution: buildResolution({}),
    });

    expect(conflicts.some((conflict) => conflict.field === 'serviceSystemId')).toBe(true);
  });

  it('flags customer conflicts against resolved commercial lineage', () => {
    const conflicts = validateIssueAnchors({
      anchors: {
        warrantyId: null,
        warrantyEntitlementId: null,
        orderId: 'order-1',
        shipmentId: null,
        productId: null,
        serializedItemId: null,
        serviceSystemId: null,
        serialNumber: null,
      },
      explicitFields: {
        orderId: true,
        customerId: true,
      },
      customerId: 'customer-2',
      resolution: buildResolution({}),
    });

    expect(conflicts.some((conflict) => conflict.field === 'customerId')).toBe(true);
  });
});
