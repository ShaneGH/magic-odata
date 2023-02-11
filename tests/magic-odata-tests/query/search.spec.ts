
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
        return defaultParser(result, uri, reqValues)
            .catch(async _ => {

                const r = await result
                const err = {
                    uri,
                    code: r.status,
                    statusText: r.statusText,
                    headers: r.headers,
                    error: await r.text(),
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

describe("Query.Search", function () {

    afterAll(() => {
        const operations = Object.keys(queryUtils().$search);
        const missing = operations
            .filter(o => !testCases.filter(tc => tc === o).length);

        expect(missing).toEqual([]);
    });

    const testCases: string[] = [];
    function testCase(name: string, test: () => void) {

        testCases.push(name)
        return describe(name, test)
    }

    testCase("term", function () {
        testCase("searchNot", function () {
            it("Should work correctly (positive)", execute.bind(null, true));
            it("Should work correctly (negative)", execute.bind(null, false));

            async function execute(positive: boolean) {

                const ctxt = await addFullUserChain();

                const result = await client.BlogPosts
                    .withQuery((u, { $filter: { eq }, $search: { term, searchNot } }) => [
                        eq(u.Id, ctxt.blogPost.Id),
                        positive
                            ? term(ctxt.blogPost.Content.substring(2, 5))
                            : searchNot(term(ctxt.blogPost.Content.substring(2, 5)))
                    ])
                    .get();

                expect(result.value.length).toBe(positive ? 1 : 0);
            }
        });
    });

    testCase("searchRaw", function () {
        it("Should work correctly (positive)", execute.bind(null, true));
        it("Should work correctly (negative)", execute.bind(null, false));

        async function execute(positive: boolean) {

            const ctxt = await addFullUserChain();

            const result = await client.BlogPosts
                .withQuery((u, { $filter: { eq }, $search: { searchRaw, searchNot } }) => [
                    eq(u.Id, ctxt.blogPost.Id),
                    positive
                        ? searchRaw('"' + ctxt.blogPost.Content.substring(2, 5) + '"')
                        : searchNot(searchRaw('"' + ctxt.blogPost.Content.substring(2, 5) + '"'))
                ])
                .get();

            expect(result.value.length).toBe(positive ? 1 : 0);
        }
    });

    testCase("searchAnd", function () {
        it("Should work correctly (positive)", execute.bind(null, true));
        it("Should work correctly (negative)", execute.bind(null, false));

        async function execute(positive: boolean) {

            const ctxt = await addFullUserChain();

            const result = await client.BlogPosts
                .withQuery((u, { $filter: { eq }, $search: { term, searchAnd, searchNot } }) => [
                    eq(u.Id, ctxt.blogPost.Id),
                    positive
                        ? searchAnd(term(ctxt.blogPost.Content.substring(2, 5)), term(ctxt.blogPost.Content.substring(2, 5)))
                        : searchNot(searchAnd(term(ctxt.blogPost.Content.substring(2, 5)), term(ctxt.blogPost.Content.substring(2, 5))))
                ])
                .get();

            expect(result.value.length).toBe(positive ? 1 : 0);
        }
    });

    testCase("searchOr", function () {
        it("Should work correctly (positive)", execute.bind(null, true));
        it("Should work correctly (negative)", execute.bind(null, false));

        async function execute(positive: boolean) {

            const ctxt = await addFullUserChain();

            const result = await client.BlogPosts
                .withQuery((u, { $filter: { eq }, $search: { term, searchOr, searchNot } }) => [
                    eq(u.Id, ctxt.blogPost.Id),
                    positive
                        ? searchOr(term(ctxt.blogPost.Content.substring(2, 5)), term(ctxt.blogPost.Content.substring(2, 5)))
                        : searchNot(searchOr(term(ctxt.blogPost.Content.substring(2, 5)), term(ctxt.blogPost.Content.substring(2, 5))))
                ])
                .get();

            expect(result.value.length).toBe(positive ? 1 : 0);
        }
    });
});