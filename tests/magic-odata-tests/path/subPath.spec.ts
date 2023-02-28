
import { My, ODataClient } from "../generatedCode.js";
import { addBlog, addBlogPost, addComment, addFullUserChain, addUser } from "../utils/client.js";
import { uniqueString } from "../utils/utils.js";
import { WithKeyType } from "magic-odata-client";
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

describe("Singleton", function () {

    it("Should get", async function () {

        const result = await oDataClient.AppDetails.get();

        expect(result.Id).toBe(1)
    })
});

describe("keyRaw", function () {

    it("Should retrieve value as path segment", async () => {
        const user = await addFullUserChain();
        const comment = await oDataClient.BlogPosts
            .withKey(x => x.keyRaw(`'${user.blogPost.Id}'`))
            .subPath(x => x.Comments)
            .withKey(x => x.key(user.comment.Id!, WithKeyType.PathSegment))
            .get();

        expect(comment.Title).toBe(user.comment.Title);
    });

    it("Should retrieve value as function call", async () => {
        const user = await addFullUserChain();
        const userName = await oDataClient.Users
            .withKey(x => x.keyRaw(`('${user.blogUser.Id}')`))
            .subPath(x => x.Name)
            .get();

        expect(userName.value).toBe(user.blogUser.Name);
    });
});

