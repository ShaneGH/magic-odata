
const path = require("path")
const fs = require("fs")

const version = process.argv[process.argv.length - 1]
const tests = process.argv.indexOf("--tests") !== -1

if (!/^\d+\.\d+(\.\d+)?$/.test(version)) {
    throw new Error(`Invalid version ${version}`);
}

reVersion("../magic-odata-shared/package.json", false, false)
reVersion("../magic-odata-client/package.json", true, false)
reVersion("../magic-odata-code-gen/package.json", true, false)

if (tests) {
    reVersion("../tests/magic-odata-tests/package.json", false, true)
    reVersion("../tests/magic-odata-tests-browser/package.json", false, true)
}

function reVersion(packageJson, addSharedDep, addProjDeps) {
    const packageJsonPath = path.join(__dirname, packageJson)
    const json = JSON.parse(fs.readFileSync(packageJsonPath).toString())

    json.version = version
    if (addSharedDep) {
        json.dependencies = {
            ...json.dependencies,
            "magic-odata-shared": version
        }
    }

    if (addProjDeps) {
        json.dependencies = {
            ...json.dependencies,
            "magic-odata-client": version,
            "magic-odata-code-gen": version
        }
    }

    fs.writeFileSync(packageJsonPath, JSON.stringify(json, null, 2))
}
