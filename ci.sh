#!/usr/bin/env bash
set -e
chmod +x ./tests/magic-odata-tests/buildFromRoot.sh
chmod +x ./buildDist.sh

(cd ./tests/TestServer; dotnet build;)
(cd ./tests/TestServer; dotnet run --no-build) &
(cd ./magic-odata-shared; npm ci; tsc)
(cd ./magic-odata-client; npm ci; npm run fix-links; tsc)
(cd ./magic-odata-code-gen; npm ci; npm run fix-links; tsc)
(cd ./tests/magic-odata-tests; npm ci; npm run fix-links; npm run build-and-test-unix)
(cd ./tests/magic-odata-tests-browser; npm ci; npm run fix-links; npm run build-and-test-unix)