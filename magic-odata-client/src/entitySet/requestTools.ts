/**
 * Input args to components which build uris
 */
export type ODataUriParts = {
    /**
     * The URI specified in RequestTools
     */
    uriRoot: string,

    /**
     * The name of the container for the entity set being queried
     */
    entitySetContainerName: string | null;

    /**
     * The name of the entity set being queried
     */
    entitySetName: string;

    /**
     * The path generated by the magic-odata-client
     */
    relativePath: string,

    /**
     * The query params generated by the magic-odata-client
     */
    query: { [key: string]: string }
}

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
     * Interceptor for http requests. Use this to add custom http headers
     */
    requestInterceptor?: (url: string, options: RequestOptions) => RequestOptions

    /** 
     * Interceptor for http responses. Use this to add custom error handling or deserialization
     */
    responseInterceptor?: ResponseInterceptor<TRequestResult, TDataResult>
}