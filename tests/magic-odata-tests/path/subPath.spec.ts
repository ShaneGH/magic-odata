
import { My, ODataClient } from "../generatedCode.js";
import { addFullUserChain } from "../utils/client.js";
import { uniqueString } from "../utils/utils.js";
import { WithKeyType } from "magic-odata-client";
import { RequestOptions, RootResponseInterceptor } from "magic-odata-client";

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

function recordingFetcher(recorder: string[]) {
    return (input: any, uri: string, init: RequestOptions, defaultInterceptor: RootResponseInterceptor<Promise<Response>, any>) => {
        recorder.push(uri)
        return defaultInterceptor(input, uri, init)
    }
}

describe("SubPath", function () {

    describe("Singleton", () => {

        it("Should retrieve primitive item in the path, 1 level", async () => {
            const user = await addFullUserChain();
            const userName = await client.Users
                .withKey(x => x.key(user.blogUser.Id!))
                .subPath(x => x.Name)
                .get();

            expect(userName.value).toBe(user.blogUser.Name);
        });

        it("Should retrieve primitive items in the path, 1 level", async () => {
            const user = await addFullUserChain();
            const blogWords = await client.BlogPosts
                .withKey(x => x.key(user.blogPost.Id!))
                .subPath(x => x.Words)
                .get();

            expect(blogWords.value.join(" ")).toBe(user.blogPost.Content);
        });

        it("Should retrieve items in the path, 1 level", async () => {
            const user = await addFullUserChain();
            const blog = await client.BlogPosts
                .withKey(x => x.key(user.blogPost.Id!))
                .subPath(x => x.Blog)
                .get();

            expect(blog.Name).toBe(user.blog.Name);
        });

        it("Should retrieve items in the path, 2 levels", async () => {
            const context = await addFullUserChain();
            const user = await client.BlogPosts
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
            const userType = await client.Users
                .withKey(x => x.key(user.blogUser.Id!))
                .subPath(x => x.UserType)
                .get();

            expect(userType.value).toBe(user.blogUser.UserType);
        });

        describe("String enum", () =>
            it("Should be a string", () => expect(typeof My.Odata.Entities.UserProfileType.Advanced).toBe("string")));
        it("Should retrieve string enum item in the path, 1 level", async () => {
            const user = await addFullUserChain();
            const userProfileType = await client.Users
                .withKey(x => x.key(user.blogUser.Id!))
                .subPath(x => x.UserProfileType)
                .get();

            expect(userProfileType.value).toBe(user.blogUser.UserProfileType);
        });

        // TODO: enum as key not working with Microsoft odata
        // TODO: also need the same test with enum as string
        // it("Should retrieve item with enum as key", async () => {
        //     const user = await addFullUserChain();
        //     const role = await client.UserRoles
        //         .withKey(x => x.key(My.Odata.Entities.UserType.Admin))
        //         .get();

        //     expect(role.Description).toBe("Admin");
        // });

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
            const comments = await client.BlogPosts
                .withKey(x => x.key(user.blogPost.Id!))
                .subPath(x => x.Comments)
                .get();

            expect(comments.value.length).toBe(1);
            expect(comments.value[0].Text).toBe(user.comment.Text);
        });

        it("Should retrieve items in the path, 2 levels", async () => {
            const context = await addFullUserChain({ addFullChainToCommentUser: {} });
            const comments = await client.Blogs
                .withKey(x => x.key(context.commentUserChain!.blog.Id!))
                .subPath(x => x.User)
                .subPath(x => x.BlogPostComments)
                .get();

            expect(comments.value.length).toBe(1);
            expect(comments.value[0].Text).toBe(context.comment.Text);
        });

        it("Should retrieve items in the path, 3 levels", async () => {
            const context = await addFullUserChain({ addFullChainToCommentUser: {} });
            const comments = await client.BlogPosts
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
                const comment = await client.BlogPosts
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
                const comment = await client.BlogPosts
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
            const comment = await client.Comments
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
            const comment = await client.Comments
                .withKey(x => x.key(user.comment.Id!))
                .subPath(x => x.Tags)
                .withQuery((t, { filter: { eq } }) => eq(t.Tag, success ? tag.Tag : "invalid"))
                .get();

            if (success) {
                expect(comment.value.length).toBe(1);
                expect(comment.value[0].Tag).toBe(tag.Tag);
            } else {
                expect(comment.value.length).toBe(0);
            }
        };
    });
});