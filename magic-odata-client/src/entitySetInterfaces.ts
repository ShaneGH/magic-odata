import { Utils } from "./query/queryUtils.js";
import { Query } from "./queryBuilder.js";
import { ODataUriParts, RequestTools } from "./entitySet/requestTools.js";
import { KeySelection } from "./entitySet/selectByKey.js";
import { CastSelection } from "./entitySet/cast.js";
import { SubPathSelection } from "./entitySet/subPath.js";
import { ODataTypeRef } from "magic-odata-shared";
import { OutputTypes } from "./query/filtering/queryPrimitiveTypes0.js";

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
     * Get type info about the values returned from this query
     */
    getOutputType(): ODataTypeRef
}

/**
 * Object to help with generating @ params in an OData Uri
 * http://docs.oasis-open.org/odata/odata/v4.01/odata-v4.01-part1-protocol.html#sec_ParameterAliases
 */
export type Params<TRoot> = {
    /**
     * Create a new URI param
     * @param paramName The name of the param in the uri. If the param is not prefixed with `@`, it will be added automatically
     * @returns A reference to the param that can be used in the query
     * @example
     * // buildUri: https://localhost/bandMembers/findMembersByBandName(bandName=@x)?@x={"@odata.id":"https://localhost/bands(123)/name"}
     * oDataClient.bandMembers
     *     .subPath((m, params) => {
     *         const bandName = params.createRef("x", root => root.bands.withKey(k => k.key(123)).subPath(b => b.name))
     *         return m.findMembersByBandName({ bandName })
     *     })
     */
    createRef<T>(paramName: string, ref: (root: TRoot) => IEntitySet<any, T, any, any, any, any, any, any>): T
    // TS bug on IEntitySet<any, T, any, any, any, any, any, any> ^^. 
    // Compiler is unable to resolve type T if a parent (or smaller) interface is used

    // https://github.com/ShaneGH/magic-odata/issues/66
    /**
     * Create a new URI param.
     * NOTE: enum values where the enum is represented by a number in typescript are currently not supported. Use `createRawConst` instead
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
    createConst<T>(paramName: string, value: T, paramType?: OutputTypes | undefined): T

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
    createRawConst(paramName: string, value: string): any

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
    param(paramName: string): any
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
     * 
     * @param urlEncode Default true
     */
    withQuery(queryBuilder: (entity: TQueryable, utils: Utils<TRoot>, params: Params<TRoot>) => Query | Query[], urlEncode?: boolean)
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