import { ODataTypeRef } from "magic-odata-shared";
import { CastSelection, IEntitySet, ODataUriParts, Params, Query, RequestTools, SubPathSelection } from "../../index.js";
import { Utils } from "../query/queryUtils.js";
import { Writer } from "../utils.js";
import { executeRequest } from "./executeRequest.js";
import { querySymbols } from "./inbuiltFunctions/functions.js";
import { params } from "./params.js";
import { SchemaTools } from "./schema.js";
import { toUri } from "./uriBuilder/toUri.js";
import { entity } from "./uriBuilder/utils.js";
import { buildRecorder, recorded, recordedType, Recorder } from "./uriEvents/eventBuilder.js";
import { Key, Path, UriPart, UriPartStream } from "./uriEvents/uriPartStream.js";

/**
 * Specified how to format an entity key in a url
 */
export enum WithKeyType {
    /**
     * Specifies that a key should be embedded as a function call
     * e.g. ~/Users(1)
     * 
     * Default
     */
    FunctionCall = "FunctionCall",

    /**
     * Specifies that a key should be added as a path segment
     * e.g. ~/Users/1
     */
    PathSegment = "PathSegment"
}

export type KeySelection<TNewEntityQuery> = {
    raw: boolean
    keyEmbedType: WithKeyType,
    key: any
}

type IEs<TFetchResult, TResult> = IEntitySet<any, any, TResult, any, any, any, any, TFetchResult>

function withKey(key: Function) {

    const builderResult: Key = key({
        key(key: any, keyType?: WithKeyType) {
            return keyType === WithKeyType.PathSegment
                ? { "type": "PathSegment", data: { keyData: key } }
                : { "type": "FunctionCall", data: { keyData: key } }
        },

        keyRaw(key: string) {
            return { "type": "Raw", data: key }
        }
    }, params())

    return Writer.create(null, new UriPartStream([{
        type: "Path",
        data: {
            type: "Key",
            data: builderResult
        }
    }]))
}

export const subPath = Symbol("subPath")
function withSubPath(
    selector: (entity: any, params: Params<any>) => any) {

    const builderResult: Recorder = selector(buildRecorder(subPath), params())
    return Writer.create(
        null,
        new UriPartStream(builderResult[recorded]
            .map(data => {
                if (data[recordedType] === "Apply") {
                    // extend PathRecord Sum type
                    throw new Error("TODO: function calls")
                }

                const p = data.data
                return p === "$count"
                    ? { type: "$count" }
                    : p === "$value"
                        ? { type: "$value" }
                        : { type: "PropertyName", data: p }
            })
            .map(data => (
                {
                    type: "Path",
                    data
                } as UriPart))))
}

type CastRecorderAcc = [string | null, Path[]]

export const cast = Symbol("cast")
function withCastPath(
    caster: (entity: any) => any) {

    const builderResult: Recorder = caster(buildRecorder(cast))
    const mappedToStream = builderResult[recorded]
        .reduce(([prop, acc], data) => {
            if (data[recordedType] === "Get") {
                if (prop) {
                    console.warn(`Unexpected get in casting call: ${String(data.data)}`);
                }

                return [String(data.data), acc] as CastRecorderAcc
            }

            if (prop == null) {
                console.warn(`Unexpected apply in casting call`);
                return [prop, acc] as CastRecorderAcc
            }

            return [null, acc.concat([{ type: "Cast", data: prop }])] as CastRecorderAcc
        }, [null, []] as CastRecorderAcc)[1]
        .map(data => (
            {
                type: "Path",
                data
            } as UriPart))

    return Writer.create(null, new UriPartStream(mappedToStream))
}

function withQueryBuilder(
    queryBuilder: (entity: any, utils: any, params: Params<any>) => any) {

    const queryUtils: Utils<any> = {
        $filter: buildRecorder(querySymbols.$filter) as any,
        $select: buildRecorder(querySymbols.$select) as any,
        $expand: buildRecorder(querySymbols.$expand) as any,
        $orderby: buildRecorder(querySymbols.$orderby) as any,
        $search: buildRecorder(querySymbols.$search) as any,
        $top: buildRecorder(querySymbols.$top) as any,
        $skip: buildRecorder(querySymbols.$skip) as any,
        $count: buildRecorder(querySymbols.$count) as any,
        custom: buildRecorder(querySymbols.custom) as any,
    }

    const builderResult: Recorder | Recorder[] = queryBuilder(
        buildRecorder(entity, "$it"),
        queryUtils,
        params())

    const results = Array.isArray(builderResult) ? builderResult : [builderResult]
    return Writer.create(null, new UriPartStream([{ type: "Query", data: results }]))
}

