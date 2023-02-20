
import { addFullUserChain } from "../utils/client.js";
import { My, ODataClient, rootConfigExporter } from "../generatedCode.js";
import { buildQuery, NonNumericTypes, ODataDate, ODataDateTimeOffset, ODataDuration, Query, QueryComplexObject, queryUtils } from "magic-odata-client";
import { uniqueString } from "../utils/utils.js";
import { buildComplexTypeRef } from "magic-odata-client";
import { queryBuilder } from "../utils/odataClient.js";
import { filterRaw } from "magic-odata-client/dist/src/query/filtering/op1.js";

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

    testCase("matchesPattern", function () {

        describe("string", () => {
            it("Should work correctly (success)", execute.bind(null, true));
            it("Should work correctly (failure)", execute.bind(null, false))

            async function execute(success: boolean) {

                const ctxt = await addFullUserChain();
                const searchString = success ? ctxt.blogPost.Name.substring(5) : "invalid"

                const result = await client.BlogPosts
                    .withQuery((bp, { $filter: { eq, and, matchesPattern } }) =>
                        and(
                            eq(bp.Id, ctxt.blogPost.Id),
                            matchesPattern(bp.Name, searchString)))
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
                        .withQuery((bp, { $filter: { eq, and, matchesPattern } }) =>
                            and(
                                eq(bp.Id, ctxt.blogPost.Id),
                                matchesPattern(searchString, bp.Name)))
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

    testCase("toLower", function () {

        it("Should work correctly (success)", execute.bind(null, true));
        it("Should work correctly (failure)", execute.bind(null, false))

        async function execute(success: boolean) {

            const ctxt = await addFullUserChain({ blogPostName: uniqueString("BLOGPOST") });
            let name = success ? ctxt.blogPost.Name.toLowerCase() : ctxt.blogPost.Name

            const result = await client.BlogPosts
                .withQuery((bp, { $filter: { eq, and, toLower } }) =>
                    and(
                        eq(bp.Id, ctxt.blogPost.Id),
                        eq(toLower(bp.Name), name)))
                .get();

            if (success) {
                expect(result.value.length).toBe(1);
                expect(result.value[0].Content).toBe(ctxt.blogPost.Content);
            } else {
                expect(result.value.length).toBe(0);
            }
        }
    });

    testCase("toUpper", function () {

        it("Should work correctly (success)", execute.bind(null, true));
        it("Should work correctly (failure)", execute.bind(null, false))

        async function execute(success: boolean) {

            const ctxt = await addFullUserChain({ blogPostName: uniqueString("blogpost") });
            let name = success ? ctxt.blogPost.Name.toUpperCase() : ctxt.blogPost.Name

            const result = await client.BlogPosts
                .withQuery((bp, { $filter: { eq, and, toUpper } }) =>
                    and(
                        eq(bp.Id, ctxt.blogPost.Id),
                        eq(toUpper(bp.Name), name)))
                .get();

            if (success) {
                expect(result.value.length).toBe(1);
                expect(result.value[0].Content).toBe(ctxt.blogPost.Content);
            } else {
                expect(result.value.length).toBe(0);
            }
        }
    });

    testCase("trim", function () {

        it("Should work correctly (success)", execute.bind(null, true));
        it("Should work correctly (failure)", execute.bind(null, false))

        async function execute(success: boolean) {

            const ctxt = await addFullUserChain({ blogPostName: uniqueString("     blogpost") });

            const result = await client.BlogPosts
                .withQuery((bp, { $filter: { eq, and, trim } }) =>
                    and(
                        eq(bp.Id, ctxt.blogPost.Id),
                        eq(success ? trim(bp.Name) : bp.Name, ctxt.blogPost.Name.trimStart())))
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

    testCase("hasSubset", function () {

        it("Should build filter (server can't process)", () => {

            const q = client.BlogPosts
                .withQuery((bp, { $filter: { hasSubset } }) => hasSubset(bp.Words, ["something"]))
                .uri(false);

            expect(q.query["$filter"]).toBe("hassubset(Words,['something'])");
        });
    });

    testCase("hasSubSequence", function () {

        it("Should build filter (server can't process)", () => {
            const { $filter: { hasSubSequence } } = queryUtils();
            const q = queryBuilder<My.Odata.Entities.QueryableBlogPost>("My.Odata.Entities.BlogPost", bp =>
                hasSubSequence(bp.Words, ["something"]));

            expect(q["$filter"]).toBe("hassubsequence(Words,['something'])");
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

    testCase("concatCollection", function () {

        it("Should build filter (server can't process)", () => {
            const { $filter: { concatCollection } } = queryUtils();
            const q = queryBuilder<My.Odata.Entities.QueryableBlogPost>("My.Odata.Entities.BlogPost", bp =>
                concatCollection(bp.Words, ["something"]));

            expect(q["$filter"]).toBe("concat(Words,['something'])");
        });
    });

    testCase("containsCollection", function () {

        it("Should build filter (server can't process) (1)", () => {
            const { $filter: { containsCollection } } = queryUtils();
            const q = queryBuilder<My.Odata.Entities.QueryableBlogPost>("My.Odata.Entities.BlogPost", bp =>
                containsCollection(bp.Words, "something"));

            expect(q["$filter"]).toBe("contains(Words,'something')");
        });

        it("Should build filter (server can't process) (2)", () => {
            const { $filter: { containsCollection } } = queryUtils();
            const q = queryBuilder<My.Odata.Entities.QueryableBlogPost>("My.Odata.Entities.BlogPost", bp =>
                containsCollection(bp.Words, bp.Content));

            expect(q["$filter"]).toBe("contains(Words,Content)");
        });

        it("Should build filter (server can't process) (3)", () => {
            const { $filter: { containsCollection } } = queryUtils();
            const q = queryBuilder<My.Odata.Entities.QueryableBlogPost>("My.Odata.Entities.BlogPost", bp =>
                containsCollection(["1", "2"], bp.Content));

            expect(q["$filter"]).toBe("contains(['1','2'],Content)");
        });
    });

    testCase("indexOfCollection", function () {

        it("Should build filter (server can't process) (1)", () => {
            const { $filter: { indexOfCollection } } = queryUtils();
            const q = queryBuilder<My.Odata.Entities.QueryableBlogPost>("My.Odata.Entities.BlogPost", bp =>
                indexOfCollection(bp.Words, "something"));

            expect(q["$filter"]).toBe("indexof(Words,'something')");
        });

        it("Should build filter (server can't process) (2)", () => {
            const { $filter: { indexOfCollection } } = queryUtils();
            const q = queryBuilder<My.Odata.Entities.QueryableBlogPost>("My.Odata.Entities.BlogPost", bp =>
                indexOfCollection(bp.Words, bp.Content));

            expect(q["$filter"]).toBe("indexof(Words,Content)");
        });

        it("Should build filter (server can't process) (3)", () => {
            const { $filter: { containsCollection } } = queryUtils();
            const q = queryBuilder<My.Odata.Entities.QueryableBlogPost>("My.Odata.Entities.BlogPost", bp =>
                containsCollection(["1", "2"], bp.Content));

            expect(q["$filter"]).toBe("contains(['1','2'],Content)");
        });
    });

    testCase("lengthCollection", function () {

        it("Should build filter (server can't process) (1)", () => {
            const { $filter: { lengthCollection } } = queryUtils();
            const q = queryBuilder<My.Odata.Entities.QueryableBlogPost>("My.Odata.Entities.BlogPost", bp =>
                lengthCollection(bp.Words));

            expect(q["$filter"]).toBe("length(Words)");
        });
    });

    testCase("subStringCollection", function () {

        it("Should build filter (server can't process) (1)", () => {
            const { $filter: { subStringCollection } } = queryUtils();
            const q = queryBuilder<My.Odata.Entities.QueryableBlogPost>("My.Odata.Entities.BlogPost", bp =>
                subStringCollection(bp.Words, 1, 2));

            expect(q["$filter"]).toBe("substring(Words,1,2)");
        });
    });

    testCase("startsWithCollection", function () {

        it("Should build filter (server can't process) (1)", () => {
            const { $filter: { startsWithCollection } } = queryUtils();
            const q = queryBuilder<My.Odata.Entities.QueryableBlogPost>("My.Odata.Entities.BlogPost", bp =>
                startsWithCollection(bp.Words, ["something"]));

            expect(q["$filter"]).toBe("startswith(Words,['something'])");
        });

        it("Should build filter (server can't process) (2)", () => {
            const { $filter: { startsWithCollection } } = queryUtils();
            const q = queryBuilder<My.Odata.Entities.QueryableBlogPost>("My.Odata.Entities.BlogPost", bp =>
                startsWithCollection(bp.Words, bp.Words));

            expect(q["$filter"]).toBe("startswith(Words,Words)");
        });

        it("Should build filter (server can't process) (3)", () => {
            const { $filter: { startsWithCollection } } = queryUtils();
            const q = queryBuilder<My.Odata.Entities.QueryableBlogPost>("My.Odata.Entities.BlogPost", bp =>
                startsWithCollection(["1", "2"], bp.Words));

            expect(q["$filter"]).toBe("startswith(['1','2'],Words)");
        });
    });

    testCase("endsWithCollection", function () {

        it("Should build filter (server can't process) (1)", () => {
            const { $filter: { endsWithCollection } } = queryUtils();
            const q = queryBuilder<My.Odata.Entities.QueryableBlogPost>("My.Odata.Entities.BlogPost", bp =>
                endsWithCollection(bp.Words, ["something"]));

            expect(q["$filter"]).toBe("endswith(Words,['something'])");
        });

        it("Should build filter (server can't process) (2)", () => {
            const { $filter: { endsWithCollection } } = queryUtils();
            const q = queryBuilder<My.Odata.Entities.QueryableBlogPost>("My.Odata.Entities.BlogPost", bp =>
                endsWithCollection(bp.Words, bp.Words));

            expect(q["$filter"]).toBe("endswith(Words,Words)");
        });

        it("Should build filter (server can't process) (3)", () => {
            const { $filter: { endsWithCollection } } = queryUtils();
            const q = queryBuilder<My.Odata.Entities.QueryableBlogPost>("My.Odata.Entities.BlogPost", bp =>
                endsWithCollection(["1", "2"], bp.Words));

            expect(q["$filter"]).toBe("endswith(['1','2'],Words)");
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
    });


    testCase("addDateTimeOffset", function () {
        const { $filter: { addDateTimeOffset, filterRaw } } = queryUtils();
        it("Should build filter Filter -> Filter -> Filter", () => {
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                addDateTimeOffset(filterRaw("rrr1"), filterRaw("rrr2")));

            expect(q["$filter"]).toBe("rrr1 add rrr2");
        })

        it("Should build filter Op -> Op -> Filter", () => {
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                addDateTimeOffset(e.DateTimeOffset, e.Duration));

            expect(q["$filter"]).toBe("DateTimeOffset add Duration");
        })

        it("Should build filter Op -> Val (str) -> Filter", () => {
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                addDateTimeOffset(e.DateTimeOffset, "ssttrr"));

            expect(q["$filter"]).toBe("DateTimeOffset add ssttrr");
        })

        it("Should build filter Op -> Val (num) -> Filter", () => {
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                addDateTimeOffset(e.DateTimeOffset, -12345));

            expect(q["$filter"]).toBe("DateTimeOffset add duration'-P0DT0H0M12.345S'");
        })

        it("Should build filter Op -> Val (class) -> Filter", () => {
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                addDateTimeOffset(e.DateTimeOffset, new ODataDuration({ h: 1 })));

            expect(q["$filter"]).toBe("DateTimeOffset add duration'P0DT1H0M0.000S'");
        })

        it("Should build filter Val (str) -> Op -> Filter", () => {
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                addDateTimeOffset("time", e.Duration));

            expect(q["$filter"]).toBe("time add Duration");
        })

        it("Should build filter Val (date) -> Op -> Filter", () => {
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                // TODO: assumes specific timezone
                addDateTimeOffset(new Date(2023, 2, 23, 14, 33, 19, 13), e.Duration));

            expect(q["$filter"]).toBe("2023-03-23T14:33:19.013+00:00 add Duration");
        })

        it("Should build filter Val (class) -> Op -> Filter", () => {
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                addDateTimeOffset(new ODataDateTimeOffset({ y: 2001, M: 1, d: 1, h: 9 }), e.Duration));

            expect(q["$filter"]).toBe("2001-01-01T09:00:00.000+00:00 add Duration");
        })
    });

    testCase("subDateTimeOffset", function () {
        const { $filter: { subDateTimeOffset } } = queryUtils();

        it("Should build filter Op -> Op -> Filter", () => {
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                subDateTimeOffset(e.DateTimeOffset, e.Duration));

            expect(q["$filter"]).toBe("DateTimeOffset sub Duration");
        })

        it("Should build filter Op -> Val (str) -> Filter", () => {
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                subDateTimeOffset(e.DateTimeOffset, "xxx"));

            expect(q["$filter"]).toBe("DateTimeOffset sub xxx");
        })

        it("Should build filter Op -> Val (num) -> Filter", () => {
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                subDateTimeOffset(e.DateTimeOffset, 334455));

            expect(q["$filter"]).toBe("DateTimeOffset sub duration'P0DT0H5M34.455S'");
        })

        it("Should build filter Op -> Val (class) -> Filter", () => {
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                subDateTimeOffset(e.DateTimeOffset, new ODataDuration({ s: 55 })));

            expect(q["$filter"]).toBe("DateTimeOffset sub duration'P0DT0H0M55.000S'");
        })

        it("Should build filter Val (str) -> Op -> Filter", () => {
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                subDateTimeOffset("ddd", e.Duration));

            expect(q["$filter"]).toBe("ddd sub Duration");
        })

        it("Should build filter Val (date) -> Op -> Filter", () => {
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                // TODO: assumes specific timezone
                subDateTimeOffset(new Date(1999, 9, 4), e.Duration));

            expect(q["$filter"]).toBe("1999-10-04T00:00:00.000-01:00 sub Duration");
        })

        it("Should build filter Val (class) -> Op -> Filter", () => {
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                subDateTimeOffset(new ODataDateTimeOffset({ y: 2000, M: 7, d: 6 }), e.Duration));

            expect(q["$filter"]).toBe("2000-07-06T00:00:00.000+00:00 sub Duration");
        })
    });

    testCase("addDate", function () {
        const { $filter: { addDate } } = queryUtils();

        it("Should build filter Op -> Op -> Filter", () => {
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                addDate(e.Date, e.Duration));

            expect(q["$filter"]).toBe("Date add Duration");
        })

        it("Should build filter Op -> Val (str) -> Filter", () => {
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                addDate(e.Date, "ttt"));

            expect(q["$filter"]).toBe("Date add ttt");
        })

        it("Should build filter Op -> Val (num) -> Filter", () => {
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                addDate(e.Date, 3344));

            expect(q["$filter"]).toBe("Date add duration'P0DT0H0M3.344S'");
        })

        it("Should build filter Op -> Val (class) -> Filter", () => {
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                addDate(e.Date, ODataDuration.fromMinutes(-90)));

            expect(q["$filter"]).toBe("Date add duration'-P0DT1H30M0.000S'");
        })

        it("Should build filter Val (str) -> Op -> Filter", () => {
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                addDate("asasasasas", e.Duration));

            expect(q["$filter"]).toBe("asasasasas add Duration");
        })

        it("Should build filter Val (date) -> Op -> Filter", () => {
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                addDate(new Date(1987, 3, 4), e.Duration));

            expect(q["$filter"]).toBe("1987-04-04 add Duration");
        })

        it("Should build filter Val (class) -> Op -> Filter", () => {
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                addDate(new ODataDate({ y: 1988, M: 8, d: 7 }), e.Duration));

            expect(q["$filter"]).toBe("1988-08-07 add Duration");
        })
    });

    testCase("subDate", function () {
        const { $filter: { subDate } } = queryUtils();

        it("Should build filter Op -> Op -> Filter", () => {
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                subDate(e.Date, e.Duration));

            expect(q["$filter"]).toBe("Date sub Duration");
        })

        it("Should build filter Op -> Val (str) -> Filter", () => {
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                subDate(e.Date, "strstr"));

            expect(q["$filter"]).toBe("Date sub strstr");
        })

        it("Should build filter Op -> Val (num) -> Filter", () => {
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                subDate(e.Date, 34545));

            expect(q["$filter"]).toBe("Date sub duration'P0DT0H0M34.545S'");
        })

        it("Should build filter Op -> Val (class) -> Filter", () => {
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                subDate(e.Date, new ODataDuration({ s: -6677 })));

            expect(q["$filter"]).toBe("Date sub duration'-P0DT0H0M6677.000S'");
        })

        it("Should build filter Val (str) -> Op -> Filter", () => {
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                subDate("strstr", e.Duration));

            expect(q["$filter"]).toBe("strstr sub Duration");
        })

        it("Should build filter Val (date) -> Op -> Filter", () => {
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                subDate(new Date(1888, 3, 4), e.Duration));

            expect(q["$filter"]).toBe("1888-04-04 sub Duration");
        })

        it("Should build filter Val (class) -> Op -> Filter", () => {
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                subDate(new ODataDate({ y: 1999, M: 7, d: 3 }), e.Duration));

            expect(q["$filter"]).toBe("1999-07-03 sub Duration");
        })
    });

    testCase("addDuration", function () {
        const { $filter: { addDuration } } = queryUtils();

        it("Should build filter Op -> Op -> Filter", () => {
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                addDuration(e.Duration, e.Duration));

            expect(q["$filter"]).toBe("Duration add Duration");
        })

        it("Should build filter Op -> Val (str) -> Filter", () => {
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                addDuration(e.Duration, "strstr"));

            expect(q["$filter"]).toBe("Duration add strstr");
        })

        it("Should build filter Op -> Val (num) -> Filter", () => {
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                addDuration(e.Duration, 5654645));

            expect(q["$filter"]).toBe("Duration add duration'P0DT1H34M14.645S'");
        })

        it("Should build filter Op -> Val (class) -> Filter", () => {
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                addDuration(e.Duration, new ODataDuration({ s: -6677 })));

            expect(q["$filter"]).toBe("Duration add duration'-P0DT0H0M6677.000S'");
        })

        it("Should build filter Val (str) -> Op -> Filter", () => {
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                addDuration("strstr", e.Duration));

            expect(q["$filter"]).toBe("strstr add Duration");
        })

        it("Should build filter Val (num) -> Op -> Filter", () => {
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                addDuration(-6543435, e.Duration));

            expect(q["$filter"]).toBe("duration'-P0DT1H49M3.435S' add Duration");
        })

        it("Should build filter Val (class) -> Op -> Filter", () => {
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                addDuration(new ODataDuration({ s: -6677 }), e.Duration));

            expect(q["$filter"]).toBe("duration'-P0DT0H0M6677.000S' add Duration");
        })
    });

    testCase("subDuration", function () {
        const { $filter: { subDuration } } = queryUtils();

        it("Should build filter Op -> Op -> Filter", () => {
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                subDuration(e.Duration, e.Duration));

            expect(q["$filter"]).toBe("Duration sub Duration");
        })

        it("Should build filter Op -> Val (str) -> Filter", () => {
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                subDuration(e.Duration, "strstr"));

            expect(q["$filter"]).toBe("Duration sub strstr");
        })

        it("Should build filter Op -> Val (num) -> Filter", () => {
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                subDuration(e.Duration, -45654));

            expect(q["$filter"]).toBe("Duration sub duration'-P0DT0H0M45.654S'");
        })

        it("Should build filter Op -> Val (class) -> Filter", () => {
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                subDuration(e.Duration, new ODataDuration({ s: -6677 })));

            expect(q["$filter"]).toBe("Duration sub duration'-P0DT0H0M6677.000S'");
        })

        it("Should build filter Val (str) -> Op -> Filter", () => {
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                subDuration("strstr", e.Duration));

            expect(q["$filter"]).toBe("strstr sub Duration");
        })

        it("Should build filter Val (num) -> Op -> Filter", () => {
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                subDuration(5709456, e.Duration));

            expect(q["$filter"]).toBe("duration'P0DT1H35M9.456S' sub Duration");
        })

        it("Should build filter Val (class) -> Op -> Filter", () => {
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                subDuration(new ODataDuration({ s: -6677 }), e.Duration));

            expect(q["$filter"]).toBe("duration'-P0DT0H0M6677.000S' sub Duration");
        })
    });

    testCase("mulDuration", function () {
        const { $filter: { mulDuration } } = queryUtils();

        it("Should build filter Op -> Op -> Filter", () => {
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                mulDuration(e.Duration, e.Int32));

            expect(q["$filter"]).toBe("Duration mul Int32");
        })

        it("Should build filter Op -> Val (num) -> Filter", () => {
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                mulDuration(e.Duration, -8758758577));

            expect(q["$filter"]).toBe("Duration mul -8758758577");
        })

        it("Should build filter Val (num) -> Op -> Filter", () => {
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                mulDuration(10056546546, e.Int32));

            expect(q["$filter"]).toBe("duration'P116DT9H29M6.546S' mul Int32");
        })
    });

    testCase("divDuration", function () {
        const { $filter: { divDuration } } = queryUtils();

        it("Should build filter Op -> Op -> Filter", () => {
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                divDuration(e.Duration, e.Int16));

            expect(q["$filter"]).toBe("Duration div Int16");
        })

        it("Should build filter Op -> Val (num) -> Filter", () => {
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                divDuration(e.Duration, 709));

            expect(q["$filter"]).toBe("Duration div 709");
        })

        it("Should build filter Val (num) -> Op -> Filter", () => {
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                divDuration(43097534, e.Decimal));

            expect(q["$filter"]).toBe("duration'P0DT11H58M17.534S' div Decimal");
        })
    });

    testCase("divByDuration", function () {
        const { $filter: { divByDuration } } = queryUtils();

        it("Should build filter Op -> Op -> Filter", () => {
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                divByDuration(e.Duration, e.Int16));

            expect(q["$filter"]).toBe("Duration divby Int16");
        })

        it("Should build filter Op -> Val (num) -> Filter", () => {
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                divByDuration(e.Duration, 709));

            expect(q["$filter"]).toBe("Duration divby 709");
        })

        it("Should build filter Val (num) -> Op -> Filter", () => {
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                divByDuration(43097534, e.Decimal));

            expect(q["$filter"]).toBe("duration'P0DT11H58M17.534S' divby Decimal");
        })
    });

    testCase("now", function () {
        it("Should work", () => {
            const { $filter: { now } } = queryUtils();
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                now());

            expect(q["$filter"]).toBe("now()");
        });
    });

    testCase("maxDateTime", function () {
        it("Should work", () => {
            const { $filter: { maxDateTime } } = queryUtils();
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                maxDateTime());

            expect(q["$filter"]).toBe("maxdatetime()");
        });
    });

    testCase("minDateTime", function () {
        it("Should work", () => {
            const { $filter: { minDateTime } } = queryUtils();
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                minDateTime());

            expect(q["$filter"]).toBe("mindatetime()");
        });
    });

    testCase("date", function () {
        it("Should work", () => {
            const { $filter: { date } } = queryUtils();
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                date(e.DateTimeOffset));

            expect(q["$filter"]).toBe("date(DateTimeOffset)");
        });
    });

    testCase("time", function () {
        it("Should work", () => {
            const { $filter: { time } } = queryUtils();
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                time(e.DateTimeOffset));

            expect(q["$filter"]).toBe("time(DateTimeOffset)");
        });
    });

    testCase("totalOffsetMinutes", function () {
        it("Should work", () => {
            const { $filter: { totalOffsetMinutes } } = queryUtils();
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                totalOffsetMinutes(e.DateTimeOffset));

            expect(q["$filter"]).toBe("totaloffsetminutes(DateTimeOffset)");
        });
    });

    testCase("totalSeconds", function () {
        it("Should work", () => {
            const { $filter: { totalSeconds } } = queryUtils();
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                totalSeconds(e.Duration));

            expect(q["$filter"]).toBe("totalseconds(Duration)");
        });
    });

    testCase("month", function () {
        it("Should work (1)", () => {
            const { $filter: { month } } = queryUtils();
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                month(e.DateTimeOffset));

            expect(q["$filter"]).toBe("month(DateTimeOffset)");
        });

        it("Should work (2)", () => {
            const { $filter: { month } } = queryUtils();
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                month(e.Date));

            expect(q["$filter"]).toBe("month(Date)");
        });
    });

    testCase("day", function () {
        it("Should work (1)", () => {
            const { $filter: { day } } = queryUtils();
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                day(e.DateTimeOffset));

            expect(q["$filter"]).toBe("day(DateTimeOffset)");
        });

        it("Should work (2)", () => {
            const { $filter: { day } } = queryUtils();
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                day(e.Date));

            expect(q["$filter"]).toBe("day(Date)");
        });
    });

    testCase("year", function () {
        it("Should work (1)", () => {
            const { $filter: { year } } = queryUtils();
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                year(e.DateTimeOffset));

            expect(q["$filter"]).toBe("year(DateTimeOffset)");
        });

        it("Should work (2)", () => {
            const { $filter: { year } } = queryUtils();
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                year(e.Date));

            expect(q["$filter"]).toBe("year(Date)");
        });
    });

    testCase("fractionalSeconds", function () {
        it("Should work (1)", () => {
            const { $filter: { fractionalSeconds } } = queryUtils();
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                fractionalSeconds(e.DateTimeOffset));

            expect(q["$filter"]).toBe("fractionalseconds(DateTimeOffset)");
        });

        it("Should work (2)", () => {
            const { $filter: { fractionalSeconds } } = queryUtils();
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                fractionalSeconds(e.TimeOfDay));

            expect(q["$filter"]).toBe("fractionalseconds(TimeOfDay)");
        });
    });

    testCase("minute", function () {
        it("Should work (1)", () => {
            const { $filter: { minute } } = queryUtils();
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                minute(e.DateTimeOffset));

            expect(q["$filter"]).toBe("minute(DateTimeOffset)");
        });

        it("Should work (2)", () => {
            const { $filter: { minute } } = queryUtils();
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                minute(e.TimeOfDay));

            expect(q["$filter"]).toBe("minute(TimeOfDay)");
        });
    });

    testCase("hour", function () {
        it("Should work (1)", () => {
            const { $filter: { hour } } = queryUtils();
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                hour(e.DateTimeOffset));

            expect(q["$filter"]).toBe("hour(DateTimeOffset)");
        });

        it("Should work (2)", () => {
            const { $filter: { hour } } = queryUtils();
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                hour(e.TimeOfDay));

            expect(q["$filter"]).toBe("hour(TimeOfDay)");
        });
    });

    testCase("second", function () {
        it("Should work (1)", () => {
            const { $filter: { second } } = queryUtils();
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                second(e.DateTimeOffset));

            expect(q["$filter"]).toBe("second(DateTimeOffset)");
        });

        it("Should work (2)", () => {
            const { $filter: { second } } = queryUtils();
            const q = queryBuilder<My.Odata.Entities.QueryableOneOfEverything>("My.Odata.Entities.OneOfEverything", e =>
                second(e.TimeOfDay));

            expect(q["$filter"]).toBe("second(TimeOfDay)");
        });
    });

    testCase("caseExpression", function () {

        it("Should work correctly (success)", function () {
            const { $filter: { caseExpression, eq, filterRaw } } = queryUtils();
            const q = queryBuilder<My.Odata.Entities.QueryableUser>("My.Odata.Entities.User", u =>
                caseExpression(
                    [eq(u.Id, "111"), filterRaw("true", NonNumericTypes.Boolean)],
                    [eq(u.Id, "222"), filterRaw("false", NonNumericTypes.Boolean)],
                    [true, filterRaw("false", NonNumericTypes.Boolean)]
                ));

            expect(q["$filter"]).toBe("case(Id eq '111':true,Id eq '222':false,true:false)");
        });
    });
});

