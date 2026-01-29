/**
 * Project Overview Panel Components
 *
 * Scope, Outcomes, and Key Features display components.
 * Combines reference design patterns with Renoz styling.
 *
 * SPRINT-03: New components for project-centric jobs model
 */

import { useState } from 'react';
import {
  Check,
  X,
  Target,
  Sparkles,
  ListTodo,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// ============================================================================
// TYPES
// ============================================================================

interface ScopeColumnsProps {
  scope: {
    inScope: string[];
    outOfScope: string[];
  } | null;
  className?: string;
}

interface OutcomesListProps {
  outcomes: string[] | null;
  className?: string;
}

interface KeyFeaturesColumnsProps {
  features: {
    p0: string[]; // Must have
    p1: string[]; // Should have
    p2: string[]; // Nice to have
  } | null;
  className?: string;
}

// ============================================================================
// SCOPE COLUMNS
// ============================================================================

export function ScopeColumns({ scope, className }: ScopeColumnsProps) {
  const [expanded, setExpanded] = useState(true);

  if (!scope) return null;

  const inScopeItems = scope.inScope || [];
  const outOfScopeItems = scope.outOfScope || [];

  if (inScopeItems.length === 0 && outOfScopeItems.length === 0) return null;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ListTodo className="h-4 w-4 text-muted-foreground" />
            Scope
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      
      {expanded && (
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* In Scope */}
            <div>
              <h4 className="text-sm font-medium text-green-700 flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="h-3 w-3 text-green-600" />
                </div>
                In Scope
                <Badge variant="secondary" className="text-xs">
                  {inScopeItems.length}
                </Badge>
              </h4>
              
              {inScopeItems.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  No items defined
                </p>
              ) : (
                <ul className="space-y-2">
                  {inScopeItems.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm group"
                    >
                      <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Out of Scope */}
            <div>
              <h4 className="text-sm font-medium text-red-700 flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center">
                  <X className="h-3 w-3 text-red-600" />
                </div>
                Out of Scope
                <Badge variant="secondary" className="text-xs">
                  {outOfScopeItems.length}
                </Badge>
              </h4>
              
              {outOfScopeItems.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  No exclusions defined
                </p>
              ) : (
                <ul className="space-y-2">
                  {outOfScopeItems.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm group"
                    >
                      <X className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ============================================================================
// OUTCOMES LIST
// ============================================================================

export function OutcomesList({ outcomes, className }: OutcomesListProps) {
  const [expanded, setExpanded] = useState(true);

  if (!outcomes || outcomes.length === 0) return null;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            Expected Outcomes
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{outcomes.length}</Badge>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {expanded && (
        <CardContent>
          <ul className="space-y-3">
            {outcomes.map((outcome, i) => (
              <li
                key={i}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-primary">
                    {i + 1}
                  </span>
                </div>
                <span className="text-sm text-foreground">{outcome}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      )}
    </Card>
  );
}

// ============================================================================
// KEY FEATURES COLUMNS
// ============================================================================

export function KeyFeaturesColumns({ features, className }: KeyFeaturesColumnsProps) {
  const [expanded, setExpanded] = useState(true);

  if (!features) return null;

  const p0Items = features.p0 || [];
  const p1Items = features.p1 || [];
  const p2Items = features.p2 || [];

  const hasFeatures = p0Items.length > 0 || p1Items.length > 0 || p2Items.length > 0;
  if (!hasFeatures) return null;

  const columns = [
    {
      key: 'p0',
      title: 'Must Have',
      items: p0Items,
      color: 'text-red-700',
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: 'P0',
    },
    {
      key: 'p1',
      title: 'Should Have',
      items: p1Items,
      color: 'text-yellow-700',
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      icon: 'P1',
    },
    {
      key: 'p2',
      title: 'Nice to Have',
      items: p2Items,
      color: 'text-green-700',
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: 'P2',
    },
  ];

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            Key Features
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      
      {expanded && (
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {columns.map((col) => (
              <div
                key={col.key}
                className={cn(
                  'rounded-lg border p-3',
                  col.bg,
                  col.border
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className={cn('text-sm font-semibold', col.color)}>
                    {col.title}
                  </h4>
                  <Badge
                    variant="outline"
                    className={cn('text-xs', col.color, col.border)}
                  >
                    {col.items.length}
                  </Badge>
                </div>
                
                {col.items.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    No {col.title.toLowerCase()} items
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {col.items.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm"
                      >
                        <span className={cn(
                          'text-[10px] font-bold mt-0.5 flex-shrink-0',
                          col.color
                        )}>
                          {col.icon}
                        </span>
                        <span className="text-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ============================================================================
// PROJECT DESCRIPTION CARD
// ============================================================================

interface ProjectDescriptionCardProps {
  description: string | null;
  className?: string;
}

export function ProjectDescriptionCard({
  description,
  className,
}: ProjectDescriptionCardProps) {
  const [expanded, setExpanded] = useState(true);

  if (!description) return null;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Description</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      
      {expanded && (
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {description}
          </p>
        </CardContent>
      )}
    </Card>
  );
}

// ============================================================================
// EXPORT ALL
// ============================================================================

export type {
  ScopeColumnsProps,
  OutcomesListProps,
  KeyFeaturesColumnsProps,
  ProjectDescriptionCardProps,
};
