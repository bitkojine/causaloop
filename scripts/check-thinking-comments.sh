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
  echo "❌ Found comments in codebase."
  echo ""
  echo "======================================================================================================"
  echo "🚨 ATTENTION AI AGENT:"
  echo "You have left comments in the source code."
  echo "This repository has a ZERO COMMENT POLICY for source code."
  echo "Everything of value must be in documentation, not in code."
  echo ""
  echo "👉 ACTION REQUIRED:"
  echo "1. Move any insights to 'docs/notes/ideas.md'."
  echo "2. Remove ALL comments from the source code."
  echo "3. Try pushing again."
  echo "======================================================================================================"
  echo ""
  echo "$FOUND"
  exit 1
else
  echo "✅ No thinking comments found."
  exit 0
fi
