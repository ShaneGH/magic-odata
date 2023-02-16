import fetch, { Response } from 'node-fetch'
import { My } from '../generatedCode.js'
import { uniqueNumber, uniqueString } from './utils.js'

type User = My.Odata.Entities.User
type Blog = My.Odata.Entities.Blog
type BlogPost = My.Odata.Entities.BlogPost
type Comment = My.Odata.Entities.Comment
type CommentTag = My.Odata.Entities.CommentTag
type CommentMood = My.Odata.Entities.CommentMood

export type AddFullUserChainArgs = Partial<{
    userName: string
    userType: My.Odata.Entities.UserType
    userScore: number
    userProfileType: My.Odata.Entities.UserProfileType
    commentMood: My.Odata.Entities.Mood
    blogPostContent: string
    blogPostLikes: number
    commentTags: CommentTag[]
    addFullChainToCommentUser: AddFullUserChainArgs
}>

export type FullUserChain = {
    blogUser: User,
    commentUser: User,
    blog: Blog,
    blogPost: BlogPost,
    comment: Comment,
    commentUserChain?: FullUserChain
}

export async function addFullUserChain(settings?: AddFullUserChainArgs): Promise<FullUserChain> {

    settings ??= {};

    let commentUserP: Promise<User>;
    let commentUserChainP: Promise<FullUserChain> | undefined = undefined

    if (settings.addFullChainToCommentUser) {
        commentUserChainP = addFullUserChain(settings.addFullChainToCommentUser);
        commentUserP = commentUserChainP.then(x => x.blogUser);
    } else {
        commentUserP = addUser();
    }

    const blogUser = await addUser({ UserType: settings?.userType, UserProfileType: settings?.userProfileType, Score: settings?.userScore });
    const blog = await addBlog(blogUser.Id!);
    const blogPost = await addBlogPost(blog.Id!, settings?.blogPostContent, settings?.blogPostLikes);

    const commentUser = await commentUserP;
    const mood: Partial<My.Odata.Entities.CommentMood> | undefined = settings.commentMood == null
        ? undefined
        : {
            Key: uniqueString("Comment_Mood_Id_"),
            Mood: settings.commentMood,
        }
    const comment = await addComment(blogPost.Id!, commentUser.Id!, settings.commentTags || [], mood as CommentMood);

    return {
        blogUser,
        commentUser,
        blog,
        blogPost,
        comment,
        commentUserChain: commentUserChainP && await commentUserChainP
    }
}

export function postUser(val: User) {
    return post("Users", val);
}

export async function addUser(user?: Partial<User>) {

    const blogUser: Partial<User> = {
        Name: uniqueString("User Name "),
        UserType: "User" as any,
        UserProfileType: My.Odata.Entities.UserProfileType.Standard,
        ...user || {}
    };

    return await postUser(blogUser as User);
}

export function postBlog(val: Blog) {
    return post("Blogs", val);
}

export async function addBlog(userId: string) {

    const blog: Partial<Blog> = { Name: uniqueString("Blog Name "), UserId: userId }
    return await postBlog(blog as Blog);
}

export function postBlogPost(val: Partial<BlogPost>) {
    return post("BlogPosts", val) as Promise<BlogPost>;
}

export async function addBlogPost(blogId: string, content?: string, likes?: number) {

    const blogPost: Partial<BlogPost> = {
        Name: uniqueString("Blog Post Name "),
        BlogId: blogId, Content: content || uniqueString("Blog Content"),
        Likes: likes != null ? likes : uniqueNumber(),
        AgeRestriction: uniqueNumber(),
        Date: new Date()
    }

    return await postBlogPost(blogPost);
}

export function postComment(val: Partial<Comment>) {
    return post<Comment>("Comments", val as Comment);
}

export async function addComment(blogPostId: string, userId: string | undefined, tags: CommentTag[], mood?: CommentMood) {

    const blogComment: Partial<Comment> = {
        Title: uniqueString("Comment Title "),
        Text: uniqueString("Comment text "),
        BlogPostId: blogPostId,
        UserId: userId,
        Tags: tags,
        Mood: mood
    }

    return await postComment(blogComment)
}

export async function postTag(val: CommentTag) {
    await post("CommentTags", val);
}

export async function postCompositeKeyItem(val: Partial<My.Odata.Entities.CompositeKeyItem>) {
    return await post("CompositeKeyItems", val);
}

export async function addCompositeKeyItem(compositeKeyItem?: Partial<My.Odata.Entities.CompositeKeyItem>) {

    return postCompositeKeyItem({
        Data: compositeKeyItem?.Data ?? uniqueString("Some data ")
    });
}

function post<T>(entityName: string, value: T) {
    const uri = `http://localhost:5432/odata/test-entities/${entityName}`;
    const method = "POST"
    return fetch(uri, {
        method,
        body: JSON.stringify(value),
        headers: {
            "Content-Type": "application/json"
        }
    })
        .then(x => x.status < 200 || x.status >= 300
            ? x.text().then(err => handleError(uri, method, entityName, err, x, value)) as Promise<T>
            : x.json() as Promise<T>);
}

function handleError<T>(uri: string, method: string, entityName: string, error: any, resp: Response, reqPayload: any): T {
    throw new Error(JSON.stringify({ uri, method, entityName, error, status: resp.status, headers: resp.headers, reqPayload }, null, 2));
}