#!/bin/bash

# Define forbidden patterns (case-insensitive)
# We want to catch ANY comment
# Forbidden: // or /*
# Allowed: None

FORBIDDEN_PATTERNS="//|/\*"

echo "Scanning for thinking comments..."

# Exclude common false positives:
# - https:// or http:// (URLs)
# - /// <reference (TS directives)

FOUND=$(grep -r -n -E -i "$FORBIDDEN_PATTERNS" packages/*/src 2>/dev/null | grep -v "https://" | grep -v "http://" | grep -v "/// <reference")

if [ -n "$FOUND" ]; then
  echo "❌ Found 'thinking' comments in codebase. Please move ideas to docs or remove uncertainty."
  echo "$FOUND"
  exit 1
else
  echo "✅ No thinking comments found."
  exit 0
fi
