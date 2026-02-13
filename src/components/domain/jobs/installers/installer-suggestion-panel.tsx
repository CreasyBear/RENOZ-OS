/**
 * Installer Suggestion Panel
 *
 * Smart assignment component for site visit creation.
 * Shows ranked installer suggestions with conflict warnings,
 * skills matching, and one-click assignment.
 *
 * SPRINT-03: Story 021 - Smart installer assignment
 */

import { useState } from 'react';
import { format } from 'date-fns';
import {
  MapPin,
  Star,
  Briefcase,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  UserCheck,
  Clock,
  Award,
  Zap,
  ChevronRight,
  Loader2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useSuggestInstallers, useInstallerAvailability } from '@/hooks/jobs';


// ============================================================================
// TYPES
// ============================================================================

type InstallerSkillType = 'solar_panels' | 'battery_systems' | 'electrical_work' | 'roof_work' | 'conduit_install' | 'commissioning' | 'diagnostics' | 'customer_training';

interface InstallerSuggestionPanelProps {
  postcode: string;
  scheduledDate?: string;
  requiredSkills?: InstallerSkillType[];
  preferredSkills?: InstallerSkillType[];
  onSelect: (installerId: string, installerName: string) => void;
  onClose?: () => void;
  className?: string;
}

interface Suggestion {
  installerId: string;
  name: string;
  score: number;
  skills: Array<{
    skill: InstallerSkillType;
    proficiencyLevel: number;
    [key: string]: unknown;
  }>;
  yearsExperience: number;
  reasons: string[];
  warnings: string[];
  avatarUrl?: string;
  status?: string;
  maxJobsPerDay?: number;
}

// ============================================================================
// SKILL BADGE COMPONENT
// ============================================================================

function SkillBadge({
  skill,
  level,
  isRequired,
  isPreferred,
}: {
  skill: string;
  level: number;
  isRequired?: boolean;
  isPreferred?: boolean;
}) {
  const formattedSkill = skill.replace('_', ' ');

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs',
        isRequired && 'bg-success/10 text-success border border-success/20',
        isPreferred && !isRequired && 'bg-info/10 text-info border border-info/20',
        !isRequired && !isPreferred && 'bg-muted text-muted-foreground'
      )}
    >
      <span className="capitalize">{formattedSkill}</span>
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'w-1 h-1 rounded-full',
              i < level ? 'bg-current' : 'bg-current/30'
            )}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// CONFLICT WARNING COMPONENT
// ============================================================================

function ConflictWarning({ warning }: { warning: string }) {
  return (
    <div className="flex items-start gap-1.5 text-xs text-warning-foreground bg-warning/10 px-2 py-1 rounded">
      <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
      <span>{warning}</span>
    </div>
  );
}

// ============================================================================
// REASON BADGE COMPONENT
// ============================================================================

function ReasonBadge({ reason }: { reason: string }) {
  const icon =
    reason.includes('skill') ? (
      <Award className="h-3 w-3" />
    ) : reason.includes('area') ? (
      <MapPin className="h-3 w-3" />
    ) : reason.includes('experience') ? (
      <Briefcase className="h-3 w-3" />
    ) : (
      <Zap className="h-3 w-3" />
    );

  return (
    <div className="flex items-center gap-1 text-xs text-success bg-success/10 px-2 py-1 rounded-full">
      {icon}
      <span>{reason}</span>
    </div>
  );
}

// ============================================================================
// SUGGESTION CARD COMPONENT
// ============================================================================

interface SuggestionCardProps {
  suggestion: Suggestion;
  rank: number;
  requiredSkills?: string[];
  preferredSkills?: string[];
  selectedDate?: string;
  isSelected: boolean;
  onSelect: () => void;
}

