
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

describe("Query.OrderBy", function () {

    afterAll(() => {
        const operations = Object.keys(queryUtils().$orderby);
        const missing = operations
            .filter(o => !testCases.filter(tc => tc === o).length);

        expect(missing).toEqual([]);
    });

    const testCases: string[] = [];
    function testCase(name: string, test: () => void) {

        testCases.push(name)
        return describe(name, test)
    }

    testCase("orderByRaw", function () {
        it("Should work correctly", async function () {

            const ctxt = await addFullUserChain({ addFullChainToCommentUser: {} });
            const userIds = [
                ctxt.blogUser.Id,
                ctxt.commentUser.Id,
                ctxt.commentUserChain!.commentUser.Id
            ]

            const result = await client.Users
                .withQuery((u, { $filter: { isIn }, $orderby: { orderByRaw } }) => [
                    isIn(u.Id, userIds),
                    orderByRaw("Name")
                ])
                .get();

            expect(result.value.length).toBeGreaterThan(1);
            for (var i = 1; i < result.value.length; i++) {
                expect(result.value[i - 1].Name.localeCompare(result.value[i].Name)).toBe(-1);
            }
        });
    });

    testCase("orderBy", function () {
        describe("$it", () => {
            it("Should work correctly asc", execute.bind(null, true));
            it("Should work correctly desc", execute.bind(null, true));

            async function execute(asc: boolean) {

                const ctxt = await addFullUserChain();
                const result = await client.BlogPosts
                    .withKey(x => x.key(ctxt.blogPost.Id!))
                    .subPath(x => x.Words)
                    .withQuery((w, { $orderby: { orderBy } }) => orderBy(w))
                    .get();

                expect(result.value.length).toBeGreaterThan(1);
                for (var i = 1; i < result.value.length; i++) {
                    expect(result.value[i - 1].localeCompare(result.value[i])).toBe(asc ? -1 : 1);
                }
            }
        });

        describe("asc/desc", () => {
            it("Should work correctly asc", execute.bind(null, true));
            it("Should work correctly desc", execute.bind(null, true));

            async function execute(asc: boolean) {

                const ctxt = await addFullUserChain({ addFullChainToCommentUser: {} });
                const userIds = [
                    ctxt.blogUser.Id,
                    ctxt.commentUser.Id,
                    ctxt.commentUserChain!.commentUser.Id
                ]

                const result = await client.Users
                    .withQuery((u, { $filter: { isIn }, $orderby: { orderBy } }) => [
                        isIn(u.Id, userIds),
                        orderBy(asc ? u.Name : [u.Name, "desc"])
                    ])
                    .get();

                expect(result.value.length).toBeGreaterThan(1);
                for (var i = 1; i < result.value.length; i++) {
                    expect(result.value[i - 1].Name.localeCompare(result.value[i].Name)).toBe(asc ? -1 : 1);
                }
            }
        });

        describe("multiple", () => {
            it("Should work correctly", async function () {

                const ctxt = await addFullUserChain({ addFullChainToCommentUser: {} });
                const userIds = [
                    ctxt.blogUser.Id,
                    ctxt.commentUser.Id,
                    ctxt.commentUserChain!.commentUser.Id
                ]

                const result = await client.Users
                    .withQuery((u, { $filter: { isIn }, $orderby: { orderBy } }) => [
                        isIn(u.Id, userIds),
                        orderBy(u.Name, u.UserType)
                    ])
                    .get();

                expect(result.value.length).toBeGreaterThan(1);
                for (var i = 1; i < result.value.length; i++) {
                    expect(result.value[i - 1].Name.localeCompare(result.value[i].Name)).toBe(-1);
                }
            });
        });

        describe("$count", () => {
            it("Should work correctly", async function () {

                const ctxt = await addFullUserChain();
                const userIds = [
                    ctxt.blogUser.Id,
                    ctxt.commentUser.Id
                ]

                const result = await client.Users
                    .withQuery((u, { $filter: { isIn }, $orderby: { orderBy } }) => [
                        isIn(u.Id, userIds),
                        orderBy([u.Blogs.$count, "desc"], u.Name)
                    ])
                    .get();

                expect(result.value.length).toBe(2);
                expect(result.value[0].Id).toBe(ctxt.blogUser.Id);
                expect(result.value[1].Id).toBe(ctxt.commentUser.Id)
            });
        });
    });
});

