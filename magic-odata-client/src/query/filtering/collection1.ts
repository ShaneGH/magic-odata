import { Filter, FilterEnv, FilterResult } from "../../queryBuilder.js";
import { QueryCollection, QueryObject, QueryObjectType, QueryPrimitive } from "../queryComplexObjectBuilder.js";
import { serialize } from "../../valueSerializer.js";
import { asOperable, combineFilterStrings, Operable, operableToFilter } from "./operable0.js";
import { IntegerTypes, NonNumericTypes, resolveOutputType } from "./queryPrimitiveTypes0.js";
import { ODataTypeRef } from "../../../index.js";
import { Reader } from "../../utils.js";
import { functionCall } from "./op1.js";

export type OperableCollection<T> = QueryCollection<QueryObject<T>, T> | Filter

const bool = resolveOutputType(NonNumericTypes.Boolean)
const int32 = resolveOutputType(IntegerTypes.Int32)

export function collectionFilter<TQueryObj extends QueryObject<TArrayType>, TArrayType>(
    collection: QueryCollection<TQueryObj, TArrayType>,
    operator: string,
    collectionItemOperation: ((t: TQueryObj) => Filter)): Filter {

    const collectionFilter = operableToFilter(collection)
    const itemFilter = collectionItemOperation(collection.childObjConfig)
        .map(x => ({
            ...x,
            $$filter: `(${collection.childObjAlias}:${x.$$filter})`
        }))

    return combineFilterStrings(`/${operator}`, bool, collectionFilter, itemFilter);
}

export function collectionFunction<TArrayType>(
    functionName: string,
    collection: OperableCollection<TArrayType>,
    values: OperableCollection<TArrayType> | TArrayType[],
    mapper?: (x: TArrayType) => string): Filter {
    return _collectionFunction(functionName, collection, values, mapper, _ => bool)
}

function filterize<TArrayType>(
    toFilterize: OperableCollection<TArrayType> | Filter | TArrayType[],
    supplimentary: OperableCollection<TArrayType> | Filter,
    mapper: ((x: TArrayType) => string) | undefined) {

    if (!Array.isArray(toFilterize)) {
        return operableToFilter(toFilterize)
    }

    return operableToFilter(supplimentary)
        .bind(({ $$output }) => Reader.create<FilterEnv, FilterResult>(({ $$root }) => ({
            $$output,
            $$filter: `[${mapper
                ? toFilterize.map(mapper).join(",")
                : toFilterize.map(x => serialize(x, $$output.isCollection ? $$output.collectionType : undefined, $$root)).join(",")}]`
        })))
}

function filterizeSingle<TArrayType>(
    toFilterize: Operable<TArrayType> | TArrayType,
    supplimentary: OperableCollection<TArrayType> | Filter,
    mapper: ((x: TArrayType) => string) | undefined) {

    const toFilterizeO = asOperable(toFilterize)
    if (toFilterizeO) {
        return operableToFilter(toFilterizeO)
    }

    return operableToFilter(supplimentary)
        .map(({ $$output }) => ($$output.isCollection && $$output.collectionType) || $$output)
        .bind($$output => Reader.create<FilterEnv, FilterResult>(({ $$root }) => ({
            $$output,
            $$filter: mapper
                ? mapper(toFilterize as TArrayType)
                : serialize(toFilterize, $$output, $$root)
        })))
}

