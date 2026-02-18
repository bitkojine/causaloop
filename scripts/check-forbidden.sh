#!/bin/bash

# Check for eslint-disable
if grep -r "eslint-disable" packages/*/src; then
  echo "Error: eslint-disable comments are forbidden in src directories."
  exit 1
fi

# Check for console usage
if grep -r "console\." packages/*/src; then
  echo "Error: Use of console is forbidden in src directories."
  exit 1
fi

echo "No forbidden patterns found."
exit 0
