import { ODataComplexType, ODataEnum, ODataServiceTypes, ODataTypeName } from "magic-odata-shared";
import { Utils, utils as queryUtils } from "../query/queryUtils.js";
import { Query } from "../queryBuilder.js";
import { buildComplexTypeRef, QueryComplexObject, QueryEnum, QueryObjectType, QueryPrimitive } from "../query/queryComplexObjectBuilder.js";
import { EntitySetData, getDeepTypeRef, lookup } from "./utils.js";

type ComplexQueryBuilder<TRoot, TEntity, TQuery> = (entity: QueryComplexObject<TEntity>, utils: Utils<TRoot>) => TQuery
type PrimitiveQueryBuilder<TRoot, TEntity, TQuery> = (entity: QueryPrimitive<TEntity>, utils: Utils<TRoot>) => TQuery
type EnumQueryBuilder<TRoot, TEntity, TQuery> = (entity: QueryEnum<TEntity>, utils: Utils<TRoot>) => TQuery

function executePrimitiveQueryBuilder<TRoot, TEntity, TQuery>(
    type: ODataTypeName,
    queryBuilder: PrimitiveQueryBuilder<TRoot, TEntity, TQuery>,
    rootContext: string): TQuery {

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

    return queryBuilder(typeRef, queryUtils());
}

function executeComplexQueryBuilder<TRoot, TEntity, TQuery>(
    type: ODataComplexType,
    root: ODataServiceTypes,
    queryBuilder: ComplexQueryBuilder<TRoot, TEntity, TQuery>,
    rootContext: string): TQuery {

    const typeRef: QueryComplexObject<TEntity> = buildComplexTypeRef(type, root, rootContext);
    return queryBuilder(typeRef, queryUtils());
}

function executeEnumQueryBuilder<TRoot, TEntity, TQuery>(
    type: ODataEnum,
    queryBuilder: EnumQueryBuilder<TRoot, TEntity, TQuery>,
    rootContext: string): TQuery {

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

    return queryBuilder(typeRef, queryUtils());
}

export function executeQueryBuilder<TRoot, TQueryable, TQuery>(
    typeRef: ODataTypeName,
    types: ODataServiceTypes,
    queryBuilder: (entity: TQueryable, utils: Utils<TRoot>) => TQuery,
    rootContext: string): TQuery {

    // There is a lot of trust in these 2 lines of code.
    // trust that the TEntity lines up with a typeRef in terms of being complex, primitive or enum
    const t = lookup(typeRef, types)
    return t.flag === "Complex"
        ? executeComplexQueryBuilder(t.type, types, queryBuilder as any, rootContext)
        : t.flag === "Primitive"
            ? executePrimitiveQueryBuilder(t.type, queryBuilder as any, rootContext)
            : executeEnumQueryBuilder(t.type, queryBuilder as any, rootContext);
}

export function recontextDataForRootQuery<TRoot, TFetchResult, TResult, TQueryable>(
    data: EntitySetData<TFetchResult, TResult>,
    queryBuilder: (entity: TQueryable, utils: Utils<TRoot>) => Query | Query[],
    urlEncode?: boolean) {

    if (data.state.query) {
        throw new Error("This request already has a query");
    }

    const typeRef = getDeepTypeRef(data.tools.type);
    if (typeRef.collectionDepth > 1) {
        throw new Error("Querying of collections of collections is not supported");
    }

    const t = lookup(typeRef, data.tools.root.types)
    const query = executeQueryBuilder(t.type, data.tools.root.types, queryBuilder, "$it")

    return {
        tools: data.tools,
        state: {
            ...data.state,
            query: {
                query,
                urlEncode: urlEncode == undefined ? true : urlEncode
            }
        }
    };
}