import { defaultAccept, EntityQueryState, RequestBuilderData, SchemaTools } from "./entitySet/utils.js";
import { Utils } from "./query/queryUtils.js";
import { QbEmit, Query } from "./queryBuilder.js";
import { ODataUriParts, RequestTools } from "./entitySet/requestTools.js";
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

    constructor(
        tools: SchemaTools<TFetchResult, TResult>,
        entitySet: ODataEntitySet | null,
        state: Writer<EntityQueryState, QbEmit> | undefined = undefined,
        private disableHttp = false) {

        this.state = {
            tools,
            entitySet,
            state: state || Writer.create({
                accept: defaultAccept,
                path: entitySet ? [entitySet.name] : [],
                query: {
                    urlEncode: true,
                    query: []
                }
            }, QbEmit.zero)
        }
    }

    getOutputType(): ODataTypeRef {
        return this.state.tools.type
    }

    withKey<TNewEntityQuery>(key: (builder: TKeyBuilder, params: Params<TRoot>) => KeySelection<TNewEntityQuery>): TNewEntityQuery {

        const { state, tools } = recontextDataForKey(this.state, key)
        return new RequestBuilder<TRoot, any, any, any, any, any, any, any>(tools, this.state.entitySet, state, this.disableHttp) as TNewEntityQuery;
    }

    cast<TNewEntityQuery>(
        cast: (caster: TCaster) => CastSelection<TNewEntityQuery>): TNewEntityQuery {

        const { tools, state } = recontextDataForCasting(this.state, cast)
        return new RequestBuilder<TRoot, any, any, any, any, any, any, any>(tools, this.state.entitySet, state, this.disableHttp) as TNewEntityQuery;
    }

    subPath<TNewEntityQuery>(
        selector: (entity: TSubPath, params: Params<TRoot>) => SubPathSelection<TNewEntityQuery>): TNewEntityQuery {

        const { state, tools } = recontextDataForSubPath(this.state, selector)
        return new RequestBuilder<TRoot, any, any, any, any, any, any, any>(tools, this.state.entitySet, state, this.disableHttp) as TNewEntityQuery;
    }

    // https://github.com/ShaneGH/magic-odata/issues/2
    withQuery(queryBuilder: (entity: TQueryable, utils: Utils<TRoot>, params: Params<TRoot>) => Query | Query[], urlEncode?: boolean) {

        const { tools, state } = recontextDataForRootQuery(this.state, queryBuilder, urlEncode)
        return new RequestBuilder<TRoot, TEntity, TResult, OperationIsNotPossibleAfterQuery, OperationIsNotPossibleAfterQuery, OperationIsNotPossibleAfterQuery, OperationIsNotPossibleAfterQuery, TFetchResult>(
            tools, this.state.entitySet, state, this.disableHttp);
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
