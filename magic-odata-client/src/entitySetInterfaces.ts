import { Utils } from "./query/queryUtils.js";
import { Query } from "./queryBuilder.js";
import { ODataUriParts, RequestTools, UriWithMetadata } from "./entitySet/requestTools.js";
import { KeySelection } from "./entitySet/selectByKey.js";
import { CastSelection } from "./entitySet/cast.js";
import { SubPathSelection } from "./entitySet/subPath.js";
import { ODataTypeRef } from "magic-odata-shared";
import { OutputTypes } from "./query/filtering/queryPrimitiveTypes0.js";
import { ParameterDefinition } from "./valueSerializer.js";

export type ODataResultMetadata = Partial<{

    "@odata.context": string
}>

// TODO: rename to ODataNestedResult
export type ODataCollectionResult<T> = ODataResultMetadata & {

    value: T
}

export type ODataResult<T> = ODataResultMetadata & T

/**
 * A query must be the last part of an OData request
 */
export type OperationIsNotPossibleAfterQuery = never

export interface IUriBuilder {

    /**
     * Return the inner workings of an OData query
     * @param encodeUri Specify whether to encode the query parts. Default: the value specifed in withQuery(...)
     */
    uri(encodeQueryParts?: boolean): ODataUriParts

    /**
     * For internal use. Subject to breaking changes
     */
    uriWithMetadata(encodeQueryParts?: boolean): UriWithMetadata
}

export type Param<T> = { param: ParameterDefinition } & T

export enum RefType {
    /** Serialize refs as follows: {"@odata.id":"https://my.odata.server/Users('123')"} */
    RefObject = "RefObject",

    /** Serialize refs as follows: $root/Users('123') */
    $root = "$root"
}

/**
 * Object to help with generating @ params in an OData Uri
 * http://docs.oasis-open.org/odata/odata/v4.01/odata-v4.01-part1-protocol.html#sec_ParameterAliases
 */
export type Params<TRoot> = {
    /**
     * Create a new URI param
     * @param paramName The name of the param in the uri. If the param is not prefixed with `@`, it will be added automatically
     * @param refType Detarmines how the ref type should be serialized. @default `RefType.RefObject`
     * @returns A reference to the param that can be used in the query
     * @example
     * // buildUri: https://localhost/bandMembers/findMembersByBandName(bandName=@x)?@x={"@odata.id":"https://localhost/bands(123)/name"}
     * oDataClient.bandMembers
     *     .subPath((m, params) => {
     *         const bandName = params.createRef("x", root => root.bands.withKey(k => k.key(123)).subPath(b => b.name))
     *         return m.findMembersByBandName({ bandName })
     *     })
     */
    createRef<T>(paramName: string, ref: (root: TRoot) => IEntitySet<any, T, any, any, any, any, any, any>, refType?: RefType): Param<T>

    // TS bug on IEntitySet<any, T, any, any, any, any, any, any> ^^. 
    // Compiler is unable to resolve type T if a parent (or smaller) interface is used

    /**
     * Create a new collection URI param
     * @param paramName The name of the param in the uri. If the param is not prefixed with `@`, it will be added automatically
     * @param values The `paramName` of each individual value is ignored
     * @returns A reference to the param that can be used in the query
     * @example
     * // buildUri: https://localhost/bandMembers/findMembersByBandNames(bandNames=@x)?@x=[{"@odata.id":"https://localhost/bands(123)/name", 'The Beatles'}]
     * oDataClient.bandMembers
     *     .subPath((m, params) => {
     *         const bandNames = params.createRefCollection("x", [
     *             params.createRef("_", root => root.bands.withKey(k => k.key(123)).subPath(b => b.name)),
     *             params.createConst("_", "The Beatles")
     *         ])
     * 
     *         return m.findMembersByBandNames({ bandNames })
     *     })
     */
    createRefCollection<T>(paramName: string, values: Param<T>[]): Param<T[]>

    // TS bug on IEntitySet<any, T, any, any, any, any, any, any> ^^. 
    // Compiler is unable to resolve type T if a parent (or smaller) interface is used

    /**
     * Create a new URI param.
     * @param paramName The name of the param in the uri. If the param is not prefixed with `@`, it will be added automatically
     * @param paramType this param might be needed to serialized primitive values correctly
     * @returns A reference to the param that can be used in the query
     * @example
     * // buildUri: https://localhost/bandMembers/findMembersByBandName(bandName=@x)?@x='The Beatles'
     * oDataClient.bandMembers
     *     .subPath((m, params) => {
     *         const bandName = params.createConst("x", "The Beatles")
     *         return m.findMembersByBandName({ bandName })
     *     })
     */
    createConst<T>(paramName: string, value: T, paramType?: OutputTypes | undefined): Param<T>

    /**
     * Create a new URI param without any type info
     * @param paramName The name of the param in the uri. If the param is not prefixed with `@`, it will be added automatically
     * @returns A reference to the param that can be used in the query
     * @example
     * // buildUri: https://localhost/bandMembers/findMembersByBandName(bandName=@x)?@x='The Beatles'
     * oDataClient.bandMembers
     *     .subPath((m, params) => {
     *         const bandName = params.createRawConst("x", "'The Beatles'")
     *         return m.findMembersByBandName({ bandName })
     *     })
     */
    createRawConst(paramName: string, value: string): Param<any>

    /**
     * Use an existing URI param
     * @param paramName The name of the param in the uri. If the param is not prefixed with `@`, it will be added automatically
     * @returns A reference to the param that can be used in the query
     * @example
     * // See `createRef` or `createConst` functions for how to generate a parameters
     * // buildUri: https://localhost/bandMembers/findMembersByBandName(bandName=@x)?@x=...
     * oDataClient.bandMembers
     *     .subPath((m, params) => m
     *         .findMembersByBandName({ bandName: params.param("x") }))
     */
    param(paramName: string): Param<any>
}

