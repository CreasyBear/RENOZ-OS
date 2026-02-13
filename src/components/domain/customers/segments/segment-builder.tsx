/**
 * SegmentBuilder Component
 *
 * Visual segment builder for creating customer segments:
 * - Drag-and-drop criteria builder
 * - Multiple criteria types (demographic, behavioral, financial)
 * - AND/OR logic operators
 * - Real-time segment size preview
 */
import { useState, useCallback } from 'react'
import {
  Plus,
  Trash2,
  GripVertical,
  Users,
  Save,
  X,
} from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'

/** Shared drag sensors for sortable lists */
function useDragSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
}
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

// ============================================================================
// TYPES
// ============================================================================

type CriteriaType = 'demographic' | 'behavioral' | 'financial' | 'engagement'
type Operator = 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'between' | 'contains' | 'in_list'
type LogicOperator = 'AND' | 'OR'

interface CriteriaField {
  id: string
  name: string
  type: CriteriaType
  dataType: 'string' | 'number' | 'boolean' | 'date' | 'enum'
  options?: string[]
}

interface SegmentCriteria {
  id: string
  field: string
  operator: Operator
  value: string | number | boolean | string[]
  secondValue?: string | number // For 'between' operator
}

interface CriteriaGroup {
  id: string
  logic: LogicOperator
  criteria: SegmentCriteria[]
}

interface SegmentDefinition {
  name: string
  description: string
  groups: CriteriaGroup[]
  groupLogic: LogicOperator
}

interface SegmentBuilderProps {
  initialSegment?: SegmentDefinition
  onSave?: (segment: SegmentDefinition) => void
  onCancel?: () => void
  className?: string
}

interface SegmentPreview {
  count: number
  totalValue: number
  avgHealthScore: number
}

// ============================================================================
// FIELD DEFINITIONS
// ============================================================================

const CRITERIA_FIELDS: CriteriaField[] = [
  // Demographic
  { id: 'type', name: 'Customer Type', type: 'demographic', dataType: 'enum', options: ['individual', 'business', 'government', 'non_profit'] },
  { id: 'status', name: 'Status', type: 'demographic', dataType: 'enum', options: ['prospect', 'active', 'inactive', 'suspended', 'blacklisted'] },
  { id: 'size', name: 'Company Size', type: 'demographic', dataType: 'enum', options: ['micro', 'small', 'medium', 'large', 'enterprise'] },
  { id: 'industry', name: 'Industry', type: 'demographic', dataType: 'string' },
  { id: 'state', name: 'State/Region', type: 'demographic', dataType: 'string' },

  // Behavioral
  { id: 'totalOrders', name: 'Total Orders', type: 'behavioral', dataType: 'number' },
  { id: 'lastOrderDays', name: 'Days Since Last Order', type: 'behavioral', dataType: 'number' },
  { id: 'avgOrderValue', name: 'Average Order Value', type: 'behavioral', dataType: 'number' },

  // Financial
  { id: 'lifetimeValue', name: 'Lifetime Value', type: 'financial', dataType: 'number' },
  { id: 'creditLimit', name: 'Credit Limit', type: 'financial', dataType: 'number' },
  { id: 'creditHold', name: 'Credit Hold', type: 'financial', dataType: 'boolean' },

  // Engagement
  { id: 'healthScore', name: 'Health Score', type: 'engagement', dataType: 'number' },
  { id: 'tags', name: 'Has Tag', type: 'engagement', dataType: 'string' },
]

const OPERATORS: Record<string, { id: Operator; label: string; dataTypes: string[] }[]> = {
  string: [
    { id: 'equals', label: 'Equals', dataTypes: ['string', 'enum'] },
    { id: 'not_equals', label: 'Not Equals', dataTypes: ['string', 'enum'] },
    { id: 'contains', label: 'Contains', dataTypes: ['string'] },
  ],
  number: [
    { id: 'equals', label: 'Equals', dataTypes: ['number'] },
    { id: 'not_equals', label: 'Not Equals', dataTypes: ['number'] },
    { id: 'greater_than', label: 'Greater Than', dataTypes: ['number'] },
    { id: 'less_than', label: 'Less Than', dataTypes: ['number'] },
    { id: 'between', label: 'Between', dataTypes: ['number'] },
  ],
  boolean: [
    { id: 'equals', label: 'Is', dataTypes: ['boolean'] },
  ],
  enum: [
    { id: 'equals', label: 'Is', dataTypes: ['enum'] },
    { id: 'not_equals', label: 'Is Not', dataTypes: ['enum'] },
    { id: 'in_list', label: 'Is One Of', dataTypes: ['enum'] },
  ],
}

