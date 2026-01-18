/**
 * RiskAlerts Component
 *
 * Displays at-risk customer alerts and churn indicators:
 * - Risk level badges
 * - Alert list with severity
 * - Quick action buttons
 */
import {
  AlertTriangle,
  Clock,
  TrendingDown,
  CreditCard,
  MessageSquare,
  Phone,
  Mail,
  XCircle,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// ============================================================================
// TYPES
// ============================================================================

interface RiskAlert {
  id: string
  type: 'churn' | 'payment' | 'engagement' | 'complaint'
  severity: 'critical' | 'warning' | 'info'
  title: string
  description: string
  timestamp: string
  actionable: boolean
}

interface CustomerRiskData {
  healthScore: number | null
  creditHold: boolean
  lastOrderDays: number | null
  openComplaints: number
  declinedPayments: number
  healthScoreTrend: 'up' | 'down' | 'stable' | null
}

interface RiskAlertsProps {
  riskData: CustomerRiskData
  onScheduleCall?: () => void
  onSendEmail?: () => void
  className?: string
}

// ============================================================================
// HELPERS
// ============================================================================

function generateAlerts(data: CustomerRiskData): RiskAlert[] {
  const alerts: RiskAlert[] = []
  const now = new Date()

  // Credit hold alert
  if (data.creditHold) {
    alerts.push({
      id: 'credit-hold',
      type: 'payment',
      severity: 'critical',
      title: 'Credit Hold Active',
      description: 'Customer account is on credit hold. New orders are blocked.',
      timestamp: now.toISOString(),
      actionable: true,
    })
  }

  // Declined payments
  if (data.declinedPayments > 0) {
    alerts.push({
      id: 'declined-payments',
      type: 'payment',
      severity: data.declinedPayments >= 3 ? 'critical' : 'warning',
      title: `${data.declinedPayments} Declined Payment${data.declinedPayments > 1 ? 's' : ''}`,
      description: 'Recent payment attempts have failed. Contact customer.',
      timestamp: now.toISOString(),
      actionable: true,
    })
  }

  // Open complaints
  if (data.openComplaints > 0) {
    alerts.push({
      id: 'open-complaints',
      type: 'complaint',
      severity: data.openComplaints >= 2 ? 'critical' : 'warning',
      title: `${data.openComplaints} Open Complaint${data.openComplaints > 1 ? 's' : ''}`,
      description: 'Unresolved customer complaints require attention.',
      timestamp: now.toISOString(),
      actionable: true,
    })
  }

  // Churn risk based on inactivity
  if (data.lastOrderDays !== null) {
    if (data.lastOrderDays > 90) {
      alerts.push({
        id: 'churn-critical',
        type: 'churn',
        severity: 'critical',
        title: 'High Churn Risk',
        description: `No orders in ${data.lastOrderDays} days. Immediate re-engagement needed.`,
        timestamp: now.toISOString(),
        actionable: true,
      })
    } else if (data.lastOrderDays > 60) {
      alerts.push({
        id: 'churn-warning',
        type: 'churn',
        severity: 'warning',
        title: 'Engagement Declining',
        description: `Last order was ${data.lastOrderDays} days ago. Consider follow-up.`,
        timestamp: now.toISOString(),
        actionable: true,
      })
    }
  }

  // Health score declining
  if (data.healthScoreTrend === 'down' && data.healthScore !== null && data.healthScore < 60) {
    alerts.push({
      id: 'health-declining',
      type: 'engagement',
      severity: 'warning',
      title: 'Health Score Declining',
      description: 'Customer health score has dropped recently. Review account.',
      timestamp: now.toISOString(),
      actionable: false,
    })
  }

  // Low health score
  if (data.healthScore !== null && data.healthScore < 40) {
    alerts.push({
      id: 'health-critical',
      type: 'engagement',
      severity: 'critical',
      title: 'Critical Health Score',
      description: `Health score is ${data.healthScore}/100. Customer needs attention.`,
      timestamp: now.toISOString(),
      actionable: true,
    })
  }

  return alerts.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 }
    return severityOrder[a.severity] - severityOrder[b.severity]
  })
}

