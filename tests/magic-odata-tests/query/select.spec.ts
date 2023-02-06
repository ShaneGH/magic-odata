
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
            .catch(async _ => {

                const r = await result
                const err = {
                    uri,
                    code: r?.status,
                    statusText: r?.statusText,
                    headers: r?.headers,
                    error: await r?.text(),
                    reqValues
                }

                throw new Error(JSON.stringify(err, null, 2));
            })
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
        const operations = Object.keys(queryUtils().select);
        const missing = operations
            .filter(o => !testCases.filter(tc => tc === o).length);

        expect(missing).toEqual([]);
    });

    const testCases: string[] = [];
    function testCase(name: string, test: () => void) {

        testCases.push(name)
        return describe(name, test)
    }

    testCase("selectRaw", function () {
        it("Should work correctly", async () => {

            const ctxt = await addFullUserChain();
            const result = await client.Users
                .withKey(x => x.key(ctxt.blogUser.Id))
                .withQuery((_, { select: { selectRaw } }) =>
                    selectRaw("Name,Score"))
                .get();

            expect(result.Name).toBe(ctxt.blogUser.Name);
            expect(result.Score).toBe(ctxt.blogUser.Score);
            expect(result.UserType).toBeUndefined();
        });
    });

    testCase("select", function () {
        describe("primitives", function () {
            it("Should work correctly", async () => {

                const ctxt = await addFullUserChain();
                const result = await client.Users
                    .withKey(x => x.key(ctxt.blogUser.Id))
                    .withQuery((x, { select: { select } }) =>
                        select(x.Name, x.Score))
                    .get();

                expect(result.Name).toBe(ctxt.blogUser.Name);
                expect(result.Score).toBe(ctxt.blogUser.Score);
                expect(result.UserType).toBeUndefined();
            });
        });

        describe("complex types", function () {

            it("Should work correctly", async () => {

                const ctxt = await addFullUserChain({ commentMood: My.Odata.Entities.Mood.Happy });
                const result = await client.Comments
                    .withKey(x => x.key(ctxt.comment.Id))
                    .withQuery((x, { select: { select } }) => select(x.Mood))
                    .get();

                expect(result.Mood!.Key).toBe(ctxt.comment.Mood!.Key);
                expect(result.Mood?.Mood).toBe(My.Odata.Entities.Mood.Happy);
            });
        });

        describe("prop of complex types", function () {

            it("Should work correctly", async () => {

                const ctxt = await addFullUserChain({ commentMood: My.Odata.Entities.Mood.Happy });
                const result = await client.Comments
                    .withKey(x => x.key(ctxt.comment.Id))
                    .withQuery((x, { select: { select } }) => select(x.Mood.Mood))
                    .get();

                expect(result.Mood!.Key).toBeUndefined();
                expect(result.Mood?.Mood).toBe(My.Odata.Entities.Mood.Happy);
            });
        });
    });
});

