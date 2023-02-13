#!/usr/bin/env bash
set -e
chmod +x ./tests/magic-odata-tests/buildFromRoot.sh
chmod +x ./buildDist.sh

(cd ./magic-odata-shared; npm install; tsc)
(cd ./magic-odata-client; npm install; npm run fix-links; tsc)
(cd ./magic-odata-code-gen; npm install; npm run fix-links; tsc)
(cd ./tests/magic-odata-tests; npm install; npm run fix-links; tsc)
(cd ./tests/magic-odata-tests-browser; npm install; npm run fix-links; tsc)