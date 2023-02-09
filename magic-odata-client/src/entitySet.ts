import { EntityQueryState, EntitySetData, EntitySetTools } from "./entitySet/utils.js";
import { Utils } from "./query/queryUtils.js";
import { Query } from "./queryBuilder.js";
import { RequestTools } from "./entitySet/requestTools.js";
import { KeySelection, recontextDataForKey } from "./entitySet/selectByKey.js";
import { recontextDataForQuery } from "./entitySet/addQuery.js";
import { CastSelection, recontextDataForCasting } from "./entitySet/cast.js";
import { recontextDataForSubPath, SubPathSelection } from "./entitySet/subPath.js";
import { executeRequest } from "./entitySet/executeRequest.js";

export type ODataResultMetadata = Partial<{

    "@odata.context": string
}>

export type ODataCollectionResult<T> = ODataResultMetadata & {

    value: T
}

export type ODataResult<T> = ODataResultMetadata & T

/**
 * Path and query utils on an entity set or sub path
 */
export interface IEntitySet<TEntity, TResult, TKeyBuilder, TQueryable, TCaster, TSingleCaster, TSubPath, TSingleSubPath, TFetchResult> {

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
        subPath: (caster: TSubPath) => SubPathSelection<TNewEntityQuery>): TNewEntityQuery;

    /**
     * Create a new EntitySet with the defined query attached
     * 
     * @param urlEncode Default true
     */
    withQuery(queryBuilder: (entity: TQueryable, utils: Utils) => Query | Query[], urlEncode?: boolean)
        : IEntitySet<TEntity, TResult, TKeyBuilder, TQueryable, TCaster, TSingleCaster, TSubPath, TSingleSubPath, TFetchResult>;

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
}

export class EntitySet<TEntity, TResult, TKeyBuilder, TQueryable, TCaster, TSingleCaster, TSubPath, TSingleSubPath, TFetchResult>
    implements IEntitySet<TEntity, TResult, TKeyBuilder, TQueryable, TCaster, TSingleCaster, TSubPath, TSingleSubPath, TFetchResult> {
    // ^^NOTE^^: these generic type names are copy pasted into code gen project \src\codeGen\utils.ts
    // ^^NOTE^^: make sure that they stay in sync

    private state: EntitySetData<TFetchResult, TResult>

    constructor(
        tools: EntitySetTools<TFetchResult, TResult>,
        state: EntityQueryState | undefined = undefined) {

        this.state = {
            tools,
            state: state || {
                path: [tools.entitySet.name]
            }
        };
    }

    withKey<TNewEntityQuery>(key: (builder: TKeyBuilder) => KeySelection<TNewEntityQuery>): TNewEntityQuery {

        const { state, tools } = recontextDataForKey(this.state, key)
        return new EntitySet<any, any, any, any, any, any, any, any, any>(tools, state) as TNewEntityQuery;
    }

    cast<TNewEntityQuery>(
        cast: (caster: TCaster) => CastSelection<TNewEntityQuery>): TNewEntityQuery {

        const { tools, state } = recontextDataForCasting(this.state, cast)
        return new EntitySet<any, any, any, any, any, any, any, any, any>(tools, state) as TNewEntityQuery;
    }

    subPath<TNewEntityQuery>(
        subPath: (pathSelector: TSubPath) => SubPathSelection<TNewEntityQuery>): TNewEntityQuery {

        const { state, tools } = recontextDataForSubPath(this.state, subPath)
        return new EntitySet<any, any, any, any, any, any, any, any, any>(tools, state) as TNewEntityQuery;
    }

    // https://github.com/ShaneGH/magic-odata/issues/2
    withQuery(queryBuilder: (entity: TQueryable, utils: Utils) => Query | Query[], urlEncode?: boolean) {

        const { tools, state } = recontextDataForQuery(this.state, queryBuilder, urlEncode)
        return new EntitySet<TEntity, TResult, TKeyBuilder, TQueryable, TCaster, TSingleCaster, TSubPath, TSingleSubPath, TFetchResult>(
            tools, state);
    }

    get(overrideRequestTools?: Partial<RequestTools<TFetchResult, TResult>>): TResult;
    get<TOverrideResultType>(overrideRequestTools?: Partial<RequestTools<TFetchResult, TOverrideResultType>>): TOverrideResultType;
    get(overrideRequestTools?: Partial<RequestTools<TFetchResult, TResult>>): TResult {
        return executeRequest(this.state, this.path(), overrideRequestTools)
    }

    // https://github.com/ShaneGH/magic-odata/issues/3
    // count(overrideRequestTools?: Partial<RequestTools<TResult>>): Promise<TDataResult> {
    //     throw new Error()
    //     //return this.fetch(this.path("$count"), overrideRequestTools);
    // }

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