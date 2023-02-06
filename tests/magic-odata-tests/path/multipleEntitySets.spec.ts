
import { ODataClient } from "../generatedCode.js";
import { addCompositeKeyItem, addFullUserChain } from "../utils/client.js";

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

function loggingFetcher(input: RequestInfo | URL, init?: RequestInit) {
    console.log(input, init)
    return fetch(input, init)
}

type Recorder = { input: RequestInfo | URL, init?: RequestInit }
function recordingFetcher(recorder: Recorder[]) {
    return (input: RequestInfo | URL, init?: RequestInit) => {
        recorder.push({ input, init })
        return fetch(input, init)
    }
}

describe("Multiple entity sets", function () {

    it("Should retrieve items from entity set 1", async () => {
        const item = await addFullUserChain();
        const result = await client.BlogPosts
            .withKey(x => x.key(item.blogPost.Id!))
            .get();

        expect(result.Name).toBe(item.blogPost.Name);
    });

    it("Should retrieve items from entity set 2", async () => {
        const item = await addFullUserChain();
        const result = await client.BlogPosts2
            .withKey(x => x.key(item.blogPost.Id!))
            .get();

        expect(result.Name).toBe(item.blogPost.Name);
    });
});