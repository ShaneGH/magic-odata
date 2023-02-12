
param(
    [Parameter(Mandatory = $true)]$version,
    [switch]$tests) 

if ($tests) {
    node ./reVersion.js --tests "$version"
}
else {
    node ./reVersion.js "$version"
}

if (-not($?)) {
    exit 1
}