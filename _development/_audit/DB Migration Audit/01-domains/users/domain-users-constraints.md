# Domain: Users — Constraints

## users
- Unique: authId
- Unique: (organizationId, email)
- Indexes:
  - (organizationId, role)
  - (organizationId, status)
  - email

## user_sessions
- Unique: sessionToken
- Indexes:
  - userId
  - (userId, expiresAt)
  - expiresAt

## user_preferences
- Unique: (userId, category, key)
- Indexes:
  - userId
  - (userId, category)

## user_invitations
- Unique: token
- Indexes:
  - organizationId
  - email
  - (organizationId, status)
  - expiresAt
  - invitedBy
- Checks:
  - expiresAt > invitedAt

## user_groups
- Unique: (organizationId, name)
- Indexes:
  - organizationId
  - (organizationId, isActive)

## user_group_members
- Unique: (groupId, userId)
- Indexes:
  - organizationId
  - groupId
  - userId
  - (groupId, role)

## user_delegations
- Indexes:
  - organizationId
  - delegatorId
  - delegateId
  - (isActive, startDate, endDate)
  - (delegatorId, isActive)
- Checks:
  - startDate < endDate
  - delegatorId != delegateId

## user_onboarding
- Unique: (userId, stepKey)
- Indexes:
  - userId
  - (userId, isCompleted)
  - stepKey

## api_tokens
- Indexes:
  - hashedToken
  - userId
  - organizationId
  - (organizationId, revokedAt, expiresAt)
  - tokenPrefix
# Domain: Users & Organizations — Constraints

## organizations
- Unique: domain
- Check: settings IS NOT NULL
- Indexes: domain, name

## users
- Unique: email (PRD says unique; clarify org-scoped vs global)
- Check: email regex
- Check: firstName IS NOT NULL OR lastName IS NOT NULL
- Indexes: organizationId, email, role, status, lastLoginAt

## userPreferences
- Unique: userId + category + key
- Check: value IS NOT NULL
- Indexes: userId, category, key

## userGroups
- Check: name IS NOT NULL
- Indexes: organizationId, name, isActive

## userGroupMembers
- Unique: groupId + userId
- Indexes: organizationId, groupId, userId, role

## userDelegations
- Check: startDate < endDate
- Check: delegatorId != delegateId
- Indexes: organizationId, delegatorId, delegateId, startDate, endDate, isActive

## userInvitations
- Unique: token
- Check: expiresAt > invitedAt
- Indexes: organizationId, email, token, status, expiresAt

## userOnboarding
- Unique: userId + stepKey
- Indexes: userId, stepKey, isCompleted

## userSessions
- Unique: sessionToken
- Check: expiresAt > createdAt
- Indexes: userId, sessionToken, expiresAt

## auditLogs
- Check: timestamp IS NOT NULL
- Indexes: organizationId, userId, entityType, entityId, timestamp
