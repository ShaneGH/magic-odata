
import { My, ODataClient } from "../generatedCode.js";
import { addBlog, addBlogPost, addComment, addFullUserChain, addUser } from "../utils/client.js";
import { uniqueString } from "../utils/utils.js";
import { ODataCollectionResult, WithKeyType } from "magic-odata-client";
import { RequestOptions, ResponseInterceptor } from "magic-odata-client";
import { defaultUriInterceptor, oDataClientFactory, uriClient } from "../utils/odataClient.js";
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

describe("SerializationSettings", () => {
    it("Should serialize partial enums", () => {

        const result = oDataClientFactory({ shortenEnumNames: true }).Users
            .withQuery((u, { $filter: { eq } }) => eq(u.UserType, My.Odata.Entities.UserType.Admin))
            .uri(false);

        expect(result.query.$filter).toBe("UserType eq 'Admin'");
    })

    it("Should serialize full enums", () => {

        const result = oDataClientFactory({ shortenEnumNames: false }).Users
            .withQuery((u, { $filter: { eq } }) => eq(u.UserType, My.Odata.Entities.UserType.Admin))
            .uri(false);

        expect(result.query.$filter).toBe("UserType eq My.Odata.Entities.UserType'Admin'");
    })

    it("Should serialize full enums (default)", () => {

        const result = oDataClientFactory({ shortenEnumNames: undefined }).Users
            .withQuery((u, { $filter: { eq } }) => eq(u.UserType, My.Odata.Entities.UserType.Admin))
            .uri(false);

        expect(result.query.$filter).toBe("UserType eq My.Odata.Entities.UserType'Admin'");
    })
});