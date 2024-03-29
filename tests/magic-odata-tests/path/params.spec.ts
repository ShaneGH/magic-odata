
import { My, ODataClient } from "../generatedCode.js";
import { addBlog, addBlogPost, addComment, addFullUserChain, addUser } from "../utils/client.js";
import { uniqueString } from "../utils/utils.js";
import { NonNumericTypes, ODataCollectionResult, RefType, WithKeyType } from "magic-odata-client";
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

                expect(uri.relativePath).toBe("Users('123')/IsType(userType%3D%40x)");
                expect(uri.query[encodeURIComponent("@x")]).toBe("'some%25thing'");
            })
        })
    })

    describe("collection", () => {

        it("Should process collection param (encode)", execute.bind(null, true));
        it("Should process collection param", execute.bind(null, false));

        function execute(encode: boolean) {
            const result = oDataClient.Blogs
                .withKey(k => k.key("1"))
                .subPath((b, params) => b.AcceptsGuids({
                    theGuids: params.createRefCollection("x", [
                        params.createRef("x", x =>
                            x.My.Odata.Container.Users.withKey(k => k.key("777")).subPath(x => x.Id), RefType.RefObject),
                        params.createRef("l", x =>
                            x.My.Odata.Container.Users.withKey(k => k.key("888")).subPath(x => x.Id), RefType.$root),
                        params.createConst("x", "xxx"),
                        params.createConst("x", "yyy", NonNumericTypes.String)
                    ])
                }))
                .uri(encode)

            const results = [
                '{"@odata.id":"http://localhost:5432/odata/test-entities/Users(\'777\')/Id"}',
                "$root/Users('888')/Id",
                'xxx',
                "'yyy'"
            ]

            if (encode) {
                expect(result.relativePath).toBe("Blogs('1')/AcceptsGuids(theGuids%3D%40x)")
                expect(result.query["%40x"]).toBe(encodeURIComponent(`[${results}]`))
            } else {
                expect(result.relativePath).toBe("Blogs('1')/AcceptsGuids(theGuids=@x)")
                expect(result.query["@x"]).toBe(`[${results}]`)
            }
        }
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
        describe("Serialize as $root/", () => {

            it("should work (1)", execute.bind(null, RefType.$root))
            it("should work (1)", execute.bind(null, RefType.RefObject))

            function execute(refType: RefType) {
                const uriBuilder = oDataClient.Blogs
                    .withKey((k, params) => k
                        .key(params.createRef("x", root => root.My.Odata.Container.BlogPosts
                            .withKey(x => x.key("213"))
                            .subPath(x => x.Blog)
                            .subPath(x => x.Id), refType)))

                const uri1 = defaultUriInterceptor(uriBuilder.uri(false));
                const uri2 = defaultUriInterceptor(uriBuilder.uri(true));

                const ref = refType === RefType.RefObject
                    ? JSON.stringify({ "@odata.id": "http://localhost:5432/odata/test-entities/BlogPosts('213')/Blog/Id" })
                    : "$root/BlogPosts('213')/Blog/Id"
                expect(uri1).toBe(`http://localhost:5432/odata/test-entities/Blogs(@x)?@x=${ref}`)
                expect(uri2).toBe(`http://localhost:5432/odata/test-entities/Blogs(%40x)?%40x=${encodeURIComponent(ref)}`)
            }
        })

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
            expect(uri1).toBe(`http://localhost:5432/odata/test-entities/Blogs(@x)?@x=${ref}`)
            expect(uri2).toBe(`http://localhost:5432/odata/test-entities/Blogs(%40x)?%40x=${encodeURIComponent(ref)}`)
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

    describe("Order by", () => {
        it("Should work correctly", function () {
            const result = oDataClient.Users
                .withQuery((u, { $orderby: { orderBy } }, params) =>
                    orderBy([params.createConst("x", "yyy", NonNumericTypes.String), "asc"]))
                .uri(false)

            expect(result.query.$orderBy).toBe("@x asc")
            expect(result.query["@x"]).toBe("'yyy'")
        });
    });

    describe("Order by function with param", () => {
        it("Should work correctly", function () {
            const result = oDataClient.Users
                .withQuery((u, { $orderby: { orderBy } }, params) =>
                    orderBy(u.HasBlog({
                        blog: params
                            .createRef("x", root => root.My.Odata.Container.Blogs
                                .withKey(x => x.key("123132")))
                    })))
                .uri(false)

            expect(result.query.$orderBy).toBe("HasBlog(blog=@x)")
            expect(result.query["@x"]).toBe('{"@odata.id":"http://localhost:5432/odata/test-entities/Blogs(\'123132\')"}')
        });
    });

    describe("$root", () => {
        const builder = oDataClient.Users
            .withKey(k => k.key("1"))
            .subPath((u, parms) => u.HasBlog({
                blog: parms.createRef("@x", root => root.My.Odata.Container.Blogs
                    .withKey(k => k.key(parms.createConst("y", "123"))))
            }))

        it("Should work correctly without encoding", function () {
            const result = builder.uri(false)

            expect(result.relativePath).toBe("Users('1')/HasBlog(blog=@x)")
            expect(result.query["@x"]).toBe('{"@odata.id":"http://localhost:5432/odata/test-entities/Blogs(@y)"}')
            expect(result.query["@y"]).toBe("'123'")
        });

        it("Should work correctly with encoding", function () {
            const result = builder.uri(true)

            expect(result.relativePath).toBe("Users('1')/HasBlog(blog%3D%40x)")
            expect(result.query[encodeURIComponent("@x")]).toBe(encodeURIComponent('{"@odata.id":"http://localhost:5432/odata/test-entities/Blogs(@y)"}'))
            expect(result.query[encodeURIComponent("@y")]).toBe("'123'")
        });

        it("Should throw on duplicate param", function () {
            try {
                const result = oDataClient.Users
                    .withKey(k => k.key("1"))
                    .subPath((u, parms) => u.HasBlog({
                        blog: parms.createRef("x", root => root.My.Odata.Container.Blogs
                            .withKey(k => k.key(parms.createConst("x", "123"))))
                    }))
                    .uri(false)

                // expect that this case is never reached
                expect(true).toBe(false)
            } catch (e: any) {
                expect(e.toString()).toContain("@x")
            }
        });

        it("Call function from $root (1)", function () {
            const result = oDataClient.Users
                .withKey(k => k.key("1"))
                .subPath((u, parms) => u.HasBlog({
                    blog: parms.createRef("x", root => root.My.Odata.Container
                        .unboundFunctions(f => f.MyBlogs2({ take: parms.createConst("y", 444) })))
                }))
                .uri(false)

            expect(result.relativePath).toBe("Users('1')/HasBlog(blog=@x)")
            expect(result.query["@x"]).toBe("{\"@odata.id\":\"http://localhost:5432/odata/test-entities/MyBlogs2(take=@y)\"}")
            expect(result.query["@y"]).toBe("444")
        });

        it("Call function from $root (2)", function () {
            const result = oDataClient.Users
                .withKey(k => k.key("1"))
                .withQuery((u, { $filter: { eq, $root } }, params) => [
                    eq(u.Blogs as any, $root(root => root.My.Odata.Container.unboundFunctions(f => f
                        .MyBlogs2({ take: params.createConst("y", 444) }))))
                ])
                .uri(false)

            expect(result.relativePath).toBe("Users('1')")
            expect(result.query["$filter"]).toBe("Blogs eq $root/MyBlogs2(take=@y)")
            expect(result.query["@y"]).toBe("444")
        });

        it("Call function from $root (3)", function () {
            const result = oDataClient.Blogs
                .withKey(k => k.key("1"))
                .subPath((b, params) => b.IsFromUser({
                    users: [params.createRef("x",
                        x => x.My.Odata.Container.Users.withKey(k => k.key("777"))
                    )]
                }))
                .uri(false)

            expect(result.relativePath).toBe("Blogs('1')/IsFromUser(users=[@x])")
            expect(result.query["@x"]).toBe("{\"@odata.id\":\"http://localhost:5432/odata/test-entities/Users('777')\"}")
        });
    });
});