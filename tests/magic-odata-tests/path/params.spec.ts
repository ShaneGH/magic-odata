
import { My, ODataClient } from "../generatedCode.js";
import { addBlog, addBlogPost, addComment, addFullUserChain, addUser } from "../utils/client.js";
import { uniqueString } from "../utils/utils.js";
import { ODataCollectionResult, WithKeyType } from "magic-odata-client";
import { RequestOptions, ResponseInterceptor } from "magic-odata-client";
import { defaultUriInterceptor, oDataClient, uriClient } from "../utils/odataClient.js";
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

describe("@Params", () => {
    describe("primitive const", () => {
        it("Should add param to path", async function () {
            const user = await addFullUserChain({ blogPostContent: "word1 word2" });
            await addBlogPost(user.blog.Id, "word3")

            const wordCount = await oDataClient.Blogs
                .withKey(k => k.key(user.blog.Id))
                .subPath((x, params) => x.WordCount({
                    filterCommentsOnly: params.createConst("x", true)
                }))
                .get();

            expect(wordCount.value).toBe(2);
        })

        it("Should add param to key", async function () {
            const user = await addFullUserChain({ blogPostContent: "word1 word2" });

            const blog = await oDataClient.Blogs
                .withKey((k, params) => k.key(params.createConst("x", user.blog.Id)))
                .get();

            expect(blog.Name).toBe(user.blog.Name);
        })

        it("Should add param to query", async function () {
            const user = await addFullUserChain({ blogPostContent: "word1 word2" });

            const blog = await oDataClient.Blogs
                .withQuery((b, { $filter: { eq, or } }, params) => or(
                    eq(b.Id, params.createConst("@x", user.blog.Id)),
                    eq(b.Id, params.param("x"))
                ))
                .get();

            expect(blog.value.length).toBe(1);
            expect(blog.value[0].Name).toBe(user.blog.Name);
        })

        it("Should add param to $filter embedded in $expand", function () {

            const blog = oDataClient.Blogs
                .withQuery((b, { $filter: { eq }, $expand: { expand } }, params) =>
                    expand(b.User, u => eq(u.Score, params.createConst("@x", 123))))
                .uri(false);

            expect(defaultUriInterceptor(blog)).toBe("http://localhost:5432/odata/test-entities/Blogs?$expand=User($filter=Score eq @x)&@x=123");
        })

        it("Should throw error if same param used twice in query (1)", function () {
            try {
                oDataClient.Blogs
                    .withQuery((b, { $filter: { eq, or } }, params) => or(
                        eq(b.Id, params.createConst("x", "123")),
                        eq(b.Id, params.createConst("x", "123"))
                    ))
                    .get();

                expect(1).toBe(2)
            } catch (e: any) {
                expect(e.message).toContain("@x")
            }
        })

        it("Should throw error if same param used twice in query (2)", function () {
            try {
                oDataClient.Blogs
                    .withQuery((b, { $filter: { eq, or } }, params) => or(
                        eq(b.Id, params.createRef("x", x => x.My.Odata.Container.AppDetails.subPath(a => a.AppName))),
                        eq(b.Id, params.createRef("x", x => x.My.Odata.Container.AppDetails.subPath(a => a.AppName)))
                    ))
                    .get();

                expect(1).toBe(2)
            } catch (e: any) {
                expect(e.message).toContain("@x")
            }
        })

        it("Should throw error if same param used twice in query (3)", function () {
            try {
                oDataClient.Blogs
                    .withQuery((b, { $filter: { eq, or } }, params) => or(
                        eq(b.Id, params.createRef("x", x => x.My.Odata.Container.AppDetails.subPath(a => a.AppName))),
                        eq(b.Id, params.createConst("x", "123"))
                    ))
                    .get();

                expect(1).toBe(2)
            } catch (e: any) {
                expect(e.message).toContain("@x")
            }
        })

        it("Should throw error if same param used twice in different scopes (1)", function () {
            try {
                oDataClient.Blogs
                    .withKey((k, params) => k.key(params.createRef("x", x => x.My.Odata.Container.AppDetails.subPath(a => a.AppName))))
                    .withQuery((b, { $filter: { eq } }, params) =>
                        eq(b.Id, params.createConst("x", "123")))
                    .get();

                expect(1).toBe(2)
            } catch (e: any) {
                expect(e.message).toContain("@x")
            }
        })

        it("Should throw error if same param used twice in different scopes (2)", function () {
            try {
                oDataClient.Blogs
                    .withKey(k => k.key("123"))
                    .subPath((x, params) => x.WordCount({
                        filterCommentsOnly: params.createConst("x", true)
                    }))
                    .withQuery((b, { $filter: { eq } }, params) =>
                        eq(b, params.createRef("x", x => x.My.Odata.Container.OneOfEverythings.subPath(a => a.$count))))
                    .get();

                expect(1).toBe(2)
            } catch (e: any) {
                expect(e.message).toContain("@x")
            }
        })

        it("Should throw error if same param used twice in different scopes (3)", function () {
            try {
                oDataClient.Blogs
                    .withKey((k, params) => k.key(params.createRef("x", x => x.My.Odata.Container.AppDetails.subPath(a => a.AppName))))
                    .subPath((x, params) => x.WordCount({
                        filterCommentsOnly: params.createConst("x", true)
                    }))
                    .get();

                expect(1).toBe(2)
            } catch (e: any) {
                expect(e.message).toContain("@x")
            }
        })
    });

    describe("enum const", () => {

        const userP = addFullUserChain({
            userType: My.Odata.Entities.UserType.Admin,
            userProfileType: My.Odata.Entities.UserProfileType.Standard
        });

        describe("Numeric enum", () => {
            it("Should add param to path (1)", executePath.bind(null, true))
            it("Should add param to path (2)", executePath.bind(null, false))

            async function executePath(success: boolean) {
                const user = await userP

                const isType = await oDataClient.Users
                    .withKey(k => k.key(user.blogUser.Id))
                    .subPath((x, params) => x.IsType({
                        userType: params.createConst("x", success
                            ? My.Odata.Entities.UserType.Admin
                            : My.Odata.Entities.UserType.User)
                    }))
                    .get();

                expect(isType.value).toBe(success);
            }

            it("Should add param to path key (1)", executePathKey.bind(null, My.Odata.Entities.UserType.Admin))
            it("Should add param to path key (2)", executePathKey.bind(null, My.Odata.Entities.UserType.User))

            async function executePathKey(type: My.Odata.Entities.UserType) {
                const result = await oDataClient.UserRoles
                    .withKey((x, params) => x.key(params.createConst("x", type)))
                    .get();

                expect(result.Key).toBe(My.Odata.Entities.UserType[type]);
            }
        })

        describe("String enum", () => {
            it("Should add param to path (1)", execute.bind(null, true))
            it("Should add param to path (2)", execute.bind(null, false))

            async function execute(success: boolean) {
                const user = await userP

                const isType = await oDataClient.Users
                    .withKey(k => k.key(user.blogUser.Id))
                    .subPath((x, params) => x.IsProfileType({
                        userProfileType: params.createConst("x", success
                            ? My.Odata.Entities.UserProfileType.Standard
                            : My.Odata.Entities.UserProfileType.Advanced)
                    }))
                    .get();

                expect(isType.value).toBe(success);
            }
        })
    })

    describe("raw param", () => {

        describe("Numeric enum", () => {
            it("Should add param to path (1)", function () {

                const uri = oDataClient.Users
                    .withKey(k => k.key("123"))
                    .subPath((x, params) => x.IsType({
                        userType: params.createRawConst("x", "'some%thing'")
                    }))
                    .uri(true);

                expect(uri.relativePath).toBe("Users('123')/IsType(userType=%40x)");
                expect(uri.query["@x"]).toBe("'some%25thing'");
            })
        })
    })

    describe("complex const", () => {
        it("Should throw error if same param used twice in different scopes (3)", async function () {
            const tag = uniqueString("comment_tag_")
            const ctxt = await addFullUserChain({ commentTags: [{ Tag: tag }] })
            const result = await oDataClient.Comments
                .subPath((x, params) => x.GetCommentsByTag({ input: params.createConst("x", { Tag: { Tag: tag } }) }))
                .get();

            expect(result.value!.length).toBe(1)
            expect(result.value![0].Id).toBe(ctxt.comment.Id)
        });
    });

    describe("null complex const", () => {
        it("Should throw error if same param used twice in different scopes (3)", async function () {
            const tag = uniqueString("comment_tag_")
            const ctxt = await addFullUserChain({ commentTags: [{ Tag: tag }] })
            const result = await oDataClient
                .unboundFunctions((x, params) => x.Calculator4({
                    lhs: params.createConst("x", null),
                    rhs: params.param("x")
                }))
                .get();

            expect(result.value).toBe(0)
        });
    });

    describe("Entity const", () => {

        it("Should reference another entity ref (1)", execute.bind(null, true));
        it("Should reference another entity ref (2)", execute.bind(null, false));

        async function execute(expected: boolean) {
            const ctxt = await addFullUserChain()
            const hasBlog = await oDataClient.Users
                .withKey(k => k.key(expected ? ctxt.blogUser.Id : "invalid"))
                .subPath((u, params) => u.HasBlog({
                    blog: params.createConst("x", { Id: ctxt.blog.Id } as My.Odata.Entities.Blog)
                }))
                .get();

            expect(hasBlog.value).toBe(expected)
        }
    });

    describe("Reference", () => {
        it("Should reference another entity id", function () {
            const uriBuilder = oDataClient.Blogs
                .withKey((k, params) => k
                    .key(params.createRef("x", root => root.My.Odata.Container.BlogPosts
                        .withKey(x => x.key("213"))
                        .subPath(x => x.Blog)
                        .subPath(x => x.Id))))

            const uri1 = defaultUriInterceptor(uriBuilder.uri(false));
            const uri2 = defaultUriInterceptor(uriBuilder.uri(true));

            const ref = JSON.stringify({ "@odata.id": "http://localhost:5432/odata/test-entities/BlogPosts('213')/Blog/Id" })
            expect(uri1).toBe(`http://localhost:5432/odata/test-entities/Blogs(%40x)?@x=${ref}`)
            expect(uri2).toBe(`http://localhost:5432/odata/test-entities/Blogs(%40x)?@x=${encodeURIComponent(ref)}`)
        });

        describe("Entity ref", () => {

            it("Should reference another entity ref (1)", execute.bind(null, true));
            it("Should reference another entity ref (2)", execute.bind(null, false));

            async function execute(expected: boolean) {
                const ctxt = await addFullUserChain()
                const hasBlog = await oDataClient.Users
                    .withKey(k => k.key(expected ? ctxt.blogUser.Id : "invalid"))
                    .subPath((u, params) => u.HasBlog({
                        blog: params.createRef("x", root => root.My.Odata.Container.Blogs
                            .withKey(x => x.key(ctxt.blog.Id)))
                    }))
                    .get();

                expect(hasBlog.value).toBe(expected)
            }
        });
    });

    describe("Unbound function", () => {
        it("Should work correctly", async function () {
            const result = await oDataClient
                .unboundFunctions((f, params) => f.Calculator({
                    lhs: params.createConst("x", 1),
                    rhs: params.param("x")
                }))
                .get()

            expect(result.value).toBe(2)
        });
    });
});