function getRiskLevel(data: CustomerRiskData): 'critical' | 'high' | 'medium' | 'low' {
  if (data.creditHold || data.declinedPayments >= 3 || data.openComplaints >= 2) {
    return 'critical'
  }
  if (data.healthScore !== null && data.healthScore < 40) {
    return 'critical'
  }
  if (data.lastOrderDays !== null && data.lastOrderDays > 90) {
    return 'high'
  }
  if (
    (data.healthScore !== null && data.healthScore < 60) ||
    data.openComplaints > 0 ||
    data.declinedPayments > 0
  ) {
    return 'medium'
  }
  return 'low'
}

const riskLevelConfig = {
  critical: {
    label: 'Critical',
    color: 'bg-red-500 text-white',
    description: 'Immediate action required',
  },
  high: {
    label: 'High Risk',
    color: 'bg-orange-500 text-white',
    description: 'Action needed soon',
  },
  medium: {
    label: 'Medium Risk',
    color: 'bg-yellow-500 text-white',
    description: 'Monitor closely',
  },
  low: {
    label: 'Low Risk',
    color: 'bg-green-500 text-white',
    description: 'Customer is healthy',
  },
}

const alertTypeIcons = {
  churn: TrendingDown,
  payment: CreditCard,
  engagement: Clock,
  complaint: MessageSquare,
}

const severityColors = {
  critical: 'border-red-200 bg-red-50',
  warning: 'border-yellow-200 bg-yellow-50',
  info: 'border-blue-200 bg-blue-50',
}

// ============================================================================
// ALERT ITEM
// ============================================================================

interface AlertItemProps {
  alert: RiskAlert
}

function AlertItem({ alert }: AlertItemProps) {
  const Icon = alertTypeIcons[alert.type]

  return (
    <div className={cn('p-3 rounded-lg border', severityColors[alert.severity])}>
      <div className="flex items-start gap-3">
        <div className={cn(
          'p-1.5 rounded-full',
          alert.severity === 'critical' ? 'bg-red-100' :
          alert.severity === 'warning' ? 'bg-yellow-100' : 'bg-blue-100'
        )}>
          <Icon className={cn(
            'h-4 w-4',
            alert.severity === 'critical' ? 'text-red-600' :
            alert.severity === 'warning' ? 'text-yellow-600' : 'text-blue-600'
          )} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{alert.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
        </div>
        {alert.severity === 'critical' && (
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
        )}
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function RiskAlerts({
  riskData,
  onScheduleCall,
  onSendEmail,
  className,
}: RiskAlertsProps) {
  const alerts = generateAlerts(riskData)
  const riskLevel = getRiskLevel(riskData)
  const config = riskLevelConfig[riskLevel]

  const criticalCount = alerts.filter(a => a.severity === 'critical').length
  const warningCount = alerts.filter(a => a.severity === 'warning').length

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Risk Assessment
            </CardTitle>
            <CardDescription>{config.description}</CardDescription>
          </div>
          <Badge className={config.color}>{config.label}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-6">
            <div className="rounded-full bg-green-100 p-3 w-fit mx-auto mb-3">
              <XCircle className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-sm font-medium">No Active Alerts</p>
            <p className="text-xs text-muted-foreground mt-1">
              Customer account is in good standing
            </p>
          </div>
        ) : (
          <>
            {/* Alert summary */}
            <div className="flex gap-4 mb-4 text-sm">
              {criticalCount > 0 && (
                <span className="text-red-600 font-medium">
                  {criticalCount} critical
                </span>
              )}
              {warningCount > 0 && (
                <span className="text-yellow-600 font-medium">
                  {warningCount} warning
                </span>
              )}
            </div>

            {/* Alert list */}
            <div className="space-y-2">
              {alerts.map((alert) => (
                <AlertItem key={alert.id} alert={alert} />
              ))}
            </div>

            {/* Quick actions */}
            {(onScheduleCall || onSendEmail) && (
              <div className="flex gap-2 mt-4 pt-4 border-t">
                {onScheduleCall && (
                  <Button size="sm" variant="outline" onClick={onScheduleCall}>
                    <Phone className="h-4 w-4 mr-1" />
                    Schedule Call
                  </Button>
                )}
                {onSendEmail && (
                  <Button size="sm" variant="outline" onClick={onSendEmail}>
                    <Mail className="h-4 w-4 mr-1" />
                    Send Email
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
