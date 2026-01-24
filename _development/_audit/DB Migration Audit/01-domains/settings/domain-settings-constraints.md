# Domain: Settings — Constraints

## organizations
- Unique: slug
- Unique: abn when abn IS NOT NULL
- Indexes:
  - isActive

## system_settings
- Unique: (organizationId, category, key)
- Indexes:
  - organizationId
  - (organizationId, category)
  - (organizationId, isPublic) where isPublic = true

## custom_fields
- Unique: (organizationId, entityType, name)
- Indexes:
  - organizationId
  - (organizationId, entityType)
  - (organizationId, entityType, isActive)
  - (organizationId, entityType, sortOrder)

## custom_field_values
- Unique: (customFieldId, entityId)
- Indexes:
  - customFieldId
  - entityId
  - (customFieldId, entityId)

## data_exports
- Indexes:
  - organizationId
  - requestedBy
  - (organizationId, requestedBy)
  - status
  - (organizationId, status)
  - expiresAt
  - createdAt
