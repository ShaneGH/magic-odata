import { buildQuery } from "../queryBuilder.js";
import { ODataUriParts, RequestOptions, RequestTools, RootResponseInterceptor } from "./requestTools.js";
import { Accept, RequestBuilderData } from "./utils.js";

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
    data: RequestBuilderData<TFetchResult, TResult>,
    overrideRequestTools: Partial<RequestTools<TFetchResult, TResult>> | undefined): RequestTools<TFetchResult, TResult> {

    return {
        ...defaultRequestTools,
        ...data.tools.requestTools,
        ...(overrideRequestTools || {})
    };
}

function _buildUri<TFetchResult, TResult>(
    data: RequestBuilderData<TFetchResult, TResult>,
    relativePath: string,
    tools: RequestTools<TFetchResult, TResult>): ODataUriParts {

    const buildUri = tools.uriInterceptor || defaultUriInterceptor
    const filterEnv = {
        buildUri,
        rootUri: data.tools.requestTools.uriRoot,
        serviceConfig: data.tools.root,
        rootContext: "$it",
        schema: data.tools.schema
    }

    return {
        uriRoot: tools.uriRoot,
        // if namespace === "", give null instead
        entitySetContainerName: data.entitySet?.containerName || null,
        entitySetName: data.entitySet?.name || null,
        relativePath: relativePath,
        query: buildQuery(data.tools.root.schemaNamespaces, buildUri, data.state.query.query, filterEnv, data.state.mutableDataParams, data.state.query.urlEncode)
    }
}

export function buildUri<TFetchResult, TResult>(
    data: RequestBuilderData<TFetchResult, TResult>,
    relativePath: string): ODataUriParts {

    const tools = combineTools(data, undefined)
    return _buildUri(data, relativePath, tools);
}

export function executeRequest<TFetchResult, TResult>(
    data: RequestBuilderData<TFetchResult, TResult>,
    relativePath: string,
    overrideRequestTools: Partial<RequestTools<TFetchResult, TResult>> | undefined): TResult {

    const requestTools = combineTools(data, overrideRequestTools)

    const uri = requestTools.uriInterceptor!(
        _buildUri({ ...data, tools: { ...data.tools, requestTools } }, relativePath, requestTools));

    const acceptHeader = !data.state.accept || data.state.accept === Accept.Json
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

    const stringParser = buildStringParser(data.state.accept, requestTools.ignoreWarnings ? acceptHeader : undefined)
    return buildResponseInterceptorChain(data, stringParser, overrideRequestTools)(requestTools.request(uri, init), uri, init)
}

function buildResponseInterceptorChain<TFetchResult, TResult>(
    data: RequestBuilderData<TFetchResult, TResult>,
    stringParser: StringParser,
    overrideRequestTools: Partial<RequestTools<TFetchResult, TResult>> | undefined): RootResponseInterceptor<TFetchResult, TResult> {

    function l0(result: TFetchResult, url: string, options: RequestOptions) {
        return data.tools.defaultResponseInterceptor(result, url, options, stringParser)
    }

    const i1 = data.tools.requestTools.responseInterceptor
    const l1 = i1 && ((input: TFetchResult, uri: string, reqValues: RequestOptions) => i1(input, uri, reqValues, l0))

    const i2 = overrideRequestTools?.responseInterceptor
    const l2 = i2 && ((input: TFetchResult, uri: string, reqValues: RequestOptions) => i2(input, uri, reqValues, l1 || l0))

    return l2 || l1 || l0
}