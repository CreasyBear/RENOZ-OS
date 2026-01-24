# Domain: Warranty — Constraints

## warranty_policies
- Unique: (organizationId, name)
- Indexes:
  - organizationId
  - (organizationId, type)
  - (organizationId, type, isDefault)
  - slaConfigurationId

## warranties
- Unique: (organizationId, warrantyNumber)
- Unique: (organizationId, productSerial) when productSerial IS NOT NULL
- Indexes:
  - organizationId
  - customerId
  - productId
  - warrantyPolicyId
  - orderId
  - (organizationId, status)
  - (organizationId, expiryDate, expiryAlertOptOut)
  - assignedUserId

## warranty_claims
- Unique: (organizationId, claimNumber)
- Indexes:
  - organizationId
  - warrantyId
  - customerId
  - (organizationId, status)
  - (organizationId, claimType)
  - slaTrackingId
  - assignedUserId
  - (organizationId, submittedAt)

## warranty_extensions
- Indexes:
  - warrantyId
  - organizationId
  - (organizationId, extensionType)
  - approvedById
  - (organizationId, createdAt)
