
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { LocationType, executeCodeGen, generateCode } from "magic-odata-code-gen"

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function file(pathFromRepoRoot: string) {

    return new Promise<string>((resolve, reject) => {
        fs
            .readFile(path.join(__dirname, "../../../../../../", pathFromRepoRoot), (err, data) => {
                if (err) reject(err)
                else resolve(data.toString())
            })
    })
}

describe("Re-execute code gen for the sake of coverage", () => {
    it("should generate code (1)", () => {
        return executeCodeGen({
            type: "Metadata",
            metadataUrl: "http://localhost:5432/odata/test-entities/$metadata",
            ciMode: true
        })
    });

    it("should generate code (2)", async () => {

        const configFile = fs
            .readFileSync(path.join(__dirname, "../../../../code-gen-config.json"))
            .toString()

        await generateCode(
            { type: LocationType.UriLocation, uri: "http://localhost:5432/odata/test-entities/$metadata" },
            JSON.parse(await file("./tests/magic-odata-tests/code-gen-config.json")),
            null)
    });

    it("should generate code (3)", async () => {

        await generateCode(
            { type: LocationType.XmlString, xml: await file("./tests/magic-odata-tests/code-gen/namespaces/namespaces.xml") },
            JSON.parse(await file("./tests/magic-odata-tests/code-gen/namespaces/namespaces.json")),
            null)
    });

    it("should generate code (4)", async () => {

        await generateCode(
            { type: LocationType.UriLocation, uri: "http://localhost:5432/odata/test-entities/$metadata" },
            JSON.parse(await file("./tests/magic-odata-tests-browser/src/clients/code-gen-config-angular-arraybuffer.json")),
            null)
    });

    it("should generate code (5)", async () => {

        await generateCode(
            { type: LocationType.UriLocation, uri: "http://localhost:5432/odata/test-entities/$metadata" },
            JSON.parse(await file("./tests/magic-odata-tests-browser/src/clients/code-gen-config-angular-blob.json")),
            null)
    });

    it("should generate code (6)", async () => {

        await generateCode(
            { type: LocationType.UriLocation, uri: "http://localhost:5432/odata/test-entities/$metadata" },
            JSON.parse(await file("./tests/magic-odata-tests-browser/src/clients/code-gen-config-angular-string.json")),
            null)
    });

    it("should generate code (7)", async () => {

        await generateCode(
            { type: LocationType.UriLocation, uri: "http://localhost:5432/odata/test-entities/$metadata" },
            JSON.parse(await file("./tests/magic-odata-tests-browser/src/clients/code-gen-config-fetch.json")),
            null)
    });
})