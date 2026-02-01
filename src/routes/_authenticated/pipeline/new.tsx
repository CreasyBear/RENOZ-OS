/**
 * Pipeline New Route
 *
 * Create a new opportunity.
 */
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { PageLayout, RouteErrorFallback } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { toastSuccess, toastError } from '@/hooks'
import { useCustomers } from '@/hooks/customers'
import { useCreateOpportunity } from '@/hooks/pipeline'
import { STAGE_PROBABILITY_DEFAULTS, type OpportunityStage } from '@/lib/schemas/pipeline'

export const Route = createFileRoute('/_authenticated/pipeline/new')({
  validateSearch: (search: Record<string, unknown>) => ({
    stage: typeof search.stage === 'string' ? search.stage : undefined,
  }),
  component: NewOpportunityPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/pipeline" />
  ),
})

const STAGE_OPTIONS: Array<{ value: OpportunityStage; label: string }> = [
  { value: 'new', label: 'New' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'negotiation', label: 'Negotiation' },
]

function normalizeStage(stage?: string): OpportunityStage {
  if (stage === 'qualified' || stage === 'proposal' || stage === 'negotiation') {
    return stage
  }
  return 'new'
}

function NewOpportunityPage() {
  const navigate = useNavigate()
  const { stage: stageParam } = Route.useSearch()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [stage, setStage] = useState<OpportunityStage>(normalizeStage(stageParam))
  const [probability, setProbability] = useState(STAGE_PROBABILITY_DEFAULTS[stage])
  const [valueDollars, setValueDollars] = useState('0')
  const [expectedCloseDate, setExpectedCloseDate] = useState('')
  const [tags, setTags] = useState('')

  const createOpportunity = useCreateOpportunity()

  const customersQuery = useCustomers({ page: 1, pageSize: 100 })

  const customers = customersQuery.data?.items ?? []

  const handleStageChange = (nextStage: OpportunityStage) => {
    setStage(nextStage)
    setProbability(STAGE_PROBABILITY_DEFAULTS[nextStage])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customerId) {
      toastError('Please select a customer.')
      return
    }

    const value = parseFloat(valueDollars) || 0
    const tagList = tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)

    try {
      const result = await createOpportunity.mutateAsync({
        title,
        description: description || undefined,
        customerId,
        stage,
        probability,
        value,
        expectedCloseDate: expectedCloseDate || null,
        tags: tagList,
        metadata: {
          source: 'other',
          notes: description || undefined,
        },
      })
      toastSuccess('Opportunity created successfully.')
      navigate({
        to: '/pipeline/$opportunityId',
        params: { opportunityId: result.opportunity.id },
      })
    } catch {
      toastError('Failed to create opportunity. Please try again.')
    }
  }

  const isLoading = customersQuery.isLoading || createOpportunity.isPending

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="New Opportunity"
        description="Create a new opportunity in your pipeline"
        actions={
          <Button variant="outline" onClick={() => navigate({ to: '/pipeline' })}>
            Back to Pipeline
          </Button>
        }
      />
      <PageLayout.Content>
        <Card>
          <CardHeader>
            <CardTitle>Opportunity Details</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="customer">Customer *</Label>
                    <Select value={customerId} onValueChange={setCustomerId}>
                      <SelectTrigger id="customer">
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Opportunity title"
                      required
                      maxLength={255}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add context or notes"
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Stage</Label>
                    <Select value={stage} onValueChange={handleStageChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STAGE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="probability">Probability (%)</Label>
                    <Input
                      id="probability"
                      type="number"
                      min={0}
                      max={100}
                      value={probability}
                      onChange={(e) => setProbability(Number(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="value">Value (AUD)</Label>
                    <Input
                      id="value"
                      type="number"
                      min={0}
                      step="0.01"
                      value={valueDollars}
                      onChange={(e) => setValueDollars(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="expectedCloseDate">Expected Close Date</Label>
                    <Input
                      id="expectedCloseDate"
                      type="date"
                      value={expectedCloseDate}
                      onChange={(e) => setExpectedCloseDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags</Label>
                    <Input
                      id="tags"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="Comma-separated tags"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate({ to: '/pipeline' })}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createOpportunity.isPending}>
                    Create Opportunity
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </PageLayout.Content>
    </PageLayout>
  )
}
