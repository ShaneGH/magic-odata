import { EntityQueryState, EntitySetData, EntitySetTools } from "./entitySet/utils.js";
import { Utils } from "./query/queryUtils.js";
import { Query } from "./queryBuilder.js";
import { ODataUriParts, RequestTools } from "./entitySet/requestTools.js";
import { KeySelection, recontextDataForKey } from "./entitySet/selectByKey.js";
import { recontextDataForQuery } from "./entitySet/addQuery.js";
import { CastSelection, recontextDataForCasting } from "./entitySet/cast.js";
import { recontextDataForSubPath, SubPathSelection } from "./entitySet/subPath.js";
import { buildUri, executeRequest } from "./entitySet/executeRequest.js";
import { Accept } from "./entitySet/utils.js";

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

/**
 * Path and query utils on an entity set or sub path
 */
export interface IEntitySet<TEntity, TResult, TKeyBuilder, TQueryable, TCaster, TSubPath, TFetchResult> {

    /**
     * Create a new EntitySet scoped to a single entity
     */
    withKey<TNewEntityQuery>(key: (builder: TKeyBuilder) => KeySelection<TNewEntityQuery>): TNewEntityQuery;

    /**
     * Create a new EntitySet of entites casted to the specified type
     */
    cast<TNewEntityQuery>(
        cast: (caster: TCaster) => CastSelection<TNewEntityQuery>): TNewEntityQuery;

    /**
     * Create a new EntitySet of entites at the sub path defined
     */
    subPath<TNewEntityQuery>(
        selector: (entity: TSubPath) => SubPathSelection<TNewEntityQuery> | string): TNewEntityQuery;

    /**
     * Create a new EntitySet with the defined query attached
     * 
     * @param urlEncode Default true
     */
    withQuery(queryBuilder: (entity: TQueryable, utils: Utils) => Query | Query[], urlEncode?: boolean)
        : IEntitySet<TEntity, TResult, OperationIsNotPossibleAfterQuery, OperationIsNotPossibleAfterQuery, OperationIsNotPossibleAfterQuery, OperationIsNotPossibleAfterQuery, TFetchResult>;

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

    /**
     * Return the inner workings of an OData query
     * @param encodeUri Specify whether to encode the query parts. Default: the value specifed in withQuery(...)
     */
    uri(encodeQueryParts?: boolean): ODataUriParts
}

export class EntitySet<TEntity, TResult, TKeyBuilder, TQueryable, TCaster, TSubPath, TFetchResult>
    implements IEntitySet<TEntity, TResult, TKeyBuilder, TQueryable, TCaster, TSubPath, TFetchResult> {
    // ^^NOTE^^: these generic type names are copy pasted into code gen project \src\codeGen\utils.ts
    // ^^NOTE^^: make sure that they stay in sync

    private state: EntitySetData<TFetchResult, TResult>

    constructor(
        tools: EntitySetTools<TFetchResult, TResult>,
        state: EntityQueryState | undefined = undefined) {

        this.state = {
            tools,
            state: state || {
                accept: Accept.Json,
                path: [tools.entitySet.name]
            }
        };
    }

    withKey<TNewEntityQuery>(key: (builder: TKeyBuilder) => KeySelection<TNewEntityQuery>): TNewEntityQuery {

        const { state, tools } = recontextDataForKey(this.state, key)
        return new EntitySet<any, any, any, any, any, any, any>(tools, state) as TNewEntityQuery;
    }

    cast<TNewEntityQuery>(
        cast: (caster: TCaster) => CastSelection<TNewEntityQuery>): TNewEntityQuery {

        const { tools, state } = recontextDataForCasting(this.state, cast)
        return new EntitySet<any, any, any, any, any, any, any>(tools, state) as TNewEntityQuery;
    }

    subPath<TNewEntityQuery>(
        selector: (entity: TSubPath) => SubPathSelection<TNewEntityQuery>): TNewEntityQuery {

        const { state, tools } = recontextDataForSubPath(this.state, selector)
        return new EntitySet<any, any, any, any, any, any, any>(tools, state) as TNewEntityQuery;
    }

    // https://github.com/ShaneGH/magic-odata/issues/2
    withQuery(queryBuilder: (entity: TQueryable, utils: Utils) => Query | Query[], urlEncode?: boolean) {

        const { tools, state } = recontextDataForQuery(this.state, queryBuilder, urlEncode)
        return new EntitySet<TEntity, TResult, OperationIsNotPossibleAfterQuery, OperationIsNotPossibleAfterQuery, OperationIsNotPossibleAfterQuery, OperationIsNotPossibleAfterQuery, TFetchResult>(
            tools, state);
    }

    get(overrideRequestTools?: Partial<RequestTools<TFetchResult, TResult>>): TResult;
    get<TOverrideResultType>(overrideRequestTools?: Partial<RequestTools<TFetchResult, TOverrideResultType>>): TOverrideResultType;
    get<TOverrideFetchResult, TOverrideResultType>(overrideRequestTools?: Partial<RequestTools<TOverrideFetchResult, TOverrideResultType>>): TOverrideResultType;
    get(overrideRequestTools?: Partial<RequestTools<TFetchResult, TResult>>): TResult {
        return executeRequest(this.state, this.path(), overrideRequestTools)
    }

    uri(encodeQueryParts?: boolean): ODataUriParts {

        const state = typeof encodeQueryParts !== "boolean" || !this.state.state.query
            ? this.state
            : {
                ...this.state,
                state: {
                    ...this.state.state,
                    query: {
                        ...this.state.state.query,
                        urlEncode: encodeQueryParts
                    }
                }
            }

        return buildUri(state, this.path())
    }

    private path(append?: string[] | string | undefined) {

        let path = this.state.state.path;
        if (typeof append === "string") {
            path = [...path, append]
        } else if (Array.isArray(append)) {
            path = [...path, ...append]
        }

        return path.join("/");
    }
}