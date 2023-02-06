import { Filter } from "../../queryBuilder.js";
import { QueryArray, QueryObject, QueryObjectType, QueryPrimitive } from "../../typeRefBuilder.js";
import { serialize } from "../../valueSerializer.js";
import { combineFilterStrings, getFilterString, getOperableFilterString, getOperableTypeInfo, HasFilterMetadata } from "./operable0.js";
import { IntegerTypes, NonNumericTypes, resolveOutputType } from "./queryPrimitiveTypes0.js";

export type OperableCollection<T> = QueryArray<QueryObject<T>, T> | Filter

const bool = resolveOutputType(NonNumericTypes.Boolean)

function collectionMapper<T>(mapper: ((x: T) => string) | undefined) {
    return mapper && ((xs: T[]) => `[${xs.map(mapper).join(",")}]`);
}

export function collectionFilter<TQueryObj extends QueryObject<TArrayType>, TArrayType>(
    collection: QueryArray<TQueryObj, TArrayType>,
    operator: string,
    collectionItemOperation: ((t: TQueryObj) => Filter)): Filter {

    const ancestorsStr = collection.$$oDataQueryMetadata.path.map(x => x.path).join("/");
    let filter = collectionItemOperation(collection.childObjConfig)?.$$filter;
    if (!filter) {
        throw new Error("Invalid prop filter for any method");
    }

    filter = `(${collection.childObjAlias}:${filter})`
    return combineFilterStrings(`/${operator}`, bool, collection.$$oDataQueryMetadata.root, ancestorsStr, filter);
}

export function collectionFunction<TArrayType>(
    functionName: string,
    collection: OperableCollection<TArrayType>,
    values: TArrayType[],
    mapper?: (x: TArrayType) => string): Filter {

    const metadata = getOperableTypeInfo(collection);
    const singleTypeRef = metadata.typeRef && metadata.typeRef.isCollection
        ? metadata.typeRef.collectionType
        : undefined;

    const firstArg = getOperableFilterString(collection);

    const secondArg = mapper
        ? values.map(mapper)
        : values.map(x => serialize(x, singleTypeRef, metadata.root))

    return combineFilterStrings("", bool,
        metadata.root, `${functionName}(${firstArg},[${secondArg.join(",")}])`);
}

export function any<TQueryObj extends QueryObject<TArrayType>, TArrayType>(
    collection: QueryArray<TQueryObj, TArrayType>,
    collectionItemOperation: ((t: TQueryObj) => Filter)): Filter {

    return collectionFilter(collection, "any", collectionItemOperation);
}

export function all<TQueryObj extends QueryObject<TArrayType>, TArrayType>(
    collection: QueryArray<TQueryObj, TArrayType>,
    collectionItemOperation: ((t: TQueryObj) => Filter)): Filter {

    return collectionFilter(collection, "all", collectionItemOperation);
}

export function count(collection: QueryArray<any, any>, countUnit = IntegerTypes.Int32): QueryPrimitive<Number> {

    return {
        $$oDataQueryObjectType: QueryObjectType.QueryPrimitive,
        $$oDataQueryMetadata: {
            root: collection.$$oDataQueryMetadata.root,
            typeRef: resolveOutputType(countUnit),
            queryAliases: collection.$$oDataQueryMetadata.queryAliases,
            path: [
                ...collection.$$oDataQueryMetadata.path,
                {
                    path: "$count",
                    navigationProperty: false
                }
            ]
        }
    }
}

export function hassubset<TArrayType>(
    collection: QueryArray<QueryPrimitive<TArrayType>, TArrayType>,
    values: TArrayType[],
    mapper?: (x: TArrayType) => string): Filter {

    return collectionFunction("hassubset", collection, values, mapper);
}

export function concatCollection<T>(lhs: OperableCollection<T>, rhs: OperableCollection<T> | T[], mapper?: (x: T) => string): Filter;
export function concatCollection<T>(lhs: OperableCollection<T> | T[], rhs: OperableCollection<T>, mapper?: (x: T) => string): Filter;
export function concatCollection<T>(lhs: OperableCollection<T> | T[], rhs: OperableCollection<T> | T[], mapper?: (x: T) => string): Filter {

    if (Array.isArray(lhs)) {
        if (Array.isArray(rhs)) {
            throw new Error("Invalid method overload");
        }

        return _concatCollection(rhs, lhs, mapper, true);
    }

    return _concatCollection(lhs, rhs, mapper, false);
}

function _concatCollection<T>(lhs: OperableCollection<T>, rhs: OperableCollection<T> | T[], mapper: undefined | ((x: T) => string), swap: boolean): Filter {
    const metadata = getOperableTypeInfo(lhs)
    let lhsS = getOperableFilterString(lhs)
    let rhsS = getFilterString(rhs, collectionMapper(mapper), metadata)

    if (swap) {
        const x = lhsS
        lhsS = rhsS
        rhsS = x
    }

    return combineFilterStrings("", metadata.typeRef, metadata.root, `concat(${lhsS},${rhsS})`);
}

function asHasFilterMetadata(x: any): HasFilterMetadata | undefined {
    return (typeof x.$$oDataQueryObjectType === "string" && x) || undefined
}

export function contains<T>(lhs: OperableCollection<T>, rhs: OperableCollection<T> | T, mapper?: (x: T) => string): Filter;
export function contains<T>(lhs: OperableCollection<T> | T, rhs: OperableCollection<T>, mapper?: (x: T) => string): Filter;
export function contains<T>(lhs: OperableCollection<T> | T, rhs: OperableCollection<T> | T, mapper?: (x: T) => string): Filter {

    if (!asHasFilterMetadata(lhs) && !asHasFilterMetadata(rhs)) {
        throw new Error("Invalid method overload");
    }

    const { nonArr, possibleArr, rev } = !asHasFilterMetadata(lhs)
        ? {
            nonArr: rhs as OperableCollection<T>,
            possibleArr: lhs,
            rev: true
        } : {
            nonArr: lhs as OperableCollection<T>,
            possibleArr: rhs,
            rev: false
        }


    const metadata = getOperableTypeInfo(nonArr)
    let lhsS = getOperableFilterString(nonArr)
    let rhsS = getFilterString(possibleArr, mapper, metadata);

    if (rev) {
        const x = lhsS
        lhsS = rhsS
        rhsS = x
    }

    return combineFilterStrings("", bool, metadata.root, `contains(${lhsS}, ${rhsS})`);
}