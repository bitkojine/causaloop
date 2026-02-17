#!/bin/bash

echo "=== Causaloop Hygiene & Boundary Audit ==="

# 1. Search for 'any' keywords (excluding types.ts and mocks)
echo "--- Searching for 'any' usage ---"
grep -r "any" packages/*/src --exclude="*.test.ts" --exclude="types.ts" | grep -v "Company" | wc -l

# 2. Search for '@ts-ignore' or '@ts-nocheck'
echo "--- Searching for TS suppressions ---"
grep -r "@ts-ignore\|@ts-nocheck" packages/*/src | wc -l

# 3. Check for illegal cross-package imports
# Core should never import from platform or app
echo "--- Checking Core isolation ---"
grep -r "from \"@causaloop/platform-browser\"\|from \"@causaloop/app-web\"" packages/core/src && echo "FAILURE: Core depends on platform/app!" || echo "Core is isolated."

# 4. Check platform isolation
echo "--- Checking Platform isolation ---"
grep -r "from \"@causaloop/app-web\"" packages/platform-browser/src && echo "FAILURE: Platform depends on app!" || echo "Platform is isolated."

echo "=== Audit Complete ==="
