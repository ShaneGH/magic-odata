#!/usr/bin/env bash
set -e

echo "Building magic-odata-client"
(cd ./magic-odata-client; tsc)

echo "Building magic-odata-code-gen"
(cd ./magic-odata-code-gen; tsc)