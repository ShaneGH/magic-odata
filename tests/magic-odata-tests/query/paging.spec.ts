
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

describe("Query.Paging", function () {

    afterAll(() => {
        // only 1 test
        // const operations = Object.keys(queryUtils().orderBy);
        // const missing = operations
        //     .filter(o => !testCases.filter(tc => tc === o).length);

        // expect(missing).toEqual([]);
    });

    const testCases: string[] = [];
    function testCase(name: string, test: () => void) {

        testCases.push(name)
        return describe(name, test)
    }

    testCase("paging", function () {
        it("Should work correctly", async function () {

            const ctxt = await addFullUserChain({ addFullChainToCommentUser: {} });
            const userIds = [
                ctxt.blogUser.Id,
                ctxt.commentUser.Id,
                ctxt.commentUserChain!.commentUser.Id
            ].sort()

            const result = await client.Users
                .withQuery((u, { paging, filter: { isIn }, orderBy: { orderBy } }) => [
                    isIn(u.Id, userIds),
                    orderBy(u.Id),
                    paging(1, 1, true)
                ])
                .get();

            expect(result.value.length).toBe(1);
            expect(result.value[0].Id).toBe(userIds[1]);
            expect((result as any)['@odata.count']).toBe(3)
        });
    });

    testCase("count", function () {
        it("Should work correctly", async function () {

            const ctxt = await addFullUserChain({ addFullChainToCommentUser: {} });
            const userIds = [
                ctxt.blogUser.Id,
                ctxt.commentUser.Id,
                ctxt.commentUserChain!.commentUser.Id
            ].sort()

            const result = await client.Users
                .withQuery((u, { count, filter: { isIn }, orderBy: { orderBy } }) => [
                    isIn(u.Id, userIds),
                    count()
                ])
                .get();

            expect((result as any)['@odata.count']).toBe(3)
        });
    });
});

