/**
 * CommunicationTemplates Component
 *
 * Manage email and message templates:
 * - Template list with categories
 * - Template editor with variables
 * - Preview with placeholder substitution
 */
import { useState } from 'react'
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  FileText,
  Mail,
  Variable,
  Clock,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

// ============================================================================
// TYPES
// ============================================================================

type TemplateCategory = 'welcome' | 'follow_up' | 'complaint_resolution' | 'upsell' | 'reactivation' | 'general'
type TemplateType = 'email' | 'sms' | 'note'

interface Template {
  id: string
  name: string
  category: TemplateCategory
  type: TemplateType
  subject?: string
  body: string
  variables: string[]
  usageCount: number
  createdAt: string
  updatedAt: string
  isActive: boolean
}

interface CommunicationTemplatesProps {
  templates?: Template[]
  isLoading?: boolean
  onSaveTemplate?: (template: Partial<Template>) => void
  onDeleteTemplate?: (templateId: string) => void
  onUseTemplate?: (templateId: string) => void
  className?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CATEGORIES: { id: TemplateCategory; label: string; color: string }[] = [
  { id: 'welcome', label: 'Welcome', color: 'bg-green-100 text-green-700' },
  { id: 'follow_up', label: 'Follow-up', color: 'bg-blue-100 text-blue-700' },
  { id: 'complaint_resolution', label: 'Complaint', color: 'bg-red-100 text-red-700' },
  { id: 'upsell', label: 'Upsell', color: 'bg-purple-100 text-purple-700' },
  { id: 'reactivation', label: 'Reactivation', color: 'bg-orange-100 text-orange-700' },
  { id: 'general', label: 'General', color: 'bg-gray-100 text-gray-700' },
]

const AVAILABLE_VARIABLES = [
  { name: 'first_name', description: 'Customer first name' },
  { name: 'last_name', description: 'Customer last name' },
  { name: 'company_name', description: 'Your company name' },
  { name: 'customer_company', description: 'Customer company name' },
  { name: 'account_manager', description: 'Assigned account manager' },
  { name: 'sender_name', description: 'Email sender name' },
  { name: 'sender_title', description: 'Email sender title' },
  { name: 'quote_number', description: 'Quote reference number' },
  { name: 'quote_date', description: 'Quote creation date' },
  { name: 'quote_total', description: 'Quote total amount' },
  { name: 'last_order_date', description: 'Date of last order' },
  { name: 'ticket_number', description: 'Support ticket number' },
]

// ============================================================================
// HELPERS
// ============================================================================

function getCategoryConfig(category: TemplateCategory) {
  return CATEGORIES.find(c => c.id === category) ?? CATEGORIES[5]
}

function extractVariables(text: string): string[] {
  const matches = text.match(/\{\{(\w+)\}\}/g) || []
  return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '')))]
}

// ============================================================================
// TEMPLATE CARD
// ============================================================================

interface TemplateCardProps {
  template: Template
  onEdit?: () => void
  onDelete?: () => void
  onDuplicate?: () => void
  onUse?: () => void
}

