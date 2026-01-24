# Domain: Jobs — Tables

## jobs
- id (uuid, PK)
- organizationId (uuid, required)
- userId (uuid, required)
- type, name, description
- status, progress
- startedAt, completedAt
- metadata (jsonb)
- externalId
- createdAt, updatedAt

## job_assignments
- id (uuid, PK)
- organizationId (uuid, required)
- orderId (uuid -> orders.id, nullable)
- customerId (uuid -> customers.id)
- installerId (uuid -> users.id)
- jobType, jobNumber, title, description
- scheduledDate, scheduledTime, estimatedDuration
- status
- startedAt, completedAt (text)
- startLocation, completeLocation (jsonb)
- signatureUrl, signedByName, signOffToken, signOffTokenExpiresAt
- confirmationStatus, confirmationToken
- internalNotes
- metadata (jsonb)
- slaTrackingId (uuid -> sla_tracking.id)
- version
- createdAt, updatedAt, createdBy, updatedBy

## job_photos
- id (uuid, PK)
- organizationId (uuid, required)
- jobAssignmentId (uuid -> job_assignments.id)
- type, photoUrl, caption
- location (jsonb)
- createdAt, updatedAt, createdBy, updatedBy

## job_tasks
- id (uuid, PK)
- organizationId (uuid, required)
- jobId (uuid -> job_assignments.id)
- title, description
- status
- assigneeId (uuid -> users.id)
- dueDate
- priority
- estimatedHours, actualHours
- position
- version
- createdAt, updatedAt, createdBy, updatedBy

## job_materials
- id (uuid, PK)
- organizationId (uuid, required)
- jobId (uuid -> job_assignments.id)
- productId (uuid -> products.id)
- quantityRequired, quantityUsed
- unitCost
- notes
- version
- createdAt, updatedAt, createdBy, updatedBy

## job_time_entries
- id (uuid, PK)
- organizationId (uuid, required)
- jobId (uuid -> job_assignments.id)
- userId (uuid -> users.id)
- startTime, endTime
- description
- isBillable
- version
- createdAt, updatedAt, createdBy, updatedBy

## checklist_templates
- id (uuid, PK)
- organizationId (uuid, required)
- name, description
- items (jsonb)
- isActive
- version
- createdAt, updatedAt, createdBy, updatedBy

## job_checklists
- id (uuid, PK)
- organizationId (uuid, required)
- jobId (uuid -> job_assignments.id)
- templateId (uuid -> checklist_templates.id, nullable)
- templateName
- version
- createdAt, updatedAt, createdBy, updatedBy

## job_checklist_items
- id (uuid, PK)
- organizationId (uuid, required)
- checklistId (uuid -> job_checklists.id)
- itemText, itemDescription
- requiresPhoto, position
- isCompleted, completedAt, completedBy
- notes, photoUrl
- version
- createdAt, updatedAt, createdBy, updatedBy

## job_templates
- id (uuid, PK)
- organizationId (uuid, required)
- name, description
- defaultTasks (jsonb), defaultBOM (jsonb)
- checklistTemplateId (uuid -> checklist_templates.id, nullable)
- estimatedDuration
- slaConfigurationId (uuid -> sla_configurations.id, nullable)
- isActive
- version
- createdAt, updatedAt, createdBy, updatedBy
