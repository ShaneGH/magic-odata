param([Parameter(Mandatory = $true)]$version) 

$buildLog = "$(get-location)\build.log"
if (Test-Path $buildLog) {
    rm $buildLog
    if (-not($?)) {
        exit 1
    }
}

echo ""
echo "Step 1: create a release branch"
$branch = "release/$version"
$tag = "v$version"
git checkout -b $branch
if (-not($?)) {
    exit 1
}

echo ""
echo "Step 2: run tests"
./executeTests.ps1 -outputLog $buildLog
if (-not($?)) {
    echo "Error with build. Suplimentary output logs: $buildLog"
    exit 1
}

echo ""
echo "Step 3: add correct versions"
./reVersion.ps1 -version $version
if (-not($?)) {
    echo "Error with build. Suplimentary output logs: $buildLog"
    exit 1
}

echo "Step 4: publish shared"
./publish.ps1 -package ../magic-odata-shared
if (-not($?)) {
    echo "Error with build. Suplimentary output logs: $buildLog"
    exit 1
}

echo ""
echo "Step 5: install versioned dependencies"
./install.ps1 -package ../magic-odata-client
if (-not($?)) {
    echo "Error with build. Suplimentary output logs: $buildLog"
    exit 1
}

./install.ps1 -package ../magic-odata-code-gen
if (-not($?)) {
    echo "Error with build. Suplimentary output logs: $buildLog"
    exit 1
}

echo ""
echo "Step 6: run tests again with new versions"
./executeTests.ps1 -outputLog $buildLog
if (-not($?)) {
    echo "Error with build. Suplimentary output logs: $buildLog"
    exit 1
}

echo ""
echo "Step 7: publish client + code-gen"
./publish.ps1 -package ../magic-odata-client
if (-not($?)) {
    echo "Error with build. Suplimentary output logs: $buildLog"
    exit 1
}

./publish.ps1 -package ../magic-odata-code-gen
if (-not($?)) {
    echo "Error with build. Suplimentary output logs: $buildLog"
    exit 1
}

echo ""
echo "Step 8: re-version tests to point at actual NPM packages"
./reVersion.ps1 -version $version -tests
if (-not($?)) {
    echo "Error with build. Suplimentary output logs: $buildLog"
    exit 1
}

echo ""
echo "Step 9: Commit release"
git add ..
git commit -m "Release version: $version"
git push --set-upstream origin "$branch"
if (-not($?)) {
    echo "Error with build. Suplimentary output logs: $buildLog"
    exit 1
}

git tag $tag
if (-not($?)) {
    echo "Error with build. Suplimentary output logs: $buildLog"
    exit 1
}

git push origin $tag
if (-not($?)) {
    echo "Error with build. Suplimentary output logs: $buildLog"
    exit 1
}

echo ""
echo "Step 10: execute tests 1 last time"
# todo: using ./executeTests.ps1 at this state will return a non 0 code. Running manually instead
pushd ../tests/magic-odata-tests; npm install; npm run build-and-test-win; popd
pushd ../tests/magic-odata-tests-browser; npm install; npm link ../magic-odata-tests; npm run build-and-test-win; popd

echo ""
echo "Step 11: remove unused release git branch"
git checkout main
git branch -D $branch
git push origin ":$branch"
git checkout ..

echo "DONE. Version $version published"