# Domain: Warranty — Tables

## warranty_policies
- id (uuid, PK)
- organizationId (uuid, required)
- name, description
- type
- durationMonths
- cycleLimit
- terms (jsonb)
- slaConfigurationId
- isDefault, isActive
- createdAt, updatedAt, createdBy, updatedBy

## warranties
- id (uuid, PK)
- organizationId (uuid, required)
- warrantyNumber
- customerId (uuid)
- productId (uuid)
- productSerial
- warrantyPolicyId (uuid)
- orderId (uuid, nullable)
- registrationDate, expiryDate
- currentCycleCount, lastCycleUpdate
- status
- assignedUserId
- originalCustomerId, transferredAt
- expiryAlertOptOut, lastExpiryAlertSent
- certificateUrl
- notes
- createdAt, updatedAt, createdBy, updatedBy

## warranty_claims
- id (uuid, PK)
- organizationId (uuid, required)
- claimNumber
- warrantyId (uuid)
- customerId (uuid)
- claimType, description
- status
- resolutionType, resolutionNotes
- approvedByUserId, approvedAt, denialReason
- cost
- cycleCountAtClaim
- submittedAt, resolvedAt
- assignedUserId
- slaTrackingId
- notes
- createdAt, updatedAt, createdBy, updatedBy

## warranty_extensions
- id (uuid, PK)
- organizationId (uuid, required)
- warrantyId (uuid)
- extensionType
- extensionMonths
- previousExpiryDate, newExpiryDate
- price
- notes
- approvedById
- createdAt, updatedAt, createdBy, updatedBy
