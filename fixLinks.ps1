
pushd .\magic-odata-client
npm run fix-links

cd ..\magic-odata-code-gen
npm run fix-links

cd ..\tests\magic-odata-tests
npm run fix-links

cd ..\magic-odata-tests-browser
npm run fix-links

popd