function _collectionFunction<TArrayType>(
    functionName: string,
    collection: OperableCollection<TArrayType> | Filter | TArrayType[],
    values: OperableCollection<TArrayType> | Filter | TArrayType[],
    mapper: ((x: TArrayType) => string) | undefined,
    output: (ts: [FilterResult, FilterResult]) => ODataTypeRef): Filter {

    if (Array.isArray(collection)) {
        if (Array.isArray(values)) {
            throw new Error("Invalid method overload")
        }

        collection = filterize(collection, values, mapper);
    }

    if (Array.isArray(values)) {
        if (Array.isArray(collection)) {
            throw new Error("Invalid method overload")
        }

        values = filterize(values, collection, mapper);
    }

    const _collection = operableToFilter(collection)
    const _values = operableToFilter(values)
    const inputs = Reader.traverse(_collection, _values) as Reader<FilterEnv, [FilterResult, FilterResult]>

    return inputs.bind(is =>
        functionCall(functionName, [_collection, _values], output(is)));
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

export function hasSubset<TArrayType>(
    collection: QueryCollection<QueryPrimitive<TArrayType>, TArrayType>,
    values: TArrayType[],
    mapper?: (x: TArrayType) => string): Filter {

    return _collectionFunction("hassubset", collection, values, mapper, _ => bool);
}

export function hasSubSequence<TArrayType>(
    collection: QueryCollection<QueryPrimitive<TArrayType>, TArrayType>,
    values: TArrayType[],
    mapper?: (x: TArrayType) => string): Filter {

    return _collectionFunction("hassubsequence", collection, values, mapper, _ => bool);
}

export function concat<T>(lhs: OperableCollection<T>, rhs: OperableCollection<T> | T[], mapper?: (x: T) => string): Filter;
export function concat<T>(lhs: OperableCollection<T> | T[], rhs: OperableCollection<T>, mapper?: (x: T) => string): Filter;
export function concat<T>(lhs: OperableCollection<T> | T[], rhs: OperableCollection<T> | T[], mapper?: (x: T) => string): Filter {

    if (Array.isArray(lhs)) {
        if (Array.isArray(rhs)) {
            throw new Error("Invalid method overload");
        }
    }

    return _collectionFunction("concat", lhs, rhs, mapper, xs => xs.map(x => x.$$output).filter(x => !!x)[0]);
}

export function endsWith<T>(lhs: OperableCollection<T>, rhs: OperableCollection<T> | T[], mapper?: (x: T) => string): Filter;
export function endsWith<T>(lhs: OperableCollection<T> | T[], rhs: OperableCollection<T>, mapper?: (x: T) => string): Filter;
export function endsWith<T>(lhs: OperableCollection<T> | T[], rhs: OperableCollection<T> | T[], mapper?: (x: T) => string): Filter {

    if (Array.isArray(lhs)) {
        if (Array.isArray(rhs)) {
            throw new Error("Invalid method overload");
        }
    }

    return _collectionFunction("endswith", lhs, rhs, mapper, _ => bool);
}

export function startsWith<T>(lhs: OperableCollection<T>, rhs: OperableCollection<T> | T[], mapper?: (x: T) => string): Filter;
export function startsWith<T>(lhs: OperableCollection<T> | T[], rhs: OperableCollection<T>, mapper?: (x: T) => string): Filter;
export function startsWith<T>(lhs: OperableCollection<T> | T[], rhs: OperableCollection<T> | T[], mapper?: (x: T) => string): Filter {

    if (Array.isArray(lhs)) {
        if (Array.isArray(rhs)) {
            throw new Error("Invalid method overload");
        }
    }

    return _collectionFunction("startswith", lhs, rhs, mapper, _ => bool);
}

function singleValuedFunction<T>(
    name: string,
    lhs: OperableCollection<T> | T[],
    rhs: Operable<T> | T,
    mapper: ((x: T) => string) | undefined,
    output: ODataTypeRef) {

    let rhsO = asOperable(rhs);
    if (Array.isArray(lhs)) {
        if (!rhsO) {
            throw new Error("Invalid method overload")
        }

        lhs = filterize(lhs, rhsO, mapper);
    }

    lhs = operableToFilter(lhs);
    rhsO ??= filterizeSingle(rhs, lhs, mapper);

    return combineFilterStrings(",", output, lhs, rhsO)
        .map(x => ({
            ...x,
            $$filter: `${name}(${x.$$filter})`
        }))
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

    return operableToFilter(collection)
        .map(({ $$filter }) => ({
            $$output: int32,
            $$filter: `length(${$$filter})`
        }));
}

export function subString<T>(lhs: OperableCollection<T>, start: number, length?: number): Filter {

    return operableToFilter(lhs)
        .map(({ $$filter, $$output }) => ({
            $$output,
            $$filter: length == null
                ? `substring(${$$filter},${start})`
                : `substring(${$$filter},${start},${length})`
        }));
}