import { buildComplexTypeRef, buildQuery, Query, QueryComplexObject } from "magic-odata-client";
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
                    error: await r.text(),
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
    const type = rootConfig.types[namespace] && rootConfig.types[namespace][name]
    if (!type || type.containerType !== "ComplexType") {
        throw new Error(fullName);
    }

    const typeRef: QueryComplexObject<T> = buildComplexTypeRef(type.type, rootConfig.types);
    return buildQuery(q(typeRef), false)
}

export const uriClient = new ODataClient({
    request: x => Promise.resolve(x) as any,
    responseInterceptor: x => x,
    uriRoot: "xxx"
}).My.Odata.Container;