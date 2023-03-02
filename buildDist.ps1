
pushd .\magic-odata-code-gen
echo "Building query compile time"
tsc
if (-not($?)) {
    popd
    exit 1
}

popd

pushd .\magic-odata-client
echo "Building query"
tsc
if (-not($?)) {
    popd
    exit 1
}

popd