param([Parameter(Mandatory = $true)]$package) 

pushd $package
if (Test-Path ./dist) { 
    rmdir ./dist -r -fo
    if (-not($?)) {
        popd
        exit 1
    }
}

npm install
if (-not($?)) {
    popd
    exit 1
}

tsc
if (-not($?)) {
    popd
    exit 1
}

npm publish
if (-not($?)) {
    popd
    exit 1
}

popd