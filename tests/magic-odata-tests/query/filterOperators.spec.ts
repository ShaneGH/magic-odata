
import { addFullUserChain } from "../utils/client.js";
import { My, ODataClient, rootConfigExporter } from "../generatedCode.js";
import { buildQuery, NonNumericTypes, Query, QueryComplexObject, queryUtils } from "magic-odata-client";
import { uniqueString } from "../utils/utils.js";
import { buildComplexTypeRef } from "magic-odata-client";
import { queryBuilder } from "../utils/odataClient.js";

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

describe("Query.Filter Operators", function () {

    afterAll(() => {
        const operations = Object.keys(queryUtils().$filter);
        const missing = operations
            .filter(o => !testCases.filter(tc => tc === o).length);

        expect(missing).toEqual([]);
    });

    const testCases: string[] = [];
    function testCase(name: string, test: () => void) {

        testCases.push(name)
        return describe(name, test)
    }

    testCase("null", function () {

        it("Should work correctly", async () => {

            const ctxt = await addFullUserChain();

            const result = await client.Users
                .withQuery((u, { $filter: { eq, and } }) =>
                    and(eq(u.Id, ctxt.blogUser.Id), eq(u.Name, null)))
                .get();

            // just a non failure is fine
            expect(result.value.length).toBe(0);
        });
    });

    testCase("filterRaw", function () {

        describe("overload1", () => {

            it("Should work correctly (success)", execute.bind(null, true));
            it("Should work correctly (failure)", execute.bind(null, false))

            async function execute(success: boolean) {

                const ctxt = await addFullUserChain();
                const name = success
                    ? ctxt.blogUser.Name
                    : uniqueString("FilterByWord");

                const result = await client.Users
                    .withQuery((u, { $filter: { eq, and, filterRaw } }) =>
                        and(eq(u.Id, ctxt.blogUser.Id), filterRaw({ n: u.Name }, x => `${x.n} eq '${name}'`)))
                    .get();

                if (success) {
                    expect(result.value.length).toBe(1);
                    expect(result.value[0].UserProfileType).toBe(ctxt.blogUser.UserProfileType);
                } else {
                    expect(result.value.length).toBe(0);
                }
            }
        });

        describe("overload2", () => {

            it("Should work correctly (success) (addTypeInfo)", execute.bind(null, true, true));
            it("Should work correctly (failure) (addTypeInfo)", execute.bind(null, false, true));
            it("Should work correctly (success)", execute.bind(null, true, false));
            it("Should work correctly (failure)", execute.bind(null, false, false));

            async function execute(success: boolean, addTypeInfo: boolean) {

                const ctxt = await addFullUserChain();
                const name = success
                    ? ctxt.blogUser.Name
                    : uniqueString("FilterByWord");

                const result = await client.Users
                    .withQuery((u, { $filter: { eq, and, filterRaw } }) =>
                        and(eq(u.Id, ctxt.blogUser.Id), filterRaw(`Name eq '${name}'`, addTypeInfo ? NonNumericTypes.Boolean : undefined)))
                    .get();

                if (success) {
                    expect(result.value.length).toBe(1);
                    expect(result.value[0].UserProfileType).toBe(ctxt.blogUser.UserProfileType);
                } else {
                    expect(result.value.length).toBe(0);
                }
            }
        });
    });

    testCase("logicalOp", function () {

        it("Should work correctly (success)", execute.bind(null, true));
        it("Should work correctly (failure)", execute.bind(null, false))

        async function execute(success: boolean) {

            const ctxt = await addFullUserChain();
            const name = success
                ? ctxt.blogUser.Name
                : uniqueString("FilterByWord");

            const result = await client.Users
                .withQuery((u, { $filter: { eq, and, logicalOp } }) =>
                    and(eq(u.Id, ctxt.blogUser.Id), logicalOp(u.Name, "eq", name)))
                .get();

            if (success) {
                expect(result.value.length).toBe(1);
                expect(result.value[0].UserProfileType).toBe(ctxt.blogUser.UserProfileType);
            } else {
                expect(result.value.length).toBe(0);
            }
        }
    });

    testCase("eq", function () {

        it("Should work correctly (success)", execute.bind(null, true));
        it("Should work correctly (failure)", execute.bind(null, false))

        async function execute(success: boolean) {

            const ctxt = await addFullUserChain();
            const name = success
                ? ctxt.blogUser.Name
                : uniqueString("FilterByWord");

            const result = await client.Users
                .withQuery((u, { $filter: { eq, and } }) =>
                    and(eq(u.Id, ctxt.blogUser.Id), eq(u.Name, name)))
                .get();

            if (success) {
                expect(result.value.length).toBe(1);
                expect(result.value[0].UserProfileType).toBe(ctxt.blogUser.UserProfileType);
            } else {
                expect(result.value.length).toBe(0);
            }
        }
    });

    testCase("isIn", function () {

        it("Should work correctly (success)", execute.bind(null, true, false));
        it("Should work correctly (failure)", execute.bind(null, false, false))
        it("Should work correctly (success) (custom mapper)", execute.bind(null, true, true));
        it("Should work correctly (failure) (custom mapper)", execute.bind(null, false, true))

        async function execute(success: boolean, customMapper: boolean) {

            const ctxt = await addFullUserChain();
            const name = success
                ? ctxt.blogUser.Name
                : uniqueString("FilterByWord");

            const result = await client.Users
                .withQuery((u, { $filter: { eq, and, isIn } }) =>
                    and(eq(u.Id, ctxt.blogUser.Id), isIn(u.Name, [name], customMapper ? x => `'${x}'` : undefined)))
                .get();

            if (success) {
                expect(result.value.length).toBe(1);
                expect(result.value[0].UserProfileType).toBe(ctxt.blogUser.UserProfileType);
            } else {
                expect(result.value.length).toBe(0);
            }
        }
    });

    testCase("ne", function () {

        it("Should work correctly (success)", execute.bind(null, true));
        it("Should work correctly (failure)", execute.bind(null, false))

        async function execute(success: boolean) {

            const ctxt = await addFullUserChain();
            const name = success
                ? uniqueString("FilterByWord")
                : ctxt.blogUser.Name;

            const result = await client.Users
                .withQuery((u, { $filter: { eq, ne, and } }) =>
                    and(eq(u.Id, ctxt.blogUser.Id), ne(u.Name, name)))
                .get();

            if (success) {
                expect(result.value.length).toBe(1);
                expect(result.value[0].UserProfileType).toBe(ctxt.blogUser.UserProfileType);
            } else {
                expect(result.value.length).toBe(0);
            }
        }
    });

    testCase("gt", function () {

        it("Should work correctly (success)", execute.bind(null, true));
        it("Should work correctly (failure)", execute.bind(null, false))

        async function execute(success: boolean) {

            const ctxt = await addFullUserChain();
            const likes = success
                ? ctxt.blogPost.Likes - 1
                : ctxt.blogPost.Likes + 1;

            const result = await client.BlogPosts
                .withQuery((u, { $filter: { eq, gt, and } }) =>
                    and(eq(u.Id, ctxt.blogPost.Id), gt(u.Likes, likes)))
                .get();

            if (success) {
                expect(result.value.length).toBe(1);
                expect(result.value[0].Content).toBe(ctxt.blogPost.Content);
            } else {
                expect(result.value.length).toBe(0);
            }
        }
    });

    testCase("ge", function () {

        it("Should work correctly (success)", execute.bind(null, true));
        it("Should work correctly (failure)", execute.bind(null, false))

        async function execute(success: boolean) {

            const ctxt = await addFullUserChain();
            const likes = success
                ? ctxt.blogPost.Likes - 1
                : ctxt.blogPost.Likes + 1;

            const result = await client.BlogPosts
                .withQuery((u, { $filter: { eq, ge, and } }) =>
                    and(eq(u.Id, ctxt.blogPost.Id), ge(u.Likes, likes)))
                .get();

            if (success) {
                expect(result.value.length).toBe(1);
                expect(result.value[0].Content).toBe(ctxt.blogPost.Content);
            } else {
                expect(result.value.length).toBe(0);
            }
        }
    });

    testCase("lt", function () {

        it("Should work correctly (success)", execute.bind(null, true));
        it("Should work correctly (failure)", execute.bind(null, false))

        async function execute(success: boolean) {

            const ctxt = await addFullUserChain();
            const likes = success
                ? ctxt.blogPost.Likes + 1
                : ctxt.blogPost.Likes - 1;

            const result = await client.BlogPosts
                .withQuery((u, { $filter: { eq, lt, and } }) =>
                    and(eq(u.Id, ctxt.blogPost.Id), lt(u.Likes, likes)))
                .get();

            if (success) {
                expect(result.value.length).toBe(1);
                expect(result.value[0].Content).toBe(ctxt.blogPost.Content);
            } else {
                expect(result.value.length).toBe(0);
            }
        }
    });

    testCase("le", function () {

        it("Should work correctly (success)", execute.bind(null, true));
        it("Should work correctly (failure)", execute.bind(null, false))

        async function execute(success: boolean) {

            const ctxt = await addFullUserChain();
            const likes = success
                ? ctxt.blogPost.Likes + 1
                : ctxt.blogPost.Likes - 1;

            const result = await client.BlogPosts
                .withQuery((u, { $filter: { eq, le, and } }) =>
                    and(eq(u.Id, ctxt.blogPost.Id), le(u.Likes, likes)))
                .get();

            if (success) {
                expect(result.value.length).toBe(1);
                expect(result.value[0].Content).toBe(ctxt.blogPost.Content);
            } else {
                expect(result.value.length).toBe(0);
            }
        }
    });

    testCase("and", function () {

        it("Should work correctly (success)", execute.bind(null, true));
        it("Should work correctly (failure)", execute.bind(null, false))

        async function execute(success: boolean) {

            const ctxt = await addFullUserChain();
            const name = success
                ? ctxt.blogUser.Name
                : uniqueString("FilterByWord");

            const result = await client.Users
                .withQuery((u, { $filter: { eq, and } }) =>
                    and(eq(u.Id, ctxt.blogUser.Id), eq(u.Name, name)))
                .get();

            if (success) {
                expect(result.value.length).toBe(1);
                expect(result.value[0].UserProfileType).toBe(ctxt.blogUser.UserProfileType);
            } else {
                expect(result.value.length).toBe(0);
            }
        }
    });

    testCase("or", function () {

        it("Should work correctly (success)", execute.bind(null, true));
        it("Should work correctly (failure)", execute.bind(null, false))

        async function execute(success: boolean) {

            const ctxt = await addFullUserChain();
            const name = success
                ? ctxt.blogUser.Name
                : uniqueString(`FilterByWord${success}`);

            const result = await client.Users
                .withQuery((u, { $filter: { eq, and, or } }) =>
                    and(
                        eq(u.Id, ctxt.blogUser.Id),
                        or(eq(u.Name, "Something invalid"), eq(u.Name, name))))
                .get();

            if (success) {
                expect(result.value.length).toBe(1);
                expect(result.value[0].UserProfileType).toBe(ctxt.blogUser.UserProfileType);
            } else {
                expect(result.value.length).toBe(0);
            }
        }
    });

    testCase("not", function () {

        it("Should work correctly (success)", execute.bind(null, true));
        it("Should work correctly (failure)", execute.bind(null, false))

        async function execute(success: boolean) {

            const ctxt = await addFullUserChain();
            const name = success
                ? uniqueString("FilterByWord")
                : ctxt.blogUser.Name

            const result = await client.Users
                .withQuery((u, { $filter: { eq, and, not } }) =>
                    and(
                        eq(u.Id, ctxt.blogUser.Id),
                        not(eq(u.Name, name))))
                .get();

            if (success) {
                expect(result.value.length).toBe(1);
                expect(result.value[0].UserProfileType).toBe(ctxt.blogUser.UserProfileType);
            } else {
                expect(result.value.length).toBe(0);
            }
        }
    });

    testCase("group", function () {

        it("Should work correctly (success)", execute.bind(null, true));
        it("Should work correctly (failure)", execute.bind(null, false))

        async function execute(success: boolean) {

            const ctxt = await addFullUserChain();
            const name = success
                ? uniqueString("FilterByWord")
                : ctxt.blogUser.Name

            const result = await client.Users
                .withQuery((u, { $filter: { eq, and, not, group } }) =>
                    and(
                        eq(u.Id, ctxt.blogUser.Id),
                        not(group(eq(u.Name, name)), false)))
                .get();

            if (success) {
                expect(result.value.length).toBe(1);
                expect(result.value[0].UserProfileType).toBe(ctxt.blogUser.UserProfileType);
            } else {
                expect(result.value.length).toBe(0);
            }
        }
    });

    testCase("any", function () {

        it("Should work correctly (success)", execute.bind(null, true));
        it("Should work correctly (failure)", execute.bind(null, false))

        async function execute(success: boolean) {

            const ctxt = await addFullUserChain();
            const name = success
                ? ctxt.blog.Name
                : uniqueString("Invalid")

            const result = await client.Users
                .withQuery((u, { $filter: { eq, and, any } }) =>
                    and(
                        eq(u.Id, ctxt.blogUser.Id),
                        any(u.Blogs, b => eq(b.Name, name))))
                .get();

            if (success) {
                expect(result.value.length).toBe(1);
                expect(result.value[0].UserProfileType).toBe(ctxt.blogUser.UserProfileType);
            } else {
                expect(result.value.length).toBe(0);
            }
        }
    });

    testCase("all", function () {

        it("Should work correctly (success)", execute.bind(null, true));
        it("Should work correctly (failure)", execute.bind(null, false))

        async function execute(success: boolean) {

            const ctxt = await addFullUserChain();
            const name = success
                ? ctxt.blog.Name
                : uniqueString("Invalid")

            const result = await client.Users
                .withQuery((u, { $filter: { eq, and, all } }) =>
                    and(
                        eq(u.Id, ctxt.blogUser.Id),
                        all(u.Blogs, b => eq(b.Name, name))))
                .get();

            if (success) {
                expect(result.value.length).toBe(1);
                expect(result.value[0].UserProfileType).toBe(ctxt.blogUser.UserProfileType);
            } else {
                expect(result.value.length).toBe(0);
            }
        }
    });

    testCase("collectionFilter", function () {

        it("Should work correctly (success)", execute.bind(null, true));
        it("Should work correctly (failure)", execute.bind(null, false))

        async function execute(success: boolean) {

            const ctxt = await addFullUserChain();
            const name = success
                ? ctxt.blog.Name
                : uniqueString("Invalid")

            const result = await client.Users
                .withQuery((u, { $filter: { eq, and, collectionFilter } }) =>
                    and(
                        eq(u.Id, ctxt.blogUser.Id),
                        collectionFilter(u.Blogs, "all", b => eq(b.Name, name))))
                .get();

            if (success) {
                expect(result.value.length).toBe(1);
                expect(result.value[0].UserProfileType).toBe(ctxt.blogUser.UserProfileType);
            } else {
                expect(result.value.length).toBe(0);
            }
        }
    });

    testCase("count", function () {

        it("Should work correctly (success)", execute.bind(null, true));
        it("Should work correctly (failure)", execute.bind(null, false))

        async function execute(success: boolean) {

            const ctxt = await addFullUserChain();
            const itemCount: number = success
                ? 1
                : 11

            const result = await client.Users
                .withQuery((u, { $filter: { eq, and, count } }) =>
                    and(
                        eq(u.Id, ctxt.blogUser.Id),
                        eq(count(u.Blogs), itemCount)))
                .get();

            if (success) {
                expect(result.value.length).toBe(1);
                expect(result.value[0].UserProfileType).toBe(ctxt.blogUser.UserProfileType);
            } else {
                expect(result.value.length).toBe(0);
            }
        }
    });

    testCase("add", function () {

        it("Should work correctly (success)", execute.bind(null, true));
        it("Should work correctly (failure)", execute.bind(null, false))

        async function execute(success: boolean) {

            const ctxt = await addFullUserChain();
            const likes = success
                ? ctxt.blogPost.Likes - 1
                : ctxt.blogPost.Likes;

            const result = await client.BlogPosts
                .withQuery((u, { $filter: { eq, and, add, filterRaw } }) =>
                    and(eq(u.Id, ctxt.blogPost.Id), eq(u.Likes, add(filterRaw(likes.toString()), 1))))
                .get();

            if (success) {
                expect(result.value.length).toBe(1);
                expect(result.value[0].Content).toBe(ctxt.blogPost.Content);
            } else {
                expect(result.value.length).toBe(0);
            }
        }
    });

    testCase("sub", function () {

        describe("forwards", () => {

            it("Should work correctly (success)", execute.bind(null, true));
            it("Should work correctly (failure)", execute.bind(null, false))

            async function execute(success: boolean) {

                const ctxt = await addFullUserChain({ blogPostLikes: 10 });
                const result = await client.BlogPosts
                    .withQuery((u, { $filter: { eq, and, sub } }) =>
                        and(eq(u.Id, ctxt.blogPost.Id), eq(sub(u.Likes, success ? 10 : 11), 0)))
                    .get();

                if (success) {
                    expect(result.value.length).toBe(1);
                    expect(result.value[0].Content).toBe(ctxt.blogPost.Content);
                } else {
                    expect(result.value.length).toBe(0);
                }
            }
        });

        describe("backwards", () => {

            it("Should work correctly (success)", execute.bind(null, true));
            it("Should work correctly (failure)", execute.bind(null, false))

            async function execute(success: boolean) {

                const ctxt = await addFullUserChain({ blogPostLikes: 10 });
                const result = await client.BlogPosts
                    .withQuery((u, { $filter: { eq, and, sub } }) =>
                        and(eq(u.Id, ctxt.blogPost.Id), eq(sub(success ? 10 : 11, u.Likes), 0)))
                    .get();

                if (success) {
                    expect(result.value.length).toBe(1);
                    expect(result.value[0].Content).toBe(ctxt.blogPost.Content);
                } else {
                    expect(result.value.length).toBe(0);
                }
            }
        });
    });

    testCase("mul", function () {

        it("Should work correctly (success)", execute.bind(null, true));
        it("Should work correctly (failure)", execute.bind(null, false))

        async function execute(success: boolean) {

            const ctxt = await addFullUserChain();
            const likes = success ? 1 : 2;

            const result = await client.BlogPosts
                .withQuery((u, { $filter: { eq, and, mul } }) =>
                    and(eq(u.Id, ctxt.blogPost.Id), eq(u.Likes, mul(u.Likes, likes))))
                .get();

            if (success) {
                expect(result.value.length).toBe(1);
                expect(result.value[0].Content).toBe(ctxt.blogPost.Content);
            } else {
                expect(result.value.length).toBe(0);
            }
        }
    });

    testCase("div", function () {
        describe("forwards", function () {

            it("Should work correctly (success)", execute.bind(null, true));
            it("Should work correctly (failure)", execute.bind(null, false))

            async function execute(success: boolean) {

                const ctxt = await addFullUserChain();
                const likes = success ? 1 : 2;

                const result = await client.BlogPosts
                    .withQuery((u, { $filter: { eq, and, div } }) =>
                        and(eq(u.Id, ctxt.blogPost.Id), eq(u.Likes, div(u.Likes, likes))))
                    .get();

                if (success) {
                    expect(result.value.length).toBe(1);
                    expect(result.value[0].Content).toBe(ctxt.blogPost.Content);
                } else {
                    expect(result.value.length).toBe(0);
                }
            }
        });

        describe("backwards", function () {

            it("Should work correctly (success)", execute.bind(null, true));
            it("Should work correctly (failure)", execute.bind(null, false))

            async function execute(success: boolean) {

                const ctxt = await addFullUserChain({ blogPostLikes: 100 });
                const likes = success ? 10 : 20;

                const result = await client.BlogPosts
                    .withQuery((u, { $filter: { eq, and, div } }) =>
                        and(eq(u.Id, ctxt.blogPost.Id), eq(div(1000, u.Likes), likes)))
                    .get();

                if (success) {
                    expect(result.value.length).toBe(1);
                    expect(result.value[0].Content).toBe(ctxt.blogPost.Content);
                } else {
                    expect(result.value.length).toBe(0);
                }
            }
        });
    });

    testCase("mod", function () {
        describe("forwards", function () {

            it("Should work correctly (success)", execute.bind(null, true));
            it("Should work correctly (failure)", execute.bind(null, false))

            async function execute(success: boolean) {

                const ctxt = await addFullUserChain();
                const likes = success ? 1 : 10000000;

                const result = await client.BlogPosts
                    .withQuery((u, { $filter: { eq, and, mod, filterRaw } }) =>
                        and(eq(u.Id, ctxt.blogPost.Id), eq(filterRaw("0"), mod(u.Likes, likes))))
                    .get();

                if (success) {
                    expect(result.value.length).toBe(1);
                    expect(result.value[0].Content).toBe(ctxt.blogPost.Content);
                } else {
                    expect(result.value.length).toBe(0);
                }
            }
        });

        describe("backwards", function () {

            it("Should work correctly (success)", execute.bind(null, true));
            it("Should work correctly (failure)", execute.bind(null, false))

            async function execute(success: boolean) {

                const ctxt = await addFullUserChain({ blogPostLikes: success ? 1 : 3 });

                const result = await client.BlogPosts
                    .withQuery((u, { $filter: { eq, and, mod } }) =>
                        and(eq(u.Id, ctxt.blogPost.Id), eq(mod(10, u.Likes), 0)))
                    .get();

                if (success) {
                    expect(result.value.length).toBe(1);
                    expect(result.value[0].Content).toBe(ctxt.blogPost.Content);
                } else {
                    expect(result.value.length).toBe(0);
                }
            }
        });
    });

    testCase("concatString", function () {

        describe("string", () => {
            it("Should work correctly (success)", execute.bind(null, true));
            it("Should work correctly (failure)", execute.bind(null, false))

            async function execute(success: boolean) {

                const ctxt = await addFullUserChain();
                const title = success ? ctxt.blogPost.Name : "invalid"
                const searchString = title + "s"

                const result = await client.BlogPosts
                    .withQuery((bp, { $filter: { eq, and, concatString } }) =>
                        and(
                            eq(bp.Id, ctxt.blogPost.Id),
                            eq(concatString(bp.Name, "s"), searchString)))
                    .get();

                if (success) {
                    expect(result.value.length).toBe(1);
                    expect(result.value[0].Content).toBe(ctxt.blogPost.Content);
                } else {
                    expect(result.value.length).toBe(0);
                }
            }

            describe("reversed args", () => {
                it("Should work correctly (success)", execute.bind(null, true));
                it("Should work correctly (failure)", execute.bind(null, false))

                async function execute(success: boolean) {

                    const ctxt = await addFullUserChain();
                    const title = success ? ctxt.blogPost.Name : "invalid"
                    const searchString = "s" + title

                    const result = await client.BlogPosts
                        .withQuery((bp, { $filter: { eq, and, concatString } }) =>
                            and(
                                eq(bp.Id, ctxt.blogPost.Id),
                                eq(concatString("s", bp.Name), searchString)))
                        .get();

                    if (success) {
                        expect(result.value.length).toBe(1);
                        expect(result.value[0].Content).toBe(ctxt.blogPost.Content);
                    } else {
                        expect(result.value.length).toBe(0);
                    }
                }
            });
        });
    });

    testCase("containsString", function () {

        describe("string", () => {
            it("Should work correctly (success)", execute.bind(null, true));
            it("Should work correctly (failure)", execute.bind(null, false))

            async function execute(success: boolean) {

                const ctxt = await addFullUserChain();
                const searchString = success ? ctxt.blogPost.Name.substring(5) : "invalid"

                const result = await client.BlogPosts
                    .withQuery((bp, { $filter: { eq, and, containsString } }) =>
                        and(
                            eq(bp.Id, ctxt.blogPost.Id),
                            containsString(bp.Name, searchString)))
                    .get();

                if (success) {
                    expect(result.value.length).toBe(1);
                    expect(result.value[0].Content).toBe(ctxt.blogPost.Content);
                } else {
                    expect(result.value.length).toBe(0);
                }
            }

            describe("reversed args", () => {
                it("Should work correctly (success)", execute.bind(null, true));
                it("Should work correctly (failure)", execute.bind(null, false))

                async function execute(success: boolean) {

                    const ctxt = await addFullUserChain();
                    const searchString = success
                        ? ctxt.blogPost.Name + "aa"
                        : "invalid"

                    const result = await client.BlogPosts
                        .withQuery((bp, { $filter: { eq, and, containsString } }) =>
                            and(
                                eq(bp.Id, ctxt.blogPost.Id),
                                containsString(searchString, bp.Name)))
                        .get();

                    if (success) {
                        expect(result.value.length).toBe(1);
                        expect(result.value[0].Content).toBe(ctxt.blogPost.Content);
                    } else {
                        expect(result.value.length).toBe(0);
                    }
                }
            });
        });
    });

    testCase("startsWithString", function () {

        it("Should work correctly (success)", execute.bind(null, true));
        it("Should work correctly (failure)", execute.bind(null, false))

        async function execute(success: boolean) {

            const ctxt = await addFullUserChain();
            const searchString = success ? ctxt.blogPost.Name.substring(0, 5) : "invalid"

            const result = await client.BlogPosts
                .withQuery((bp, { $filter: { eq, and, startsWithString } }) =>
                    and(
                        eq(bp.Id, ctxt.blogPost.Id),
                        startsWithString(bp.Name, searchString)))
                .get();

            if (success) {
                expect(result.value.length).toBe(1);
                expect(result.value[0].Content).toBe(ctxt.blogPost.Content);
            } else {
                expect(result.value.length).toBe(0);
            }
        }

        describe("reversed args", () => {
            it("Should work correctly (success)", execute.bind(null, true));
            it("Should work correctly (failure)", execute.bind(null, false))

            async function execute(success: boolean) {

                const ctxt = await addFullUserChain();
                const searchString = success
                    ? ctxt.blogPost.Name + "aa"
                    : "invalid"

                const result = await client.BlogPosts
                    .withQuery((bp, { $filter: { eq, and, startsWithString } }) =>
                        and(
                            eq(bp.Id, ctxt.blogPost.Id),
                            startsWithString(searchString, bp.Name)))
                    .get();

                if (success) {
                    expect(result.value.length).toBe(1);
                    expect(result.value[0].Content).toBe(ctxt.blogPost.Content);
                } else {
                    expect(result.value.length).toBe(0);
                }
            }
        });
    });

    testCase("endsWithString", function () {

        it("Should work correctly (success)", execute.bind(null, true));
        it("Should work correctly (failure)", execute.bind(null, false))

        async function execute(success: boolean) {

            const ctxt = await addFullUserChain();
            const searchString = success ? ctxt.blogPost.Name.substring(5) : "invalid"

            const result = await client.BlogPosts
                .withQuery((bp, { $filter: { eq, and, endsWithString } }) =>
                    and(
                        eq(bp.Id, ctxt.blogPost.Id),
                        endsWithString(bp.Name, searchString)))
                .get();

            if (success) {
                expect(result.value.length).toBe(1);
                expect(result.value[0].Content).toBe(ctxt.blogPost.Content);
            } else {
                expect(result.value.length).toBe(0);
            }
        }

        describe("reversed args", () => {
            it("Should work correctly (success)", execute.bind(null, true));
            it("Should work correctly (failure)", execute.bind(null, false))

            async function execute(success: boolean) {

                const ctxt = await addFullUserChain();
                const searchString = success
                    ? "aa" + ctxt.blogPost.Name
                    : "invalid"

                const result = await client.BlogPosts
                    .withQuery((bp, { $filter: { eq, and, endsWithString } }) =>
                        and(
                            eq(bp.Id, ctxt.blogPost.Id),
                            endsWithString(searchString, bp.Name)))
                    .get();

                if (success) {
                    expect(result.value.length).toBe(1);
                    expect(result.value[0].Content).toBe(ctxt.blogPost.Content);
                } else {
                    expect(result.value.length).toBe(0);
                }
            }
        });
    });

    testCase("indexOfString", function () {

        it("Should work correctly (success)", execute.bind(null, true));
        it("Should work correctly (failure)", execute.bind(null, false))

        async function execute(success: boolean) {

            const ctxt = await addFullUserChain();
            const searchString = success ? ctxt.blogPost.Name.substring(0, 5) : "invalid"

            const result = await client.BlogPosts
                .withQuery((bp, { $filter: { eq, and, indexOfString } }) =>
                    and(
                        eq(bp.Id, ctxt.blogPost.Id),
                        eq(indexOfString(bp.Name, searchString), 0)))
                .get();

            if (success) {
                expect(result.value.length).toBe(1);
                expect(result.value[0].Content).toBe(ctxt.blogPost.Content);
            } else {
                expect(result.value.length).toBe(0);
            }
        }

        describe("reversed args", () => {
            it("Should work correctly (success)", execute.bind(null, true));
            it("Should work correctly (failure)", execute.bind(null, false))

            async function execute(success: boolean) {

                const ctxt = await addFullUserChain();
                const searchString = success
                    ? ctxt.blogPost.Name + "aa"
                    : "invalid"

                const result = await client.BlogPosts
                    .withQuery((bp, { $filter: { eq, and, indexOfString } }) =>
                        and(
                            eq(bp.Id, ctxt.blogPost.Id),
                            eq(indexOfString(searchString, bp.Name), 0)))
                    .get();

                if (success) {
                    expect(result.value.length).toBe(1);
                    expect(result.value[0].Content).toBe(ctxt.blogPost.Content);
                } else {
                    expect(result.value.length).toBe(0);
                }
            }
        });
    });

    testCase("lengthString", function () {

        it("Should work correctly (success)", execute.bind(null, true));
        it("Should work correctly (failure)", execute.bind(null, false))

        async function execute(success: boolean) {

            const ctxt = await addFullUserChain();
            let length = ctxt.blogPost.Name.length
            if (!success) length++;

            const result = await client.BlogPosts
                .withQuery((bp, { $filter: { eq, and, lengthString } }) =>
                    and(
                        eq(bp.Id, ctxt.blogPost.Id),
                        eq(lengthString(bp.Name), length)))
                .get();

            if (success) {
                expect(result.value.length).toBe(1);
                expect(result.value[0].Content).toBe(ctxt.blogPost.Content);
            } else {
                expect(result.value.length).toBe(0);
            }
        }
    });

    testCase("subString", function () {

        it("Should work correctly (success)", execute.bind(null, true));
        it("Should work correctly (failure)", execute.bind(null, false))

        async function execute(success: boolean) {

            const ctxt = await addFullUserChain();
            const partial = success ? ctxt.blogPost.Name.substring(5) : "invalid"

            const result = await client.BlogPosts
                .withQuery((bp, { $filter: { eq, and, subString } }) =>
                    and(
                        eq(bp.Id, ctxt.blogPost.Id),
                        eq(subString(bp.Name, 5), partial)))
                .get();

            if (success) {
                expect(result.value.length).toBe(1);
                expect(result.value[0].Content).toBe(ctxt.blogPost.Content);
            } else {
                expect(result.value.length).toBe(0);
            }
        }

        testCase("2 args", function () {

            it("Should work correctly (success)", execute.bind(null, true));
            it("Should work correctly (failure)", execute.bind(null, false))

            async function execute(success: boolean) {

                const ctxt = await addFullUserChain();
                const partial = success ? ctxt.blogPost.Name.substring(5, 7) : "invalid"

                const result = await client.BlogPosts
                    .withQuery((bp, { $filter: { eq, and, subString } }) =>
                        and(
                            eq(bp.Id, ctxt.blogPost.Id),
                            eq(subString(bp.Name, 5, 2), partial)))
                    .get();

                if (success) {
                    expect(result.value.length).toBe(1);
                    expect(result.value[0].Content).toBe(ctxt.blogPost.Content);
                } else {
                    expect(result.value.length).toBe(0);
                }
            }
        });
    });

    testCase("ceiling", function () {

        it("Should work correctly", async () => {

            const ctxt = await addFullUserChain({ userScore: 1.2 });
            const result = await client.Users
                .withQuery((u, { $filter: { eq, and, ceiling } }) =>
                    and(
                        eq(u.Id, ctxt.blogUser.Id),
                        eq(ceiling(u.Score), 2)))
                .get();

            expect(result.value.length).toBe(1);
            expect(result.value[0].Name).toBe(ctxt.blogUser.Name);
        });
    });

    testCase("floor", function () {

        it("Should work correctly", async () => {

            const ctxt = await addFullUserChain({ userScore: 1.2 });
            const result = await client.Users
                .withQuery((u, { $filter: { eq, and, floor } }) =>
                    and(
                        eq(u.Id, ctxt.blogUser.Id),
                        eq(floor(u.Score), 1)))
                .get();

            expect(result.value.length).toBe(1);
            expect(result.value[0].Name).toBe(ctxt.blogUser.Name);
        });
    });

    testCase("round", function () {

        it("Should work correctly (round up)", execute.bind(null, true));
        it("Should work correctly (round down)", execute.bind(null, false));

        async function execute(roundUp: boolean) {

            const ctxt = await addFullUserChain({ userScore: roundUp ? 1.6 : 1.2 });
            const result = await client.Users
                .withQuery((u, { $filter: { eq, and, round } }) =>
                    and(
                        eq(u.Id, ctxt.blogUser.Id),
                        eq(round(u.Score), roundUp ? 2 : 1)))
                .get();

            expect(result.value.length).toBe(1);
            expect(result.value[0].Name).toBe(ctxt.blogUser.Name);
        }
    });

    testCase("hassubset", function () {

        it("Should build filter (server can't process)", () => {
            const { $filter: { hassubset } } = queryUtils();
            const q = queryBuilder<My.Odata.Entities.QueryableBlogPost>("My.Odata.Entities.BlogPost", bp =>
                hassubset(bp.Words, ["something"]));

            expect(q["$filter"]).toBe("hassubset(Words,['something'])");
        });
    });

    testCase("collectionFunction", function () {

        it("Should build filter (server can't process)", () => {
            const { $filter: { collectionFunction } } = queryUtils();
            const q = queryBuilder<My.Odata.Entities.QueryableBlogPost>("My.Odata.Entities.BlogPost", bp =>
                collectionFunction("hassubset", bp.Words, ["something"]));

            expect(q["$filter"]).toBe("hassubset(Words,['something'])");
        });
    });

    testCase("divby", function () {

        describe("forwards", () => {
            it("Should build filter (server can't process)", () => {
                const { $filter: { divby, eq, group } } = queryUtils();
                const q = queryBuilder<My.Odata.Entities.QueryableBlogPost>("My.Odata.Entities.BlogPost", u =>
                    eq(u.Likes, group(divby(u.Likes, 2.1))));

                expect(q["$filter"]).toBe("Likes eq (Likes divby 2.1)");
            });
        });

        describe("backwards", () => {
            it("Should build filter (server can't process)", () => {
                const { $filter: { divby, eq, group } } = queryUtils();
                const q = queryBuilder<My.Odata.Entities.QueryableBlogPost>("My.Odata.Entities.BlogPost", u =>
                    eq(u.Likes, group(divby(2.1, u.Likes))));

                expect(q["$filter"]).toBe("Likes eq (2.1 divby Likes)");
            });
        });

        // async function execute(success: boolean) {

        //     const ctxt = await addFullUserChain();
        //     const likes = success ? 1 : 2.1;

        //     const result = await client.BlogPosts
        //         .withQuery((q, { filter: { eq, and, divby, group } }) => q
        //             .filter(u => and(eq(u.Id, ctxt.blogPost.Id), eq(u.Likes, divby(u.Likes, likes)))))
        //         .get();

        //     if (success) {
        //         expect(result.value.length).toBe(1);
        //         expect(result.value[0].Content).toBe(ctxt.blogPost.Content);
        //     } else {
        //         expect(result.value.length).toBe(0);
        //     }
        // }
    });
});

