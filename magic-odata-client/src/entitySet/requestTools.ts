import { ODataTypeRef } from "../../index.js";
import { QbEmit } from "../queryBuilder.js";
import { Accept } from "./utils.js";

/**
 * Input args to components which build uris
 * See https://github.com/ShaneGH/magic-odata/blob/main/docs/Features.md#client-configuration for examples
 * 
 * If using an angular client, see https://github.com/ShaneGH/magic-odata/blob/main/docs/Features.md#2---wire-up-an-angular-client-in-a-di-factory
 */
export type ODataUriParts = {
    /**
     * The URI specified in RequestTools
     */
    uriRoot: string,

    /**
     * The name of the container for the entity set being queried
     * Can be null if the container has not name or query is on an unbound function
     */
    entitySetContainerName: string | null;

    /**
     * The name of the entity set being queried
     * Can be null if the query is on an unbound function
     */
    entitySetName: string | null;

    /**
     * The path generated by the magic-odata-client
     */
    relativePath: string,

    /**
     * The query params generated by the magic-odata-client
     */
    query: { [key: string]: string }
}

export type UriWithMetadata = {
    uriParts: ODataUriParts
    qbEmit: QbEmit
    accept: Accept
    outputType: ODataTypeRef
}

export type DefaultResponseInterceptor<TFetchResult, TResult> = (input: TFetchResult, url: string, options: RequestOptions, stringParser: (string: string, contentType?: string) => any) => TResult
export type RootResponseInterceptor<TFetchResult, TResult> = (input: TFetchResult, url: string, options: RequestOptions) => TResult
export type ResponseInterceptor<TFetchResult, TResult> = (input: TFetchResult, url: string, options: RequestOptions, defaultInterceptor: RootResponseInterceptor<TFetchResult, TResult>) => TResult

/**
 * Options to copy into the request. 
 * This object is designed to mirror a subset of options used by the fetch API
 * 
 * https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
 * https://nodejs.org/dist/latest-v18.x/docs/api/globals.html#fetch
 */
export type RequestOptions = {
    method: string
    headers: [string, string][]
}

/**
 * Input args to an ODataHttpClient
 */
export type RequestTools<TRequestResult, TDataResult> = {
    /** 
     * A basic http client. Set this to a browser fetch, node18 fetch or a client from the the node-fetch npm module
     * You can also use this value to proxy requests
     * 
     * If the code was generated in agular mode, this must be a function which wraps a call to an angular HttpClient
     */
    request(url: string, options: RequestOptions): TRequestResult

    /** 
     * The root URI of all entity sets. Something like: https://my.service.com/my-odata",
     */
    uriRoot: string

    /** 
     * Interceptor for uri building
     * Optional
     */
    uriInterceptor?: (uri: ODataUriParts) => string

    /** 
     * Interceptor for http requests. Use this to do authentication and to add custom http headers
     */
    requestInterceptor?: (url: string, options: RequestOptions) => RequestOptions

    /** 
     * Interceptor for http responses. Use this to add custom error handling or deserialization
     */
    responseInterceptor?: ResponseInterceptor<TRequestResult, TDataResult>

    /**
     * If true will ignore warnings of inconsitent content
     */
    ignoreWarnings?: boolean
}