import { Filter } from "../../queryBuilder.js";
import { QueryCollection, QueryObject, QueryObjectType, QueryPrimitive } from "../queryComplexObjectBuilder.js";
import { serialize } from "../../valueSerializer.js";
import { combineFilterStrings, getOperableFilterString, getOperableTypeInfo, HasFilterMetadata, Operable } from "./operable0.js";
import { IntegerTypes, NonNumericTypes, resolveOutputType } from "./queryPrimitiveTypes0.js";
import { ODataTypeRef } from "../../../index.js";

export type OperableCollection<T> = QueryCollection<QueryObject<T>, T> | Filter

const bool = resolveOutputType(NonNumericTypes.Boolean)
const int32 = resolveOutputType(IntegerTypes.Int32)

export function collectionFilter<TQueryObj extends QueryObject<TArrayType>, TArrayType>(
    collection: QueryCollection<TQueryObj, TArrayType>,
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
    values: OperableCollection<TArrayType> | TArrayType[],
    mapper?: (x: TArrayType) => string): Filter {
    return _collectionFunction(functionName, collection, values, mapper, false, bool)
}

function _collectionFunction<TArrayType>(
    functionName: string,
    collection: HasFilterMetadata,
    values: HasFilterMetadata | TArrayType[],
    mapper: ((x: TArrayType) => string) | undefined,
    reverse: boolean,
    output: ODataTypeRef | undefined): Filter {

    const metadata = getOperableTypeInfo(collection);
    const singleTypeRef = metadata.typeRef && metadata.typeRef.isCollection
        ? metadata.typeRef.collectionType
        : undefined;

    let firstArg = getOperableFilterString(collection);

    let secondArg = Array.isArray(values)
        ? `[${mapper
            ? values.map(mapper).join(",")
            : values.map(x => serialize(x, singleTypeRef, metadata.root)).join(",")}]`
        : getOperableFilterString(values)

    if (reverse) {
        [firstArg, secondArg] = [secondArg, firstArg]
    }

    return combineFilterStrings("", output,
        metadata.root, `${functionName}(${firstArg},${secondArg})`);
}

export function any<TQueryObj extends QueryObject<TArrayType>, TArrayType>(
    collection: QueryCollection<TQueryObj, TArrayType>,
    collectionItemOperation: ((t: TQueryObj) => Filter)): Filter {

    return collectionFilter(collection, "any", collectionItemOperation);
}

export function all<TQueryObj extends QueryObject<TArrayType>, TArrayType>(
    collection: QueryCollection<TQueryObj, TArrayType>,
    collectionItemOperation: ((t: TQueryObj) => Filter)): Filter {

    return collectionFilter(collection, "all", collectionItemOperation);
}

export function count(collection: QueryCollection<any, any>, countUnit = IntegerTypes.Int32): QueryPrimitive<Number> {

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
    collection: QueryCollection<QueryPrimitive<TArrayType>, TArrayType>,
    values: TArrayType[],
    mapper?: (x: TArrayType) => string): Filter {

    return _collectionFunction("hassubset", collection, values, mapper, false, bool);
}

export function hassubsequence<TArrayType>(
    collection: QueryCollection<QueryPrimitive<TArrayType>, TArrayType>,
    values: TArrayType[],
    mapper?: (x: TArrayType) => string): Filter {

    return _collectionFunction("hassubsequence", collection, values, mapper, false, bool);
}

export function concat<T>(lhs: OperableCollection<T>, rhs: OperableCollection<T> | T[], mapper?: (x: T) => string): Filter;
export function concat<T>(lhs: OperableCollection<T> | T[], rhs: OperableCollection<T>, mapper?: (x: T) => string): Filter;
export function concat<T>(lhs: OperableCollection<T> | T[], rhs: OperableCollection<T> | T[], mapper?: (x: T) => string): Filter {

    if (Array.isArray(lhs)) {
        if (Array.isArray(rhs)) {
            throw new Error("Invalid method overload");
        }

        return _collectionFunction("concat", rhs, lhs, mapper, true, rhs.$$oDataQueryObjectType === "Filter" ? rhs.$$output : rhs.$$oDataQueryMetadata.typeRef);
    }

    return _collectionFunction("concat", lhs, rhs, mapper, false, lhs.$$oDataQueryObjectType === "Filter" ? lhs.$$output : lhs.$$oDataQueryMetadata.typeRef);
}

