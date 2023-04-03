import { defaultAccept, EntityQueryState, RequestBuilderData, SchemaTools } from "./entitySet/utils.js";
import { Utils } from "./query/queryUtils.js";
import { QbEmit, Query } from "./queryBuilder.js";
import { ODataUriParts, RequestTools, UriWithMetadata } from "./entitySet/requestTools.js";
import { KeySelection, recontextDataForKey } from "./entitySet/selectByKey.js";
import { recontextDataForRootQuery } from "./entitySet/addQuery.js";
import { CastSelection, recontextDataForCasting } from "./entitySet/cast.js";
import { recontextDataForSubPath, SubPathSelection } from "./entitySet/subPath.js";
import { buildUri, executeRequest } from "./entitySet/executeRequest.js";
import { ODataEntitySet, ODataTypeRef } from "../index.js";
import { IEntitySet, OperationIsNotPossibleAfterQuery, Params } from "./entitySetInterfaces.js";
import { Writer } from "./utils.js";

export class RequestBuilder<TRoot, TEntity, TResult, TKeyBuilder, TQueryable, TCaster, TSubPath, TFetchResult>
    implements IEntitySet<TRoot, TEntity, TResult, TKeyBuilder, TQueryable, TCaster, TSubPath, TFetchResult> {
    // ^^NOTE^^: these generic type names are copy pasted into code gen project \src\codeGen\utils.ts
    // ^^NOTE^^: make sure that they stay in sync

    private state: RequestBuilderData<TFetchResult, TResult>
    public readonly name: string | null

    constructor(
        tools: SchemaTools<TFetchResult, TResult>,
        entitySet: ODataEntitySet | null,
        queryType: ODataTypeRef | null,
        state: Writer<EntityQueryState, QbEmit> | undefined = undefined,
        private disableHttp = false) {

        this.name = entitySet?.name || null

        if (!state && !queryType) {
            throw new Error("You must specify state or a type");
        }

        if (state && queryType) {
            throw new Error("You must specify state or a type, but not both");
        }

        this.state = {
            tools,
            entitySet,
            state: state || Writer.create({
                accept: defaultAccept,
                path: entitySet ? [entitySet.name] : [],
                type: queryType!,
                query: {
                    urlEncode: true,
                    query: []
                }
            }, QbEmit.zero)
        }
    }

    withKey<TNewEntityQuery>(key: (builder: TKeyBuilder, params: Params<TRoot>) => KeySelection<TNewEntityQuery>): TNewEntityQuery {

        const state = recontextDataForKey(this.state, key)
        return new RequestBuilder<TRoot, any, any, any, any, any, any, any>(this.state.tools, this.state.entitySet, null, state, this.disableHttp) as TNewEntityQuery;
    }

    cast<TNewEntityQuery>(
        cast: (caster: TCaster) => CastSelection<TNewEntityQuery>): TNewEntityQuery {

        const state = recontextDataForCasting(this.state, cast)
        return new RequestBuilder<TRoot, any, any, any, any, any, any, any>(this.state.tools, this.state.entitySet, null, state, this.disableHttp) as TNewEntityQuery;
    }

    subPath<TNewEntityQuery>(
        selector: (entity: TSubPath, params: Params<TRoot>) => SubPathSelection<TNewEntityQuery>): TNewEntityQuery {

        const state = recontextDataForSubPath(this.state, selector)
        return new RequestBuilder<TRoot, any, any, any, any, any, any, any>(this.state.tools, this.state.entitySet, null, state, this.disableHttp) as TNewEntityQuery;
    }

    // https://github.com/ShaneGH/magic-odata/issues/2
    withQuery(queryBuilder: (entity: TQueryable, utils: Utils<TRoot>, params: Params<TRoot>) => Query | Query[], urlEncode?: boolean) {

        const state = recontextDataForRootQuery(this.state, queryBuilder, urlEncode)
        return new RequestBuilder<TRoot, TEntity, TResult, OperationIsNotPossibleAfterQuery, OperationIsNotPossibleAfterQuery, OperationIsNotPossibleAfterQuery, OperationIsNotPossibleAfterQuery, TFetchResult>(
            this.state.tools, this.state.entitySet, null, state, this.disableHttp);
    }

    get(overrideRequestTools?: Partial<RequestTools<TFetchResult, TResult>>): TResult;
    get<TOverrideResultType>(overrideRequestTools?: Partial<RequestTools<TFetchResult, TOverrideResultType>>): TOverrideResultType;
    get<TOverrideFetchResult, TOverrideResultType>(overrideRequestTools?: Partial<RequestTools<TOverrideFetchResult, TOverrideResultType>>): TOverrideResultType;
    get(overrideRequestTools?: Partial<RequestTools<TFetchResult, TResult>>): TResult {
        if (this.disableHttp) {
            throw new Error("This entity set has http requests disabled");
        }

        return executeRequest(this.state, overrideRequestTools)
    }

    uri(encodeQueryParts?: boolean): ODataUriParts {

        return this.uriWithMetadata(encodeQueryParts).uriParts
    }

    uriWithMetadata(encodeQueryParts?: boolean): UriWithMetadata {
        const state = typeof encodeQueryParts !== "boolean"
            ? this.state
            : {
                ...this.state,
                state: this.state.state.map(state => ({
                    ...state,
                    query: {
                        ...state.query,
                        urlEncode: encodeQueryParts
                    }
                }))
            }

        return buildUri(state)
    }
}
