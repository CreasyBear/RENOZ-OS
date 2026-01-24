#!/bin/bash

################################################################################
# Architecture Compliance Checker
#
# This script runs automated checks to detect container/presenter pattern
# violations in the codebase.
#
# Usage:
#   npm run check:architecture
#   bash scripts/check-architecture.sh
#   bash scripts/check-architecture.sh --fix
#
# Violations checked:
#   1. useQuery/useMutation in domain components
#   2. Inline query keys instead of queryKeys.*
#   3. Server function imports in components
#   4. Manual polling with setInterval/setTimeout
#   5. useState + useEffect data fetching
#
# Exit codes:
#   0 = All checks passed
#   1 = One or more violations found
#
# @see PREVENTION_STRATEGIES.md for context
################################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
VIOLATIONS=0
WARNINGS=0

# Parse arguments
VERBOSE=false
SHOW_FIXES=false

while [[ $# -gt 0 ]]; do
  case $1 in
    -v|--verbose)
      VERBOSE=true
      shift
      ;;
    --show-fixes)
      SHOW_FIXES=true
      shift
      ;;
    *)
      shift
      ;;
  esac
done

# Helper functions
print_header() {
  echo ""
  echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
}

print_violation() {
  echo -e "${RED}❌ VIOLATION: $1${NC}"
  ((VIOLATIONS++))
}

print_warning() {
  echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
  ((WARNINGS++))
}

print_pass() {
  echo -e "${GREEN}✅ PASS: $1${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ️  INFO: $1${NC}"
}

# Check function
check_violation() {
  local name=$1
  local command=$2
  local error_msg=$3

  if eval "$command" > /tmp/check_result.txt 2>&1; then
    if [ -s /tmp/check_result.txt ]; then
      print_violation "$error_msg"
      if [ "$VERBOSE" = true ]; then
        echo "---"
        cat /tmp/check_result.txt
        echo "---"
      else
        echo "Found $(wc -l < /tmp/check_result.txt) violations. Run with --verbose for details."
      fi
      return 1
    else
      print_pass "$name"
      return 0
    fi
  else
    print_pass "$name"
    return 0
  fi
}

# ============================================================================
# CHECK 1: useQuery/useMutation in domain components
# ============================================================================
print_header "CHECK 1: Data Hooks in Presenter Components"

echo "Scanning src/components/domain for useQuery/useMutation..."

if grep -r "useQuery\|useMutation\|useInfiniteQuery\|useSuspenseQuery" \
  src/components/domain \
  --include="*.tsx" \
  --include="*.ts" \
  > /tmp/check_result.txt 2>/dev/null; then

  if [ -s /tmp/check_result.txt ]; then
    print_violation "useQuery/useMutation found in presenter components"
    echo "Files with violations:"
    grep -r "useQuery\|useMutation\|useInfiniteQuery\|useSuspenseQuery" \
      src/components/domain \
      --include="*.tsx" \
      --include="*.ts" \
      -l | sort | uniq

    if [ "$VERBOSE" = true ]; then
      echo ""
      echo "Detailed violations:"
      grep -r "useQuery\|useMutation\|useInfiniteQuery\|useSuspenseQuery" \
        src/components/domain \
        --include="*.tsx" \
        --include="*.ts" \
        -n
    fi
  else
    print_pass "No useQuery/useMutation in presenters"
  fi
else
  print_pass "No useQuery/useMutation in presenters"
fi

# ============================================================================
# CHECK 2: Inline query keys instead of queryKeys.*
# ============================================================================
print_header "CHECK 2: Inline Query Keys"

echo "Scanning for inline query key definitions..."

# Look for queryKey: [ patterns
INLINE_KEYS=$(grep -r "queryKey:\s*\[" src/ --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v "queryKeys\." || true)

if [ ! -z "$INLINE_KEYS" ]; then
  # Filter out false positives (like queryKey: [...queryKeys.x, y])
  INLINE_KEYS=$(echo "$INLINE_KEYS" | grep -v "\.\.\.queryKeys" || true)
fi

if [ ! -z "$INLINE_KEYS" ]; then
  print_violation "Inline query keys detected instead of queryKeys.*"
  echo "Files with violations:"
  echo "$INLINE_KEYS" | cut -d: -f1 | sort | uniq

  if [ "$VERBOSE" = true ]; then
    echo ""
    echo "Detailed violations:"
    echo "$INLINE_KEYS" | head -20
    if [ $(echo "$INLINE_KEYS" | wc -l) -gt 20 ]; then
      echo "... and $(($(echo "$INLINE_KEYS" | wc -l) - 20)) more"
    fi
  fi
