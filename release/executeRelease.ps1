param([Parameter(Mandatory = $true)]$version) 

$buildLog = "$(get-location)\build.log"
if (Test-Path $buildLog) {
    rm $buildLog
    if (-not($?)) {
        exit 1
    }
}

# echo ""
# echo "Step 1: create a release branch"
# $branch = "release/$version"
# $tag = "v$version"
# git checkout -b $branch
# if (-not($?)) {
#     exit 1
# }

# echo ""
# echo "Step 2: run tests"
# ./executeTests.ps1 -outputLog $buildLog
# if (-not($?)) {
#     echo "Error with build. Suplimentary output logs: $buildLog"
#     exit 1
# }

# echo ""
# echo "Step 3: add correct versions"
# ./reVersion.ps1 -version $version
# if (-not($?)) {
#     echo "Error with build. Suplimentary output logs: $buildLog"
#     exit 1
# }

# # echo "Step 4: publish shared"
# # ./publish.ps1 -package ../magic-odata-shared
# # if (-not($?)) {
# #     echo "Error with build. Suplimentary output logs: $buildLog"
# #     exit 1
# # }

# echo ""
# echo "Step 5: install versioned dependencies"
# ./install.ps1 -package ../magic-odata-client
# if (-not($?)) {
#     echo "Error with build. Suplimentary output logs: $buildLog"
#     exit 1
# }

# ./install.ps1 -package ../magic-odata-code-gen
# if (-not($?)) {
#     echo "Error with build. Suplimentary output logs: $buildLog"
#     exit 1
# }

# echo ""
# echo "Step 6: run tests again with new versions"
# ./executeTests.ps1 -outputLog $buildLog
# if (-not($?)) {
#     echo "Error with build. Suplimentary output logs: $buildLog"
#     exit 1
# }

# # echo ""
# # echo "Step 7: publish client + code-gen"
# # ./publish.ps1 -package ../magic-odata-client
# # if (-not($?)) {
# #     echo "Error with build. Suplimentary output logs: $buildLog"
# #     exit 1
# # }

# # ./publish.ps1 -package ../magic-odata-code-gen
# # if (-not($?)) {
# #     echo "Error with build. Suplimentary output logs: $buildLog"
# #     exit 1
# # }

# echo ""
# echo "Step 8: run tests a third time, pointing at actual npm packages as dependencies"
# ./reVersion.ps1 -version $version -tests
# if (-not($?)) {
#     echo "Error with build. Suplimentary output logs: $buildLog"
#     exit 1
# }

# ./executeTests.ps1 -outputLog $buildLog -npmInstall
# if (-not($?)) {
#     echo "Error with build. Suplimentary output logs: $buildLog"
#     exit 1
# }

echo ""
echo "Step 9: Commit release"
git add ..
git commit -m "Release version: $version"
git push --set-upstream origin $branch
git tag $tag
git push origin $tag


echo "DONE. Version $version published"