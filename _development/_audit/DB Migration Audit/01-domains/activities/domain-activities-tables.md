# Domain: Activities — Tables

## activities
- id (uuid, PK)
- organizationId (uuid, required)
- userId (uuid, nullable)
- entityType, entityId
- action
- changes (jsonb)
- metadata (jsonb)
- ipAddress (inet)
- userAgent
- description
- source, sourceRef
- createdAt
- createdBy
