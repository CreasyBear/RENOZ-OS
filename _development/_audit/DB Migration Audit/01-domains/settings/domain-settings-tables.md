# Domain: Settings — Tables

## organizations
- id (uuid, PK)
- name, slug, abn
- email, phone, website
- address (jsonb)
- settings (jsonb)
- branding (jsonb)
- isActive
- plan, stripeCustomerId
- createdAt, updatedAt, deletedAt

## system_settings
- id (uuid, PK)
- organizationId (uuid, required)
- category, key
- value (jsonb)
- type
- description
- isPublic
- createdBy, updatedBy
- version
- metadata (jsonb)
- createdAt, updatedAt

## custom_fields
- id (uuid, PK)
- organizationId (uuid, required)
- entityType
- name, label
- fieldType
- options (jsonb)
- isRequired, isActive
- validationRules (jsonb)
- defaultValue (jsonb)
- sortOrder
- metadata (jsonb)
- createdBy, updatedBy
- version
- createdAt, updatedAt

## custom_field_values
- id (uuid, PK)
- customFieldId (uuid -> custom_fields.id)
- entityId
- value (jsonb)
- createdBy, updatedBy
- version
- createdAt, updatedAt

## data_exports
- id (uuid, PK)
- organizationId (uuid, required)
- requestedBy (uuid -> users.id)
- entities (text[])
- format
- status
- fileUrl, fileName, fileSize
- recordCount
- expiresAt, startedAt, completedAt
- errorMessage
- metadata (jsonb)
- createdAt, updatedAt