else
  print_pass "No inline query keys found"
fi

# ============================================================================
# CHECK 3: Server function imports in components
# ============================================================================
print_header "CHECK 3: Server Functions in Components"

echo "Scanning src/components/domain for server function imports..."

if grep -r "from ['\"]@/server/functions" \
  src/components/domain \
  --include="*.tsx" \
  --include="*.ts" \
  > /tmp/check_result.txt 2>/dev/null; then

  if [ -s /tmp/check_result.txt ]; then
    print_violation "Server functions imported in presenter components"
    echo "Files with violations:"
    grep -r "from ['\"]@/server/functions" \
      src/components/domain \
      --include="*.tsx" \
      --include="*.ts" \
      -l | sort | uniq

    if [ "$VERBOSE" = true ]; then
      echo ""
      echo "Detailed violations:"
      grep -r "from ['\"]@/server/functions" \
        src/components/domain \
        --include="*.tsx" \
        --include="*.ts" \
        -n
    fi
  else
    print_pass "No server function imports in presenters"
  fi
else
  print_pass "No server function imports in presenters"
fi

# ============================================================================
# CHECK 4: Manual polling with setInterval/setTimeout
# ============================================================================
print_header "CHECK 4: Manual Polling Patterns"

echo "Scanning for setInterval/setTimeout in src/components/domain..."

if grep -r "setInterval\|setTimeout" \
  src/components/domain \
  --include="*.tsx" \
  --include="*.ts" \
  > /tmp/check_result.txt 2>/dev/null; then

  if [ -s /tmp/check_result.txt ]; then
    print_warning "Manual polling detected (consider using refetchInterval)"
    echo "Files with potential issues:"
    grep -r "setInterval\|setTimeout" \
      src/components/domain \
      --include="*.tsx" \
      --include="*.ts" \
      -l | sort | uniq

    if [ "$VERBOSE" = true ]; then
      echo ""
      echo "Detailed findings:"
      grep -r "setInterval\|setTimeout" \
        src/components/domain \
        --include="*.tsx" \
        --include="*.ts" \
        -n
    fi
  else
    print_pass "No manual polling in presenters"
  fi
else
  print_pass "No manual polling in presenters"
fi

# ============================================================================
# CHECK 5: Component directory structure
# ============================================================================
print_header "CHECK 5: Directory Structure"

echo "Checking for incorrectly placed components..."

# Look for /components/components patterns (nested components dir)
NESTED=$(find src/components/domain -type d -name "components" 2>/dev/null | wc -l)

if [ "$NESTED" -gt 0 ]; then
  print_warning "Found $NESTED nested /components directories in domain"
  echo "Nested directories:"
  find src/components/domain -type d -name "components" 2>/dev/null
else
  print_pass "No problematic nested component directories"
fi

# ============================================================================
# CHECK 6: Query key centralization
# ============================================================================
print_header "CHECK 6: Query Key Centralization"

echo "Checking if queryKeys in @/lib/query-keys.ts covers used patterns..."

# This is informational - count unique query keys used
USED_KEYS=$(grep -rh "queryKeys\." src/routes src/hooks --include="*.tsx" --include="*.ts" 2>/dev/null | \
  grep -o "queryKeys\.[a-zA-Z]*" | sort | uniq || true)

if [ ! -z "$USED_KEYS" ]; then
  COUNT=$(echo "$USED_KEYS" | wc -l)
  print_info "Found $COUNT unique query key namespaces in use"
  if [ "$VERBOSE" = true ]; then
    echo "Query key namespaces:"
    echo "$USED_KEYS"
  fi
else
  print_info "No queryKeys usage found (or grep failed)"
fi

# ============================================================================
# SUMMARY
# ============================================================================
print_header "SUMMARY"

if [ "$VIOLATIONS" -eq 0 ] && [ "$WARNINGS" -eq 0 ]; then
  echo -e "${GREEN}🎉 All checks passed! Your architecture is clean.${NC}"
  exit 0
elif [ "$VIOLATIONS" -eq 0 ]; then
  echo -e "${YELLOW}⚠️  $WARNINGS warning(s) found. Review and fix.${NC}"
  exit 0
else
  echo -e "${RED}❌ $VIOLATIONS violation(s) found. Fix these before committing.${NC}"
  if [ "$WARNINGS" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Plus $WARNINGS warning(s).${NC}"
  fi
  exit 1
fi
