import { ODataComplexType, ODataEnum, ODataServiceConfig, ODataTypeName } from "magic-odata-shared";
import { Utils, utils as queryUtils } from "../query/queryUtils.js";
import { Query } from "../queryBuilder.js";
import { buildComplexTypeRef, QueryComplexObject, QueryEnum, QueryObjectType, QueryPrimitive } from "../typeRefBuilder.js";
import { EntitySetData, getDeepTypeRef, lookup } from "./utils.js";

type ComplexQueryBuilder<TEntity> = (entity: QueryComplexObject<TEntity>, utils: Utils) => Query | Query[]
type PrimitiveQueryBuilder<TEntity> = (entity: QueryPrimitive<TEntity>, utils: Utils) => Query | Query[]
type EnumQueryBuilder<TEntity> = (entity: QueryEnum<TEntity>, utils: Utils) => Query | Query[]

function executePrimitiveQueryBuilder<TEntity>(
    type: ODataTypeName,
    root: ODataServiceConfig,
    queryBuilder: PrimitiveQueryBuilder<TEntity>): Query | Query[] {

    const typeRef: QueryPrimitive<TEntity> = {
        $$oDataQueryObjectType: QueryObjectType.QueryPrimitive,
        $$oDataQueryMetadata: {
            typeRef: {
                isCollection: false,
                ...type
            },
            queryAliases: {},
            root: root.types,
            path: [{
                path: "$it",
                navigationProperty: false
            }]
        }
    };

    return queryBuilder(typeRef, queryUtils());
}

function executeComplexQueryBuilder<TEntity>(
    type: ODataComplexType,
    root: ODataServiceConfig,
    queryBuilder: ComplexQueryBuilder<TEntity>): Query | Query[] {

    const typeRef: QueryComplexObject<TEntity> = buildComplexTypeRef(type, root.types);
    return queryBuilder(typeRef, queryUtils());
}

function executeEnumQueryBuilder<TEntity>(
    type: ODataEnum,
    root: ODataServiceConfig,
    queryBuilder: EnumQueryBuilder<TEntity>): Query | Query[] {

    const typeRef: QueryEnum<TEntity> = {
        $$oDataEnumType: type,
        $$oDataQueryObjectType: QueryObjectType.QueryEnum,
        $$oDataQueryMetadata: {
            root: root.types,
            typeRef: {
                isCollection: false,
                namespace: type.namespace,
                name: type.name
            },
            queryAliases: {},
            path: [{
                path: "$it",
                navigationProperty: false
            }]
        }
    };

    return queryBuilder(typeRef, queryUtils());
}

export function recontextDataForQuery<TFetchResult, TResult, TQueryable>(
    data: EntitySetData<TFetchResult, TResult>,
    queryBuilder: (entity: TQueryable, utils: Utils) => Query | Query[], urlEncode?: boolean) {

    if (data.state.query) {
        throw new Error("This request already has a query");
    }

    const typeRef = getDeepTypeRef(data.tools.type);
    if (typeRef.collectionDepth > 1) {
        throw new Error("Querying of collections of collections is not supported");
    }

    // There is a lot of trust in these 2 lines of code.
    // trust that the TEntity lines up with a typeRef in terms of being complex, primitive or enum
    const t = lookup(typeRef, data.tools.root.types)
    const query = t.flag === "Complex"
        ? executeComplexQueryBuilder(t.type, data.tools.root, queryBuilder as any)
        : t.flag === "Primitive"
            ? executePrimitiveQueryBuilder(t.type, data.tools.root, queryBuilder as any)
            : executeEnumQueryBuilder(t.type, data.tools.root, queryBuilder as any);

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