function SuggestionCard({
  suggestion,
  rank,
  requiredSkills = [],
  preferredSkills = [],
  selectedDate,
  isSelected,
  onSelect,
}: SuggestionCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  // Get availability for selected date
  const { data: availability, isLoading: checkingAvailability } = useInstallerAvailability(
    suggestion.installerId,
    selectedDate,
    selectedDate,
    !!selectedDate
  );

  const isAvailable = selectedDate
    ? availability?.availability[selectedDate]?.available
    : null;

  const availabilityReason = selectedDate
    ? availability?.availability[selectedDate]?.reason
    : null;

  const initials = suggestion.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Determine match quality
  const matchQuality =
    suggestion.score >= 80 ? 'excellent' : suggestion.score >= 60 ? 'good' : 'fair';

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all duration-200',
        isSelected && 'ring-2 ring-primary ring-offset-2',
        !isSelected && 'hover:shadow-md cursor-pointer'
      )}
      onClick={() => !isSelected && onSelect()}
    >
      {/* Rank Badge */}
      <div
        className={cn(
          'absolute top-3 left-3 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white',
          rank === 1 ? 'bg-yellow-500' : rank === 2 ? 'bg-gray-400' : rank === 3 ? 'bg-amber-600' : 'bg-muted-foreground'
        )}
      >
        {rank}
      </div>

      {/* Selection Check */}
      {isSelected && (
        <div className="absolute top-3 right-3">
          <div className="bg-primary text-primary-foreground rounded-full p-1">
            <CheckCircle className="h-4 w-4" />
          </div>
        </div>
      )}

      <CardContent className="pt-6 pb-4">
        {/* Header */}
        <div className="flex items-start gap-3 pl-8">
          <Avatar className="h-12 w-12">
            <AvatarImage src={suggestion.avatarUrl} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold truncate">{suggestion.name}</h4>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {suggestion.yearsExperience} years exp
              </Badge>
              {selectedDate && (
                <>
                  {checkingAvailability ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : isAvailable === false ? (
                    <StatusBadge status="unavailable" variant="error" className="text-xs" />
                  ) : isAvailable === true ? (
                    <StatusBadge status="available" variant="success" className="text-xs" />
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Score Bar */}
        <div className="mt-4 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Match Score</span>
            <span className={cn('font-medium', matchQuality === 'excellent' && 'text-success')}>
              {suggestion.score}%
            </span>
          </div>
          <div className="flex gap-1">
            <Progress
              value={suggestion.score}
              className="h-2 flex-1"
            />
          </div>
        </div>

        {/* Reasons */}
        {suggestion.reasons.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {suggestion.reasons.slice(0, 2).map((reason, i) => (
              <ReasonBadge key={i} reason={reason} />
            ))}
            {suggestion.reasons.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{suggestion.reasons.length - 2} more
              </Badge>
            )}
          </div>
        )}

        {/* Warnings */}
        {suggestion.warnings.length > 0 && (
          <div className="mt-3 space-y-1">
            {suggestion.warnings.map((warning, i) => (
              <ConflictWarning key={i} warning={warning} />
            ))}
          </div>
        )}

        {/* Availability Warning */}
        {availabilityReason && !isAvailable && (
          <div className="mt-2">
            <ConflictWarning warning={availabilityReason} />
          </div>
        )}

        {/* Expand/Collapse Details */}
        <button
          className="mt-3 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          onClick={(e) => {
            e.stopPropagation();
            setShowDetails(!showDetails);
          }}
        >
          {showDetails ? 'Hide' : 'Show'} skills
          <ChevronRight
            className={cn('h-3 w-3 transition-transform', showDetails && 'rotate-90')}
          />
        </button>

        {/* Skills Details */}
        {showDetails && (
          <div className="mt-3 pt-3 border-t space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Skills Match</p>
            <div className="flex flex-wrap gap-1.5">
              {suggestion.skills.map((skill) => (
                <SkillBadge
                  key={skill.skill}
                  skill={skill.skill}
                  level={skill.proficiencyLevel}
                  isRequired={requiredSkills.includes(skill.skill)}
                  isPreferred={preferredSkills.includes(skill.skill)}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN PANEL COMPONENT
// ============================================================================

export function InstallerSuggestionPanel({
  postcode,
  scheduledDate,
  requiredSkills = [],
  preferredSkills = [],
  onSelect,
  onClose,
  className,
}: InstallerSuggestionPanelProps) {
  const [selectedInstallerId, setSelectedInstallerId] = useState<string | null>(null);

  const {
    data: suggestionsData,
    isLoading,
    error,
  } = useSuggestInstallers(postcode, {
    requiredSkills,
    preferredSkills,
    date: scheduledDate,
    limit: 5,
  });

  const suggestions = (suggestionsData?.suggestions || []) as Suggestion[];

  const handleSelect = (installerId: string, name: string) => {
    setSelectedInstallerId(installerId);
    onSelect(installerId, name);
  };

  // Categorize suggestions
  const excellentMatches = suggestions.filter((s) => s.score >= 80);
  const goodMatches = suggestions.filter((s) => s.score >= 60 && s.score < 80);
  const fairMatches = suggestions.filter((s) => s.score < 60);

  return (
    <Card className={cn('w-full max-w-md', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-lg">
              <UserCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Smart Assignment</CardTitle>
              <p className="text-xs text-muted-foreground">
                {suggestionsData?.totalMatches || 0} installers match your criteria
              </p>
            </div>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Job Requirements Summary */}
        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{postcode}</span>
            {scheduledDate && (
              <>
                <Separator orientation="vertical" className="h-4" />
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{format(new Date(scheduledDate), 'MMM d, yyyy')}</span>
              </>
            )}
          </div>
          {(requiredSkills.length > 0 || preferredSkills.length > 0) && (
            <div className="flex flex-wrap gap-1.5">
              {requiredSkills.map((skill) => (
                <Badge key={skill} variant="default" className="text-xs">
                  Required: {skill.replace('_', ' ')}
                </Badge>
              ))}
              {preferredSkills.map((skill) => (
                <Badge key={skill} variant="secondary" className="text-xs">
                  Preferred: {skill.replace('_', ' ')}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground text-center py-4">
              Finding best matches...
            </p>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-[140px] animate-pulse bg-muted rounded-lg" />
              ))}
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-6">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Failed to load suggestions</p>
            <Button variant="outline" size="sm" className="mt-2">
              Retry
            </Button>
          </div>
        )}

        {/* No Results */}
        {!isLoading && !error && suggestions.length === 0 && (
          <div className="text-center py-6">
            <div className="bg-muted mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full">
              <UserCheck className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No matching installers</p>
            <p className="text-xs text-muted-foreground mt-1">
              Try adjusting your criteria or expanding the search area
            </p>
          </div>
        )}

        {/* Suggestions List */}
        {!isLoading && !error && suggestions.length > 0 && (
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {/* Excellent Matches */}
            {excellentMatches.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-success flex items-center gap-1.5">
                  <Star className="h-3 w-3 fill-success" />
                  Best Matches ({excellentMatches.length})
                </h4>
                {excellentMatches.map((suggestion, index) => (
                  <SuggestionCard
                    key={suggestion.installerId}
                    suggestion={suggestion}
                    rank={index + 1}
                    requiredSkills={requiredSkills}
                    preferredSkills={preferredSkills}
                    selectedDate={scheduledDate}
                    isSelected={selectedInstallerId === suggestion.installerId}
                    onSelect={() => handleSelect(suggestion.installerId, suggestion.name)}
                  />
                ))}
              </div>
            )}

            {/* Good Matches */}
            {goodMatches.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-info flex items-center gap-1.5">
                  <CheckCircle className="h-3 w-3" />
                  Good Matches ({goodMatches.length})
                </h4>
                {goodMatches.map((suggestion, index) => (
                  <SuggestionCard
                    key={suggestion.installerId}
                    suggestion={suggestion}
                    rank={excellentMatches.length + index + 1}
                    requiredSkills={requiredSkills}
                    preferredSkills={preferredSkills}
                    selectedDate={scheduledDate}
                    isSelected={selectedInstallerId === suggestion.installerId}
                    onSelect={() => handleSelect(suggestion.installerId, suggestion.name)}
                  />
                ))}
              </div>
            )}

            {/* Fair Matches */}
            {fairMatches.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-warning-foreground flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3" />
                  Alternative Options ({fairMatches.length})
                </h4>
                {fairMatches.map((suggestion, index) => (
                  <SuggestionCard
                    key={suggestion.installerId}
                    suggestion={suggestion}
                    rank={excellentMatches.length + goodMatches.length + index + 1}
                    requiredSkills={requiredSkills}
                    preferredSkills={preferredSkills}
                    selectedDate={scheduledDate}
                    isSelected={selectedInstallerId === suggestion.installerId}
                    onSelect={() => handleSelect(suggestion.installerId, suggestion.name)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export type { InstallerSuggestionPanelProps, Suggestion };
