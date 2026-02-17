#!/bin/bash
if grep -r "eslint-disable" packages/*/src; then
  echo "Error: eslint-disable comments are forbidden in src directories."
  exit 1
fi
echo "No forbidden comments found."
exit 0
