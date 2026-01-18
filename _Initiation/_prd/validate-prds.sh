#!/bin/bash
# PRD Validation Script
# Validates PRD structure, references, and consistency for ralph-loop
# Usage: ./validate-prds.sh [path-to-prd-folder]

PRD_ROOT="${1:-$(dirname "$0")}"
ERRORS=0
WARNINGS=0

echo "=========================================="
echo "PRD Validation for Ralph Loop"
echo "=========================================="
echo "Scanning: $PRD_ROOT"
echo ""

# Colors
RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

error() {
  echo -e "${RED}ERROR:${NC} $1"
  ERRORS=$((ERRORS + 1))
}

warn() {
  echo -e "${YELLOW}WARN:${NC} $1"
  WARNINGS=$((WARNINGS + 1))
}

ok() {
  echo -e "${GREEN}OK:${NC} $1"
}

# Track all story IDs for uniqueness check
ALL_STORY_IDS=()

# Find all PRD folders (excluding archive, patterns)
for folder in "$PRD_ROOT"/1-foundation/*/; do
  folder_name=$(basename "$folder")

  # Skip known non-PRD folders
  if [[ "$folder_name" == "patterns" || "$folder_name" == "archive" || "$folder_name" == "_"* ]]; then
    continue
  fi

  echo "--- $folder_name ---"

  # Check for PRD file
  prd_file=$(ls "$folder"*.prd.json 2>/dev/null | head -1)
  if [[ -z "$prd_file" ]]; then
    warn "$folder_name: No .prd.json file found"
    continue
  fi

  # Validate JSON syntax
  if ! jq empty "$prd_file" 2>/dev/null; then
    error "$folder_name: Invalid JSON in $(basename "$prd_file")"
    continue
  fi

  # Check required PRD fields
  has_id=$(jq -r '.id // empty' "$prd_file")
  has_name=$(jq -r '.name // empty' "$prd_file")
  has_stories=$(jq -r '.stories // empty' "$prd_file")
  has_success=$(jq -r '.success_criteria // empty' "$prd_file")
  has_domain_promise=$(jq -r '.domain_completion_promise // empty' "$prd_file")

  [[ -z "$has_id" ]] && error "$folder_name: Missing 'id' field"
  [[ -z "$has_name" ]] && error "$folder_name: Missing 'name' field"
  [[ -z "$has_stories" ]] && error "$folder_name: Missing 'stories' array"
  [[ -z "$has_success" ]] && warn "$folder_name: Missing 'success_criteria'"
  [[ -z "$has_domain_promise" ]] && warn "$folder_name: Missing 'domain_completion_promise'"

  # Validate each story
  story_count=$(jq '.stories | length' "$prd_file")
  for i in $(seq 0 $((story_count - 1))); do
    story_id=$(jq -r ".stories[$i].id" "$prd_file")
    story_name=$(jq -r ".stories[$i].name" "$prd_file")
    has_criteria=$(jq -r ".stories[$i].acceptance_criteria | length" "$prd_file")
    has_promise=$(jq -r ".stories[$i].completion_promise // empty" "$prd_file")

    # Check for duplicate story IDs
    if [[ " ${ALL_STORY_IDS[*]} " =~ " ${story_id} " ]]; then
      error "Duplicate story ID: $story_id"
    fi
    ALL_STORY_IDS+=("$story_id")

    # Validate story fields
    [[ "$has_criteria" -eq 0 ]] && error "$story_id: No acceptance_criteria"
    [[ -z "$has_promise" ]] && error "$story_id: Missing completion_promise"

    # Validate dependencies exist
    deps=$(jq -r ".stories[$i].dependencies[]?" "$prd_file" 2>/dev/null)
    for dep in $deps; do
      if [[ -n "$dep" && ! " ${ALL_STORY_IDS[*]} " =~ " ${dep} " ]]; then
        # Check if it's in any PRD (could be cross-domain)
        found=$(grep -r "\"id\": \"$dep\"" "$PRD_ROOT" 2>/dev/null | head -1)
        [[ -z "$found" ]] && warn "$story_id: Dependency '$dep' not found"
      fi
    done
  done

  # Check for progress.txt
  if [[ ! -f "$folder/progress.txt" ]]; then
    error "$folder_name: Missing progress.txt"
  fi

  # Check for PROMPT.md
  if [[ ! -f "$folder/PROMPT.md" ]]; then
    error "$folder_name: Missing PROMPT.md"
  else
    # Check PROMPT.md references correct PRD
    prd_basename=$(basename "$prd_file")
    if ! grep -q "$prd_basename" "$folder/PROMPT.md" 2>/dev/null; then
      warn "$folder_name: PROMPT.md doesn't reference $prd_basename"
    fi
  fi

  ok "$folder_name: $story_count stories validated"
done

echo ""
echo "=========================================="
echo "Validation Complete"
echo "=========================================="
echo -e "Errors:   ${RED}$ERRORS${NC}"
echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"
echo ""

if [[ $ERRORS -gt 0 ]]; then
  echo -e "${RED}FAILED${NC} - Fix errors before running ralph-loop"
  exit 1
else
  echo -e "${GREEN}PASSED${NC} - PRDs are valid for ralph-loop"
  exit 0
fi
