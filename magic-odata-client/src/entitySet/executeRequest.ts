import { buildQuery } from "../queryBuilder.js";
import { ODataUriParts, RequestOptions, RequestTools, RootResponseInterceptor } from "./requestTools.js";
import { EntitySetData } from "./utils.js";

export class HttpError extends Error {
    constructor(message: string, public httpResponse: any) {
        super(message)
    }
}

function addLeadingSlash(path: string) {
    return path && `/${path}`
}

function removeTrailingSlash(path: string) {
    return path && path.replace(/\/$/, "")
}

const defaultRequestTools: Partial<RequestTools<any, any>> = {
    uriInterceptor: (uri: ODataUriParts) => {

        let queryPart = Object
            .keys(uri.query)
            .map(x => `${x}=${uri.query[x]}`)
            .join("&");

        const uriRoot = removeTrailingSlash(uri.uriRoot)
        const entityName = addLeadingSlash(removeTrailingSlash(uri.relativePath))
        queryPart = queryPart && `?${queryPart}`

        return `${uriRoot}${entityName}${queryPart}`
    },

    requestInterceptor: (_: any, x: RequestOptions) => x
}

export function executeRequest<TFetchResult, TResult>(
    data: EntitySetData<TFetchResult, TResult>,
    relativePath: string,
    overrideRequestTools: Partial<RequestTools<TFetchResult, TResult>> | undefined): TResult {

    const tools: RequestTools<TFetchResult, TResult> = {
        responseInterceptor: data.tools.defaultResponseInterceptor,
        ...defaultRequestTools,
        ...data.tools.requestTools,
        ...(overrideRequestTools || {})
    };

    const uri = tools.uriInterceptor!({
        uriRoot: tools.uriRoot,
        // if namespace === "", give null instead
        entitySetContainerName: data.tools.entitySet.namespace || null,
        entitySetName: data.tools.entitySet.name,
        relativePath: relativePath,
        query: buildQuery(data.state.query?.query || [], data.state.query?.urlEncode)
    });

    let init: RequestOptions = tools.requestInterceptor!(uri, {
        method: "GET",
        headers: [
            ["Content-Type", "application/json; charset=utf-8"],
            ["Accept", "application/json"],
            ["OData-Version", "4"]
        ]
    });

    return buildResponseInterceptorChain(data, overrideRequestTools)(tools.request(uri, init), uri, init)
}

function buildResponseInterceptorChain<TFetchResult, TResult>(
    data: EntitySetData<TFetchResult, TResult>,
    overrideRequestTools: Partial<RequestTools<TFetchResult, TResult>> | undefined): RootResponseInterceptor<TFetchResult, TResult> {

    const l0 = data.tools.defaultResponseInterceptor

    const i1 = data.tools.requestTools.responseInterceptor
    const l1 = i1 && ((input: TFetchResult, uri: string, reqValues: RequestOptions) => i1(input, uri, reqValues, l0))

    const i2 = overrideRequestTools?.responseInterceptor
    const l2 = i2 && ((input: TFetchResult, uri: string, reqValues: RequestOptions) => i2(input, uri, reqValues, l1 || l0))

    return l2 || l1 || l0
}