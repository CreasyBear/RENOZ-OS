# Domain: Jobs — Constraints

## jobs
- Indexes:
  - (userId, status)
  - (userId, status, createdAt)
  - (organizationId, userId)
  - externalId

## job_assignments
- Indexes:
  - (organizationId, status)
  - (organizationId, installerId)
  - (organizationId, scheduledDate)
  - (organizationId, customerId)
  - (installerId, scheduledDate)
  - orderId

## job_photos
- Indexes:
  - jobAssignmentId
  - (organizationId, jobAssignmentId)

## job_tasks
- Indexes:
  - (organizationId, jobId)
  - (organizationId, status)
  - (organizationId, createdAt)
  - (jobId, position)

## job_materials
- Indexes:
  - (organizationId, jobId)
  - (organizationId, productId)
  - (organizationId, createdAt)

## job_time_entries
- Indexes:
  - (organizationId, jobId)
  - (organizationId, userId)
  - (organizationId, startTime)

## checklist_templates
- Indexes:
  - (organizationId, name)
  - (organizationId, isActive)

## job_checklists
- Indexes:
  - (organizationId, jobId)
  - (organizationId, templateId)
  - (organizationId, createdAt)

## job_checklist_items
- Indexes:
  - (organizationId, checklistId)
  - (organizationId, isCompleted)

## job_templates
- Indexes:
  - (organizationId, name)
  - (organizationId, isActive)
  - (organizationId, createdAt)