class UriBuilder<TFetchResult, TResult> implements IEs<TFetchResult, TResult> {

    constructor(
        private readonly _tools: SchemaTools<TFetchResult, TResult>,
        private readonly _data: Writer<null, UriPartStream>) {
    }

    get(overrideRequestTools?: Partial<RequestTools<TFetchResult, TResult>> | undefined): TResult;
    get<TOverrideResultType>(overrideRequestTools?: Partial<RequestTools<TFetchResult, TOverrideResultType>> | undefined): TOverrideResultType;
    get<TOverrideFetchResult, TOverrideResultType>(overrideRequestTools?: Partial<RequestTools<TOverrideFetchResult, TOverrideResultType>> | undefined): TOverrideResultType;
    get(overrideRequestTools?: any): any {
        const uri = this._uri(true)
        return executeRequest(uri.accept, this._tools, uri.oDataUriParts, overrideRequestTools)
    }

    withKey<TNewEntityQuery>(key: (builder: any, params: Params<any>) => KeySelection<TNewEntityQuery>): TNewEntityQuery {
        const builderResult = this._data
            .bind(withKey.bind(null, key))

        return new UriBuilder(this._tools, builderResult) as any
    }

    cast<TNewEntityQuery>(cast: (caster: any) => CastSelection<TNewEntityQuery>): TNewEntityQuery {
        const builderResult = this._data
            .bind(withCastPath.bind(null, cast))

        return new UriBuilder(this._tools, builderResult) as any
    }

    subPath<TNewEntityQuery>(selector: (entity: any, params: Params<any>) => SubPathSelection<TNewEntityQuery>): TNewEntityQuery {
        const builderResult = this._data
            .bind(withSubPath.bind(null, selector))

        return new UriBuilder(this._tools, builderResult) as any
    }

    withQuery(queryBuilder: (entity: any, utils: Utils<any>, params: Params<any>) => Query | Query[]): IEntitySet<any, any, any, never, never, never, never, any> {
        const builderResult = this._data
            .bind(withQueryBuilder.bind(null, queryBuilder))

        return new UriBuilder(this._tools, builderResult) as any
    }

    uri(encodeQueryParts?: boolean | undefined): ODataUriParts {
        return this._uri(encodeQueryParts).oDataUriParts
    }

    private _uri(encodeQueryParts?: boolean | undefined) {
        return toUri(this._data.execute()[1], this._tools.requestTools.uriRoot)
            .apply({
                rootConfig: this._tools.root,
                currentContext: "$it",
                encodeURIComponent: encodeQueryParts == null || encodeQueryParts
                    ? encodeURIComponent
                    : x => x
            })
    }

    getOutputType(): ODataTypeRef {
        throw new Error("TODO: Method not implemented.");
    }
}

export function entityContainer<TFetchResult, TResult>(
    tools: SchemaTools<TFetchResult, TResult>, schemaName: string, entityContainerName: string): any {

    const schema = tools.root.schemaNamespaces[schemaName]
    if (!schema) {
        throw new Error(`Invalid schema name "${schemaName}"`);
    }

    const entityContainer = schema.entityContainers[entityContainerName]
    if (!entityContainer) {
        throw new Error(`Invalid entity contianer name "${entityContainerName}"`);
    }

    return new Proxy({}, {
        get(target: any, p: string | symbol, receiver: any): any {

            p = String(p)
            if (p === "unboundFunctions") {
                throw new Error("TODO unboundFunctions")
            }

            if (!entityContainer.entitySets[p]) {
                const err = { schema: schemaName, entityContainer: entityContainerName, entitySet: p }
                throw new Error(`Invalid entity set: ${JSON.stringify(err)}`)
            }

            const emit = new UriPartStream([{
                type: "EntityContainerName",
                data: entityContainer.entitySets[p].containerName
            }, {
                type: "Path",
                data: { type: "EntitySetName", data: entityContainer.entitySets[p] }
            }])

            const uriPart = Writer.create(null, emit)
            return new UriBuilder(tools, uriPart)
        }
    })
}