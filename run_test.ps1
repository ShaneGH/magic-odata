
.\buildDist.ps1
pushd .\tests\experiments

echo "Deleting old test result"
rm generatedCode.ts
mv test.ts test.notts
echo "Generating code"
tsc
if (-not($?)) {
    popd
    exit 1
}

echo "Running"
node ./dist/working.js > generatedCode.ts
if (-not($?)) {
    popd
    exit 1
}

mv test.notts test.ts
tsc
if (-not($?)) {
    popd
    exit 1
}

popd
node ./tests/experiments/dist/test.js