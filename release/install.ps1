param([Parameter(Mandatory = $true)]$package) 

pushd $package
npm install
if (-not($?)) {
    popd
    exit 1
}

popd