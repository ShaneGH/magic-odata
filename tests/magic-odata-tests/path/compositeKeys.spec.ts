
import { ODataClient } from "../generatedCode.js";
import { addCompositeKeyItem } from "../utils/client.js";

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

describe("Composite Keys", function () {

    it("Should retrieve items by key", async () => {
        const item = await addCompositeKeyItem();
        const result = await client.CompositeKeyItems
            .withKey(x => x.key({ Id1: item.Id1!, Id2: item.Id2! }))
            .get();

        expect(result.Data).toBe(item.Data);
    });

    it("Should not retrieve items by invalid key", async () => {
        const item = await addCompositeKeyItem();
        const result = await client.CompositeKeyItems
            .withKey(x => x.key({ Id1: item.Id1! + "a", Id2: item.Id2! }))
            .get<Promise<number>>({ responseInterceptor: async x => (await x).status });

        expect(result).toBe(404);
    });

    it("Should not retrieve items by swapped key", async () => {
        const item = await addCompositeKeyItem();
        const result = await client.CompositeKeyItems
            .withKey(x => x.key({ Id1: item.Id2!, Id2: item.Id1! }))
            .get<Promise<number>>({ responseInterceptor: async x => (await x).status });

        expect(result).toBe(404);
    });

    it("Should thow error on missing key segment", async () => {
        const item = await addCompositeKeyItem();

        try {
            client.CompositeKeyItems
                .withKey(k => k.key({ Id1: item.Id1! } as any));

            expect(true).toBe(false);
        } catch (e: any) {
            expect(e.toString()).toContain("Id2");
        }
    });
});