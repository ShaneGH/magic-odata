import { buildQuery, ODataUriParts, Query, QueryComplexObject } from "magic-odata-client";
import { buildComplexTypeRef } from "magic-odata-client/dist/src/query/queryComplexObjectBuilder.js";
import { FilterEnv } from "magic-odata-client/dist/src/queryBuilder.js";
import { ODataClient, rootConfigExporter } from "../generatedCode.js";

export const oDataClient = new ODataClient({
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
                    errorBody: await r.text(),
                    reqValues
                }

                throw new Error(JSON.stringify(err, null, 2));
            })
    }
}).My.Odata.Container;

const rootConfig = rootConfigExporter();

export function queryBuilder<T>(fullName: string, q: (x: QueryComplexObject<T>) => Query | Query[]) {

    const dot = fullName.lastIndexOf(".");
    const namespace = dot === -1 ? "" : fullName.substring(0, dot)
    const name = dot === -1 ? fullName : fullName.substring(dot + 1)
    const type = rootConfig.schemaNamespaces[namespace] && rootConfig.schemaNamespaces[namespace].types[name]
    if (!type || type.containerType !== "ComplexType") {
        throw new Error(fullName);
    }

    const typeRef: QueryComplexObject<T> = buildComplexTypeRef(type.type, rootConfig.schemaNamespaces, "$it");
    const env: FilterEnv = {
        rootUri: "URI",
        buildUri: defaultUriInterceptor,
        serviceConfig: rootConfig,
        rootContext: "$it",
        schema: rootConfig.schemaNamespaces[namespace]
    }

    return buildQuery(rootConfig.schemaNamespaces, defaultUriInterceptor, q(typeRef), env, [], false)
}

// copied from magic-odata-client\src\entitySet\executeRequest.ts
export function defaultUriInterceptor(uri: ODataUriParts): string {

    let queryPart = Object
        .keys(uri.query)
        .map(x => `${x}=${uri.query[x]}`)
        .join("&");

    const uriRoot = removeTrailingSlash(uri.uriRoot)
    const entityName = addLeadingSlash(removeTrailingSlash(uri.relativePath))
    queryPart = queryPart && `?${queryPart}`

    return `${uriRoot}${entityName}${queryPart}`
}

function addLeadingSlash(path: string) {
    return path && `/${path}`
}

function removeTrailingSlash(path: string) {
    return path && path.replace(/\/$/, "")
}

export const uriClient = new ODataClient({
    request: x => Promise.resolve(x) as any,
    responseInterceptor: x => x,
    uriRoot: "xxx"
}).My.Odata.Container;
