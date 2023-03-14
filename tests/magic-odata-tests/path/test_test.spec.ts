
import { NonNumericTypes, ODataDate } from "magic-odata-client/dist/index.js";
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

describe("SmokeTests", function () {

    //current failure is that the wrong overload of filterRaw is being used

    it("Should have basic functionality", async () => {
        // throw new Error("Make sure to test all possible configurations of arguments in functions with overrides")

        const ctxt = await addFullUserChain()
        const items = await client.HasIds
            .cast(x => x.Blog())
            .withQuery((b, { $filter: { eq, and, filterRaw, isIn }, $top }) => {
                return [
                    //isIn(b.Id, [ctxt.blogUser.Id, ctxt.blog.Id])
                    and(
                        // filterRaw(`Id eq '${ctxt.blog.Id}'`, NonNumericTypes.Boolean),
                        // filterRaw({ x: b.Id }, x => `${x.x} eq '${ctxt.blog.Id}'`, NonNumericTypes.Boolean),
                        filterRaw({ x: b.Id }, x => `${x.x} eq '${ctxt.blog.Id}'`),
                        // eq(b.Name, ctxt.blog.Name, x => `'${x}'`),
                        // eq(b.Name, ctxt.blog.Name),
                        // eq("a" as any, "2", x => `'${x}'`),
                        //eq("a" as any, "2")
                    ),
                    $top(1)
                ]
            })
            .get();

        // $count, $value
        expect(items.value.length).toBe(1);
        expect(items.value[0].Name).toBe(ctxt.blog.Name);
    });

    describe("any", function () {

        it("Should work", async () => {

            const user = await addFullUserChain();
            const result = await client.Users
                .withQuery((u, { $filter: { eq, and, any } }) =>
                    and(
                        eq(u.Id, user.blogUser.Id),
                        any(u.Blogs, b1 => true as any)))
                .get();

            expect(result.value.length).toBe(1);
            expect(result.value[0].Name).toBe(user.blogUser.Name);
        });
    });

    describe("Edm numbers", function () {

        describe("As Date", () => {
            it("Should work", async () => {

                const result = await client.OneOfEverythings
                    .withQuery((u, { $filter: { eq, add } }) => eq(u.Int16, add(u.Int32, -1)))
                    .get();

                expect(result.value.length).toEqual(1);
            });
        });
    });

    describe("Edm.Date", function () {

        describe("As Date", () => {
            it("Should work", async () => {

                const result = await client.OneOfEverythings
                    .withQuery((u, { $filter: { eq } }) => eq(u.Date, new Date(1999, 1, 1)))
                    .get();

                expect(result.value.length).toEqual(1);
            });
        });

        describe("As struct", () => {
            it("Should work", async () => {

                const result = await client.OneOfEverythings
                    .withQuery((u, { $filter: { eq } }) => eq(u.Date, new ODataDate({ y: 1999, M: 2, d: 1 })))
                    .get();

                expect(result.value.length).toEqual(1);
            });
        });

        describe("As string", () => {
            it("Should work", async () => {

                const result = await client.OneOfEverythings
                    .withQuery((u, { $filter: { eq } }) => eq(u.Date, "1999-02-01"))
                    .get();

                expect(result.value.length).toEqual(1);
            });
        });
    });

    describe("Edge cases", () => {
        describe("test_overloads", () => {
            it("Should single generic case", () => {
                const uri = client.Blogs
                    .withQuery((b, { $filter: { __testOverloads } }: any) =>
                        __testOverloads(b.Id))
                    .uri();

                expect(uri.query.$filter).toBe("Id");
            });

            // it("cpy", () => {
            //     const uri = client.HasIds
            //         .cast(x => x.Blog())
            //         .withQuery((b, { $filter: { and, test_overloads } }: any) => {
            //             return [
            //                 //and(
            //                 // filterRaw(`Id eq '${ctxt.blog.Id}'`, NonNumericTypes.Boolean),
            //                 // filterRaw({ x: b.Id }, x => `${x.x} eq '${ctxt.blog.Id}'`, NonNumericTypes.Boolean),
            //                 test_overloads(b.Id),
            //                 // eq(b.Name, ctxt.blog.Name, x => `'${x}'`),
            //                 // eq(b.Name, ctxt.blog.Name)
            //                 //eq("a" as any, "2", x => `'${x}'`)
            //                 //),
            //                 // $top(1)
            //             ]
            //         })
            //         .uri();

            //     expect(uri.query.$filter).toBe("sadasd");
            // });
        });

    })
});