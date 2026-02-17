#!/bin/bash

# Define forbidden patterns (case-insensitive)
# We want to catch conversational/uncertainty markers.
# Exclude dist, node_modules, and this script itself.

FORBIDDEN_PATTERNS="I think|We should probably|Wait,|Let's trace|Maybe\?|Maybe we|I wonder|Question:|Answer:|NAUGHTY"

echo "Scanning for thinking comments..."

# Grep for patterns in src directories
# -r: recursive
# -n: line numbers
# -E: extended regex
# -i: case insensitive
# --include: only source files

FOUND=$(grep -r -n -E -i "$FORBIDDEN_PATTERNS" packages/*/src 2>/dev/null)

if [ -n "$FOUND" ]; then
  echo "❌ Found 'thinking' comments in codebase. Please move ideas to docs or remove uncertainty."
  echo "$FOUND"
  exit 1
else
  echo "✅ No thinking comments found."
  exit 0
fi
