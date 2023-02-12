
Param(
    [Parameter(Mandatory = $true)]$outputLog,
    [switch]$npmInstall,
    [switch]$ignoreFailures)

function execute($npmInstall) {
    
    if ($npmInstall) {
        npm install
    }

    if (-not($?)) {
        return 1
    }
    else {
        npm run build-and-test > $outputLog
        if (-not($?)) {
            return 1
        }
        else {
            return 0
        }
    }
}

echo "Executing tests"
pushd ..\tests\magic-odata-tests
$result1 = execute $npmInstall
popd

if ($result1 -ne 0 -and -not($ignoreFailures)) {
    echo "ERROR EXECUTING TESTS $result1"
    exit 1
}

popd
echo "Executing browser tests"
pushd ..\tests\magic-odata-tests-browser
$result2 = execute $npmInstall
popd

if ($result2 -ne 0 -and -not($ignoreFailures)) {
    echo "ERROR EXECUTING BROWSER TESTS"
    exit 1
}
