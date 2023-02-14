
import { addFullUserChain } from "../utils/client.js";
import { My, ODataClient, rootConfigExporter } from "../generatedCode.js";
import { queryUtils, WithKeyType } from "magic-odata-client";
import { oDataClient } from "../utils/odataClient.js";

const rootConfig = rootConfigExporter();

function loggingFetcher(input: RequestInfo | URL, init?: RequestInit) {
    console.log(input, init)
    return fetch(input, init)
}

function toListRequestInterceptor(_: any, r: RequestInit): RequestInit {
    return {
        ...r,
        headers: {
            ...(r.headers || {}),
            ToList: "true"
        }
    }
}
const client = new ODataClient({
    request: fetch,
    uriRoot: "http://localhost:5432/odata/test-entities"
}).My.Odata.Container;

const uriClient = new ODataClient({
    request: x => Promise.resolve({
        ok: true,
        json: () => Promise.resolve(x)
    }) as any,
    uriRoot: "xxx"
}).My.Odata.Container;


describe("Query.Select", function () {

    afterAll(() => {
        const expected = [
            "Edm.String",
            "Edm.Guid",
            "Edm.Boolean",
            "Edm.Date",
            "Edm.DateTimeOffset",
            "Edm.Int16",
            "Edm.Int32",
            "Edm.Int64",
            "Edm.Decimal",
            "Edm.Double",
            "Edm.Single",
            "Edm.Byte",
            "Edm.Binary",
            "Edm.Duration",
            "Edm.TimeOfDay",
            "Edm.SByte"
            // https://github.com/ShaneGH/magic-odata/issues/7
            // https://github.com/ShaneGH/magic-odata/issues/8
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
            // "Edm.GeometryCollection"
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

        it("Should escape characters in path", execute.bind(null, WithKeyType.FunctionCall));
        it("Should escape characters in path segment", execute.bind(null, WithKeyType.FunctionCall));

        async function execute(keyType: WithKeyType) {

            try {
                await client.Users
                    .withKey(x => x.key("hello ' ''", keyType))
                    .get();

                expect(1).toEqual(2);
            } catch (e: any) {
                expect(e.httpResponse.status).toBe(404)
            }
        }

        it("Should escape composite key characters in path", async function () {

            try {
                await client.CompositeKeyItems
                    .withKey(x => x.key({ Id1: "hello ' ''", Id2: "64729622-1e76-450a-827d-9376a21cdc0b" }))
                    .get();

                expect(1).toEqual(2);
            } catch (e: any) {
                expect(e.httpResponse.status).toBe(404)
            }
        });

        it("Should escape characters in query", async () => {

            const result = await oDataClient.Users
                .withQuery((u, { $filter: { eq } }) => eq(u.Id, "hello ' ''"))
                .get();

            expect(result.value.length).toEqual(0);
        });
    });

    testCase("Edm.Guid", function () {

        it("Should work", async () => {

            const result = await oDataClient.OneOfEverythings
                .withQuery((u, { $filter: { eq } }) => eq(u.Guid, "486fd5a2-4326-45c0-9a3f-ddc88dcb36d2"))
                .get();

            expect(result.value.length).toEqual(1);
        });
    });

    testCase("Edm.Boolean", function () {

        it("Should work", async () => {

            const result = await oDataClient.OneOfEverythings
                .withQuery((u, { $filter: { eq } }) => eq(u.Boolean, true))
                .get();

            expect(result.value.length).toEqual(1);
        });
    });

    testCase("Edm.Int16", function () {

        it("Should work", async () => {

            const result = await oDataClient.OneOfEverythings
                .withQuery((u, { $filter: { eq } }) => eq(u.Int16, 1))
                .get();

            expect(result.value.length).toEqual(1);
        });
    });

    testCase("Edm.Int32", function () {

        it("Should work", async () => {

            const result = await oDataClient.OneOfEverythings
                .withQuery((u, { $filter: { eq } }) => eq(u.Int32, 2))
                .get();

            expect(result.value.length).toEqual(1);
        });
    });

    testCase("Edm.Int64", function () {

        it("Should work", async () => {

            const result = await oDataClient.OneOfEverythings
                .withQuery((u, { $filter: { eq } }) => eq(u.Int64, 3))
                .get();

            expect(result.value.length).toEqual(1);
        });
    });

    testCase("Edm.Decimal", function () {

        it("Should work", async () => {

            const result = await oDataClient.OneOfEverythings
                .withQuery((u, { $filter: { eq } }) => eq(u.Decimal, 3.3))
                .get();

            expect(result.value.length).toEqual(1);
        });
    });

    testCase("Edm.Double", function () {

        it("Should work", async () => {

            const result = await oDataClient.OneOfEverythings
                .withQuery((u, { $filter: { eq } }) => eq(u.Double, 2.2))
                .get();

            expect(result.value.length).toEqual(1);
        });
    });

    testCase("Edm.Single", function () {

        it("Should work", async () => {

            const result = await oDataClient.OneOfEverythings
                .withQuery((u, { $filter: { eq } }) => eq(u.Single, 1.1))
                .get();

            expect(result.value.length).toEqual(1);
        });
    });

    testCase("Edm.Byte", function () {

        it("Should work", async () => {

            const result = await oDataClient.OneOfEverythings
                .withQuery((u, { $filter: { eq } }) => eq(u.Byte, 0x11))
                .get();

            expect(result.value.length).toEqual(1);
        });
    });

    testCase("Edm.Byte", function () {

        it("Should work", async () => {

            const result = await oDataClient.OneOfEverythings
                .withQuery((u, { $filter: { eq } }) => eq(u.SByte, 0x10))
                .get();

            expect(result.value.length).toEqual(1);
        });
    });

    testCase("Edm.Date", function () {

        describe("As Date", () => {
            it("Should work", async () => {

                const result = await oDataClient.OneOfEverythings
                    .withQuery((u, { $filter: { eq } }) => eq(u.Date, new Date(1999, 1, 1)))
                    .get();

                expect(result.value.length).toEqual(1);
            });

            it("Should work with different padding", async () => {

                const result = await oDataClient.OneOfEverythings
                    .withQuery((u, { $filter: { eq } }) => eq(u.Date, new Date(1, 12, 11)))
                    .get();

                expect(result.value.length).toEqual(0);
            });
        });

        describe("As struct", () => {
            it("Should work", async () => {

                const result = await oDataClient.OneOfEverythings
                    .withQuery((u, { $filter: { eq } }) => eq(u.Date, { y: 1999, M: 2, d: 1 }))
                    .get();

                expect(result.value.length).toEqual(1);
            });

            it("Should work with different padding", async () => {

                const result = await oDataClient.OneOfEverythings
                    .withQuery((u, { $filter: { eq } }) => eq(u.Date, { y: 1, M: 12, d: 11 }))
                    .get();

                expect(result.value.length).toEqual(0);
            });
        });

        describe("As string", () => {
            it("Should work", async () => {

                const result = await oDataClient.OneOfEverythings
                    .withQuery((u, { $filter: { eq } }) => eq(u.Date, "1999-02-01"))
                    .get();

                expect(result.value.length).toEqual(1);
            });
        });
    });

    testCase("Edm.DateTimeOffset", function () {

        /* Server value:
                DateTimeOffset = new DateTimeOffset(
                    new DateTime(1999, 1, 1, 11, 30, 30, 123),
                    TimeSpan.FromHours(1)),
         */

        describe("As Date", () => {

            it("Should work (1)", async () => {

                const result = await oDataClient.OneOfEverythings
                    .withQuery((u, { $filter: { gt } }) => gt(u.DateTimeOffset, new Date(1998, 1, 1)))
                    .get();

                expect(result.value.length).toEqual(1);
            });

            it("Should work (2)", async () => {

                const result = await oDataClient.OneOfEverythings
                    .withQuery((u, { $filter: { lt } }) => lt(u.DateTimeOffset, new Date(2000, 1, 1)))
                    .get();

                expect(result.value.length).toEqual(1);
            });

            it("Should serialize correctly (1)", async () => {

                const result: string = await uriClient.OneOfEverythings
                    .withQuery((u, { $filter: { lt } }) => lt(u.DateTimeOffset, new Date(2000, 1, 1)))
                    .get() as any;

                const q = decodeURIComponent(/\$filter=(.+)/.exec(result)![1])

                // TODO: assumes user is running in GMT timezone
                expect(q).toEqual("DateTimeOffset lt 2000-02-01T00:00:00.000+00:00");
            });

            it("Should serialize correctly (2)", async () => {

                const result: string = await uriClient.OneOfEverythings
                    .withQuery((u, { $filter: { lt } }) => lt(u.DateTimeOffset, new Date(2000, 0, 2, 3, 4, 5, 6)))
                    .get() as any;

                const q = decodeURIComponent(/\$filter=(.+)/.exec(result)![1])

                // TODO: assumes user is running in GMT timezone
                expect(q).toEqual("DateTimeOffset lt 2000-01-02T03:04:05.006+00:00");
            });
        });

        describe("As struct", () => {

            it("Should work", async () => {

                const result = await oDataClient.OneOfEverythings
                    .withQuery((u, { $filter: { eq } }) => eq(u.DateTimeOffset, { y: 1999, M: 1, d: 1, h: 11, m: 30, s: 30, ms: 123, offsetH: 1, offsetM: 30 }))
                    .get();

                expect(result.value.length).toEqual(1);
            });

            it("Should serialize correctly (1)", async () => {

                const result: string = await uriClient.OneOfEverythings
                    .withQuery((u, { $filter: { lt } }) => lt(u.DateTimeOffset, { y: 2000, M: 1, d: 1 }))
                    .get() as any;

                const q = decodeURIComponent(/\$filter=(.+)/.exec(result)![1])

                expect(q).toEqual("DateTimeOffset lt 2000-01-01T00:00:00.000+00:00");
            });

            it("Should serialize correctly (2)", async () => {

                const result: string = await uriClient.OneOfEverythings//1999, 1, 1, 11, 30, 30, 123
                    .withQuery((u, { $filter: { lt } }) => lt(u.DateTimeOffset, { y: 1999, M: 1, d: 2, h: 3, m: 4, s: 5, ms: 666, offsetH: 7, offsetM: 8 }))
                    .get() as any;

                const q = decodeURIComponent(/\$filter=(.+)/.exec(result)![1])

                expect(q).toEqual("DateTimeOffset lt 1999-01-02T03:04:05.666+07:08");
            });
        });

        describe("As string", () => {

            it("Should work (1)", async () => {

                const result = await oDataClient.OneOfEverythings
                    .withQuery((u, { $filter: { gt } }) => gt(u.DateTimeOffset, "1998-01-01"))
                    .get();

                expect(result.value.length).toEqual(1);
            });

            it("Should work (2)", async () => {

                const result = await oDataClient.OneOfEverythings
                    .withQuery((u, { $filter: { lt } }) => lt(u.DateTimeOffset, "2000-01-01"))
                    .get();

                expect(result.value.length).toEqual(1);
            });

            it("Should serialize correctly", async () => {

                const result: string = await uriClient.OneOfEverythings
                    .withQuery((u, { $filter: { lt } }) => lt(u.DateTimeOffset, "XXX"))
                    .get() as any;

                const q = decodeURIComponent(/\$filter=(.+)/.exec(result)![1])

                // TODO: assumes user is running in GMT timezone
                expect(q).toEqual("DateTimeOffset lt XXX");
            });
        });
    });

    testCase("Edm.TimeOfDay", function () {

        describe("As Date", () => {

            it("Should work", async () => {

                const result = await oDataClient.OneOfEverythings
                    .withQuery((u, { $filter: { eq } }) => eq(u.TimeOfDay, new Date(2000, 1, 1, 12, 1, 1, 1)))
                    .get();

                expect(result.value.length).toEqual(1);
            });
        });


        describe("As Struct", () => {

            it("Should work", async () => {

                const result = await oDataClient.OneOfEverythings
                    .withQuery((u, { $filter: { eq } }) => eq(u.TimeOfDay, { h: 12, m: 1, s: 1, ms: 1 }))
                    .get();

                expect(result.value.length).toEqual(1);
            });
        });


        describe("As string", () => {

            it("Should work", async () => {

                const result = await oDataClient.OneOfEverythings
                    .withQuery((u, { $filter: { eq } }) => eq(u.TimeOfDay, "12:01:01.001"))
                    .get();

                expect(result.value.length).toEqual(1);
            });
        });
    });

    testCase("Edm.Duration", function () {

        it("Should work with struct", async () => {

            const result = await oDataClient.OneOfEverythings
                .withQuery((u, { $filter: { eq } }) => eq(u.Duration, { d: 2, h: 3, m: 4, s: 5, ms: 6 }))
                .get();

            expect(result.value.length).toEqual(1);
        });

        it("Should work with string", async () => {

            const result = await oDataClient.OneOfEverythings
                .withQuery((u, { $filter: { eq } }) => eq(u.Duration, "duration'P2DT3H4M5.006S'"))
                .get();

            expect(result.value.length).toEqual(1);
        });

        it("Should work with number", withNumber.bind(null, 1.728e+8 + 1.08e+7 + 240000 + 5000 + 6, true));
        it("Should work with number (1)", withNumber.bind(null, 1, false));
        it("Should work with number (2)", withNumber.bind(null, 1234, false));
        it("Should work with number (3)", withNumber.bind(null, 71234, false));
        it("Should work with number (4)", withNumber.bind(null, 7894561, false));
        it("Should work with number (5)", withNumber.bind(null, 234567890, false));
        it("Should work with number (-1)", withNumber.bind(null, -1, false));
        it("Should work with number (-2)", withNumber.bind(null, -1234, false));
        it("Should work with number (-3)", withNumber.bind(null, -71234, false));
        it("Should work with number (-4)", withNumber.bind(null, -7894561, false));
        it("Should work with number (-5)", withNumber.bind(null, -234567890, false));

        async function withNumber(number: number, ok: boolean) {

            const result = await oDataClient.OneOfEverythings
                .withQuery((u, { $filter: { eq, not } }) => ok ? eq(u.Duration, number) : not(eq(u.Duration, number)))
                .get();

            expect(result.value.length).toEqual(1);
        };
    });

    testCase("Edm.Guid", function () {
        it("Should escape characters in query", async () => {

            const result = await oDataClient.Users
                .withQuery((u, { $filter: { eq } }) => eq(u.Id, "hello ' ''"))
                .get();

            expect(result.value.length).toEqual(0);
        });
    });

    testCase("Edm.Binary", function () {
        it("Should work", async () => {

            const result = await oDataClient.OneOfEverythings
                .withQuery((u, { $filter: { eq } }) => eq(u.Binary, "Eg=="))
                .get();

            expect(result.value.length).toEqual(1);
        });
    });

    testCase("Edm.SByte", function () {
        it("Should work", async () => {

            const result = await oDataClient.OneOfEverythings
                .withQuery((u, { $filter: { eq } }) => eq(u.SByte, 0x10))
                .get();

            expect(result.value.length).toEqual(1);
        });
    });
});

