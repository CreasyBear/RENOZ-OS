# Iteration Limits

## Philosophy
Use the `estimated_iterations` field from PRD stories as the maximum attempts.
Invest upfront to avoid debt - but know when to stop.

## Limits by Story Type

| Story Type | Base Limit | Source |
|------------|------------|--------|
| Foundation | estimated_iterations × 2 | Critical path, allow extra attempts |
| Domain | estimated_iterations | As specified in PRD |
| Polish-only | estimated_iterations | Usually 1-2 |

## Iteration Counting

An "iteration" is one complete Ralph loop cycle:
1. Read current state
2. Implement/modify code
3. Run verification
4. Assess result

Failed verification = iteration consumed.
Successful verification = story advances to next stage.

## Exhaustion Protocol

When iterations exhausted:

### Foundation Stories
1. Log detailed failure state to progress.txt
2. Attempt ONE alternative approach (rollback to scaffold)
3. If second attempt fails → STOP, escalate to human
4. Do NOT continue to next foundation story

### Domain Stories (Critical Path)
1. Log failure state
2. Attempt alternative if obvious
3. If no alternative → mark `status: blocked`
4. Continue to next story (dependency permitting)
5. Escalate at domain end if blockers remain

### Domain Stories (Non-Critical)
1. Log failure state
2. Mark `status: skipped`
3. Continue immediately
4. Address in polish phase or later domain pass