/**
 * Path and query utils on an entity set or sub path
 */
export interface IEntitySet<TRoot, TEntity, TResult, TKeyBuilder, TQueryable, TCaster, TSubPath, TFetchResult> extends IUriBuilder {

    /**
     * Create a new EntitySet scoped to a single entity
     */
    withKey<TNewEntityQuery>(key: (builder: TKeyBuilder, params: Params<TRoot>) => KeySelection<TNewEntityQuery>): TNewEntityQuery;

    /**
     * Create a new EntitySet of entites casted to the specified type
     */
    cast<TNewEntityQuery>(
        cast: (caster: TCaster) => CastSelection<TNewEntityQuery>): TNewEntityQuery;

    /**
     * Create a new EntitySet of entites at the sub path defined
     */
    subPath<TNewEntityQuery>(
        selector: (entity: TSubPath, params: Params<TRoot>) => SubPathSelection<TNewEntityQuery> | string): TNewEntityQuery;

    /**
     * Create a new EntitySet with the defined query attached
     */
    withQuery(queryBuilder: (entity: TQueryable, utils: Utils<TRoot>, params: Params<TRoot>) => Query | Query[])
        : IEntitySet<TRoot, TEntity, TResult, OperationIsNotPossibleAfterQuery, OperationIsNotPossibleAfterQuery, OperationIsNotPossibleAfterQuery, OperationIsNotPossibleAfterQuery, TFetchResult>;


    /**
     * @deprecated Use withQuery method without urlEncode parameter. 
     * If the query is used in a URL that is executed as an http request, the uri will always be encoded
     * If the query is used to build a URL without executing, the encoding can be specified in the `.uri(...)` method
     */
    withQuery(queryBuilder: (entity: TQueryable, utils: Utils<TRoot>, params: Params<TRoot>) => Query | Query[], urlEncode: boolean)
        : IEntitySet<TRoot, TEntity, TResult, OperationIsNotPossibleAfterQuery, OperationIsNotPossibleAfterQuery, OperationIsNotPossibleAfterQuery, OperationIsNotPossibleAfterQuery, TFetchResult>;

    /**
     * Execute a get request
     * @param overrideRequestTools Override any request tools needed
     */
    get(overrideRequestTools?: Partial<RequestTools<TFetchResult, TResult>>): TResult;

    /**
     * Execute a get request, casting the result to something custom
     * @param overrideRequestTools Override any request tools needed
     */
    get<TOverrideResultType>(overrideRequestTools?: Partial<RequestTools<TFetchResult, TOverrideResultType>>): TOverrideResultType;

    /**
     * Execute a get request, casting the result to something custom
     * @param overrideRequestTools Override any request tools needed
     */
    get<TOverrideFetchResult, TOverrideResultType>(overrideRequestTools?: Partial<RequestTools<TOverrideFetchResult, TOverrideResultType>>): TOverrideResultType;
}