// ============================================================================
// CRITERIA ROW COMPONENT
// ============================================================================

interface CriteriaRowProps {
  criteria: SegmentCriteria
  onUpdate: (criteria: SegmentCriteria) => void
  onRemove: () => void
  showDrag?: boolean
}

function CriteriaRow({ criteria, onUpdate, onRemove, showDrag }: CriteriaRowProps) {
  const field = CRITERIA_FIELDS.find(f => f.id === criteria.field)
  const operators = field ? OPERATORS[field.dataType] || OPERATORS.string : OPERATORS.string

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg border bg-background">
      {showDrag && (
        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
      )}

      {/* Field selector */}
      <Select
        value={criteria.field}
        onValueChange={(value) => onUpdate({ ...criteria, field: value, value: '' })}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select field" />
        </SelectTrigger>
        <SelectContent>
          {(['demographic', 'behavioral', 'financial', 'engagement'] as CriteriaType[]).map(type => (
            <div key={type}>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground capitalize">
                {type}
              </div>
              {CRITERIA_FIELDS.filter(f => f.type === type).map(f => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </div>
          ))}
        </SelectContent>
      </Select>

      {/* Operator selector */}
      <Select
        value={criteria.operator}
        onValueChange={(value) => onUpdate({ ...criteria, operator: value as Operator })}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Operator" />
        </SelectTrigger>
        <SelectContent>
          {operators.map(op => (
            <SelectItem key={op.id} value={op.id}>
              {op.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Value input */}
      {field?.dataType === 'enum' && field.options && field.options.length > 0 ? (
        <Select
          value={criteria.value as string}
          onValueChange={(value) => onUpdate({ ...criteria, value })}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Select value" />
          </SelectTrigger>
          <SelectContent>
            {field.options.map(opt => (
              <SelectItem key={opt} value={opt}>
                <span className="capitalize">{opt.replace('_', ' ')}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : field?.dataType === 'boolean' ? (
        <Select
          value={criteria.value?.toString()}
          onValueChange={(value) => onUpdate({ ...criteria, value: value === 'true' })}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Value" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Yes</SelectItem>
            <SelectItem value="false">No</SelectItem>
          </SelectContent>
        </Select>
      ) : (
        <Input
          type={field?.dataType === 'number' ? 'number' : 'text'}
          value={criteria.value as string | number}
          onChange={(e) => onUpdate({
            ...criteria,
            value: field?.dataType === 'number' ? Number(e.target.value) : e.target.value
          })}
          placeholder="Value"
          className="w-[160px]"
        />
      )}

      {/* Second value for 'between' operator */}
      {criteria.operator === 'between' && (
        <>
          <span className="text-sm text-muted-foreground">and</span>
          <Input
            type="number"
            value={criteria.secondValue ?? ''}
            onChange={(e) => onUpdate({ ...criteria, secondValue: Number(e.target.value) })}
            placeholder="Max"
            className="w-[100px]"
          />
        </>
      )}

      <Button variant="ghost" size="icon" onClick={onRemove} aria-label="Remove criteria">
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}

// ============================================================================
// SORTABLE CRITERIA ROW
// ============================================================================

interface SortableCriteriaRowProps {
  criteria: SegmentCriteria
  index: number
  groupLogic: LogicOperator
  onUpdate: (criteria: SegmentCriteria) => void
  onRemove: () => void
}

function SortableCriteriaRow({
  criteria,
  index,
  groupLogic,
  onUpdate,
  onRemove,
}: SortableCriteriaRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: criteria.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2',
        isDragging && 'opacity-50 z-50'
      )}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      {index > 0 && (
        <Badge variant="outline" className="shrink-0">
          {groupLogic}
        </Badge>
      )}
      <div className="flex-1">
        <CriteriaRow
          criteria={criteria}
          onUpdate={onUpdate}
          onRemove={onRemove}
        />
      </div>
    </div>
  )
}

// ============================================================================
// SEGMENT PREVIEW COMPONENT
// ============================================================================

interface SegmentPreviewPanelProps {
  preview: SegmentPreview | null
  isLoading: boolean
}

function SegmentPreviewPanel({ preview, isLoading }: SegmentPreviewPanelProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4" />
          Segment Preview
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : preview ? (
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{preview.count.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Customers</p>
            </div>
            <div>
              <p className="text-2xl font-bold">${(preview.totalValue / 1000).toFixed(0)}k</p>
              <p className="text-xs text-muted-foreground">Total Value</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{preview.avgHealthScore}</p>
              <p className="text-xs text-muted-foreground">Avg Health</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Add criteria to see segment preview
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SegmentBuilder({
  initialSegment,
  onSave,
  onCancel,
  className,
}: SegmentBuilderProps) {
  const [segment, setSegment] = useState<SegmentDefinition>(
    initialSegment ?? {
      name: '',
      description: '',
      groups: [],
      groupLogic: 'AND',
    }
  )

  // Mock preview - in production, this would call the server
  const [preview] = useState<SegmentPreview | null>(() => {
    if (segment.groups.length > 0 && segment.groups.some(g => g.criteria.length > 0)) {
      return {
        count: Math.floor(Math.random() * 500) + 50,
        totalValue: Math.floor(Math.random() * 500000) + 100000,
        avgHealthScore: Math.floor(Math.random() * 30) + 60,
      }
    }
    return null
  })

  const addGroup = useCallback(() => {
    const newGroup: CriteriaGroup = {
      id: crypto.randomUUID(),
      logic: 'AND',
      criteria: [{
        id: crypto.randomUUID(),
        field: 'status',
        operator: 'equals',
        value: 'active',
      }],
    }
    setSegment(prev => ({ ...prev, groups: [...prev.groups, newGroup] }))
  }, [])

  const updateGroup = useCallback((index: number, group: CriteriaGroup) => {
    setSegment(prev => {
      const groups = [...prev.groups]
      groups[index] = group
      return { ...prev, groups }
    })
  }, [])

  const removeGroup = useCallback((index: number) => {
    setSegment(prev => ({
      ...prev,
      groups: prev.groups.filter((_, i) => i !== index),
    }))
  }, [])

  // Handle group reordering
  const handleGroupDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = segment.groups.findIndex((g) => g.id === active.id)
    const newIndex = segment.groups.findIndex((g) => g.id === over.id)

    if (oldIndex !== -1 && newIndex !== -1) {
      setSegment((prev) => ({
        ...prev,
        groups: arrayMove(prev.groups, oldIndex, newIndex),
      }))
    }
  }, [segment.groups])

  // Sensors for drag-and-drop (using shared configuration)
  const sensors = useDragSensors()

  const handleSave = () => {
    if (onSave && segment.name) {
      onSave(segment)
    }
  }

  const hasCriteria = segment.groups.some(g => g.criteria.length > 0)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleGroupDragEnd}
    >
      <div className={cn('space-y-6', className)}>
      {/* Segment Info */}
      <Card>
        <CardHeader>
          <CardTitle>Segment Details</CardTitle>
          <CardDescription>
            Define your customer segment with name and criteria
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Segment Name</Label>
              <Input
                id="name"
                value={segment.name}
                onChange={(e) => setSegment(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., High-Value Active Customers"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={segment.description}
                onChange={(e) => setSegment(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description"
              />
            </div>
          </div>
        </CardContent>
        </Card>
        </div>
      {/* Criteria Groups */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">Segment Criteria</h3>
            <p className="text-sm text-muted-foreground">
              Define conditions to filter customers
            </p>
          </div>
          {segment.groups.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Groups match:</span>
              <Select
                value={segment.groupLogic}
                onValueChange={(value) => setSegment(prev => ({ ...prev, groupLogic: value as LogicOperator }))}
              >
                <SelectTrigger className="w-[80px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AND">AND</SelectItem>
                  <SelectItem value="OR">OR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <SortableContext
          items={segment.groups.map((g) => g.id)}
          strategy={verticalListSortingStrategy}
        >
          {segment.groups.map((group, index) => (
            <SortableGroupItem
              key={group.id}
              group={group}
              groupIndex={index}
              groupLogic={segment.groupLogic}
              onUpdate={(g) => updateGroup(index, g)}
              onRemove={() => removeGroup(index)}
            />
          ))}
        </SortableContext>

        <Button variant="outline" onClick={addGroup} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Condition Group
        </Button>
      </div>

      {/* Preview */}
      <SegmentPreviewPanel
        preview={hasCriteria ? preview : null}
        isLoading={false}
      />

      {/* Actions */}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button onClick={handleSave} disabled={!segment.name || !hasCriteria}>
          <Save className="h-4 w-4 mr-2" />
          Save Segment
        </Button>
      </div>
    </DndContext>
  )
}

// ============================================================================
// SORTABLE GROUP ITEM (Missing component - fixes runtime error)
// ============================================================================

interface SortableGroupItemProps {
  group: CriteriaGroup
  groupIndex: number
  groupLogic: LogicOperator
  onUpdate: (group: CriteriaGroup) => void
  onRemove: () => void
}

function SortableGroupItem({
  group,
  groupIndex,
  groupLogic,
  onUpdate,
  onRemove,
}: SortableGroupItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: group.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const addCriteria = () => {
    const newCriteria: SegmentCriteria = {
      id: crypto.randomUUID(),
      field: 'status',
      operator: 'equals',
      value: 'active',
    }
    onUpdate({ ...group, criteria: [...group.criteria, newCriteria] })
  }

  const updateCriteria = (index: number, criteria: SegmentCriteria) => {
    const updated = [...group.criteria]
    updated[index] = criteria
    onUpdate({ ...group, criteria: updated })
  }

  const removeCriteria = (index: number) => {
    onUpdate({ ...group, criteria: group.criteria.filter((_, i) => i !== index) })
  }

  const handleCriteriaDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = group.criteria.findIndex((c) => c.id === active.id)
    const newIndex = group.criteria.findIndex((c) => c.id === over.id)

    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(group.criteria, oldIndex, newIndex)
      onUpdate({ ...group, criteria: reordered })
    }
  }

  // Sensors for nested criteria drag-and-drop (using shared configuration)
  const criteriaSensors = useDragSensors()

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        isDragging && 'opacity-50 z-50'
      )}
    >
      {groupIndex > 0 && (
        <div className="flex items-center gap-2 my-2">
          <div className="flex-1 h-px bg-border" />
          <Badge variant="secondary">{groupLogic}</Badge>
          <div className="flex-1 h-px bg-border" />
        </div>
      )}
      <Card className={cn(isDragging && 'ring-2 ring-primary')}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted"
                aria-label="Drag to reorder group"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </button>
              <CardTitle className="text-sm font-medium">
                Condition Group {groupIndex + 1}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={group.logic}
                onValueChange={(value) => onUpdate({ ...group, logic: value as LogicOperator })}
              >
                <SelectTrigger className="w-[80px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AND">AND</SelectItem>
                  <SelectItem value="OR">OR</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" onClick={onRemove} className="h-8 w-8" aria-label="Remove group">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <CardDescription>
            Match {group.logic === 'AND' ? 'all' : 'any'} of the following conditions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <DndContext
            sensors={criteriaSensors}
            collisionDetection={closestCenter}
            onDragEnd={handleCriteriaDragEnd}
          >
            <SortableContext
              items={group.criteria.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              {group.criteria.map((criteria, index) => (
                <SortableCriteriaRow
                  key={criteria.id}
                  criteria={criteria}
                  index={index}
                  groupLogic={group.logic}
                  onUpdate={(c) => updateCriteria(index, c)}
                  onRemove={() => removeCriteria(index)}
                />
              ))}
            </SortableContext>
          </DndContext>
          <Button
            variant="outline"
            size="sm"
            onClick={addCriteria}
            className="w-full mt-2"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Condition
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
