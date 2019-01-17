#!/bin/sh

set -e

sh -c "npm install"

sh -c "npm run lint"

sh -c "npm run build"

sh -c "npx semantic-release"
