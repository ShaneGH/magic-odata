
import { ODataClient } from "../generatedCode.js";
import { addFullUserChain, addUser } from "../utils/client.js";

const client = new ODataClient({
    request: fetch,
    uriRoot: "something invalid",
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

function loggingFetcher(input: RequestInfo | URL, init?: RequestInit) {
    console.log(input, init)
    return fetch(input, init)
}

describe("uriInterceptor", function () {

    it("Should fire up uriInterceptor", async () => {
        const items = await client.Users
            .get({
                uriInterceptor: _ => {
                    return "http://localhost:5432/odata/test-entities/Users?$filter=Id%20eq%20'invalidId'"
                }
            });

        expect(items.value.length).toBe(0);
    });
});