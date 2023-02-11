
import { addFullUserChain } from "../utils/client.js";
import { My, ODataClient, rootConfigExporter } from "../generatedCode.js";
import { queryUtils } from "magic-odata-client";

const rootConfig = rootConfigExporter();

function loggingFetcher(input: RequestInfo | URL, init?: RequestInit) {
    console.log(input, init)
    return fetch(input, init)
}

const client = new ODataClient({
    request: fetch,
    uriRoot: "http://localhost:5432/odata/test-entities",
    responseInterceptor: (result, uri, reqValues, defaultParser) => {
        if (!defaultParser) {
            throw new Error("Expected default parser")
        }

        return defaultParser(result, uri, reqValues)
        // .catch(async _ => {

        //     const r = await result
        //     const err = {
        //         uri,
        //         code: r?.status,
        //         statusText: r?.statusText,
        //         headers: r?.headers,
        //         error: await r?.text(),
        //         reqValues
        //     }

        //     throw new Error(JSON.stringify(err, null, 2));
        // })
    }
}).My.Odata.Container;

function toListRequestInterceptor(_: any, r: RequestInit): RequestInit {
    return {
        ...r,
        headers: {
            ...(r.headers || {}),
            ToList: "true"
        }
    }
}

describe("Query.Select", function () {

    afterAll(() => {
        const expected = [
            "Edm.String",
            // https://github.com/ShaneGH/magic-odata/issues/7
            // https://github.com/ShaneGH/magic-odata/issues/8
            // "Edm.Guid",
            // "Edm.Boolean",
            // "Edm.DateTime",
            // "Edm.DateTimeOffset",
            // "Edm.Int16",
            // "Edm.Int32",
            // "Edm.Int64",
            // "Edm.Decimal",
            // "Edm.Double",
            // "Edm.Single",
            // "Edm.Byte",
            // "Edm.Binary",
            // "Edm.Duration",
            // "Edm.TimeOfDay",
            // "Edm.GeographyPoint",
            // "Edm.GeographyLineString",
            // "Edm.GeographyPolygon",
            // "Edm.GeographyMultiPoint",
            // "Edm.GeographyMultiLineString",
            // "Edm.GeographyMultiPolygon",
            // "Edm.GeographyCollection",
            // "Edm.GeometryPoint",
            // "Edm.GeometryLineString",
            // "Edm.GeometryPolygon",
            // "Edm.GeometryMultiPoint",
            // "Edm.GeometryMultiLineString",
            // "Edm.GeometryMultiPolygon",
            // "Edm.GeometryCollection",
            // "Edm.SByte"
        ]

        const missing = expected
            .filter(o => !testCases.filter(tc => tc === o).length);

        expect(missing).toEqual([]);
    });

    const testCases: string[] = [];
    function testCase(name: string, test: () => void) {

        testCases.push(name)
        return describe(name, test)
    }

    testCase("Edm.String", function () {
        it("Should escape characters in path", async () => {

            try {
                await client.Users
                    .withKey(x => x.key("hello ' ''"))
                    .get();

                expect(1).toEqual(2);
            } catch (e: any) {
                expect(e.httpResponse.status).toBe(404)
            }
        });

        it("Should escape characters in query", async () => {

            const result = await client.Users
                .withQuery((u, { $filter: { eq } }) => eq(u.Id, "hello ' ''"))
                .get();

            expect(result.value.length).toEqual(0);
        });
    });
});