function TemplateCard({ template, onEdit, onDelete, onDuplicate, onUse }: TemplateCardProps) {
  const categoryConfig = getCategoryConfig(template.category)

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge className={cn('text-xs', categoryConfig.color)}>
                {categoryConfig.label}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {template.type === 'email' ? <Mail className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
              </Badge>
            </div>
            <CardTitle className="text-base">{template.name}</CardTitle>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onUse}>
                <Mail className="h-4 w-4 mr-2" />
                Use Template
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {template.subject && (
          <CardDescription className="line-clamp-1">
            {template.subject}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
          {template.body}
        </p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Variable className="h-3 w-3" />
            {template.variables.length} variables
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3" />
            Used {template.usageCount} times
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// TEMPLATE EDITOR DIALOG
// ============================================================================

interface TemplateEditorProps {
  template?: Template | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (template: Partial<Template>) => void
}

function TemplateEditor({ template, open, onOpenChange, onSave }: TemplateEditorProps) {
  const [name, setName] = useState(template?.name ?? '')
  const [category, setCategory] = useState<TemplateCategory>(template?.category ?? 'general')
  const [type, setType] = useState<TemplateType>(template?.type ?? 'email')
  const [subject, setSubject] = useState(template?.subject ?? '')
  const [body, setBody] = useState(template?.body ?? '')
  const [activeTab, setActiveTab] = useState('edit')

  const detectedVariables = extractVariables(`${subject} ${body}`)

  const handleSave = () => {
    onSave({
      id: template?.id,
      name,
      category,
      type,
      subject: type === 'email' ? subject : undefined,
      body,
      variables: detectedVariables,
    })
    onOpenChange(false)
  }

  const insertVariable = (varName: string) => {
    setBody(prev => prev + `{{${varName}}}`)
  }

  // Preview with sample data
  const previewBody = body
    .replace(/\{\{first_name\}\}/g, 'John')
    .replace(/\{\{last_name\}\}/g, 'Smith')
    .replace(/\{\{company_name\}\}/g, 'Your Company')
    .replace(/\{\{customer_company\}\}/g, 'ACME Corp')
    .replace(/\{\{account_manager\}\}/g, 'Sarah Mitchell')
    .replace(/\{\{sender_name\}\}/g, 'Mike Johnson')
    .replace(/\{\{sender_title\}\}/g, 'Account Manager')
    .replace(/\{\{quote_number\}\}/g, 'Q-2024-0042')
    .replace(/\{\{quote_date\}\}/g, 'January 15, 2024')
    .replace(/\{\{quote_total\}\}/g, '$12,500')
    .replace(/\{\{last_order_date\}\}/g, 'December 10, 2023')
    .replace(/\{\{ticket_number\}\}/g, 'TKT-1234')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template ? 'Edit Template' : 'Create Template'}
          </DialogTitle>
          <DialogDescription>
            Create reusable communication templates with dynamic variables
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="variables">Variables</TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="space-y-4 mt-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Welcome Email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as TemplateCategory)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as TemplateType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="note">Note</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {type === 'email' && (
              <div className="space-y-2">
                <Label htmlFor="subject">Subject Line</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g., Welcome to {{company_name}}!"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="body">Body</Label>
              <Textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your template content here. Use {{variable_name}} for dynamic content."
                className="min-h-[200px] font-mono text-sm"
              />
            </div>

            {detectedVariables.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">Detected variables:</span>
                {detectedVariables.map(v => (
                  <Badge key={v} variant="secondary">
                    {`{{${v}}}`}
                  </Badge>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="preview" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Preview</CardTitle>
                <CardDescription>
                  How your template will look with sample data
                </CardDescription>
              </CardHeader>
              <CardContent>
                {type === 'email' && subject && (
                  <div className="mb-4">
                    <Label className="text-xs text-muted-foreground">Subject</Label>
                    <p className="font-medium">
                      {subject
                        .replace(/\{\{first_name\}\}/g, 'John')
                        .replace(/\{\{company_name\}\}/g, 'Your Company')
                        .replace(/\{\{quote_number\}\}/g, 'Q-2024-0042')}
                    </p>
                  </div>
                )}
                <div className="p-4 rounded-lg bg-muted/50 whitespace-pre-wrap text-sm">
                  {previewBody || 'Enter template content to see preview...'}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="variables" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Available Variables</CardTitle>
                <CardDescription>
                  Click to insert a variable into your template
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 sm:grid-cols-2">
                  {AVAILABLE_VARIABLES.map(variable => (
                    <Button
                      key={variable.name}
                      variant="outline"
                      className="justify-start h-auto py-2"
                      onClick={() => insertVariable(variable.name)}
                    >
                      <div className="text-left">
                        <p className="font-mono text-sm">{`{{${variable.name}}}`}</p>
                        <p className="text-xs text-muted-foreground">{variable.description}</p>
                      </div>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name || !body}>
            {template ? 'Save Changes' : 'Create Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CommunicationTemplates({
  templates: propTemplates,
  isLoading = false,
  onSaveTemplate,
  onDeleteTemplate,
  onUseTemplate,
  className,
}: CommunicationTemplatesProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<TemplateCategory | 'all'>('all')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)

  // Use provided templates or empty array
  const templates = propTemplates ?? []

  // Filter templates
  const filteredTemplates = templates.filter(t => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (!t.name.toLowerCase().includes(query) &&
          !t.body.toLowerCase().includes(query)) {
        return false
      }
    }
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false
    return true
  })

  const handleCreate = () => {
    setEditingTemplate(null)
    setEditorOpen(true)
  }

  const handleEdit = (template: Template) => {
    setEditingTemplate(template)
    setEditorOpen(true)
  }

  const handleSave = (data: Partial<Template>) => {
    onSaveTemplate?.(data)
    setEditorOpen(false)
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as TemplateCategory | 'all')}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </Button>
        </div>
      </div>

      {/* Template Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-20 mb-2" />
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              {searchQuery || categoryFilter !== 'all'
                ? 'No templates match your filters'
                : 'No templates yet'}
            </p>
            <Button variant="outline" className="mt-4" onClick={handleCreate}>
              Create your first template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map(template => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={() => handleEdit(template)}
              onDelete={() => onDeleteTemplate?.(template.id)}
              onDuplicate={() => {
                setEditingTemplate({ ...template, id: '', name: `${template.name} (Copy)` })
                setEditorOpen(true)
              }}
              onUse={() => onUseTemplate?.(template.id)}
            />
          ))}
        </div>
      )}

      {/* Template Editor */}
      <TemplateEditor
        template={editingTemplate}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        onSave={handleSave}
      />
    </div>
  )
}
