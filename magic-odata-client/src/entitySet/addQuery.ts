import { ODataComplexType, ODataEnum, ODataTypeName } from "magic-odata-shared";
import { Utils, utils as queryUtils } from "../query/queryUtils.js";
import { QbEmit, Query } from "../queryBuilder.js";
import { addEquality, buildComplexTypeRef, QueryComplexObject, QueryEnum, QueryObjectType, QueryPrimitive } from "../query/queryComplexObjectBuilder.js";
import { RequestBuilderData, getDeepTypeRef, lookup, EntityQueryState } from "./utils.js";
import { Params } from "../entitySetInterfaces.js";
import { params } from "./params.js";
import { Writer } from "../utils.js";
import { SerializerSettings } from "../valueSerializer.js";

type ComplexQueryBuilder<TRoot, TEntity, TQuery> = (entity: QueryComplexObject<TEntity>, utils: Utils<TRoot>, params: Params<TRoot>) => TQuery
type PrimitiveQueryBuilder<TRoot, TEntity, TQuery> = (entity: QueryPrimitive<TEntity>, utils: Utils<TRoot>, params: Params<TRoot>) => TQuery
type EnumQueryBuilder<TRoot, TEntity, TQuery> = (entity: QueryEnum<TEntity>, utils: Utils<TRoot>, params: Params<TRoot>) => TQuery

function executePrimitiveQueryBuilder<TRoot, TEntity, TQuery>(
    type: ODataTypeName,
    queryBuilder: PrimitiveQueryBuilder<TRoot, TEntity, TQuery>,
    rootContext: string,
    params: Params<TRoot>): TQuery {

    const typeRef: QueryPrimitive<TEntity> = addEquality({
        $$oDataQueryObjectType: QueryObjectType.QueryPrimitive,
        $$oDataQueryMetadata: {
            typeRef: {
                isCollection: false,
                ...type
            },
            queryAliases: {},
            rootContext,
            path: [],
            qbEmit: QbEmit.zero
        }
    });

    return queryBuilder(typeRef, queryUtils(), params);
}

function executeComplexQueryBuilder<TRoot, TEntity, TQuery>(
    type: ODataComplexType,
    serializerSettings: SerializerSettings,
    queryBuilder: ComplexQueryBuilder<TRoot, TEntity, TQuery>,
    rootContext: string,
    params: Params<TRoot>): TQuery {

    const typeRef: QueryComplexObject<TEntity> = buildComplexTypeRef(type, serializerSettings, rootContext);
    return queryBuilder(typeRef, queryUtils(), params);
}

function executeEnumQueryBuilder<TRoot, TEntity, TQuery>(
    type: ODataEnum,
    queryBuilder: EnumQueryBuilder<TRoot, TEntity, TQuery>,
    rootContext: string,
    params: Params<TRoot>): TQuery {

    const typeRef: QueryEnum<TEntity> = addEquality({
        $$oDataEnumType: type,
        $$oDataQueryObjectType: QueryObjectType.QueryEnum,
        $$oDataQueryMetadata: {
            rootContext,
            typeRef: {
                isCollection: false,
                namespace: type.namespace,
                name: type.name
            },
            queryAliases: {},
            path: [],
            qbEmit: QbEmit.zero
        }
    });

    return queryBuilder(typeRef, queryUtils(), params);
}

export function executeQueryBuilder<TRoot, TQueryable, TQuery>(
    typeRef: ODataTypeName,
    serializerSettings: SerializerSettings,
    queryBuilder: (entity: TQueryable, utils: Utils<TRoot>, params: Params<TRoot>) => TQuery,
    rootContext: string,
    params: Params<TRoot>): TQuery {

    // There is a lot of trust in these 2 lines of code.
    // trust that the TEntity lines up with a typeRef in terms of being complex, primitive or enum
    const t = lookup(typeRef, serializerSettings.serviceConfig)
    return t.flag === "Complex"
        ? executeComplexQueryBuilder(t.type, serializerSettings, queryBuilder as any, rootContext, params)
        : t.flag === "Primitive"
            ? executePrimitiveQueryBuilder(t.type, queryBuilder as any, rootContext, params)
            : executeEnumQueryBuilder(t.type, queryBuilder as any, rootContext, params);
}

export function recontextDataForRootQuery<TRoot, TFetchResult, TResult, TQueryable>(
    data: RequestBuilderData<TFetchResult, TResult>,
    queryBuilder: (entity: TQueryable, utils: Utils<TRoot>, params: Params<TRoot>) => Query | Query[]): Writer<EntityQueryState, QbEmit> {

    return data.state.bind(state => {

        if (state.query.query.length) {
            throw new Error("This request already has a query");
        }

        const typeRef = getDeepTypeRef(state.type);
        if (typeRef.collectionDepth > 1) {
            throw new Error("Querying of collections of collections is not supported");
        }

        const paramsBuilder = params<TRoot>(
            data.tools.requestTools.uriRoot, data.tools.root, data.tools.serializerSettings, data.tools.schema);
        const t = lookup(typeRef, data.tools.root.schemaNamespaces)
        const query = executeQueryBuilder(t.type, data.tools.serializerSettings, queryBuilder, "$it", paramsBuilder)

        return [{
            ...state,
            query: {
                query: Array.isArray(query) ? query : [query]
            }
        }, QbEmit.zero];
    })
}