export function endsWith<T>(lhs: OperableCollection<T>, rhs: OperableCollection<T> | T[], mapper?: (x: T) => string): Filter;
export function endsWith<T>(lhs: OperableCollection<T> | T[], rhs: OperableCollection<T>, mapper?: (x: T) => string): Filter;
export function endsWith<T>(lhs: OperableCollection<T> | T[], rhs: OperableCollection<T> | T[], mapper?: (x: T) => string): Filter {

    if (Array.isArray(lhs)) {
        if (Array.isArray(rhs)) {
            throw new Error("Invalid method overload");
        }

        return _collectionFunction("endswith", rhs, lhs, mapper, true, bool);
    }

    return _collectionFunction("endswith", lhs, rhs, mapper, false, bool);
}

export function startsWith<T>(lhs: OperableCollection<T>, rhs: OperableCollection<T> | T[], mapper?: (x: T) => string): Filter;
export function startsWith<T>(lhs: OperableCollection<T> | T[], rhs: OperableCollection<T>, mapper?: (x: T) => string): Filter;
export function startsWith<T>(lhs: OperableCollection<T> | T[], rhs: OperableCollection<T> | T[], mapper?: (x: T) => string): Filter {

    if (Array.isArray(lhs)) {
        if (Array.isArray(rhs)) {
            throw new Error("Invalid method overload");
        }

        return _collectionFunction("startswith", rhs, lhs, mapper, true, bool);
    }

    return _collectionFunction("startswith", lhs, rhs, mapper, false, bool);
}

function asHasFilterMetadata(x: any): HasFilterMetadata | undefined {
    return (typeof x.$$oDataQueryObjectType === "string" && x) || undefined
}

function singleValuedFunction<T>(
    name: string,
    lhs: OperableCollection<T> | T[],
    rhs: Operable<T> | Operable<T> | T,
    mapper: ((x: T) => string) | undefined,
    output: ODataTypeRef) {

    if (!asHasFilterMetadata(lhs) && !asHasFilterMetadata(rhs)) {
        throw new Error("Invalid method overload");
    }

    if (Array.isArray(lhs)) {
        const rhsMeta = asHasFilterMetadata(rhs);
        if (!rhsMeta) {
            throw new Error("Invalid method overload");
        }

        return _collectionFunction(name, rhsMeta, lhs, mapper, true, output);
    }

    let rhsMeta = asHasFilterMetadata(rhs);
    if (!rhsMeta) {
        const $$output = lhs.$$oDataQueryObjectType === "Filter" ? lhs.$$output : lhs.$$oDataQueryMetadata.typeRef
        const $$root = lhs.$$oDataQueryObjectType === "Filter" ? lhs.$$root : lhs.$$oDataQueryMetadata.root

        rhsMeta = {
            $$root,
            $$output,
            $$oDataQueryObjectType: "Filter",
            $$filter: mapper
                ? mapper(rhs as T)
                : serialize(rhs, ($$output && $$output.isCollection && $$output.collectionType) || undefined, $$root)
        }
    }

    return _collectionFunction(name, lhs, rhsMeta, undefined, false, output);
}

export function contains<T>(lhs: OperableCollection<T>, rhs: Operable<T> | T, mapper?: (x: T) => string): Filter;
export function contains<T>(lhs: OperableCollection<T> | T[], rhs: Operable<T>, mapper?: (x: T) => string): Filter;
export function contains<T>(lhs: OperableCollection<T> | T[], rhs: Operable<T> | Operable<T> | T, mapper?: (x: T) => string): Filter {

    return singleValuedFunction("contains", lhs, rhs, mapper, bool);
}

export function indexOf<T>(lhs: OperableCollection<T>, rhs: Operable<T> | T, mapper?: (x: T) => string): Filter;
export function indexOf<T>(lhs: OperableCollection<T> | T[], rhs: Operable<T>, mapper?: (x: T) => string): Filter;
export function indexOf<T>(lhs: OperableCollection<T> | T[], rhs: Operable<T> | Operable<T> | T, mapper?: (x: T) => string): Filter {

    return singleValuedFunction("indexof", lhs, rhs, mapper, int32);
}

export function length<T>(collection: OperableCollection<T>): Filter {
    const root = collection.$$oDataQueryObjectType === "Filter" ? collection.$$root : collection.$$oDataQueryMetadata.root

    return combineFilterStrings("", int32, root, `length(${getOperableFilterString(collection)})`);
}

export function subString<T>(lhs: OperableCollection<T>, start: number, length?: number): Filter {

    const metadata = getOperableTypeInfo(lhs);
    const lhsS = getOperableFilterString(lhs)

    const filter = length == null ? `substring(${lhsS},${start})` : `substring(${lhsS},${start},${length})`;
    return combineFilterStrings("", metadata.typeRef, metadata.root, filter);
}