#!/usr/bin/env bash
set -e
chmod +x ./tests/magic-odata-tests/buildFromRoot.sh
chmod +x ./buildDist.sh

(cd ./tests/TestServer; dotnet build;)
(cd ./tests/TestServer; dotnet run --no-build) &
(cd ./magic-odata-shared; npm ci; tsc)
(cd ./magic-odata-client; npm ci; npm run fix-links; tsc)
(cd ./magic-odata-code-gen; npm ci; npm run fix-links; tsc)
(
    # run this build a little more manually, because of issues
    # with how jest discovers files for coverage
    cd ./tests/magic-odata-tests; 
    npm ci; 
    npm run fix-links; 
    ./buildFromRoot.sh;
    npm run generate-code
    tsc
    cd ../..
    node --experimental-vm-modules ./tests/magic-odata-tests/node_modules/jest/bin/jest.js  --coverage --config ./jest.ci.config.json)
(cd ./tests/magic-odata-tests-browser; npm ci; npm run fix-links; npm run build-and-test-unix)