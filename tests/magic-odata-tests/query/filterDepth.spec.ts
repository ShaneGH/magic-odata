
import { addFullUserChain } from "../utils/client.js";
import { My, ODataClient, rootConfigExporter } from "../generatedCode.js";
import { buildQuery, Query, QueryComplexObject, queryUtils, RequestOptions } from "magic-odata-client";
import { uniqueString } from "../utils/utils.js";
import { describeEntityRelationship as testCase, verifyEntityRelationships } from "../correctness/entityRelationships.js";
import { buildComplexTypeRef } from "magic-odata-client";

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

function toListRequestInterceptor(_: any, r: RequestOptions): RequestOptions {
    return {
        ...r,
        headers: [
            ...(r.headers || []),
            ["ToList", "true"]
        ]
    }
}

describe("Query.Filter Depth", function () {

    afterAll(verifyEntityRelationships);

    // BlogName -> BlogName
    testCase("Simple -> Simple", function () {

        it("Should filter (success)", execute.bind(null, true));
        it("Should filter (failure)", execute.bind(null, false))

        async function execute(success: boolean) {

            const uniqueWord = uniqueString("FilterByWord")
            const user = await addFullUserChain({
                blogPostContent: `Blog ${uniqueWord}`
            });

            const word = success
                ? uniqueWord
                : uniqueString("FilterByWord");

            const result = await client.BlogPosts
                .withKey(x => x.key(user.blogPost.Id!))
                .subPath(x => x.Words)
                .withQuery((n, { filter: { eq, and } }) => eq(n, word))
                .get();

            if (success) {
                expect(result.value.length).toBe(1);
                expect(result.value[0]).toBe(word);
            } else {
                expect(result.value.length).toBe(0);
            }
        }
    });

    // BlogName -> BlogName
    testCase("Singleton -> Simple", function () {

        it("Should filter (success)", execute.bind(null, true));
        it("Should filter (failure)", execute.bind(null, false))

        async function execute(success: boolean) {

            const word = success
                ? "Blog"
                : "Invalid";

            const result = await client.AppDetails
                .subPath(x => x.AppNameWords)
                .withQuery((w, { filter: { eq, and } }) => eq(w, word))
                .get();

            if (success) {
                expect(result.value.length).toBe(1);
                expect(result.value[0]).toBe(word);
            } else {
                expect(result.value.length).toBe(0);
            }
        }
    });

    // BlogPost, Blog, Name
    testCase("Complex -> Complex -> Simple", function () {

        it("Should filter (success)", execute.bind(null, true));
        it("Should filter (failure)", execute.bind(null, false))

        async function execute(success: boolean) {

            const user = await addFullUserChain();
            const blogName = success
                ? user.blog.Name
                : "Not a valid name";

            const result = await client.BlogPosts.withQuery((bp, { filter: { eq, and } }) =>
                and(
                    eq(bp.Id, user.blogPost.Id),
                    eq(bp.Blog.Name, blogName)))
                .get();

            if (success) {
                expect(result.value.length).toBe(1);
                expect(result.value[0].Name).toBe(user.blogPost.Name);
            } else {
                expect(result.value.length).toBe(0);
            }
        }
    });

    // User, Blogs, Blog, Name
    testCase("Complex -> Array<Complex> -> Complex -> Simple", function () {

        it("Should filter (success)", execute.bind(null, true));
        it("Should filter (failure)", execute.bind(null, false))

        async function execute(success: boolean) {

            const user = await addFullUserChain();
            const userBlogName = success
                ? user.blog.Name
                : "Not a valid name";

            const result = await client.Users.withQuery((u, { filter: { eq, and, any } }) =>
                and(
                    eq(u.Id, user.blogUser.Id),
                    any(u.Blogs, b1 => eq(b1.Name, userBlogName))))
                .get();

            if (success) {
                expect(result.value.length).toBe(1);
                expect(result.value[0].Name).toBe(user.blogUser.Name);
            } else {
                expect(result.value.length).toBe(0);
            }
        }
    });

    // User, Name
    testCase("Complex -> Simple", function () {

        it("Should filter (success)", execute.bind(null, true));
        it("Should filter (failure)", execute.bind(null, false))

        async function execute(success: boolean) {

            const user = await addFullUserChain();
            const userName = success
                ? user.blogUser.Name
                : "Not a valid name";

            const result = await client.Users.withQuery((u, { filter: { eq, and } }) =>
                and(
                    eq(u.Id, user.blogUser.Id),
                    eq(u.Name, userName)))
                .get();

            if (success) {
                expect(result.value.length).toBe(1);
                expect(result.value[0].Name).toBe(user.blogUser.Name);
            } else {
                expect(result.value.length).toBe(0);
            }
        }
    });

    // User, UserType
    testCase("Complex -> Enum", function () {

        describe("Number enum", () =>
            it("Should be a number", () => expect(typeof My.Odata.Entities.UserType.Admin).toBe("number")));

        it("Should filter with number enum (success)", executeNum.bind(null, true));
        it("Should filter with number enum (failure)", executeNum.bind(null, false))

        async function executeNum(success: boolean) {

            const user = await addFullUserChain({ userType: "Admin" as any });
            const userType = success
                ? My.Odata.Entities.UserType.Admin
                : My.Odata.Entities.UserType.User;

            const result = await client.Users.withQuery((u, { filter: { eq, and } }) =>
                and(
                    eq(u.Id, user.blogUser.Id),
                    eq(u.UserType, userType)))
                .get();

            if (success) {
                expect(result.value.length).toBe(1);
                expect(result.value[0].Name).toBe(user.blogUser.Name);
            } else {
                expect(result.value.length).toBe(0);
            }
        }

        describe("String enum", () =>
            it("Should be a string", () => expect(typeof My.Odata.Entities.UserProfileType.Advanced).toBe("string")));

        it("Should filter with string enum (success)", executeStr.bind(null, true));
        it("Should filter with string enum (failure)", executeStr.bind(null, false))

        async function executeStr(success: boolean) {

            const user = await addFullUserChain({ userProfileType: My.Odata.Entities.UserProfileType.Advanced });
            const userProfileType = success
                ? My.Odata.Entities.UserProfileType.Advanced
                : My.Odata.Entities.UserProfileType.Standard;

            const result = await client.Users.withQuery((u, { filter: { eq, and } }) =>
                and(
                    eq(u.Id, user.blogUser.Id),
                    eq(u.UserProfileType, userProfileType)))
                .get();

            if (success) {
                expect(result.value.length).toBe(1);
                expect(result.value[0].Name).toBe(user.blogUser.Name);
            } else {
                expect(result.value.length).toBe(0);
            }
        }
    });

    // User -> Blogs -> Count
    testCase("Complex -> Array<Complex> -> Count", function () {

        it("Should filter (success)", execute.bind(null, true));
        it("Should filter (failure)", execute.bind(null, false))

        async function execute(success: boolean) {

            const user = await addFullUserChain();
            const expectedCount = success ? 1 : 111;

            const result = await client.Users
                .withQuery((u, { filter: { eq, and, count } }) =>
                    and(
                        eq(u.Id, user.blogUser.Id),
                        eq(count(u.Blogs), expectedCount)))
                .get();

            if (success) {
                expect(result.value.length).toBe(1);
                expect(result.value[0].Name).toBe(user.blogUser.Name);
            } else {
                expect(result.value.length).toBe(0);
            }
        }
    });

    // User -> Blogs -> Blog -> BlogPosts -> BlogPost -> Name
    testCase("Complex -> Array<Complex> -> Complex -> Array<Complex> -> Complex -> Simple", function () {

        it("Should filter (success)", execute.bind(null, true));
        it("Should filter (failure)", execute.bind(null, false))

        async function execute(success: boolean) {

            const user = await addFullUserChain();
            const postName = success
                ? user.blogPost.Name
                : "Not a valid name";

            const result = await client.Users.withQuery((u, { filter: { eq, and, any } }) =>
                and(
                    eq(u.Id, user.blogUser.Id),
                    any(u.Blogs, b => any(b.Posts, bp => eq(bp.Name, postName)))))
                .get();

            if (success) {
                expect(result.value.length).toBe(1);
                expect(result.value[0].Name).toBe(user.blogUser.Name);
            } else {
                expect(result.value.length).toBe(0);
            }
        }
    });

    // BlogPost -> Comments -> Comment -> User -> Name
    testCase("Complex -> Array<Complex> -> Complex -> Complex -> Simple", function () {

        it("Should filter (success)", execute.bind(null, true));
        it("Should filter (failure)", execute.bind(null, false))

        async function execute(success: boolean) {

            const user = await addFullUserChain();
            const userName = success
                ? user.commentUser.Name
                : "Not a valid name";

            const result = await client.BlogPosts.withQuery((bp, { filter: { eq, and, any } }) =>
                and(
                    eq(bp.Id, user.blogPost.Id),
                    any(bp.Comments, c => eq(c.User.Name, userName))))
                .get();

            if (success) {
                expect(result.value.length).toBe(1);
                expect(result.value[0].Name).toBe(user.blogPost.Name);
            } else {
                expect(result.value.length).toBe(0);
            }
        }
    });

    // Blog -> User -> Comments -> Comment -> BlogPost -> Name
    testCase("Complex -> Complex -> Array<Complex> -> Complex -> Complex -> Simple", function () {

        it("Should filter (success)", execute.bind(null, true));
        it("Should filter (failure)", execute.bind(null, false))

        async function execute(success: boolean) {

            const user = await addFullUserChain({ addFullChainToCommentUser: {} });
            const blogPostName = success
                ? user.blogPost.Name
                : "Not a valid name";

            // blogs where the owner user has commented on a blog with a post name "blogPostName"
            const result = await client.Blogs
                .withQuery((b, { filter: { eq, and, any } }) =>
                    and(
                        eq(b.Id, user.commentUserChain!.blog.Id),
                        any(b.User.BlogPostComments, c => eq(c.BlogPost.Name, blogPostName))))
                .get();

            if (success) {
                expect(result.value.length).toBe(1);
                expect(result.value[0].Name).toBe(user.commentUserChain!.blog.Name);
            } else {
                expect(result.value.length).toBe(0);
            }
        }
    });

    // Comment -> User -> Blogs -> Blog -> Name
    testCase("Complex -> Complex -> Array<Complex> -> Complex -> Simple", function () {

        it("Should filter (success)", execute.bind(null, true));
        it("Should filter (failure)", execute.bind(null, false))

        async function execute(success: boolean) {

            const user = await addFullUserChain({ addFullChainToCommentUser: {} });
            const blogName = success
                ? user.commentUserChain!.blog.Name
                : "Not a valid name";

            const result = await client.Comments.withQuery((c, { filter: { eq, and, any } }) =>
                and(
                    eq(c.Id, user.comment.Id),
                    any(c.User.Blogs, b => eq(b.Name, blogName))))
                .get();

            if (success) {
                expect(result.value.length).toBe(1);
                expect(result.value[0].Title).toBe(user.comment.Title);
            } else {
                expect(result.value.length).toBe(0);
            }
        }
    });

    // BlogPost, Words, Word
    testCase("Complex -> Array<Simple> -> Simple", function () {

        it("Should filter (success)", execute.bind(null, true));
        it("Should filter (failure)", execute.bind(null, false))

        async function execute(success: boolean) {

            const blogPostText = uniqueString("custom_blog_post_")
            const user = await addFullUserChain({ blogPostContent: blogPostText });
            const blogPostWord = success
                ? blogPostText
                : "Not a valid name";

            const result = await client.BlogPosts
                .withQuery((bp, { filter: { eq, and, any } }) =>
                    and(
                        eq(bp.Id, user.blogPost.Id),
                        any(bp.Words, w => eq(w, blogPostWord))))
                .get({ requestInterceptor: toListRequestInterceptor });

            if (success) {
                expect(result.value.length).toBe(1);
                expect(result.value[0].Name).toBe(user.blogPost.Name);
            } else {
                expect(result.value.length).toBe(0);
            }
        }
    });

    function qb<T>(fullName: string, q: (x: QueryComplexObject<T>) => Query | Query[]) {

        const dot = fullName.lastIndexOf(".");
        const namespace = dot === -1 ? "" : fullName.substring(0, dot)
        const name = dot === -1 ? fullName : fullName.substring(dot + 1)
        const type = rootConfig.types[namespace] && rootConfig.types[namespace][name]
        if (!type || type.containerType !== "ComplexType") {
            throw new Error(fullName);
        }

        const typeRef: QueryComplexObject<T> = buildComplexTypeRef(type.type, rootConfig.types);
        return buildQuery(q(typeRef), false)
    }

    const { filter: { hassubset, any, eq, and } } = queryUtils();

    // BlogPost, Words, HasSubset
    testCase("Complex -> Array<Simple> -> HasSubset", function () {

        it("Should build filter (server can't process)", () => {
            const q = qb<My.Odata.Entities.QueryableBlogPost>("My.Odata.Entities.BlogPost", bp =>
                hassubset(bp.Words, ["something"]))

            expect(q["$filter"]).toBe("hassubset(Words,['something'])");
        });
    });

    // BlogPost, Comments, Comment, Words, Word
    testCase("Complex -> Array<Complex> -> Complex -> Array<Simple> -> Simple", function () {

        it("Should build filter (server can't process)", () => {
            const q = qb<My.Odata.Entities.QueryableBlogPost>("My.Odata.Entities.BlogPost", bp =>
                any(bp.Comments, c => any(c.Words, w => eq(w, "something"))))

            expect(q["$filter"]).toBe("Comments/any(c:c/Words/any(w:w eq 'something'))");
        });
    });

    // Blog -> BlogPosts -> BlogPost -> Words -> Word
    testCase("Complex -> Array<Complex> -> Complex -> Array<Simple> -> Simple", function () {

        it("Should build filter (server can't process)", () => {
            const q = qb<My.Odata.Entities.QueryableBlog>("My.Odata.Entities.Blog", b =>
                and(
                    any(b.Posts, b => any(b.Words, w => eq(w, "something")))))

            expect(q["$filter"]).toBe("Posts/any(p:p/Words/any(w:w eq 'something'))");
        });
    });

    // BlogPost -> Comments -> Comment -> Words -> HasSubset
    testCase("Complex -> Array<Complex> -> Complex -> Array<Simple> -> HasSubset", function () {

        it("Should build filter (server can't process)", () => {
            const q = qb<My.Odata.Entities.QueryableBlogPost>("My.Odata.Entities.BlogPost", bp =>
                any(bp.Comments, c => any(c.Words, w => eq(w, "something"))))

            expect(q["$filter"]).toBe("Comments/any(c:c/Words/any(w:w eq 'something'))");
        });
    });

    // BlogPost -> Words -> Word
    testCase("Complex -> Array<Simple> -> Simple", function () {

        it("Should build filter (server can't process)", () => {
            const q = qb<My.Odata.Entities.QueryableBlogPost>("My.Odata.Entities.BlogPost", b =>
                any(b.Words, w => eq(w, "something")))

            expect(q["$filter"]).toBe("Words/any(w:w eq 'something')");
        });
    });

    // Comment -> BlogPost -> Words -> Word
    testCase("Complex -> Complex -> Array<Simple> -> Simple", function () {

        it("Should build filter (server can't process)", () => {
            const q = qb<My.Odata.Entities.QueryableComment>("My.Odata.Entities.Comment", c =>
                any(c.BlogPost.Words, w => eq(w, "something")))

            expect(q["$filter"]).toBe("BlogPost/Words/any(w:w eq 'something')");
        });
    });

    // Comment -> BlogPost -> Words -> HasSubset
    testCase("Complex -> Complex -> Array<Simple> -> HasSubset", function () {

        it("Should build filter (server can't process)", () => {
            const q = qb<My.Odata.Entities.QueryableComment>("My.Odata.Entities.Comment", c =>
                hassubset(c.BlogPost.Words, ["something"]))

            expect(q["$filter"]).toBe("hassubset(BlogPost/Words,['something'])");
        });
    });

    // User -> Comments -> Comment -> BlogPost -> Words -> HasSubset
    testCase("Complex -> Array<Complex> -> Complex -> Complex -> Array<Simple> -> HasSubset", function () {

        it("Should build filter (server can't process)", () => {
            const q = qb<My.Odata.Entities.QueryableUser>("My.Odata.Entities.User", u =>
                any(u.BlogPostComments, c => hassubset(c.BlogPost.Words, ["something"])))

            expect(q["$filter"]).toBe("BlogPostComments/any(bpc:hassubset(bpc/BlogPost/Words,['something']))");
        });
    });

    // User -> Comments -> Comment -> BlogPost -> Words -> Word
    testCase("Complex -> Array<Complex> -> Complex -> Complex -> Array<Simple> -> Simple", function () {

        it("Should build filter (server can't process)", () => {
            const q = qb<My.Odata.Entities.QueryableUser>("My.Odata.Entities.User", u =>
                any(u.BlogPostComments, c => any(c.BlogPost.Words, w => eq(w, "something"))))

            expect(q["$filter"]).toBe("BlogPostComments/any(bpc:bpc/BlogPost/Words/any(w:w eq 'something'))");
        });
    });

    //
    testCase("Complex -> Complex -> Array<Complex> -> Complex -> Array<Simple> -> HasSubset", function () {

        it("Should build filter (server can't process)", () => {
            const q = qb<My.Odata.Entities.QueryableComment>("My.Odata.Entities.Comment", c =>
                hassubset(c.BlogPost.Words, ["something"]))

            expect(q["$filter"]).toBe("hassubset(BlogPost/Words,['something'])");
        });
    });

    // This one doesn't work in real life. Might need to amend it if there
    // is a server query working
    // Comment -> BlogPost -> Comments -> Comment -> Words -> Word
    testCase("Complex -> Complex -> Array<Complex> -> Complex -> Array<Simple> -> Simple", function () {

        it("Should build filter (server can't process)", () => {
            const q = qb<My.Odata.Entities.QueryableComment>("My.Odata.Entities.Comment", c1 =>
                any(c1.BlogPost.Comments, c2 => any(c2.Words, w => eq(w, "something"))))

            expect(q["$filter"]).toBe("BlogPost/Comments/any(c:c/Words/any(w:w eq 'something'))");
        });
    });
});

