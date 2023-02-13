
pushd ./magic-odata-shared; npm install; tsc; popd
pushd ./magic-odata-client; npm install; npm run fix-links; tsc; popd
pushd ./magic-odata-code-gen; npm install; npm run fix-links; tsc; popd
pushd ./tests/magic-odata-tests; npm install; npm run fix-links; tsc; popd
pushd ./tests/magic-odata-tests-browser; npm install; npm run fix-links; tsc; popd