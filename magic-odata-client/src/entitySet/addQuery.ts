import { Dict, ODataComplexType, ODataEnum, ODataSchema, ODataTypeName } from "magic-odata-shared";
import { Utils, utils as queryUtils } from "../query/queryUtils.js";
import { Query } from "../queryBuilder.js";
import { buildComplexTypeRef, QueryComplexObject, QueryEnum, QueryObjectType, QueryPrimitive } from "../query/queryComplexObjectBuilder.js";
import { EntitySetData, getDeepTypeRef, lookup } from "./utils.js";
import { Params } from "../entitySetInterfaces.js";
import { params } from "./params.js";

type ComplexQueryBuilder<TRoot, TEntity, TQuery> = (entity: QueryComplexObject<TEntity>, utils: Utils<TRoot>, params: Params<TRoot>) => TQuery
type PrimitiveQueryBuilder<TRoot, TEntity, TQuery> = (entity: QueryPrimitive<TEntity>, utils: Utils<TRoot>, params: Params<TRoot>) => TQuery
type EnumQueryBuilder<TRoot, TEntity, TQuery> = (entity: QueryEnum<TEntity>, utils: Utils<TRoot>, params: Params<TRoot>) => TQuery

function executePrimitiveQueryBuilder<TRoot, TEntity, TQuery>(
    type: ODataTypeName,
    queryBuilder: PrimitiveQueryBuilder<TRoot, TEntity, TQuery>,
    rootContext: string,
    params: Params<TRoot>): TQuery {

    const typeRef: QueryPrimitive<TEntity> = {
        $$oDataQueryObjectType: QueryObjectType.QueryPrimitive,
        $$oDataQueryMetadata: {
            typeRef: {
                isCollection: false,
                ...type
            },
            queryAliases: {},
            rootContext,
            path: []
        }
    };

    return queryBuilder(typeRef, queryUtils(), params);
}

function executeComplexQueryBuilder<TRoot, TEntity, TQuery>(
    type: ODataComplexType,
    root: Dict<ODataSchema>,
    queryBuilder: ComplexQueryBuilder<TRoot, TEntity, TQuery>,
    rootContext: string,
    params: Params<TRoot>): TQuery {

    const typeRef: QueryComplexObject<TEntity> = buildComplexTypeRef(type, root, rootContext);
    return queryBuilder(typeRef, queryUtils(), params);
}

function executeEnumQueryBuilder<TRoot, TEntity, TQuery>(
    type: ODataEnum,
    queryBuilder: EnumQueryBuilder<TRoot, TEntity, TQuery>,
    rootContext: string,
    params: Params<TRoot>): TQuery {

    const typeRef: QueryEnum<TEntity> = {
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
            path: []
        }
    };

    return queryBuilder(typeRef, queryUtils(), params);
}

export function executeQueryBuilder<TRoot, TQueryable, TQuery>(
    typeRef: ODataTypeName,
    types: Dict<ODataSchema>,
    queryBuilder: (entity: TQueryable, utils: Utils<TRoot>, params: Params<TRoot>) => TQuery,
    rootContext: string,
    params: Params<TRoot>): TQuery {

    // There is a lot of trust in these 2 lines of code.
    // trust that the TEntity lines up with a typeRef in terms of being complex, primitive or enum
    const t = lookup(typeRef, types)
    return t.flag === "Complex"
        ? executeComplexQueryBuilder(t.type, types, queryBuilder as any, rootContext, params)
        : t.flag === "Primitive"
            ? executePrimitiveQueryBuilder(t.type, queryBuilder as any, rootContext, params)
            : executeEnumQueryBuilder(t.type, queryBuilder as any, rootContext, params);
}

export function recontextDataForRootQuery<TRoot, TFetchResult, TResult, TQueryable>(
    data: EntitySetData<TFetchResult, TResult>,
    queryBuilder: (entity: TQueryable, utils: Utils<TRoot>, params: Params<TRoot>) => Query | Query[],
    urlEncode?: boolean): EntitySetData<TFetchResult, TResult> {

    if (data.state.query.query.length) {
        throw new Error("This request already has a query");
    }

    const typeRef = getDeepTypeRef(data.tools.type);
    if (typeRef.collectionDepth > 1) {
        throw new Error("Querying of collections of collections is not supported");
    }

    const [mutableParamDefinitions, paramsBuilder] = params<TRoot>(
        data.tools.requestTools.uriRoot, data.tools.root, data.tools.root.schemaNamespaces[data.tools.entitySet.namespace]);
    const t = lookup(typeRef, data.tools.root.schemaNamespaces)
    const query = executeQueryBuilder(t.type, data.tools.root.schemaNamespaces, queryBuilder, "$it", paramsBuilder)

    return {
        tools: data.tools,
        state: {
            ...data.state,
            mutableDataParams: [...data.state.mutableDataParams, mutableParamDefinitions],
            query: {
                query: Array.isArray(query) ? query : [query],
                urlEncode: urlEncode == undefined ? true : urlEncode
            }
        }
    };
}