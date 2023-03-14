import { ODataUriParts, RequestOptions, RequestTools, RootResponseInterceptor } from "../entitySet/requestTools.js";
import { Accept } from "../entitySet/utils.js";
import { SchemaTools } from "./schema.js";

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

function defaultUriInterceptor(uri: ODataUriParts): string {

    let queryPart = Object
        .keys(uri.query)
        .map(x => `${x}=${uri.query[x]}`)
        .join("&");

    const uriRoot = removeTrailingSlash(uri.uriRoot)
    const entityName = uriRoot
        ? addLeadingSlash(removeTrailingSlash(uri.relativePath))
        : removeTrailingSlash(uri.relativePath)

    queryPart = queryPart && `?${queryPart}`

    return `${uriRoot}${entityName}${queryPart}`
}

const defaultRequestTools: Partial<RequestTools<any, any>> = {
    uriInterceptor: defaultUriInterceptor,
    requestInterceptor: (_: any, x: RequestOptions) => x
}

type StringParser = (string: string, contentType?: string) => any
function buildStringParser(accept: Accept, acceptHeader?: string): StringParser {
    return (string: string, contentType?: string) => {
        if (/json/i.test(contentType || "")) {
            if (acceptHeader && !/json/i.test(acceptHeader)) {
                console.warn(`Inconsistent HTTP response. Requested: ${accept}, Got: ${contentType}`);
            }

            return string && JSON.parse(string)
        }

        if (accept === Accept.Json) {
            return string && JSON.parse(string)
        }

        if (accept === Accept.Integer) {
            return (string || null) && parseInt(string)
        }

        return string;
    }
}

function combineTools<TFetchResult, TResult>(
    requestTools: RequestTools<TFetchResult, TResult>,
    overrideRequestTools: Partial<RequestTools<TFetchResult, TResult>> | undefined): RequestTools<TFetchResult, TResult> {

    return {
        ...defaultRequestTools,
        ...requestTools,
        ...(overrideRequestTools || {})
    };
}

export function executeRequest<TFetchResult, TResult>(
    accept: Accept,
    data: SchemaTools<TFetchResult, TResult>,
    uriParts: ODataUriParts,
    overrideRequestTools: Partial<RequestTools<TFetchResult, TResult>> | undefined): TResult {

    const requestTools = combineTools(data.requestTools, overrideRequestTools)

    const uri = requestTools.uriInterceptor!(uriParts);

    const acceptHeader = accept === Accept.Json
        ? "application/json"
        : "text/plain"

    let init: RequestOptions = requestTools.requestInterceptor!(uri, {
        method: "GET",
        headers: [
            ["OData-Version", "4"],
            ["Accept", acceptHeader]
            // Not required for get request. Will be required if POST/PUT are implemented
            // ["Content-Type", "application/json; charset=utf-8"],
        ]
    });

    const stringParser = buildStringParser(accept, requestTools.ignoreWarnings ? acceptHeader : undefined)
    return buildResponseInterceptorChain(data, stringParser, overrideRequestTools)(requestTools.request(uri, init), uri, init)
}

function buildResponseInterceptorChain<TFetchResult, TResult>(
    data: SchemaTools<TFetchResult, TResult>,
    stringParser: StringParser,
    overrideRequestTools: Partial<RequestTools<TFetchResult, TResult>> | undefined): RootResponseInterceptor<TFetchResult, TResult> {

    function l0(result: TFetchResult, url: string, options: RequestOptions) {
        return data.defaultResponseInterceptor(result, url, options, stringParser)
    }

    const i1 = data.requestTools.responseInterceptor
    const l1 = i1 && ((input: TFetchResult, uri: string, reqValues: RequestOptions) => i1(input, uri, reqValues, l0))

    const i2 = overrideRequestTools?.responseInterceptor
    const l2 = i2 && ((input: TFetchResult, uri: string, reqValues: RequestOptions) => i2(input, uri, reqValues, l1 || l0))

    return l2 || l1 || l0
}