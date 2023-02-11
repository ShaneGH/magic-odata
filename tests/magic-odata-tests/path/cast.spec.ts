
import { ODataClient } from "../generatedCode.js";
import { addFullUserChain, addUser } from "../utils/client.js";

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

describe("Cast", function () {

    it("Should retrieve items of the correct type", async () => {
        const user = await addUser();
        const items = await client.HasIds
            .cast(x => x.User())
            .withQuery((u, { $filter: { eq } }) => eq(u.Id, user.Id!))
            .get();

        expect(items.value.length).toBe(1);
    });

    it("Should retrieve items of the correct type (with key)", async () => {

        const user = await addUser();
        const items = await client.HasIds
            .withKey(x => x.key(user.Id!))
            .cast(i => i.User())
            .get();

        expect(items.Name).toBe(user.Name);
    });

    it("Should not retrieve items of the incorrect type", async () => {
        const user = await addUser();
        const items = await client.HasIds
            .cast(x => x.Blog())
            .withQuery((u, { $filter: { eq } }) => eq(u.Id, user.Id!))
            .get();

        expect(items.value.length).toBe(0);
    });

    it("Should not retrieve items of the incorrect type (with key)", async () => {

        const user = await addUser();

        let err: Error | null = null;
        try {
            await client.HasIds
                .withKey(x => x.key(user.Id!))
                .cast(i => i.Blog())
                .get()
        } catch (e: any) {
            err = e;
        }

        expect(err).toBeTruthy()
        expect(JSON.parse(err?.message || "{}").code).toBe(404)
    });

    it("Should retrieve correct values after cast", async () => {
        const user = await addUser();
        const items = await client.HasIds
            .withKey(x => x.key(user.Id!))
            .cast(c => c.User())
            .get();

        expect(items.Name).toBe(user.Name);
    });

    describe("Path Cast Combos", () => {

        it("Should retrieve correct values after cast => path => cast (multi)", async () => {
            const ctxt = await addFullUserChain();
            const comments = await client.HasIds
                .withKey(x => x.key(ctxt.commentUser.Id!))
                .cast(c => c.User())
                .subPath(u => u.BlogPostComments)
                .cast(x => x.Comment())
                .get();

            expect(comments.value.length).toBe(1);
            expect(comments.value[0].Text).toBe(ctxt.comment.Text);
        });

        it("Should retrieve correct values after cast and path (multi)", async () => {
            const ctxt = await addFullUserChain();
            const comments = await client.HasIds
                .withKey(x => x.key(ctxt.commentUser.Id!))
                .cast(c => c.User())
                .subPath(u => u.BlogPostComments)
                .get();

            expect(comments.value.length).toBe(1);
            expect(comments.value[0].Text).toBe(ctxt.comment.Text);
        });

        it("Should retrieve correct values after cast and path (single)", async () => {
            const ctxt = await addFullUserChain();
            const user = await client.HasIds
                .withKey(x => x.key(ctxt.blog.Id!))
                .cast(c => c.Blog())
                .subPath(u => u.User)
                .get();

            expect(user.Name).toBe(ctxt.blogUser.Name);
        });
    });
});

describe("Cast (singleton)", function () {

    it("Should retrieve items of the correct type", async () => {
        const items = await client.AppDetailsBase
            .cast(x => x.AppDetails())
            .get();

        expect(items.AppName).toBe("Blog app");
    });

    describe("Path Cast Combos", () => {

        it("Should retrieve correct values after cast and path", async () => {
            const ctxt = await addFullUserChain();
            const comments = await client.AppDetailsBase
                .cast(c => c.AppDetails())
                .subPath(u => u.AppName)
                .get();

            expect(comments.value).toBe("Blog app");
        });
    });
});