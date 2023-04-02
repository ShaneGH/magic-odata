
import { My, ODataClient } from "../generatedCode.js";
import { addBlog, addBlogPost, addComment, addFullUserChain, addUser } from "../utils/client.js";
import { uniqueString } from "../utils/utils.js";
import { ODataCollectionResult, WithKeyType } from "magic-odata-client";
import { RequestOptions, ResponseInterceptor } from "magic-odata-client";
import { oDataClient, uriClient } from "../utils/odataClient.js";
import { RootResponseInterceptor } from "magic-odata-client";

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

function recordingFetcher(recorder: string[]) {
    return (input: any, uri: string, init: RequestOptions, defaultInterceptor: RootResponseInterceptor<Promise<Response>, any>) => {
        recorder.push(uri)
        return defaultInterceptor(input, uri, init)
    }
}

describe("function calls", () => {

    describe("Singleton", () => {
        const user = addFullUserChain();
        it("Should call a function with no inputs", async () => {
            await user
            const userCount = await oDataClient.AppDetails
                .subPath(x => x.CountUsers())
                .get();

            expect(userCount.value).toBeGreaterThan(0);
        });

        it("Should call a function after casting", async () => {
            await user
            const userCount = await oDataClient.AppDetailsBase
                .cast(x => x.AppDetails())
                .subPath(x => x.CountUsers())
                .get();

            expect(userCount.value).toBeGreaterThan(0);
        });
    });

    describe("Entity set", () => {
        it("Should call a function with no inputs", async () => {

            const user = await addUser();
            await Promise.all(
                [...Array(10).keys()].map(() => addBlog(user.Id!)))

            const top10 = await oDataClient.Blogs
                .subPath(x => x.Top10BlogsByName())
                .get();

            expect(top10.value!.length).toBe(10);
            for (let i = 1; i < top10.value!.length; i++) {
                expect(
                    top10.value![i].Name
                        .toLocaleLowerCase()
                        .localeCompare(top10.value![i - 1].Name
                            .toLocaleLowerCase()))
                    .toBeGreaterThanOrEqual(0)
            }
        });
    });

    describe("Entity", () => {
        it("Should call a function with no inputs", async () => {
            const user = await addFullUserChain();
            const wordCount = await oDataClient.Blogs
                .withKey(k => k.key(user.blog.Id))
                .subPath(x => x.WordCount())
                .get();

            expect(wordCount.value).toBeGreaterThan(0);
            expect(wordCount.value).toBe(user.blogPost.Content.split(/\s/).length);
        });

        it("Should call a function deep in the path", async () => {
            const user = await addFullUserChain();
            const wordCount = await oDataClient.Users
                .withKey(k => k.key(user.blogUser.Id))
                .subPath(u => u.Blogs)
                .withKey(k => k.key(user.blog.Id))
                .subPath(x => x.WordCount())
                .get();

            expect(wordCount.value).toBeGreaterThan(0);
            expect(wordCount.value).toBe(user.blogPost.Content.split(/\s/).length);
        });

        it("Should call a function with inputs (test 1)", functionWithInputs.bind(null, true));
        it("Should call a function with inputs (test 2)", functionWithInputs.bind(null, false));

        async function functionWithInputs(filter: boolean) {
            const user = await addFullUserChain({ blogPostContent: "word1 word2" });
            await addBlogPost(user.blog.Id, "word3")

            const wordCount = await oDataClient.Blogs
                .withKey(k => k.key(user.blog.Id))
                .subPath(x => x.WordCount({ filterCommentsOnly: filter }))
                .get();

            expect(wordCount.value).toBe(filter ? 2 : 3);
        }

        it("Should call a function after casting 1", async () => {
            const user = await addFullUserChain();
            const wordCount = await oDataClient.HasIds
                .cast(i => i.Blog())
                .withKey(k => k.key(user.blog.Id))
                .subPath(x => x.WordCount())
                .get();

            expect(wordCount.value).toBeGreaterThan(0);
            expect(wordCount.value).toBe(user.blogPost.Content.split(/\s/).length);
        });

        it("Should call a function after casting 2 (key before cast)", async () => {
            const user = await addFullUserChain();
            const wordCount = await oDataClient.HasIds
                .withKey(k => k.key(user.blog.Id))
                .cast(i => i.Blog())
                .subPath(x => x.WordCount())
                .get();

            expect(wordCount.value).toBeGreaterThan(0);
            expect(wordCount.value).toBe(user.blogPost.Content.split(/\s/).length);
        });

        it("Should call a composed functions", async () => {
            const user = await addFullUserChain();
            const result = await oDataClient.Users
                .withKey(k => k.key(user.blogUser.Id))
                .subPath(x => x.FavouriteBlog())
                .subPath(x => x.WordCount())
                .get();

            expect(result.value).toBe(2);
        });

        it("Should handle a path segments after functions", async () => {
            const user = await addFullUserChain();
            const result = await oDataClient.Users
                .withKey(k => k.key(user.blogUser.Id))
                .subPath(x => x.FavouriteBlog())
                .subPath(x => x.Name)
                .get();

            expect(result.value).toBe(user.blog.Name);
        });
    });

    describe("Unbound", () => {
        it("Should call a function with no inputs", async () => {
            const blogs = await oDataClient
                .unboundFunctions(f => f.MyBlogs())
                .get();

            expect(blogs.value.length).toBe(1);
            expect(blogs.value[0].Name).toBe("Owners Blog");
        });

        it("Should call a function with inputs", async () => {
            const calculation = await oDataClient
                .unboundFunctions(f => f.Calculator({ lhs: 1, rhs: 2 }))
                .get();

            expect(calculation.value).toBe(3);
        });
    });

    describe("Nullable args", () => {
        it("Should work with primitive collection", () => {
            // asp doesn't like this one
            const result = oDataClient
                .unboundFunctions(f => f.Calculator3({ vals: null }))
                .uri(false);

            expect(result.relativePath).toBe("Calculator3(vals=null)");
        });

        it("Should work with complex collection", async () => {
            const calculation = await oDataClient
                .unboundFunctions(f => f.Calculator4({ lhs: { Val: 1 }, rhs: null }))
                .get();

            expect(calculation.value).toBe(1);
        });
    });

    describe("Collection args", () => {
        it("Should work with primitive collection", async () => {
            const blogs = await oDataClient
                .unboundFunctions(f => f.Calculator2({ vals: [1, 2] }))
                .get();

            expect(blogs.value).toBe(3);
        });

        it("Should work with complex collection", async () => {
            const calculation = await oDataClient
                .unboundFunctions(f => f.Calculator3({ vals: [{ Val: 1 }, { Val: 2 }] }))
                .get();

            expect(calculation.value).toBe(3);
        });
    });

    describe("Function overrides", () => {
        const ctxtP = addFullUserChain();
        it("Should return value on parent class", async () => {
            const ctxt = await ctxtP
            const six = await oDataClient.HasIds
                .withKey(k => k.key(ctxt.blogUser.Id))
                .subPath(x => x.JustReturn6())
                .get();

            expect(six.value).toBe(6);
        });

        it("Should return value on child class", async () => {
            const ctxt = await ctxtP
            const six = await oDataClient.Blogs
                .withKey(k => k.key(ctxt.blog.Id))
                .subPath(x => x.JustReturn6())
                .get();

            expect(six.value).toBe(6);
        });

        it("Should return override value on child class", async () => {
            const ctxt = await ctxtP
            const six: ODataCollectionResult<string | null> = await oDataClient.Users
                .withKey(k => k.key(ctxt.blogUser.Id))
                .subPath(x => x.JustReturn6())
                .get();

            expect(six.value).toBe("6");
        });
    });

    describe("Query", () => {
        it("Should call entity function", () => {

            const uri = oDataClient.Blogs
                .withQuery((x, { $filter: { and, eq } }) =>
                    and(
                        eq(x.Id, "123"),
                        eq(x.WordCount({ filterCommentsOnly: true }), 77)))
                .uri(false);

            expect(uri.query["$filter"]).toBe("Id eq '123' and WordCount(filterCommentsOnly=true) eq 77")
        });

        it("Should call serialize arg from entity", () => {

            // this is not a valid OData query. Just testing the serializer
            const uri = oDataClient.Blogs
                .withQuery((x, { $filter: { and, eq } }) =>
                    and(
                        eq(x.Id, "123"),
                        eq(x.WordCount({ countThisWord: x.Name }), 77)))
                .uri(false);

            expect(uri.query["$filter"]).toBe("Id eq '123' and WordCount(countThisWord=Name) eq 77")
        });

        it("Should call entity function with params", () => {

            const uri = oDataClient.Blogs
                .withQuery((x, { $filter: { and, eq } }, params) =>
                    and(
                        eq(x.Id, "123"),
                        eq(x.WordCount({ filterCommentsOnly: params.createConst("x", true) }), 77)))
                .uri(false);

            expect(uri.query["$filter"]).toBe("Id eq '123' and WordCount(filterCommentsOnly=@x) eq 77")
            expect(uri.query["@x"]).toBe("true")
        });

        it("Serializes param values correctly when resolved from function input", () => {

            const uri = oDataClient.Blogs
                .withQuery((x, { $filter: { and, eq } }, params) =>
                    and(
                        eq(x.Id, "123"),
                        eq(x.AcceptsGuid({ theGuid: params.createConst("x", "guid value 1") }), "guid value 2")))
                .uri(false);

            expect(uri.query["$filter"]).toBe("Id eq '123' and AcceptsGuid(theGuid=@x) eq guid value 2")
            expect(uri.query["@x"]).toBe("guid value 1")
        });

        it("Serializes param values correctly when resolved from function input within a collection", () => {

            let xxx = false
            const uri = oDataClient.Users
                .withQuery((x, { $filter: { and, eq, $filter, count } }, params) =>
                    and(
                        eq(x.Id, "123"),
                        eq(
                            count(
                                $filter(x.Blogs, b => {
                                    if (xxx) throw new Error("####")
                                    xxx = true
                                    return eq(b.AcceptsGuid({ theGuid: params.createConst("x", "guid value 1") }), "guid value 2");
                                })),
                            4)))
                .uri(false);

            expect(uri.query["$filter"]).toBe("Id eq '123' and Blogs/$filter(AcceptsGuid(theGuid=@x) eq guid value 2)/$count eq 4")
            expect(uri.query["@x"]).toBe("guid value 1")
        });

        it("Serializes param values correctly when resolved from function input within a collection (2)", () => {

            const uri = oDataClient.Users
                .withQuery((x, { $filter: { and, eq, any } }, params) =>
                    and(
                        eq(x.Id, "123"),
                        any(x.Blogs, b => eq(
                            b.AcceptsGuid({ theGuid: params.createConst("x", "guid value 1") }),
                            "guid value 2"))))
                .uri(false);

            expect(uri.query["$filter"]).toBe("Id eq '123' and Blogs/any(b:b/AcceptsGuid(theGuid=@x) eq guid value 2)")
            expect(uri.query["@x"]).toBe("guid value 1")
        });

        it("Serializes param values correctly when resolved from function input within an expand and filter", () => {

            const uri = oDataClient.Users
                .withQuery((x, { $expand: { expand }, $filter: { and, eq } }, params) => [
                    expand(x.Blogs, blog => and(
                        eq(blog.Id, "123"),
                        eq(blog.AcceptsGuid({ theGuid: params.createConst("x", "guid value 1") }), "guid value 2"))),
                ])
                .uri(false);

            expect(uri.query["$expand"]).toBe("Blogs($filter=Id eq '123' and AcceptsGuid(theGuid=@x) eq guid value 2)")
            expect(uri.query["@x"]).toBe("guid value 1")
        });

        // https://github.com/ShaneGH/magic-odata/issues/72
        // it("Should call unbound function", () => {

        //     const uri = oDataClient.Users
        //         .withQuery((x, { $filter: { eq, $root } }, params1) => eq(
        //             $root(r => r.My.Odata.Container.unboundFunctions((f, params2) => {
        //                 return f
        //                     .Calculator2({ vals: [1, x.Score, params1.createConst("x", 2), params2.createConst("y", 3)] })
        //             })),
        //             2))
        //         .uri(false);

        //     expect(uri.query["$filter"]).toBe("Calculator2(vals=[1,Score,@x,@y]) eq 2")
        //     expect(uri.query["@x"]).toBe("2")
        //     expect(uri.query["@y"]).toBe("3")
        // });
    });
})