describe("SubPath", function () {

    describe("Singleton", () => {

        it("Should retrieve primitive item in the path, 1 level", async () => {
            const user = await addFullUserChain();
            const userName = await oDataClient.Users
                .withKey(x => x.key(user.blogUser.Id!))
                .subPath(x => x.Name)
                .get();

            expect(userName.value).toBe(user.blogUser.Name);
        });

        it("Should retrieve primitive items in the path, 1 level", async () => {
            const user = await addFullUserChain();
            const blogWords = await oDataClient.BlogPosts
                .withKey(x => x.key(user.blogPost.Id!))
                .subPath(x => x.Words)
                .get();

            expect(blogWords.value.join(" ")).toBe(user.blogPost.Content);
        });

        it("Should retrieve items in the path, 1 level", async () => {
            const user = await addFullUserChain();
            const blog = await oDataClient.BlogPosts
                .withKey(x => x.key(user.blogPost.Id!))
                .subPath(x => x.Blog)
                .get();

            expect(blog.Name).toBe(user.blog.Name);
        });

        it("Should retrieve empty items", async () => {
            const user = await addUser();
            const blogs = await oDataClient.Users
                .withKey(x => x.key(user.Id!))
                .subPath(x => x.Blogs)
                .get();

            expect(blogs.value.length).toBe(0);
        });

        it("Should retrieve empty item", async () => {
            const ctxt = await addFullUserChain();
            const comment = await addComment(ctxt.blogPost.Id!, undefined, []);
            try {
                await oDataClient.Comments
                    .withKey(x => x.key(comment.Id!))
                    .subPath(x => x.User)
                    .get();

                expect(true).toBe(false)
            } catch (e: any) {
                expect(e.toString()).toContain("404")
            }
        });

        it("Should retrieve items in the path, 2 levels", async () => {
            const context = await addFullUserChain();
            const user = await oDataClient.BlogPosts
                .withKey(x => x.key(context.blogPost.Id!))
                .subPath(x => x.Blog)
                .subPath(x => x.User)
                .get();

            expect(user.Name).toBe(context.blogUser.Name);
        });
    });

    describe("Enum", () => {

        describe("Number enum", () =>
            it("Should be a number", () => expect(typeof My.Odata.Entities.UserType.Admin).toBe("number")));
        it("Should retrieve number enum item in the path, 1 level", async () => {
            const user = await addFullUserChain();
            const userType = await oDataClient.Users
                .withKey(x => x.key(user.blogUser.Id!))
                .subPath(x => x.UserType)
                .get();

            expect(userType.value).toBe(user.blogUser.UserType);
        });

        describe("String enum", () =>
            it("Should be a string", () => expect(typeof My.Odata.Entities.UserProfileType.Advanced).toBe("string")));

        it("Should retrieve string enum item in the path, 1 level", async () => {
            const user = await addFullUserChain();
            const userProfileType = await oDataClient.Users
                .withKey(x => x.key(user.blogUser.Id!))
                .subPath(x => x.UserProfileType)
                .get();

            expect(userProfileType.value).toBe(user.blogUser.UserProfileType);
        });

        describe("Enum as key", () => {
            it("Should work with string enum", async () => {
                let cache = ""

                oDataClient.UserRoles
                    .withKey(x => x.key(My.Odata.Entities.UserType.Admin))
                    .get<number, number>({
                        request: uri => {
                            cache = uri;
                            return 1;
                        },
                        responseInterceptor: x => x
                    });

                expect(cache).toBe("http://localhost:5432/odata/test-entities/UserRoles('Admin')");
            });

            it("Should work with number enum", async () => {
                let cache = ""

                oDataClient.UserProfiles
                    .withKey(x => x.key(My.Odata.Entities.UserProfileType.Advanced))
                    .get<number, number>({
                        request: uri => {
                            cache = uri;
                            return 1;
                        },
                        responseInterceptor: x => x
                    });

                expect(cache).toBe("http://localhost:5432/odata/test-entities/UserProfiles('Advanced')");
            });
        });

        // it("Should retrieve subpath of item with enum as key", async () => {
        //     const user = await addFullUserChain();
        //     const role = await client.UserRoles
        //         .withKey(x => x.key(My.Odata.Entities.UserType.User))
        //         .subPath(x => x.Description)
        //         .get();

        //     expect(role.value).toBe("User");
        // });
    });

    describe("Collection", () => {

        it("Should retrieve items in the path, 1 level", async () => {
            const user = await addFullUserChain();
            const comments = await oDataClient.BlogPosts
                .withKey(x => x.key(user.blogPost.Id!))
                .subPath(x => x.Comments)
                .get();

            expect(comments.value.length).toBe(1);
            expect(comments.value[0].Text).toBe(user.comment.Text);
        });

        it("Should retrieve items in the path, 2 levels", async () => {
            const context = await addFullUserChain({ addFullChainToCommentUser: {} });
            const comments = await oDataClient.Blogs
                .withKey(x => x.key(context.commentUserChain!.blog.Id!))
                .subPath(x => x.User)
                .subPath(x => x.BlogPostComments)
                .get();

            expect(comments.value.length).toBe(1);
            expect(comments.value[0].Text).toBe(context.comment.Text);
        });

        it("Should retrieve items in the path, 3 levels", async () => {
            const context = await addFullUserChain({ addFullChainToCommentUser: {} });
            const comments = await oDataClient.BlogPosts
                .withKey(x => x.key(context.commentUserChain!.blogPost.Id!))
                .subPath(x => x.Blog)
                .subPath(x => x.User)
                .subPath(x => x.BlogPostComments)
                .get();

            expect(comments.value.length).toBe(1);
            expect(comments.value[0].Text).toBe(context.comment.Text);
        });
    });

    describe("Path Cast Combos", () => {
        it("Is in the casting spec", () => {
            expect(true).toBeTruthy();
        });
    });

    describe("Collection, key combos", () => {

        describe("Collection, Key, Collection, Key", () => {
            it("Should work correctly with function key type", execute.bind(null, WithKeyType.FunctionCall));
            it("Should work correctly with path key type", execute.bind(null, WithKeyType.PathSegment));

            async function execute(keyType: WithKeyType) {

                const records: string[] = []
                const user = await addFullUserChain();
                const comment = await oDataClient.BlogPosts
                    .withKey(x => x.key(user.blogPost.Id!, keyType))
                    .subPath(x => x.Comments)
                    .withKey(x => x.key(user.comment.Id!, keyType))
                    .get({ responseInterceptor: recordingFetcher(records) });

                expect(comment.Text).toBe(user.comment.Text);
                expect(records.length).toBe(1);

                if (keyType === WithKeyType.FunctionCall) {
                    expect(records[0]).toContain("(");
                } else {
                    expect((records[0]).indexOf("(")).toBe(-1);
                }
            }
        });

        describe("Collection, Key, Collection, Key, Singleton", () => {
            it("Should work correctly", async () => {

                const user = await addFullUserChain();
                const comment = await oDataClient.BlogPosts
                    .withKey(x => x.key(user.blogPost.Id!))
                    .subPath(x => x.Comments)
                    .withKey(x => x.key(user.comment.Id!))
                    .subPath(x => x.User)
                    .get();

                expect(comment.Name).toBe(user.commentUser.Name);
            });
        });
    });

    describe("Path to complex type", () => {
        it("Should work correctly", async () => {

            const tag = { Tag: uniqueString() }
            const user = await addFullUserChain({ commentTags: [tag] });
            const comment = await oDataClient.Comments
                .withKey(x => x.key(user.comment.Id!))
                .subPath(x => x.Tags)
                .get();

            expect(comment.value.length).toBe(1);
            expect(comment.value[0].Tag).toBe(tag.Tag);
        });

        it("Should work correctly (with tag filter)", execute.bind(null, true));
        it("Should work correctly (with invalid tag filter)", execute.bind(null, false));

        async function execute(success: boolean) {

            const tag = { Tag: uniqueString() }
            const user = await addFullUserChain({ commentTags: [tag] });
            const comment = await oDataClient.Comments
                .withKey(x => x.key(user.comment.Id!))
                .subPath(x => x.Tags)
                .withQuery((t, { $filter: { eq } }) => eq(t.Tag, success ? tag.Tag : "invalid"))
                .get();

            if (success) {
                expect(comment.value.length).toBe(1);
                expect(comment.value[0].Tag).toBe(tag.Tag);
            } else {
                expect(comment.value.length).toBe(0);
            }
        };
    });

    describe("$value", () => {

        it("Should retrieve enum as $value", async () => {
            const user = await addFullUserChain();
            const userProfileType: string = await oDataClient.Users
                .withKey(x => x.key(user.blogUser.Id!))
                .subPath(x => x.UserProfileType)
                .subPath(x => x.$value)
                .get();

            expect(userProfileType).toBe(user.blogUser.UserProfileType);
        });

        it("Should retrieve primitive as $value", async () => {
            const user = await addFullUserChain();
            const likes: string = await oDataClient.BlogPosts
                .withKey(x => x.key(user.blogPost.Id!))
                .subPath(x => x.Likes)
                .subPath(x => x.$value)
                .get();

            expect(typeof likes).toBe("string");
            expect(likes).toBe(user.blogPost.Likes.toString());
        });

        it("Should query after $value", async () => {
            const user = await addFullUserChain();
            const likes: string = await oDataClient.BlogPosts
                .withKey(x => x.key(user.blogPost.Id!))
                .subPath(x => x.Likes)
                .subPath(x => x.$value)

                .get();

            expect(typeof likes).toBe("string");
            expect(likes).toBe(user.blogPost.Likes.toString());
        });
    })

    describe("$count", () => {

        it("Should retrieve entity set $count", async () => {
            await addFullUserChain();
            const count: number = await oDataClient.Users
                .subPath(x => x.$count)
                .get();

            expect(typeof count).toBe("number");
            expect(count).toBeGreaterThan(2);
        });

        it("Should retrieve sub entity set $count", async () => {
            const user = await addFullUserChain();
            const uri: any = await uriClient.Users
                .withKey(u => u.key(user.blogUser.Id!))
                .subPath(x => x.Blogs)
                .subPath(x => x.$count)
                .get();

            expect(uri).toBe(`xxx/Users('${user.blogUser.Id}')/Blogs/$count`);
        });

        it("Should retrieve complex type set $count", async () => {
            const user = await addFullUserChain({ commentTags: [{ Tag: uniqueString() }] });
            const uri: any = await uriClient.Comments
                .withKey(u => u.key(user.comment.Id!))
                .subPath(x => x.Tags)
                .subPath(x => x.$count)
                .get();

            expect(uri).toBe(`xxx/Comments('${user.comment.Id}')/Tags/$count`);
        });

        it("Should retrieve complex type set $count", async () => {

            const count: number = await oDataClient.AppDetails
                .subPath(x => x.AppNameWords)
                .subPath(x => x.$count)
                .get();

            expect(typeof count).toBe("number");
            expect(count).toBe(2);
        });

        it("Should retrieve casted entity set $count", async () => {

            const user = await addFullUserChain();
            const uri: any = await uriClient.Users
                .cast(x => x.User())
                .subPath(x => x.$count)
                .get();

            expect(uri).toBe(`xxx/Users/My.Odata.Entities.User/$count`);
        });
    })

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

                expect(top10.value.length).toBe(10);
                for (let i = 1; i < top10.value.length; i++) {
                    expect(
                        top10.value[i].Name
                            .toLocaleLowerCase()
                            .localeCompare(top10.value[i - 1].Name
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
        });
    })
});