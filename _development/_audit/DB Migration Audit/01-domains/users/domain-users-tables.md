# Domain: Users — Tables

## users
- id (uuid, PK)
- authId (uuid)
- organizationId (uuid -> organizations.id)
- email, name
- profile (jsonb)
- role, status, type
- preferences (jsonb)
- createdAt, updatedAt, createdBy, updatedBy, deletedAt

## user_sessions
- id (uuid, PK)
- userId (uuid -> users.id)
- sessionToken
- userAgent, ipAddress
- expiresAt, lastActiveAt
- createdAt, updatedAt
- createdBy, updatedBy, version

## user_preferences
- id (uuid, PK)
- userId (uuid -> users.id)
- category, key
- value (jsonb)
- version
- createdAt, updatedAt, createdBy, updatedBy

## user_invitations
- id (uuid, PK)
- organizationId (uuid -> organizations.id)
- email, role
- invitedBy (uuid -> users.id)
- invitedAt, expiresAt, acceptedAt
- personalMessage
- token
- status
- version
- createdBy, updatedBy

## user_groups
- id (uuid, PK)
- organizationId (uuid -> organizations.id)
- name, description, color
- isActive
- version
- createdAt, updatedAt, createdBy, updatedBy, deletedAt

## user_group_members
- id (uuid, PK)
- organizationId (uuid -> organizations.id)
- groupId (uuid -> user_groups.id)
- userId (uuid -> users.id)
- role
- joinedAt
- addedBy
- version
- createdBy, updatedBy

## user_delegations
- id (uuid, PK)
- organizationId (uuid -> organizations.id)
- delegatorId (uuid -> users.id)
- delegateId (uuid -> users.id)
- startDate, endDate
- reason
- isActive
- version
- createdAt, updatedAt, createdBy, updatedBy, deletedAt

## user_onboarding
- id (uuid, PK)
- userId (uuid -> users.id)
- stepKey, stepName
- isCompleted, completedAt
- dismissedAt
- metadata (jsonb)
- version
- createdAt, updatedAt, createdBy, updatedBy

## api_tokens
- id (uuid, PK)
- name
- hashedToken, tokenPrefix
- userId (uuid -> users.id)
- organizationId (uuid -> organizations.id)
- scopes (jsonb)
- expiresAt
- lastUsedAt, lastUsedIp
- createdAt
- revokedAt, revokedBy, revokedReason
# Domain: Users & Organizations — Tables

## organizations
- id (uuid, PK)
- name (varchar)
- domain (varchar, unique)
- settings (jsonb)
- timezone, locale, currency
- createdBy, updatedBy (uuid -> users.id)
- createdAt, updatedAt
- version (int)

## users
- id (uuid, PK)
- organizationId (uuid -> organizations.id)
- email (varchar, unique)
- firstName, lastName
- avatarUrl
- role, status (enum)
- lastLoginAt, lastActiveAt
- passwordResetToken, passwordResetExpires
- emailVerified, emailVerificationToken
- invitedBy, invitedAt
- createdBy, updatedBy
- createdAt, updatedAt
- version

## userPreferences
- id (uuid, PK)
- userId (uuid -> users.id)
- category, key, value (jsonb)
- createdBy, updatedBy
- createdAt, updatedAt
- version

## userGroups
- id (uuid, PK)
- organizationId (uuid -> organizations.id)
- name, description, color
- isActive
- createdBy, updatedBy
- createdAt, updatedAt
- version

## userGroupMembers
- id (uuid, PK)
- organizationId (uuid -> organizations.id)
- groupId (uuid -> userGroups.id)
- userId (uuid -> users.id)
- role (enum)
- joinedAt
- addedBy
- createdBy, updatedBy
- version

## userDelegations
- id (uuid, PK)
- organizationId (uuid -> organizations.id)
- delegatorId, delegateId (uuid -> users.id)
- startDate, endDate
- reason
- isActive
- createdBy, updatedBy
- createdAt, updatedAt
- version

## userInvitations
- id (uuid, PK)
- organizationId (uuid -> organizations.id)
- email, role (enum)
- invitedBy, invitedAt
- expiresAt, acceptedAt
- personalMessage
- token (unique)
- status (enum)
- createdBy, updatedBy
- version

## userOnboarding
- id (uuid, PK)
- userId (uuid -> users.id)
- stepKey, stepName
- isCompleted
- completedAt, dismissedAt
- metadata (jsonb)
- createdBy, updatedBy
- createdAt, updatedAt
- version

## userSessions
- id (uuid, PK)
- userId (uuid -> users.id)
- sessionToken (unique)
- ipAddress (inet)
- userAgent (text)
- expiresAt
- createdBy, updatedBy
- createdAt, updatedAt
- version

## auditLogs
- id (uuid, PK)
- organizationId (uuid -> organizations.id)
- userId (uuid -> users.id)
- action, entityType, entityId
- oldValues, newValues (jsonb)
- ipAddress, userAgent
- timestamp
- metadata (jsonb)
