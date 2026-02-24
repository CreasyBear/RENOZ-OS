/* eslint-disable react-refresh/only-export-components -- Component exports component + step types */
/**
 * FormWizard Component
 *
 * Multi-step form wrapper with step indicator, navigation, and per-step validation.
 *
 * @example
 * ```tsx
 * const steps = [
 *   { id: 'info', label: 'Information', description: 'Basic details' },
 *   { id: 'contact', label: 'Contact', description: 'Contact info' },
 *   { id: 'review', label: 'Review', description: 'Confirm details' },
 * ]
 *
 * <FormWizard
 *   steps={steps}
 *   currentStep={currentStep}
 *   onStepChange={setCurrentStep}
 *   onComplete={handleSubmit}
 *   canNavigateToStep={(stepIndex) => stepIndex <= maxCompletedStep + 1}
 * >
 *   {currentStep === 0 && <InfoStep form={form} />}
 *   {currentStep === 1 && <ContactStep form={form} />}
 *   {currentStep === 2 && <ReviewStep form={form} />}
 * </FormWizard>
 * ```
 */
import * as React from "react"
import { Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { Button } from "~/components/ui/button"
import { cn } from "~/lib/utils"

// ============================================================================
// TYPES
// ============================================================================

export interface WizardStep {
  /** Unique step identifier */
  id: string
  /** Step label shown in indicator */
  label: string
  /** Optional description */
  description?: string
  /** Optional icon */
  icon?: React.ReactNode
}

export interface FormWizardProps {
  /** Step definitions */
  steps: WizardStep[]
  /** Current step index (0-based) */
  currentStep: number
  /** Callback when step changes */
  onStepChange: (step: number) => void
  /** Callback when wizard completes (final step submit) */
  onComplete: () => void | Promise<void>
  /** Step content */
  children: React.ReactNode
  /** Custom validation for current step before proceeding */
  validateStep?: (step: number) => boolean | Promise<boolean>
  /** Whether a step can be navigated to */
  canNavigateToStep?: (stepIndex: number) => boolean
  /** Whether currently submitting */
  isSubmitting?: boolean
  /** Labels */
  labels?: {
    previous?: string
    next?: string
    complete?: string
    completing?: string
  }
  /** Additional class names */
  className?: string
  /** Step indicator position */
  indicatorPosition?: "top" | "left"
  /** Show step numbers */
  showStepNumbers?: boolean
  /** Allow clicking on steps to navigate */
  allowStepClick?: boolean
  /**
   * When true, the Complete button on the last step uses type="submit" so the
   * parent form's onSubmit handles submit (per FORM-STANDARDS). handleNext will
   * not call onComplete when on last step—the form submit does.
   */
  submitOnLastStep?: boolean
}

// ============================================================================
// COMPONENTS
// ============================================================================

interface StepIndicatorProps {
  steps: WizardStep[]
  currentStep: number
  onStepClick?: (index: number) => void
  canNavigateToStep?: (index: number) => boolean
  orientation?: "horizontal" | "vertical"
  showNumbers?: boolean
  allowClick?: boolean
}

function StepIndicator({
  steps,
  currentStep,
  onStepClick,
  canNavigateToStep,
  orientation = "horizontal",
  showNumbers = true,
  allowClick = false,
}: StepIndicatorProps) {
  return (
    <nav
      aria-label="Progress"
      className={cn(
        orientation === "horizontal" && "w-full",
        orientation === "vertical" && "flex flex-col"
      )}
    >
      <ol
        role="list"
        className={cn(
          "flex",
          orientation === "horizontal" && "items-center",
          orientation === "vertical" && "flex-col space-y-4"
        )}
      >
        {steps.map((step, index) => {
          const isComplete = index < currentStep
          const isCurrent = index === currentStep
          const isUpcoming = index > currentStep
          const canClick = allowClick && canNavigateToStep?.(index) !== false

          return (
            <li
              key={step.id}
              className={cn(
                orientation === "horizontal" && "flex-1 flex items-center",
                orientation === "vertical" && "flex items-start"
              )}
            >
              {/* Connector line (not for first item) */}
              {index > 0 && orientation === "horizontal" && (
                <div
                  className={cn(
                    "flex-1 h-0.5 transition-colors",
                    isComplete ? "bg-primary" : "bg-border"
                  )}
                />
              )}

              <button
                type="button"
                onClick={() => canClick && onStepClick?.(index)}
                disabled={!canClick}
                className={cn(
                  "flex items-center gap-3 group",
                  canClick && "cursor-pointer",
                  !canClick && "cursor-default"
                )}
              >
                {/* Step circle */}
                <span
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors",
                    isComplete && "border-primary bg-primary text-primary-foreground",
                    isCurrent && "border-primary bg-background text-primary",
                    isUpcoming && "border-muted bg-background text-muted-foreground",
                    canClick && "group-hover:border-primary/70"
                  )}
                >
                  {isComplete ? (
                    <Check className="h-5 w-5" />
                  ) : showNumbers ? (
                    index + 1
                  ) : step.icon ? (
                    step.icon
                  ) : (
                    index + 1
                  )}
                </span>

                {/* Step text */}
                <span
                  className={cn(
                    "flex flex-col",
                    orientation === "horizontal" && "hidden sm:flex"
                  )}
                >
                  <span
                    className={cn(
                      "text-sm font-medium",
                      (isComplete || isCurrent) && "text-foreground",
                      isUpcoming && "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </span>
                  {step.description && (
                    <span className="text-xs text-muted-foreground">
                      {step.description}
                    </span>
                  )}
                </span>
              </button>

              {/* Connector line for vertical */}
              {index < steps.length - 1 && orientation === "vertical" && (
                <div
                  className={cn(
                    "ml-5 mt-2 w-0.5 h-8",
                    isComplete ? "bg-primary" : "bg-border"
                  )}
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function FormWizard({
  steps,
  currentStep,
  onStepChange,
  onComplete,
  children,
  validateStep,
  canNavigateToStep,
  isSubmitting = false,
  labels = {},
  className,
  indicatorPosition = "top",
  showStepNumbers = true,
  allowStepClick = true,
  submitOnLastStep = false,
}: FormWizardProps) {
  const [isValidating, setIsValidating] = React.useState(false)

  const {
    previous = "Previous",
    next = "Next",
    complete = "Complete",
    completing = "Completing...",
  } = labels

  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === steps.length - 1
  const isSubmitButton = submitOnLastStep && isLastStep

  const handlePrevious = () => {
    if (!isFirstStep && !isSubmitting) {
      onStepChange(currentStep - 1)
    }
  }

  const handleNext = async () => {
    if (isSubmitting || isValidating) return
    if (submitOnLastStep && isLastStep) return

    // Validate current step if validator provided
    if (validateStep) {
      setIsValidating(true)
      try {
        const isValid = await validateStep(currentStep)
        if (!isValid) {
          return
        }
      } finally {
        setIsValidating(false)
      }
    }

    if (isLastStep) {
      if (submitOnLastStep) return // form's onSubmit handles submit
      await onComplete()
    } else {
      onStepChange(currentStep + 1)
    }
  }

  const handleStepClick = (stepIndex: number) => {
    if (stepIndex > currentStep + 1) return
    if (stepIndex !== currentStep && canNavigateToStep?.(stepIndex) !== false) {
      onStepChange(stepIndex)
    }
  }

  const isProcessing = isSubmitting || isValidating

  return (
    <div
      className={cn(
        "flex",
        indicatorPosition === "top" && "flex-col gap-8",
        indicatorPosition === "left" && "flex-row gap-8",
        className
      )}
    >
      {/* Step Indicator */}
      <div
        className={cn(
          indicatorPosition === "top" && "w-full",
          indicatorPosition === "left" && "w-64 shrink-0"
        )}
      >
        <StepIndicator
          steps={steps}
          currentStep={currentStep}
          onStepClick={handleStepClick}
          canNavigateToStep={canNavigateToStep}
          orientation={indicatorPosition === "top" ? "horizontal" : "vertical"}
          showNumbers={showStepNumbers}
          allowClick={allowStepClick && !isProcessing}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Step Content */}
        <div className="mb-8">{children}</div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrevious}
            disabled={isFirstStep || isProcessing}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            {previous}
          </Button>

          <div className="text-sm text-muted-foreground">
            Step {currentStep + 1} of {steps.length}
          </div>

          <Button
            type={isSubmitButton ? "submit" : "button"}
            onClick={isSubmitButton ? undefined : handleNext}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />
                {isLastStep ? completing : "Validating..."}
              </>
            ) : isLastStep ? (
              complete
            ) : (
              <>
                {next}
                <ChevronRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// HOOK: Wizard State Management
// ============================================================================

export interface UseWizardOptions {
  /** Total number of steps */
  totalSteps: number
  /** Initial step (default: 0) */
  initialStep?: number
  /** Callback when step changes */
  onStepChange?: (step: number) => void
}

export interface UseWizardResult {
  /** Current step index */
  currentStep: number
  /** Set current step */
  setCurrentStep: (step: number) => void
  /** Go to next step */
  nextStep: () => void
  /** Go to previous step */
  previousStep: () => void
  /** Whether on first step */
  isFirstStep: boolean
  /** Whether on last step */
  isLastStep: boolean
  /** Can navigate to a specific step */
  canGoToStep: (step: number) => boolean
  /** Highest completed step */
  maxCompletedStep: number
  /** Mark current step as completed and go to next */
  completeCurrentStep: () => void
  /** Reset wizard to initial state */
  reset: () => void
}

/**
 * Hook for managing wizard state
 */
export function useWizard({
  totalSteps,
  initialStep = 0,
  onStepChange,
}: UseWizardOptions): UseWizardResult {
  const [currentStep, setCurrentStepInternal] = React.useState(initialStep)
  const [maxCompletedStep, setMaxCompletedStep] = React.useState(-1)

  const setCurrentStep = React.useCallback(
    (step: number) => {
      const clampedStep = Math.max(0, Math.min(step, totalSteps - 1))
      setCurrentStepInternal(clampedStep)
      onStepChange?.(clampedStep)
    },
    [totalSteps, onStepChange]
  )

  const nextStep = React.useCallback(() => {
    setCurrentStep(currentStep + 1)
  }, [currentStep, setCurrentStep])

  const previousStep = React.useCallback(() => {
    setCurrentStep(currentStep - 1)
  }, [currentStep, setCurrentStep])

  const completeCurrentStep = React.useCallback(() => {
    setMaxCompletedStep((prev) => Math.max(prev, currentStep))
    nextStep()
  }, [currentStep, nextStep])

  const canGoToStep = React.useCallback(
    (step: number) => step <= maxCompletedStep + 1,
    [maxCompletedStep]
  )

  const reset = React.useCallback(() => {
    setCurrentStepInternal(initialStep)
    setMaxCompletedStep(-1)
  }, [initialStep])

  return {
    currentStep,
    setCurrentStep,
    nextStep,
    previousStep,
    isFirstStep: currentStep === 0,
    isLastStep: currentStep === totalSteps - 1,
    canGoToStep,
    maxCompletedStep,
    completeCurrentStep,
    reset,
  }
}
